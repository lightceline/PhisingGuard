// PhishingGuard - service worker: gọi API, đặt badge, chèn banner cảnh báo.
// Không gán cứng ngưỡng: vùng xanh/vàng/đỏ do API quyết định (trường "zone").

const API = "http://127.0.0.1:8000/predict";
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

// Popup hỏi kết quả qua message để dùng chung cache.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "check") {
    checkUrl(msg.url)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // phản hồi bất đồng bộ
  }
});
