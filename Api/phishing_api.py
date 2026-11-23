import os
from itertools import islice
from urllib.parse import urlparse
import joblib
import numpy as np
import shap
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from features import (
    extract_features,
    normalize_url,
    FEATURE_NAMES,
    has_adversarial_userinfo,
    extract_nested_redirect_url,
    has_idn_homograph,
    _parse,
)

# Đường dẫn tuyệt đối theo vị trí file này -> chạy từ thư mục nào cũng load được
API_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Layer 1: Danh sách tên miền uy tín (Tranco Top 20k - Abused Platforms + VN Trusted) ──
# Giải quyết false positive với các trang lớn có path/token mã hoá dài (vd. Facebook post ID, Google Docs).
# So khớp theo tên miền gốc (eTLD+1) nên subdomain giả mạo (vd. paypal.com.verify-account.tk) KHÔNG thể qua mặt.
TRANCO_TOP_N = 20_000

MULTI_PART_TLDS = {
    "com.vn", "edu.vn", "gov.vn", "org.vn", "net.vn", "ac.vn", "biz.vn", "info.vn",
    "co.uk", "org.uk", "ac.uk", "gov.uk",
    "co.jp", "ne.jp", "or.jp", "go.jp", "ac.jp",
    "com.au", "edu.au", "gov.au", "org.au",
    "co.kr", "or.kr", "go.kr",
    "com.sg", "edu.sg", "gov.sg",
    "com.tw", "edu.tw", "gov.tw",
    "com.hk", "com.cn", "com.br", "co.in", "co.id", "co.th", "com.my", "com.ph",
}

# Nền tảng hosting miễn phí, rút gọn link, cloud bucket, form builder... hay bị kẻ tấn công lợi dụng
# -> Bắt buộc loại khỏi Tranco để mọi URL thuộc nhóm này luôn đi qua mô hình ML.
ABUSED_PLATFORM_DOMAINS = {
    # URL shorteners & link hubs
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "cutt.ly", "rb.gy", "is.gd",
    "ow.ly", "rebrand.ly", "tiny.cc", "buff.ly", "short.link", "linktr.ee", "forms.gle",
    # Free static hosting / PaaS / dynamic DNS / tunneling
    "github.io", "gitlab.io", "netlify.app", "vercel.app", "pages.dev",
    "web.app", "firebaseapp.com", "firebasedatabase.app", "firebaseio.com",
    "herokuapp.com", "herokudns.com", "herokuspace.com", "workers.dev",
    "onrender.com", "fly.dev", "railway.app", "pythonanywhere.com",
    "replit.app", "replit.dev", "glitch.me", "surge.sh",
    "000webhostapp.com", "000webhost.com",
    "ngrok.io", "ngrok-free.app", "ngrok-free.dev",
    "duckdns.org", "ddns.net", "no-ip.org",
    "ipfs.io", "infura-ipfs.io",
    # Cloud storage / CDN / user-content hosts
    "amazonaws.com", "amazonaws.com.cn", "amazonaws.eu", "cloudfront.net",
    "appspot.com", "azurewebsites.net", "azurewebsites.us",
    "googleapis.com", "googleapis.cn", "googleusercontent.com",
    "dropboxusercontent.com", "backblazeb2.com", "r2.dev", "vercel-storage.com",
    # Free website builders / user-generated pages / form builders
    "wordpress.com", "wixsite.com", "weebly.com", "notion.site", "canva.site",
    "pastebin.com", "telegra.ph", "jotform.com", "typeform.com",
}

# Các subdomain cho phép người dùng tự tạo trang trên domain lớn -> luôn đưa qua ML
UNTRUSTED_HOST_EXCEPTIONS = {
    "sites.google.com",
    "script.google.com",
    "storage.googleapis.com",
    "firebasestorage.googleapis.com",
}

