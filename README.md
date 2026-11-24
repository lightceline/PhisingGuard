# PhishingGuard

Real-time malicious & phishing URL detection system combining a **2-layer defense architecture**, **Explainable AI (SHAP)**, and **2-Stage Adversarial Defense**, deployed as a FastAPI service (Docker / Render) and a Chrome Extension (Manifest V3).

---

## Architecture

1. **Layer 1 — Trusted Domain Whitelist (`eTLD+1`) & Input Canonicalization Guardrails:**
   - Uses **Tranco Top 20,000** (`Api/tranco_top20k.csv`) minus 75 commonly abused hosting/shortener/cloud platforms (`netlify.app`, `github.io`, `vercel.app`, `bit.ly`, `blogspot.*`, `amazonaws.com`, `sites.google.com`, etc.), merged with trusted Vietnamese domains (`19,946` total trusted root domains).
   - Matches strictly by registrable root domain (`eTLD+1`) via `.hostname` to prevent subdomain spoofing (e.g., `secure-login.paypal.com.verify-account.tk` is **not** whitelisted).
   - Blocks whitelist bypasses via **Open Redirect unwrapping** (`?q=`, `?url=`, `?u=`), **`userinfo@` authority spoofing prevention** (`http://facebook.com:80@evil.tk`), and **Cyrillic / IDN Punycode (`xn--`) homograph detection**.

2. **Layer 2 — Adversarially Hardened Machine Learning + Real-Time SHAP:**
   - **4-class LightGBM classifier** (`benign`, `phishing`, `malware`, `defacement`) using **27 SHAP-selected features** (out of 32 lexical, structural, and statistical URL features, enhanced with multi-pass `%xx` decoding and Leetspeak/Cyrillic homoglyph de-obfuscation).
   - **2-Stage Adversarial Defense:** Combines URI canonicalization & hard guardrails (Stage 1) with **Problem-Space Adversarial Retraining** on `544,373` URLs (`484,379` clean training URLs + `59,994` adversarial phishing variants covering SEO slug stuffing and query/vowel dilution).
   - Two-threshold risk zoning (`TAU_LOW = 0.58`, `TAU_HIGH = 0.72`) reducing average Attack Success Rate (**ASR**) across 7 adversarial attack families (`7,000` test variants) from **79.7% down to 2.9%** while maintaining `~1%` benign FPR.
   - Real-time `TreeExplainer` SHAP values translated into human-readable Vietnamese explanations in the Chrome Extension.

---

## End-to-End Notebook Pipeline (`src/`)

| # | Notebook | Description & Key Outputs |
|---|---|---|
| 1 | `src/analysis.ipynb` | Raw data EDA (`dataset1.csv` + `dataset2.csv`), scheme/`www.`/trailing-slash canonicalization (`normalize_url`), deduplication, and 4-class merging $\rightarrow$ `Data/Processed/merged_dataset.csv` (`756,843` URLs). |
| 2 | `src/feature_engineering.ipynb` | Stratified 80/20 Holdout split (`Data/Holdout/merged_holdout.csv`, `151,369` URLs) and extraction of **32 URL features** (20 Lexical, 7 Structural, 5 Statistical) $\rightarrow$ `Data/Features/merged_features.csv` (`605,474` URLs). |
| 3 | `src/eda_features.ipynb` | Feature-level EDA across the 4 classes: per-class means, boxplots by feature group, Pearson correlation heatmap, high-correlation scatterplots, and Mutual Information ranking (`Reports/Images/`). |
| 4 | `src/modeling.ipynb` | Stratified 80/20 Train/Val split (`484,379` train / `121,095` val), benchmarking **16 ML classifiers** (`Models/merged/*.pkl`, `Models/model_comparison.csv`), and multi-model Hard Case error analysis (`Models/hard_cases_merged.csv`). |
| 5 | `src/explainability.ipynb` | Global & Local SHAP analysis across 10 models (`TreeExplainer`, `LinearExplainer`, `KernelExplainer`), consensus feature selection (`k = 27` $\rightarrow$ `Models/final_features.json`), and two-threshold optimization (`TAU_LOW = 0.58`, `TAU_HIGH = 0.72`). |
| 6 | `src/adversarial_evaluation.ipynb` | Problem-space adversarial evaluation across **7 attack scenarios (A1–A7)**, 2-stage adversarial defense (input canonicalization + adversarial retraining on `544,373` samples), and export of the hardened bundle $\rightarrow$ `Api/deploy_bundle.pkl`. |

