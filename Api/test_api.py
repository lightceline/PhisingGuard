import requests

API = "http://127.0.0.1:8000/predict"
tests = [
    "https://www.facebook.com/",
    "http://facebook.com",
    "facebook.com",
    "https://www.google.com/search?q=cats",
    "https://en.wikipedia.org/wiki/Machine_learning",
    "https://github.com/pallets/flask",
    "https://vnexpress.net/",
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
    print(f"{r['malicious_score']:.4f}  {r['zone']:6s}  {r.get('normalized_url', '-')}  <-  {u}")

# Kiểm tra 3 biến thể Facebook phải cho cùng một điểm
fb = [results[u]['malicious_score'] for u in tests[:3] if u in results]
print("\n3 biến thể Facebook cùng điểm:", len(set(fb)) == 1, fb)



import requests
API = "http://127.0.0.1:8000/predict"
pairs = [("http://secure-login-paypal.tk", "http://secure-login-paypal.tk/"),
         ("http://verify-account-update.top", "http://verify-account-update.top/"),
         ("http://free-gift-card-claim.xyz", "http://free-gift-card-claim.xyz/")]
for a, b in pairs:
    sa = requests.post(API, json={"url": a}).json()["malicious_score"]
    sb = requests.post(API, json={"url": b}).json()["malicious_score"]
    print(f"không /: {sa:.4f} | có /: {sb:.4f}   {a}")


import requests
API = "http://127.0.0.1:8000/predict"
pairs = [("http://secure-login-paypal.tk", "http://secure-login-paypal.tk/"),
         ("http://verify-account-update.top", "http://verify-account-update.top/"),
         ("https://www.facebook.com", "https://www.facebook.com/"),
         ("https://www.google.com", "https://www.google.com/")]
for a, b in pairs:
    sa = requests.post(API, json={"url": a}).json()["malicious_score"]
    sb = requests.post(API, json={"url": b}).json()["malicious_score"]
    print(f"không /: {sa:.4f} | có /: {sb:.4f}   {a}")



    