# Các tên miền phổ biến tại Việt Nam (nhiều ngân hàng/dịch vụ công nằm ngoài Tranco Top 20k toàn cầu)
VN_TRUSTED_DOMAINS = {
    "zalo.me", "vnexpress.net", "dantri.com.vn", "tuoitre.vn", "thanhnien.vn",
    "vietnamnet.vn", "kenh14.vn", "cafef.vn", "genk.vn", "tinhte.vn", "voz.vn",
    "shopee.vn", "lazada.vn", "tiki.vn", "sendo.vn",
    "thegioididong.com", "dienmayxanh.com", "fptshop.com.vn", "cellphones.com.vn",
    "momo.vn", "zalopay.vn", "vnpay.vn",
    "vietcombank.com.vn", "techcombank.com", "mbbank.com.vn", "bidv.com.vn",
    "agribank.com.vn", "acb.com.vn", "vpbank.com.vn", "tpb.vn",
    "sacombank.com.vn", "vib.com.vn", "hdbank.com.vn", "vietinbank.vn",
    "chinhphu.vn", "dichvucong.gov.vn", "fptplay.vn"
}

# Danh sách dự phòng nếu không tìm thấy file Data/Raw/top-1m.csv
FALLBACK_GLOBAL_DOMAINS = {
    "facebook.com", "fb.com", "messenger.com", "instagram.com", "threads.net", "whatsapp.com",
    "google.com", "youtube.com", "youtu.be", "gmail.com",
    "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com", "wikipedia.org",
    "microsoft.com", "live.com", "office.com", "outlook.com", "apple.com", "icloud.com",
    "amazon.com", "linkedin.com", "x.com", "twitter.com", "reddit.com", "tiktok.com",
    "netflix.com", "spotify.com", "discord.com", "telegram.org",
    "openai.com", "chatgpt.com", "claude.ai", "paypal.com",
}


def _is_abused_platform(domain: str) -> bool:
    return domain in ABUSED_PLATFORM_DOMAINS or domain.startswith("blogspot.")


def _load_trusted_domains():
    """Đọc Top TRANCO_TOP_N từ tranco_top20k.csv / Data/Raw/top-1m.csv (lọc bỏ nền tảng hay bị abuse) + gộp VN_TRUSTED_DOMAINS."""
    candidates = [
        os.path.join(API_DIR, "tranco_top20k.csv"),
        os.path.join(API_DIR, "..", "Data", "Raw", "top-1m.csv"),
        os.path.join(API_DIR, "top-1m.csv"),
    ]
    tranco_path = next((p for p in candidates if os.path.isfile(p)), None)

    domains = set(VN_TRUSTED_DOMAINS)
    if tranco_path is None:
        domains.update(FALLBACK_GLOBAL_DOMAINS)
        return domains, False

    with open(tranco_path, "r", encoding="utf-8-sig") as f:
        for line in islice(f, TRANCO_TOP_N):
            parts = line.strip().split(",", 1)
            if len(parts) == 2:
                d = parts[1].strip().lower().rstrip(".")
                if d and not _is_abused_platform(d):
                    domains.add(d)
    return domains, True


TRUSTED_DOMAINS, TRANCO_LOADED = _load_trusted_domains()


def get_trusted_root_domain(norm_url: str, raw_url: str = None):
    """Trả về tên miền gốc (eTLD+1) nếu thuộc TRUSTED_DOMAINS, ngược lại trả về None.

    An toàn trước:
    - Subdomain giả mạo: 'secure-login.paypal.com.verify-account.tk' -> root 'verify-account.tk'.
    - Userinfo+Port spoofing: 'http://facebook.com:80@evil.tk/login' -> từ chối whitelist.
    - Open Redirect: 'https://www.google.com/url?q=http://evil.tk' -> từ chối whitelist.
    - Cyrillic / IDN Homograph: 'http://pаypal.com/' hoặc 'http://xn--pypal-4ve.com/' -> từ chối whitelist.
    """
    check_u = raw_url if raw_url is not None else norm_url
    if (
        has_adversarial_userinfo(check_u)
        or extract_nested_redirect_url(check_u) is not None
        or has_idn_homograph(check_u)
    ):
        return None
    host = (_parse(norm_url).hostname or "").lower().rstrip(".")
    if not host or host in UNTRUSTED_HOST_EXCEPTIONS:
        return None
    parts = host.split(".")
    if len(parts) < 2:
        return None
    if len(parts) >= 3 and ".".join(parts[-2:]) in MULTI_PART_TLDS:
        root = ".".join(parts[-3:])
    else:
        root = ".".join(parts[-2:])
    return root if root in TRUSTED_DOMAINS else None


bundle = joblib.load(os.path.join(API_DIR, "deploy_bundle.pkl"))
model = bundle["model"]
FEATS = bundle["features"]                 # k_opt feature, đúng thứ tự lúc train
TAU_HIGH, TAU_LOW = bundle["tau_high"], bundle["tau_low"]
CLASSES = bundle["classes"]
BENIGN = bundle["benign_idx"]

