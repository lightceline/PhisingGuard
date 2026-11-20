# PhishingGuard

Real-time malicious & phishing URL detection system combining a **2-layer defense architecture** with **Explainable AI (SHAP)**, deployed as a FastAPI service (Docker / Render) and a Chrome Extension (Manifest V3).

## Architecture

1. **Layer 1 — Trusted Domain Whitelist (eTLD+1):**
   - Uses **Tranco Top 20,000** (`Api/tranco_top20k.csv`) minus 75 commonly abused hosting/shortener/cloud platforms (`netlify.app`, `github.io`, `vercel.app`, `bit.ly`, `blogspot.*`, `amazonaws.com`, `sites.google.com`, etc.), merged with trusted Vietnamese domains (`19,946` total trusted root domains).
   - Matches strictly by registrable root domain (eTLD+1) to prevent subdomain spoofing (e.g., `secure-login.paypal.com.verify-account.tk` is **not** whitelisted).
2. **Layer 2 — Machine Learning + Real-Time SHAP:**
   - 4-class LightGBM classifier (`benign`, `phishing`, `malware`, `defacement`) trained on `759,323` normalized URLs using **27 SHAP-selected features** (out of 32 lexical, structural, and statistical URL features).
   - Two-threshold risk zoning (`TAU_LOW = 0.58`, `TAU_HIGH = 0.72`) with `96.08%` precision and `1.02%` benign FPR in the high-risk (`red`) zone on the holdout set.
   - Real-time `TreeExplainer` SHAP values translated into human-readable Vietnamese explanations in the Chrome Extension.

## Project Structure

```text
PhishingGuard/
├── src/                    # End-to-end ML notebooks (analysis, feature engineering, EDA, modeling, SHAP explainability)
├── Api/                    # Standalone FastAPI inference service + Dockerfile + deploy_bundle.pkl + tranco_top20k.csv
├── Extension/              # Chrome Extension (Manifest V3, floating rounded card UI + SHAP explanations)
├── docker-compose.yml      # Local / VPS one-command Docker deployment
├── PRIVACY.md              # Privacy Policy for Chrome Web Store
└── PhishingGuard-Extension-v0.1.0.zip
```

## Live Deployment

- **Cloud API (Render):** `https://phishingguard-ai43.onrender.com` (`GET /health`, `POST /predict`)
- **Docker Hub Image:** `docker.io/lightcelline/phishingguard-api:latest`

## Quick Start

### 1. Run API with Docker
```bash
docker compose up --build -d
# Verify: http://127.0.0.1:8000/health
```

Or pull directly from Docker Hub:
```bash
docker run -d -p 8000:7860 --name phishingguard-api lightcelline/phishingguard-api:latest
```

### 2. Install Chrome Extension
1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `Extension/` folder (or upload `PhishingGuard-Extension-v0.1.0.zip` to the Chrome Web Store).
3. Click the **PhishingGuard** icon on any `http://` or `https://` page to inspect the risk score and SHAP explanations.

## Privacy Policy
See [PRIVACY.md](./PRIVACY.md).
