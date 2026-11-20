// PhishingGuard - service worker: gọi API, đặt badge, chèn banner cảnh báo.
// Không gán cứng ngưỡng: vùng xanh/vàng/đỏ do API quyết định (trường "zone").

const API = "https://phishingguard-ai43.onrender.com/predict";
const COLORS = { red: "#d93025", yellow: "#f9ab00", green: "#188038" };
const BADGE_TEXT = { red: "!", yellow: "?", green: "OK" };

chrome.storage.session.clear(); // cache chỉ sống trong phiên service worker

function isCheckable(url) {
  return /^https?:\/\//i.test(url || "");
}

async function checkUrl(url) {
  const key = "u:" + url;
  const cached = (await chrome.storage.session.get(key))[key];
  if (cached) return cached;

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  if (!res.ok) throw new Error("API trả về mã " + res.status);
  const data = await res.json();
  await chrome.storage.session.set({ [key]: data });
  return data;
}

function setBadge(tabId, zone) {
  chrome.action.setBadgeText({ tabId, text: BADGE_TEXT[zone] || "" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: COLORS[zone] || "#5f6368" });
}

// Hàm này được chèn vào trang, phải tự chứa (không dùng biến bên ngoài).
function showBanner(score) {
  if (document.getElementById("phishingguard-banner")) return;
  const d = document.createElement("div");
  d.id = "phishingguard-banner";
  d.textContent =
    "⚠ PhishingGuard: trang này có dấu hiệu nguy hiểm (độ tin cậy " + score +
    "%). Hãy cẩn thận trước khi nhập thông tin. (Bấm để ẩn)";
  d.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#d93025;" +
    "color:#fff;padding:10px 16px;font:14px/1.4 system-ui,sans-serif;" +
    "text-align:center;cursor:pointer;";
  d.onclick = () => d.remove();
  document.documentElement.appendChild(d);
}

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== "complete" || !isCheckable(tab.url)) return;
  try {
    const data = await checkUrl(tab.url);
    setBadge(tabId, data.zone);
    if (data.zone === "red") {
      chrome.scripting
        .executeScript({ target: { tabId }, func: showBanner, args: [data.reliability_score] })
        .catch(() => {}); // một số trang (chrome web store...) không cho chèn
    }
  } catch (e) {
    chrome.action.setBadgeText({ tabId, text: "×" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#5f6368" });
  }
});

// Mở/đóng hộp thoại nổi bo tròn 100% ở góc trên-phải (thay cho default_popup góc vuông của Chrome).
// Hàm tự chứa để chèn qua chrome.scripting.executeScript.
function toggleFloatingPopup(iframeUrl) {
  const WRAP_ID = "phishingguard-floating-wrap";
  const existing = document.getElementById(WRAP_ID);
  if (existing) {
    if (typeof existing._pgCleanup === "function") existing._pgCleanup();
    existing.remove();
    return;
  }

  const wrap = document.createElement("div");
  wrap.id = WRAP_ID;
  wrap.style.cssText =
    "position:fixed;top:10px;right:14px;width:374px;max-width:calc(100vw - 24px);" +
    "max-height:calc(100vh - 24px);border-radius:14px;overflow:hidden;" +
    "box-shadow:0 12px 38px rgba(0,0,0,0.58),0 0 0 1px rgba(255,255,255,0.12);" +
    "z-index:2147483647;background:#1f2023;opacity:0;transform:translateY(-6px);" +
    "transition:opacity .14s ease,transform .14s ease;";

  const iframe = document.createElement("iframe");
  iframe.src = iframeUrl;
  iframe.style.cssText =
    "width:100%;height:300px;max-height:calc(100vh - 24px);border:0;display:block;background:#1f2023;";
  wrap.appendChild(iframe);
  document.documentElement.appendChild(wrap);

  requestAnimationFrame(() => {
    wrap.style.opacity = "1";
    wrap.style.transform = "translateY(0)";
  });

  const close = () => {
    cleanup();
    wrap.remove();
  };

  const onOutsideClick = (e) => {
    if (!wrap.contains(e.target)) close();
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") close();
  };
  const onMessage = (e) => {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type === "pg-close") {
      close();
    } else if (e.data.type === "pg-resize" && typeof e.data.height === "number") {
      const maxH = Math.max(200, window.innerHeight - 24);
      iframe.style.height = Math.min(Math.ceil(e.data.height), maxH) + "px";
    }
  };

  const cleanup = () => {
    document.removeEventListener("mousedown", onOutsideClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("message", onMessage);
  };
  wrap._pgCleanup = cleanup;

  setTimeout(() => {
    document.addEventListener("mousedown", onOutsideClick, true);
  }, 50);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("message", onMessage);
}

chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id || !isCheckable(tab.url)) return;
  const iframeUrl = chrome.runtime.getURL("popup.html");
  chrome.scripting
    .executeScript({ target: { tabId: tab.id }, func: toggleFloatingPopup, args: [iframeUrl] })
    .catch(() => {});
});

// Popup hỏi kết quả qua message để dùng chung cache.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "check") {
    checkUrl(msg.url)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // phản hồi bất đồng bộ
  }
  if (msg && msg.type === "leave") {
    const tid = msg.tabId ?? (sender.tab && sender.tab.id);
    if (tid != null) {
      chrome.tabs.goBack(tid).catch(() => chrome.tabs.update(tid, { url: "chrome://newtab" }));
    }
    sendResponse({ ok: true });
  }
});