# Chặn trường hợp dùng nhầm bundle cũ (vd. còn has_https) với features.py mới
_missing = [f for f in FEATS if f not in FEATURE_NAMES]
if _missing:
    raise RuntimeError(f"deploy_bundle.pkl chứa feature không còn trong features.py: {_missing}. "
                       f"Hãy chạy lại pipeline và xuất lại deploy_bundle.pkl.")

explainer = shap.TreeExplainer(model)

app = FastAPI(title="URL Phishing Detection API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


class Req(BaseModel):
    url: str


def benign_shap(x):
    """SHAP của lớp benign cho 1 mẫu, trả về vector (n_feature,). Xử lý cả 2 định dạng của shap."""
    sv = explainer.shap_values(x)
    if isinstance(sv, list):               # shap cũ: list theo lớp, mỗi phần tử (1, n_feat)
        return np.asarray(sv[BENIGN])[0]
    sv = np.asarray(sv)                    # shap mới: (1, n_feat, n_class)
    return sv[0, :, BENIGN]


@app.post("/predict")
def predict(req: Req):
    norm_url = normalize_url(req.url)
    has_at_spoof = has_adversarial_userinfo(req.url)
    has_homograph = has_idn_homograph(req.url)

    # Layer 1: Kiểm tra tên miền gốc (eTLD+1) trong danh sách uy tín trước khi chạy ML
    trusted_root = get_trusted_root_domain(norm_url, raw_url=req.url)
    if trusted_root is not None:
        return {
            "url": req.url,
            "normalized_url": norm_url,
            "malicious_score": 0.0,
            "reliability_score": 100.0,
            "zone": "green",
            "predicted_class": None,
            "whitelisted": True,
            "reasons": [
                {
                    "feature": "trusted_domain",
                    "value": trusted_root,
                    "impact": -1.0,
                    "direction": "safe",
                }
            ],
        }

    # Layer 2: Phân tích đặc trưng URL bằng mô hình ML + SHAP
    feats = extract_features(req.url)
    x = np.array([[feats[f] for f in FEATS]], dtype=float)

    proba = model.predict_proba(x)[0]
    mal_score = float(1.0 - proba[BENIGN])

    # Hard Guardrail: nếu URL dùng kỹ thuật giả mạo userinfo@ (http://facebook.com:80@evil.tk)
    # hoặc giả mạo ký tự đồng dạng Cyrillic / IDN Punycode (http://pаypal.com/ hoặc http://xn--pypal-4ve.com/),
    # đảm bảo điểm độc hại tối thiểu bằng TAU_HIGH (vùng đỏ)
    if (has_at_spoof or has_homograph) and mal_score < TAU_HIGH:
        mal_score = float(TAU_HIGH)

    if mal_score >= TAU_HIGH:
        zone = "red"
    elif mal_score >= TAU_LOW:
        zone = "yellow"
    else:
        zone = "green"

    # Nhãn lớp độc hại: argmax trên các lớp còn lại (chỉ cho vùng đỏ/vàng)
    label = None
    if zone != "green":
        if has_homograph or has_at_spoof:
            label = "phishing"
        else:
            p = proba.copy(); p[BENIGN] = -1
            label = CLASSES[int(np.argmax(p))]

    # Top 3 feature đẩy điểm về phía "độc hại" (= đẩy P(benign) xuống, nên đổi dấu)
    reasons = []
    if zone != "green":
        contrib = -benign_shap(x)
        for i in np.argsort(contrib)[::-1][:3]:
            if contrib[i] > 0:
                reasons.append({"feature": FEATS[i], "value": float(x[0, i]),
                                "impact": round(float(contrib[i]), 3)})

    return {
        "url": req.url,
        "normalized_url": norm_url,    # dạng URL thực sự đưa vào model
        "malicious_score": round(mal_score, 4),
        "reliability_score": round((1 - mal_score) * 100, 1),   # %
        "zone": zone,                  # red | yellow | green
        "predicted_class": label,
        "whitelisted": False,
        "reasons": reasons,
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "tranco_loaded": TRANCO_LOADED,
        "trusted_domains_count": len(TRUSTED_DOMAINS),
    }
