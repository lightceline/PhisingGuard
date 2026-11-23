import requests

BASE = "http://127.0.0.1:8000"
API = f"{BASE}/predict"

# 1. Kiểm tra /health (xác nhận Tranco Top 20k đã nạp)
h = requests.get(f"{BASE}/health").json()
print("Health:", h)

# 2. Kiểm tra nhóm URL cơ bản + bài viết Facebook dài + subdomain giả mạo
print("\n── 1. Basic & Whitelist tests ──")
tests = [
    "https://www.facebook.com/",
    "http://facebook.com",
    "facebook.com",
    "https://www.facebook.com/MelodyManhMeo/posts/pfbid0LwKKrqsdKpdMPKhWpzQ52349J9TEs8WjzN5W8ZCNkCT48sdt8sxFfvBCmgnkX1ail",
    "https://www.google.com/search?q=cats",
    "https://en.wikipedia.org/wiki/Machine_learning",
    "https://github.com/pallets/flask",
    "https://vnexpress.net/",
    "https://momo.vn/",
    "http://secure-login.paypal.com.verify-account.tk/signin?id=1",
]

results = {}
for u in tests:
    resp = requests.post(API, json={"url": u})
    if resp.status_code != 200:
        print(resp.status_code, resp.text[:200], "|", u)
        continue
    r = resp.json()
    results[u] = r
    wl = "WL" if r.get("whitelisted") else "ML"
    print(f"[{wl}] {r['malicious_score']:.4f}  {r['zone']:6s}  {r.get('normalized_url', '-')}  <-  {u}")

fb = [results[u]["malicious_score"] for u in tests[:3] if u in results]
print("3 biến thể Facebook cùng điểm:", len(set(fb)) == 1, fb)

# 3. Kiểm tra nhất quán dấu '/' ở cuối URL
print("\n── 2. Trailing '/' consistency ──")
pairs = [
    ("http://secure-login-paypal.tk", "http://secure-login-paypal.tk/"),
    ("http://verify-account-update.top", "http://verify-account-update.top/"),
    ("http://free-gift-card-claim.xyz", "http://free-gift-card-claim.xyz/"),
    ("https://www.facebook.com", "https://www.facebook.com/"),
    ("https://www.google.com", "https://www.google.com/"),
]
for a, b in pairs:
    sa = requests.post(API, json={"url": a}).json()["malicious_score"]
    sb = requests.post(API, json={"url": b}).json()["malicious_score"]
    ok = "OK" if sa == sb else "DIFF!"
    print(f"[{ok}] không /: {sa:.4f} | có /: {sb:.4f}   {a}")

# 4. Kiểm tra ngoại lệ Layer 1 (hosting miễn phí / rút gọn link / subdomain giả mạo -> PHẢI đi qua ML, không whitelist)
print("\n── 3. Abused platforms (must NOT be whitelisted) ──")
abused_tests = [
    "https://paypal-verify-login.netlify.app/signin",
    "https://secure-vcb-update.github.io/login",
    "https://sites.google.com/view/verify-account-login",
    "https://bit.ly/3xFakeBank",
    "https://account-confirm.blogspot.com/verify",
    "http://secure-login.paypal.com.verify-account.tk/signin?id=1",
]
all_bypassed_wl = True
for u in abused_tests:
    r = requests.post(API, json={"url": u}).json()
    wl = r.get("whitelisted", False)
    if wl:
        all_bypassed_wl = False
    tag = "FAIL-WL!" if wl else "ML-OK"
    print(f"[{tag:8s}] {r['malicious_score']:.4f}  {r['zone']:6s}  {u}")
print("Tất cả nền tảng hay bị lợi dụng đều đi qua ML:", all_bypassed_wl)

# 5. Kiểm tra trang lành tính KHÔNG thuộc Tranco Top 20k (đánh giá thuần bằng Layer 2 ML)
print("\n── 4. Non-Tranco benign URLs (pure Layer 2 ML) ──")
non_tranco_benign = [
    "https://hust.edu.vn/",
    "https://uit.edu.vn/tuyen-sinh",
    "https://example-coffee-shop.vn/menu/ca-phe-sua",
]
for u in non_tranco_benign:
    r = requests.post(API, json={"url": u}).json()
    wl = "WL" if r.get("whitelisted") else "ML"
    print(f"[{wl}] {r['malicious_score']:.4f}  {r['zone']:6s}  {u}")

# 6. Kiểm tra chống tấn công đối kháng (Adversarial Evasion & Defense A1 - A8: Userinfo, Open Redirect, Slug, Query, %xx, Leetspeak, Cyrillic & Punycode)
print("\n── 5. Adversarial Evasion & Defense tests (A1 - A8) ──")
adv_tests = [
    ("A1 Userinfo+Port Spoof", "http://facebook.com:80@vietcombank-secure-verify.xyz/login/account"),
    ("A2 Trusted Open Redirect", "https://www.google.com/url?q=http://vietcombank-secure-verify.xyz/login/account"),
    ("A3 Benign SEO Slug Stuffing", "http://vietcombank-secure-verify.xyz/login/account/tin-tuc-cong-nghe-cap-nhat-he-thong-bao-mat-moi-2026"),
    ("A4 Query & Vowel Dilution", "http://momo-wallet-authenticate.top/verify?page=home"),
    ("A5 URL Percent-Encoding", "http://vietcombank-secure-verify.xyz/%6c%6f%67%69%6e/%61%63%63%6f%75%6e%74"),
    ("A6 Combined Slug + Query", "http://vietcombank-secure-verify.xyz/login/account/bai-viet-huong-dan-su-dung-dich-vu-truc-tuyen-2026?id=1"),
    ("A7 Leetspeak Keyword Spoof", "http://paypa1-secure-vcb.xyz/l0g1n/ver1fy"),
    ("A8a Raw Cyrillic Homograph", "http://p\u0430ypal.com/l\u043eg\u0456n"),
    ("A8b IDN Punycode Homograph", "http://xn--pypal-4ve.com/"),
]
all_adv_caught = True
for name, u in adv_tests:
    r = requests.post(API, json={"url": u}).json()
    caught = r["zone"] in ("red", "yellow") and not r.get("whitelisted", False)
    if not caught:
        all_adv_caught = False
    tag = "CAUGHT" if caught else "BYPASSED!"
    print(f"[{tag:9s}] {r['malicious_score']:.4f}  {r['zone']:6s}  {name:28s} | {r.get('normalized_url')} <- {u}")
print("Tất cả kịch bản tấn công đối kháng (kể cả Cyrillic/Punycode) đều bị chặn:", all_adv_caught)
