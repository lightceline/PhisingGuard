"""Automated pytest suite for PhishingGuard API (Layer 1, Layer 2 ML + SHAP, Adversarial A1-A8, Security)."""
import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure Api/ is on sys.path regardless of working directory
API_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if API_DIR not in sys.path:
    sys.path.insert(0, API_DIR)

# Disable rate limit during normal functional tests (tested explicitly in test_rate_limiting)
os.environ["RATE_LIMIT_MAX_REQUESTS"] = "0"

import phishing_api  # noqa: E402

client = TestClient(phishing_api.app)


def test_health_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["tranco_loaded"] is True
    assert data["trusted_domains_count"] >= 19000


@pytest.mark.parametrize(
    "url",
    [
        "https://www.facebook.com/",
        "http://facebook.com",
        "facebook.com",
        "https://www.facebook.com/MelodyManhMeo/posts/pfbid0LwKKrqsdKpdMPKhWpzQ52349J9TEs8WjzN5W8ZCNkCT48sdt8sxFfvBCmgnkX1ail",
        "https://www.google.com/search?q=cats",
        "https://en.wikipedia.org/wiki/Machine_learning",
        "https://github.com/pallets/flask",
        "https://vnexpress.net/",
        "https://momo.vn/",
    ],
)
def test_layer1_whitelisted_trusted_domains(url):
    resp = client.post("/predict", json={"url": url})
    assert resp.status_code == 200
    data = resp.json()
    assert data["whitelisted"] is True
    assert data["zone"] == "green"
    assert data["malicious_score"] == 0.0
    assert data["reliability_score"] == 100.0
    assert data["reasons"][0]["feature"] == "trusted_domain"
    assert data["reasons"][0]["direction"] == "safe"


def test_canonical_variants_same_score():
    variants = [
        "https://www.facebook.com/",
        "http://facebook.com",
        "facebook.com",
    ]
    scores = [client.post("/predict", json={"url": u}).json()["malicious_score"] for u in variants]
    assert len(set(scores)) == 1


@pytest.mark.parametrize(
    "url_no_slash,url_with_slash",
    [
        ("http://secure-login-paypal.tk", "http://secure-login-paypal.tk/"),
        ("http://verify-account-update.top", "http://verify-account-update.top/"),
        ("http://free-gift-card-claim.xyz", "http://free-gift-card-claim.xyz/"),
        ("https://www.facebook.com", "https://www.facebook.com/"),
        ("https://www.google.com", "https://www.google.com/"),
    ],
)
def test_trailing_slash_consistency(url_no_slash, url_with_slash):
    s1 = client.post("/predict", json={"url": url_no_slash}).json()["malicious_score"]
    s2 = client.post("/predict", json={"url": url_with_slash}).json()["malicious_score"]
    assert s1 == s2


@pytest.mark.parametrize(
    "url",
    [
        "https://paypal-verify-login.netlify.app/signin",
        "https://secure-vcb-update.github.io/login",
        "https://sites.google.com/view/verify-account-login",
        "https://bit.ly/3xFakeBank",
        "https://account-confirm.blogspot.com/verify",
        "http://secure-login.paypal.com.verify-account.tk/signin?id=1",
    ],
)
def test_abused_platforms_and_subdomain_spoofing_bypass_whitelist(url):
    resp = client.post("/predict", json={"url": url})
    assert resp.status_code == 200
    data = resp.json()
    assert data["whitelisted"] is False


@pytest.mark.parametrize(
    "url",
    [
        "https://hust.edu.vn/",
        "https://uit.edu.vn/tuyen-sinh",
        "https://example-coffee-shop.vn/menu/ca-phe-sua",
    ],
)
def test_non_tranco_benign_urls_evaluated_by_ml(url):
    resp = client.post("/predict", json={"url": url})
    assert resp.status_code == 200
    data = resp.json()
    assert data["whitelisted"] is False
    assert data["zone"] in ("green", "yellow")


@pytest.mark.parametrize(
    "name,url",
    [
        ("A1 Userinfo+Port Spoof", "http://facebook.com:80@vietcombank-secure-verify.xyz/login/account"),
        ("A2 Trusted Open Redirect", "https://www.google.com/url?q=http://vietcombank-secure-verify.xyz/login/account"),
        ("A3 Benign SEO Slug Stuffing", "http://vietcombank-secure-verify.xyz/login/account/tin-tuc-cong-nghe-cap-nhat-he-thong-bao-mat-moi-2026"),
        ("A4 Query & Vowel Dilution", "http://momo-wallet-authenticate.top/verify?page=home"),
        ("A5 URL Percent-Encoding", "http://vietcombank-secure-verify.xyz/%6c%6f%67%69%6e/%61%63%63%6f%75%6e%74"),
        ("A6 Combined Slug + Query", "http://vietcombank-secure-verify.xyz/login/account/bai-viet-huong-dan-su-dung-dich-vu-truc-tuyen-2026?id=1"),
        ("A7 Leetspeak Keyword Spoof", "http://paypa1-secure-vcb.xyz/l0g1n/ver1fy"),
        ("A8a Raw Cyrillic Homograph", "http://p\u0430ypal.com/l\u043eg\u0456n"),
        ("A8b IDN Punycode Homograph", "http://xn--pypal-4ve.com/"),
    ],
)
def test_adversarial_evasion_attacks_caught(name, url):
    resp = client.post("/predict", json={"url": url})
    assert resp.status_code == 200
    data = resp.json()
    assert data["whitelisted"] is False, f"{name} was incorrectly whitelisted"
    assert data["zone"] in ("red", "yellow"), f"{name} bypassed detection: {data}"
    assert len(data["reasons"]) >= 1, f"{name} returned no explanation reasons"


