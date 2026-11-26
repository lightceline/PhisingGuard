# PhishingGuard

Real-time malicious & phishing URL detection system combining a **2-layer defense architecture**, **Explainable AI (SHAP)**, **2-Stage Adversarial Defense**, and a **Lightweight Hybrid TF-IDF RAG Security Assistant**, deployed as a hardened FastAPI service (Docker / Render / GitHub Actions CI/CD) and a bilingual **EN/VI Chrome Extension (Manifest V3, v0.2.0)**.

---

## Architecture

1. **Layer 1 — Trusted Domain Whitelist (`eTLD+1`) & Input Canonicalization Guardrails:**
   - Uses **Tranco Top 20,000** (`Api/tranco_top20k.csv`) minus 75+ commonly abused hosting/shortener/cloud platforms (`netlify.app`, `github.io`, `vercel.app`, `bit.ly`, `blogspot.*`, `amazonaws.com`, `sites.google.com`, etc.), merged with 37 trusted Vietnamese domains (`19,946` total trusted root domains).
   - Matches strictly by registrable root domain (`eTLD+1`) via `.hostname` to prevent subdomain spoofing (e.g., `secure-login.paypal.com.verify-account.tk` is **not** whitelisted).
   - Blocks whitelist bypasses via **Open Redirect unwrapping** (`?q=`, `?url=`, `?u=`), **`userinfo@` authority spoofing prevention** (`http://facebook.com:80@evil.tk`), and **Cyrillic / IDN Punycode (`xn--`) homograph detection**.

2. **Layer 2 — Adversarially Hardened Machine Learning + Real-Time SHAP:**
   - **4-class LightGBM classifier** (`benign`, `phishing`, `malware`, `defacement`) using **27 SHAP-selected features** (out of 32 lexical, structural, and statistical URL features, enhanced with multi-pass `%xx` decoding and Leetspeak/Cyrillic homoglyph de-obfuscation).
   - **2-Stage Adversarial Defense:** Combines URI canonicalization & hard guardrails (Stage 1, emitting explicit `adversarial_userinfo` and `idn_homograph` reasons) with **Problem-Space Adversarial Retraining** on `544,373` URLs (`484,379` clean training URLs + `59,994` adversarial phishing variants covering SEO slug stuffing and query/vowel dilution).
   - Two-threshold risk zoning (`TAU_LOW = 0.58`, `TAU_HIGH = 0.72`) reducing average Attack Success Rate (**ASR**) across 7 adversarial attack families (`7,000` test variants) from **79.7% down to 2.9%** while maintaining `~1%` benign FPR.
   - Real-time `TreeExplainer` SHAP values translated into human-readable **Vietnamese & English** explanations in the Chrome Extension.
   - **API Hardening:** Sliding-window IP rate limiting (`120 req/60s`, HTTP `429`), Pydantic input bounds (`URL <= 2,048` chars, `message <= 500` chars, HTTP `422`), and configurable `CORS_ALLOW_ORIGINS`.

3. **RAG Security Assistant (`POST /chat`):**
   - **40 curated security & incident-response documents:** `23` bilingual core docs (`Api/knowledge_base.json`) + `17` auto-loaded sections across `6` Markdown packs (`Api/kb_docs/`: modern phishing, VN phishing patterns, browser safety, social/crypto scams, GDPR/LSEPi, technical FAQ).
   - **Lightweight Hybrid TF-IDF Retrieval** (`0.55 word + 0.45 char_wb` n-grams + exact keyword boosting): `< 2 ms` latency and `< 5 MB` RAM (Render Free 512 MB compatible), grounded in the live `scan_context` (SHAP/guardrail signals).
   - **3-Tier Response Synthesis with Prompt-Injection Protection:** Strips query strings (`?<redacted>`) before any LLM call, enforces strict `EN`/`VI` output language, and routes through **SiliconFlow / OpenAI-compatible** (`DeepSeek-V3`) $\rightarrow$ **Google Gemini Flash** $\rightarrow$ **0%-hallucination Extractive RAG** & Off-Topic Guardrail.

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

## Benchmarks

### 1. Adversarial Robustness (`N = 1,000` Holdout Phishing URLs $\times$ 7 Attacks)

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

### 2. End-to-End API Latency (`600` in-process requests, `Api/benchmark_latency.py`)

