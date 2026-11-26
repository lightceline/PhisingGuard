# Privacy Policy — PhishingGuard Chrome Extension

*Last updated: November 26, 2026 (v0.2.0)*

## 1. Overview
**PhishingGuard** is a browser extension that detects potentially malicious or phishing URLs in real time using a 2-layer machine learning defense architecture with explainable AI (**SHAP**) and an optional bilingual (**EN/VI**) **RAG Security Assistant**.

## 2. Data Collected & How It Is Used
- **Visited Page URL (real-time URL analysis — `POST /predict`):** When you navigate to an `http://` or `https://` web page or open the extension popup, PhishingGuard sends **only the current tab's URL** to our prediction API (`https://phishingguard-ai43.onrender.com/predict`) to evaluate its phishing/malicious risk score, risk zone (`green`/`yellow`/`red`), and top contributing SHAP/guardrail signals.
- **User-Initiated Security Chat (`POST /chat`, optional):** Only when you actively submit a question in the built-in Security Assistant chatbox, PhishingGuard sends your question (up to 500 characters), selected UI language (`vi` or `en`), and the current page's scan summary (`scan_context`) to `https://phishingguard-ai43.onrender.com/chat` to generate a grounded cybersecurity explanation or incident-response guide.
- **Local browser storage (strictly on-device):**
  - Prediction results are cached temporarily in `chrome.storage.session` inside your browser to avoid redundant API calls during your active session and are automatically cleared when the browser/service worker closes.
  - Your UI language preference (`pg_lang`: `vi` or `en`) is stored locally in the extension's `localStorage`.

## 3. Third-Party LLM Processing & URL Sanitization (Chatbox Only)
- By default, PhishingGuard's `/chat` endpoint can operate in **offline Extractive RAG mode** (zero external LLM calls) using its local 40-document security knowledge base.
- When optional LLM synthesis is enabled on the backend (e.g., an OpenAI-compatible provider such as **SiliconFlow / DeepSeek-V3**, or **Google Gemini Flash**), your chat question, the SHAP risk summary, and a **sanitized URL** are forwarded solely to generate the real-time reply.
- **Privacy & Prompt-Injection Safeguard:** Before any external LLM request is made, PhishingGuard's `sanitize_url_for_prompt()` function **strips all URL query strings and fragments** (replacing them with `?<redacted>`) and control characters, so personal tokens, email addresses, or session IDs embedded in URL parameters are never transmitted to third-party LLM providers.
- Please avoid entering passwords, bank card numbers, OTP codes, or other sensitive personal information into the chatbox.

## 4. Data We Do NOT Collect
- We do **NOT** collect personally identifiable information (name, email, passwords, payment details, form inputs, cookies, or page HTML/DOM contents).
- We do **NOT** store or log your browsing history or chat conversations in any server-side database (API processing is stateless, apart from transient in-memory IP sliding-window rate limiting to prevent abuse).
- We do **NOT** sell, rent, or share any data with advertisers or data brokers.

## 5. Chrome Extension Permissions Explained
- `tabs`: Used to read the URL of the active/updated `http`/`https` tab for phishing analysis and to support the "Leave this page" action.
- `storage`: Used strictly for temporary in-session caching (`chrome.storage.session`) of recent URL scan results.
- `scripting` & `<all_urls>`: Used solely to inject the dismissible top warning banner on high-risk (`red`) pages and the isolated floating popup card (`iframe`) when you click the extension icon.
- `host_permissions` (`https://phishingguard-ai43.onrender.com/*`): Used to communicate with the PhishingGuard API (`/predict` and `/chat`).

## 6. Contact
For questions or privacy concerns regarding PhishingGuard, please open an issue at:
https://github.com/lightceline/PhisingGuard