---

## Adversarial Robustness Benchmark (`N = 1,000` Holdout Phishing URLs $\times$ 7 Attacks)

| Attack Scenario (`1,000` variants each) | Baseline (v0.1) ASR % ($\downarrow$) | Stage 1 Defense ASR % ($\downarrow$) | Stage 2 Defense ASR % ($\downarrow$) |
|---|---|---|---|
| **A1:** `userinfo@` + `:port` Spoofing (`facebook.com:80@...`) | `100.0%` | `0.7%` | **`0.1%`** |
| **A2:** Trusted Open Redirect (`google.com/url?q=...`) | `100.0%` | `2.3%` | **`7.9%`** |
| **A3:** Benign SEO Slug Stuffing (`+path_hyphens`) | `93.1%` | `92.9%` | **`0.3%`** |
| **A4:** Query & Vowel Dilution (`?page=home`) | `49.2%` | `49.4%` | **`5.6%`** |
| **A5:** URL Percent-Encoding (`%xx` path) | `44.6%` | `1.0%` | **`6.3%`** |
| **A6:** Combined Slug + Query Camouflage | `93.1%` | `93.1%` | **`0.0%`** |
| **A7:** Cyrillic & IDN Punycode Homograph (`xn--`) | `78.1%` | `0.0%` | **`0.0%`** |
| **Average across all 7,000 adversarial variants** | **`79.7%`** | **`34.2%`** | **`2.9%`** |

---

## Project Structure

```text
PhishingGuard/
├── src/                                # 6 end-to-end Jupyter notebooks (analysis -> adversarial evaluation)
│   ├── analysis.ipynb
│   ├── feature_engineering.ipynb
│   ├── eda_features.ipynb
│   ├── modeling.ipynb
│   ├── explainability.ipynb
│   └── adversarial_evaluation.ipynb
├── Api/                                # Standalone FastAPI inference service + Docker setup
│   ├── phishing_api.py                 # Layer 1 (Whitelist & Guardrails) + Layer 2 (LightGBM + TreeSHAP) + /chat
│   ├── features.py                     # URL canonicalization, IDN/Cyrillic/Leetspeak decoding & 32 features
│   ├── rag_assistant.py                # Lightweight TF-IDF RAG + Optional LLM Fallback Security Assistant
│   ├── knowledge_base.json             # Bilingual (VI/EN) security & incident-response KB (NCSC/OWASP/NIST)
│   ├── deploy_bundle.pkl               # Hardened LightGBM model + 27 selected features + thresholds
│   ├── tranco_top20k.csv               # Tranco Top 20,000 domains
│   ├── tests/test_phishing_api.py      # Automated pytest & adversarial test suite (41 tests)
│   ├── benchmark_latency.py            # End-to-end API latency benchmark (p50/p95/p99)
│   ├── Dockerfile
│   └── requirements.txt
├── Extension/                          # Chrome Extension (Manifest V3, VI/EN bilingual UI + SHAP + RAG Chatbox)
├── Models/                             # Trained classifiers, comparison CSVs, and final_features.json
├── Reports/Images/                     # EDA, Confusion Matrix, SHAP, and Adversarial evaluation figures
├── docker-compose.yml                  # Local / VPS one-command Docker deployment
├── PRIVACY.md                          # Privacy Policy for Chrome Web Store
└── PhishingGuard-Extension-v0.2.0.zip
```

---

## Live Deployment

- **Cloud API (Render):** `https://phishingguard-ai43.onrender.com` (`GET /health`, `POST /predict`, `POST /chat`)
- **Docker Hub Image:** `docker.io/lightcelline/phishingguard-api:latest`

---

## Quick Start

### 1. Run API with Docker
```bash
docker compose up --build -d
# Verify health & run full test suite (including A1-A8 adversarial tests):
python Api/test_api.py
```

Or pull directly from Docker Hub:
```bash
docker run -d -p 8000:7860 --name phishingguard-api lightcelline/phishingguard-api:latest
```

### 2. Install Chrome Extension
1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `Extension/` folder (or upload `PhishingGuard-Extension-v0.2.0.zip` to the Chrome Web Store).
3. Click the **PhishingGuard** icon on any `http://` or `https://` page to inspect the risk score and SHAP explanations.

---

## Privacy Policy
See [PRIVACY.md](./PRIVACY.md).