| Workload | N | Mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Throughput (req/s) |
|---|---:|---:|---:|---:|---:|---:|
| Layer 1 — Trusted Whitelist (`eTLD+1`) | 200 | 4.39 | **4.27** | 5.66 | 8.15 | **226.7** |
| Layer 2 — ML Only (Non-Tranco Benign) | 200 | 13.36 | **12.30** | 17.02 | 19.54 | 74.7 |
| Layer 2 — ML + Real-Time TreeSHAP (Malicious/Adversarial) | 200 | 17.28 | **17.05** | 20.27 | 21.08 | 57.7 |
| **Overall Mixed Workload** | **600** | **11.67** | **12.30** | **19.15** | **20.73** | **85.7** |

---

## CI/CD Pipeline (`.github/workflows/ci.yml`)

Every `push` / `pull_request` to `main`/`master` triggers an automated 3-job GitHub Actions workflow:
1. **`api-tests`:** Checks out the repo with Git LFS, installs `libgomp1` & dependencies, and runs `pytest -v Api/tests/test_phishing_api.py` (Layer 1/2, A1–A8 adversarial evasion, guardrails, rate limiting, input validation, and RAG `/chat` tests).
2. **`build-extension-artifact`:** Automatically packages `Extension/` into `PhishingGuard-Extension-v<version>.zip` and uploads it as a build artifact.
3. **`deploy-api`:** Builds and pushes the Docker image (`:latest` and `:<sha>`) to Docker Hub via Buildx, then triggers the Render Deploy Hook for zero-touch cloud redeployment.

---

## Project Structure

```text
PhishingGuard/
├── .github/workflows/
│   └── ci.yml                          # GitHub Actions CI/CD (pytest -> Extension ZIP -> Docker Hub -> Render)
├── src/                                # 6 end-to-end Jupyter notebooks (analysis -> adversarial evaluation)
│   ├── analysis.ipynb
│   ├── feature_engineering.ipynb
│   ├── eda_features.ipynb
│   ├── modeling.ipynb
│   ├── explainability.ipynb
│   └── adversarial_evaluation.ipynb
├── Api/                                # Standalone FastAPI inference & RAG service + Docker setup
│   ├── phishing_api.py                 # Rate limiter + Layer 1 + Layer 2 (LightGBM + TreeSHAP) + /chat
│   ├── features.py                     # URL canonicalization, IDN/Cyrillic/Leetspeak decoding & 32 features
│   ├── rag_assistant.py                # Lightweight Hybrid TF-IDF RAG + Multi-Provider LLM + Extractive Fallback
│   ├── knowledge_base.json             # 23 bilingual (VI/EN) security & incident-response KB docs
│   ├── kb_docs/                        # 6 auto-loaded Markdown KB packs (17 sections -> 40 total KB docs)
│   ├── deploy_bundle.pkl               # Hardened LightGBM model + 27 selected features + thresholds
│   ├── tranco_top20k.csv               # Tranco Top 20,000 domains
│   ├── tests/test_phishing_api.py      # Automated pytest suite (API, Adversarial A1-A8, Hardening & RAG)
│   ├── benchmark_latency.py            # End-to-end API latency benchmark (p50/p95/p99)
│   ├── test_api.py                     # Live HTTP verification script
│   ├── Dockerfile
│   ├── requirements.txt
│   └── requirements-dev.txt
├── Extension/                          # Chrome Extension (Manifest V3, v0.2.0, EN/VI UI + SHAP + RAG Chatbox)
├── Models/                             # Trained classifiers, comparison CSVs, and final_features.json
├── Reports/                            # Latency benchmark report & EDA/Confusion Matrix/SHAP/Adversarial figures
├── .env.example                        # Environment variables template (copy to .env for local LLM testing)
├── docker-compose.yml                  # Local / VPS one-command Docker deployment (with optional .env)
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
# (Optional) Configure local LLM keys for RAG /chat (falls back to Extractive RAG if omitted):
cp .env.example .env

docker compose up --build -d

# Run automated pytest suite (API, Adversarial A1-A8, Hardening & RAG):
pytest -v Api/tests/test_phishing_api.py

# Or run live HTTP check / latency benchmark:
python Api/test_api.py
python Api/benchmark_latency.py
```

Or pull directly from Docker Hub:
```bash
docker run -d -p 8000:7860 --name phishingguard-api lightcelline/phishingguard-api:latest
```

### 2. Install Chrome Extension (`v0.2.0`)
1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `Extension/` folder (or upload `PhishingGuard-Extension-v0.2.0.zip` to the Chrome Web Store).
3. Click the **PhishingGuard** icon on any `http://` or `https://` page to inspect the risk score, switch between **EN / VI**, review SHAP explanations, or ask the built-in **RAG Security Assistant**.

---

## Privacy Policy
See [PRIVACY.md](./PRIVACY.md).
