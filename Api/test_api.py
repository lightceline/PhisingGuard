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