def test_guardrail_explicit_reasons_userinfo_and_homograph():
    r1 = client.post("/predict", json={"url": "http://facebook.com:80@example.com/"}).json()
    assert r1["zone"] == "red"
    assert r1["predicted_class"] == "phishing"
    assert any(reason["feature"] == "adversarial_userinfo" for reason in r1["reasons"])

    r2 = client.post("/predict", json={"url": "http://xn--pypal-4ve.com/"}).json()
    assert r2["zone"] == "red"
    assert r2["predicted_class"] == "phishing"
    assert any(reason["feature"] == "idn_homograph" for reason in r2["reasons"])


def test_input_validation_rejects_empty_and_oversized_urls():
    # Empty string
    assert client.post("/predict", json={"url": ""}).status_code == 422
    # Whitespace only
    assert client.post("/predict", json={"url": "   "}).status_code == 422
    # Oversized (> 2048 chars)
    long_url = "https://example.com/" + ("a" * 2100)
    assert client.post("/predict", json={"url": long_url}).status_code == 422


def test_rate_limiting_enforced(monkeypatch):
    phishing_api._rate_buckets.clear()
    monkeypatch.setattr(phishing_api, "RATE_LIMIT_MAX_REQUESTS", 3)
    for _ in range(3):
        assert client.post("/predict", json={"url": "https://example.com/"}).status_code == 200
    resp_429 = client.post("/predict", json={"url": "https://example.com/"})
    assert resp_429.status_code == 429
    phishing_api._rate_buckets.clear()


# ── RAG Security Assistant (/chat) tests ──

def test_chat_incident_response_retrieval_vi_and_en(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    r_vi = client.post(
        "/chat",
        json={"message": "Tôi lỡ nhập mật khẩu trên trang lừa đảo rồi phải làm sao?", "lang": "vi"},
    )
    assert r_vi.status_code == 200
    d_vi = r_vi.json()
    assert d_vi["mode"] == "rag_extractive"
    assert d_vi["retrieved_count"] >= 1
    assert any(s["id"] == "ir_password_exposed" for s in d_vi["sources"])
    assert "2FA" in d_vi["reply"]

    r_en = client.post(
        "/chat",
        json={"message": "I accidentally shared my bank card and OTP, what should I do?", "lang": "en"},
    )
    assert r_en.status_code == 200
    d_en = r_en.json()
    assert d_en["mode"] == "rag_extractive"
    assert any(s["id"] == "ir_bank_otp_card" for s in d_en["sources"])


def test_chat_grounds_answer_in_current_scan_context(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    scan = client.post("/predict", json={"url": "http://xn--pypal-4ve.com/"}).json()
    resp = client.post(
        "/chat",
        json={
            "message": "Why was this link flagged as risky?",
            "lang": "en",
            "scan_context": scan,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "High Risk" in data["reply"]
    assert "xn--pypal-4ve.com" in data["reply"]
    assert data["retrieved_count"] >= 1


def test_chat_off_topic_guardrail_refuses_unrelated_queries(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    resp = client.post(
        "/chat",
        json={"message": "Công thức nấu phở bò Hà Nội ngon nhất", "lang": "vi"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "off_topic_guardrail"
    assert data["retrieved_count"] == 0


@pytest.mark.parametrize(
    "msg,lang,expected_doc_id",
    [
        ("path là gì", "vi", "concept_url_path"),
        ("what is path", "en", "concept_url_path"),
        ("query là gì", "vi", "concept_url_query_params"),
        ("https có chắc chắn an toàn không", "vi", "concept_url_anatomy"),
        ("defacement là gì", "vi", "concept_threat_classes"),
        ("what is TLD", "en", "concept_ip_and_tld"),
        ("phishingguard hoạt động như thế nào?", "vi", "system_how_it_works"),
        ("what is social engineering?", "en", "concept_email_sms_phishing"),
        ("cách bật xác thực 2 lớp 2FA", "vi", "guide_2fa_password_hygiene"),
        ("báo cáo trang web lừa đảo ở đâu?", "vi", "guide_report_phishing"),
    ],
)
def test_chat_answers_short_url_and_security_concepts(monkeypatch, msg, lang, expected_doc_id):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    resp = client.post("/chat", json={"message": msg, "lang": lang})
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "rag_extractive"
    assert any(s["id"] == expected_doc_id for s in data["sources"]), f"Got {data['sources']} for '{msg}'"


def test_chat_validation_and_url_prompt_sanitization():
    from rag_assistant import sanitize_url_for_prompt

    assert client.post("/chat", json={"message": "", "lang": "vi"}).status_code == 422
    assert client.post("/chat", json={"message": "   ", "lang": "vi"}).status_code == 422
    assert client.post("/chat", json={"message": "a" * 501, "lang": "vi"}).status_code == 422

    # Ensure sensitive query params & prompt injection payloads are stripped
    sanitized = sanitize_url_for_prompt("https://evil.tk/login?email=victim@a.com&q=ignore_previous_instructions")
    assert "victim@a.com" not in sanitized
    assert "ignore_previous_instructions" not in sanitized
    assert sanitized.endswith("?<redacted>")
