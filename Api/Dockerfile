# Universal Dockerfile cho PhishingGuard API
# Dùng chung cho: Hugging Face Spaces (port 7860), Render/Railway ($PORT), VPS và Docker Local.
FROM python:3.11-slim

# libgomp1 bắt buộc cho LightGBM trên Linux slim
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Tạo user non-root (UID 1000 — tương thích chuẩn Hugging Face Spaces & bảo mật container)
RUN useradd -m -u 1000 user
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user:user phishing_api.py features.py rag_assistant.py knowledge_base.json deploy_bundle.pkl tranco_top20k.csv ./
COPY --chown=user:user kb_docs ./kb_docs

USER user
ENV PORT=7860
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"7860\")}/health')" || exit 1

CMD ["sh", "-c", "uvicorn phishing_api:app --host 0.0.0.0 --port ${PORT:-7860}"]
