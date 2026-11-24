# Privacy Policy — PhishingGuard Chrome Extension

*Last updated: November 20, 2026*

## 1. Overview
**PhishingGuard** is a browser extension that detects potentially malicious or phishing URLs in real time using a machine learning model with explainable AI (SHAP) feedback.

## 2. Data Collected & How It Is Used
- **Visited Page URL (solely for real-time analysis):** When you navigate to an `http://` or `https://` web page or open the extension popup, PhishingGuard sends **only the current tab's URL** to our prediction API (`https://phishingguard-ai43.onrender.com/predict`) to evaluate its phishing/malicious risk score and top contributing URL features.
- **Optional Security Assistant (`POST /chat`):** Only when you explicitly open the in-popup Assistant and send a question, your message and the current scan summary (risk zone and SHAP signals) are sent to our stateless RAG endpoint (`https://phishingguard-ai43.onrender.com/chat`). By default, answers are generated locally on our server from a curated security knowledge base (Extractive TF-IDF RAG) without calling third-party AI APIs. If optional LLM synthesis is enabled on a self-hosted server, URL query strings are stripped beforehand to protect sensitive tokens/emails and mitigate prompt injection. Chat messages are **never** stored in any database.
- **Session-only local cache:** Prediction results are cached temporarily in `chrome.storage.session` inside your browser to avoid repeated API calls during your active session. This cache is automatically cleared when the browser/service worker closes.

## 3. Data We Do NOT Collect
- We do **NOT** collect personally identifiable information (name, email, passwords, payment details, form inputs, or page contents).
- We do **NOT** store or log your browsing history in any database.
- We do **NOT** sell, rent, or share any data with third parties or advertisers.

## 4. Chrome Extension Permissions Explained
- `tabs`: Used to read the URL of the active/updated `http`/`https` tab for phishing analysis and to support the "Leave this page" button.
- `storage`: Used strictly for temporary in-session caching (`chrome.storage.session`) of recent URL scores.
- `scripting` & `<all_urls>`: Used solely to inject a dismissible top warning banner when a visited page is classified as high-risk (`red`).
- `host_permissions` (`https://phishingguard-ai43.onrender.com/*`): Used to send the URL to the PhishingGuard API and receive the risk score and SHAP explanation.

## 5. Contact
For questions or privacy concerns regarding PhishingGuard, please open an issue at:
https://github.com/lightceline/PhisingGuard
