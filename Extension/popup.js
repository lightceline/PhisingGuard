// Popup PhishingGuard. Thử giao diện không cần extension/API: mở popup.html?demo=red | yellow | green

const ICON_SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/></svg>';
const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M12 3.5L2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.2v.1"/></svg>';
const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// Mô tả điều mô hình ĐÃ ĐO (không khẳng định nguyên nhân). Hướng tác động hiển thị bằng biểu tượng.
const n = (v) => (Number.isInteger(Number(v)) ? String(Number(v)) : Number(v).toFixed(2));
const FEATURE_TEXT = {
  num_slashes:          (v) => `Link có ${n(v)} dấu gạch chéo "/"`,
  path_depth:           (v) => `Đường dẫn có ${n(v)} cấp thư mục`,
  num_query_params:     (v) => `Link có ${n(v)} tham số sau dấu "?"`,
  domain_hyphens:       (v) => `Tên miền có ${n(v)} dấu gạch nối "-"`,
  path_hyphens:         (v) => `Đường dẫn có ${n(v)} dấu gạch nối "-"`,
  num_hyphens:          (v) => `Link có ${n(v)} dấu gạch nối "-"`,
  url_entropy:          (v) => `Độ ngẫu nhiên của các ký tự trong link: ${n(v)}`,
  path_length:          (v) => `Đường dẫn dài ${n(v)} ký tự`,
  digit_ratio:          (v) => `Tỉ lệ chữ số trong link: ${n(v)}`,
  url_length:           (v) => `Link dài ${n(v)} ký tự`,
  num_dots:             (v) => `Link có ${n(v)} dấu chấm`,
  num_digits:           (v) => `Link có ${n(v)} chữ số`,
  special_char_ratio:   (v) => `Tỉ lệ ký tự đặc biệt trong link: ${n(v)}`,
  avg_token_length:     (v) => `Độ dài trung bình của các đoạn chữ: ${n(v)}`,
  num_subdomains:       (v) => `Tên miền có ${n(v)} tên miền phụ`,
  consonant_ratio:      (v) => `Tỉ lệ phụ âm trong link: ${n(v)}`,
  num_underscores:      (v) => `Link có ${n(v)} dấu gạch dưới "_"`,
  vowel_ratio:          (v) => `Tỉ lệ nguyên âm trong link: ${n(v)}`,
  num_ampersands:       (v) => `Link có ${n(v)} ký tự "&"`,
  has_ip_address:       (v) => (Number(v) ? "Link dùng địa chỉ IP thay cho tên miền" : "Link dùng tên miền, không dùng địa chỉ IP"),
  domain_entropy:       (v) => `Độ ngẫu nhiên của các ký tự trong tên miền: ${n(v)}`,
  num_question_marks:   (v) => `Link có ${n(v)} dấu "?"`,
  longest_token_length: (v) => `Đoạn chữ dài nhất trong link có ${n(v)} ký tự`,
  letter_ratio:         (v) => `Tỉ lệ chữ cái trong link: ${n(v)}`,
  num_equals:           (v) => `Link có ${n(v)} dấu "="`,
  domain_length:        (v) => `Tên miền dài ${n(v)} ký tự`,
  num_percent:          (v) => `Link có ${n(v)} ký tự mã hóa "%"`,
  is_suspicious_tld:    (v) => (Number(v) ? "Tên miền dùng đuôi (TLD) có nguy cơ cao (.tk, .xyz, .top...)" : "Đuôi tên miền thông dụng"),
  has_suspicious_word:  (v) => (Number(v) ? "Link chứa từ khóa nhạy cảm (login, verify, account...)" : "Link không chứa từ khóa nhạy cảm"),
  trusted_domain:       (v) => `Tên miền ${v} nằm trong danh sách trang web uy tín`
};

const TITLE = { red: "Nguy cơ cao", yellow: "Đáng ngờ", green: "Có vẻ an toàn" };
const SUB = {
  yellow: "Link này có một vài dấu hiệu đáng ngờ. Hãy cẩn thận.",
  green: "Chưa thấy dấu hiệu đáng ngờ trong link này."
};
const SUB_RED = {
  phishing: "Link này có nhiều dấu hiệu của trang lừa đảo.",
  malware: "Link này có nhiều dấu hiệu của trang chứa phần mềm độc hại.",
  defacement: "Link này có nhiều dấu hiệu của trang bị can thiệp."
};
const CLASS_NAME = { benign: "lành tính", phishing: "lừa đảo (phishing)", malware: "phần mềm độc hại (malware)", defacement: "trang bị can thiệp (defacement)" };

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

function describe(r) {
  const f = FEATURE_TEXT[r.feature];
  return f ? f(r.value) : `${r.feature}: ${n(r.value)}`;
}

function pickReasons(data) {
  const all = (data.reasons || []).map((r) => ({ ...r, direction: r.direction || "risk" }));
  const risk = all.filter((r) => r.direction === "risk");
  const safe = all.filter((r) => r.direction === "safe");
  if (data.zone === "green") return [...safe.slice(0, 2), ...risk.slice(0, 1)].slice(0, 3);
  return [...risk.slice(0, 2), ...safe.slice(0, 1)];
}

function render(url, data, tabId) {
  const zone = data.zone;
  $("url").textContent = url;
  $("url").title = url;

  const v = $("verdict");
  v.className = "verdict " + zone;
  $("rel").textContent = "Độ tin cậy " + Math.round(data.reliability_score) + "%";
  $("vtitle").textContent = TITLE[zone] || "Không xác định";
  $("vsub").textContent = zone === "red"
    ? (SUB_RED[data.predicted_class] || "Link này có nhiều dấu hiệu bất thường, giống các trang độc hại.")
    : (SUB[zone] || "");

  const ul = $("reasons");
  ul.innerHTML = "";
  pickReasons(data).forEach((r) => {
    const li = el("li", r.direction === "safe" ? "safe" : "risk");
    const ic = el("span", "ic"); ic.innerHTML = r.direction === "safe" ? ICON_OK : ICON_WARN;
    const box = el("div");
    box.appendChild(el("div", "txt", describe(r)));
    box.appendChild(el("div", "sub", r.direction === "safe" ? "Đặc điểm này làm giảm nguy cơ" : "Đặc điểm này làm tăng nguy cơ"));
    li.appendChild(ic); li.appendChild(box); ul.appendChild(li);
  });

  // Chi tiết kỹ thuật (bật/tắt)
  const d = $("details");
  d.innerHTML = "";
  const addLine = (k, val) => { const p = el("div"); const b = el("b", "", k + ": "); p.appendChild(b); p.appendChild(document.createTextNode(val)); d.appendChild(p); };
  if (data.whitelisted) {
    addLine("Nguồn đánh giá", "Danh sách tên miền uy tín (Layer 1 Whitelist)");
  } else {
    addLine("Điểm rủi ro của mô hình", String(data.malicious_score));
  }
  if (data.normalized_url) addLine("Link sau chuẩn hóa", data.normalized_url);
  if (data.predicted_class) addLine("Nhóm gần nhất", CLASS_NAME[data.predicted_class] || data.predicted_class);
  const rs = data.reasons || [];
  if (rs.length && !data.whitelisted) {
    d.appendChild(el("div", "", "Mức tác động của từng đặc điểm (SHAP, + tăng nguy cơ, - giảm):"));
    const t = el("table");
    rs.forEach((r) => {
      const tr = el("tr");
      tr.appendChild(el("td", "", r.feature));
      const sign = (r.direction === "safe" ? -1 : 1) * Math.abs(r.impact);
      tr.appendChild(el("td", "", (sign > 0 ? "+" : "") + sign.toFixed(3)));
      t.appendChild(tr);
    });
    d.appendChild(t);
  }

  const bd = $("btn-detail");
  bd.hidden = false;
  bd.textContent = "Xem chi tiết";
  bd.onclick = () => { d.hidden = !d.hidden; bd.textContent = d.hidden ? "Xem chi tiết" : "Ẩn chi tiết"; };

  const bl = $("btn-leave");
  bl.hidden = zone !== "red";
  bl.onclick = async () => {
    if (typeof chrome === "undefined" || !chrome.tabs || tabId == null) return;
    try { await chrome.tabs.goBack(tabId); } catch (e) { await chrome.tabs.update(tabId, { url: "chrome://newtab" }); }
    window.close();
  };
}

function showError(msg, url) {
  if (url) { $("url").textContent = url; $("url").title = url; }
  $("verdict").className = "verdict";
  $("rel").textContent = "";
  $("vtitle").textContent = "Không kiểm tra được";
  $("vsub").textContent = msg;
}

const DEMO = {
  red: { url: "paypa1-secure.login.verify-acc.com/signin?id=1", zone: "red", malicious_score: 0.9312, reliability_score: 6.9,
         predicted_class: "phishing", normalized_url: "http://paypa1-secure.login.verify-acc.com/signin?id=1",
         reasons: [
           { feature: "num_subdomains", value: 4, impact: 1.2, direction: "risk" },
           { feature: "domain_entropy", value: 3.91, impact: 0.8, direction: "risk" },
           { feature: "url_length", value: 28, impact: 0.3, direction: "safe" }] },
  yellow: { url: "https://example.com/a/b/c/d/e?x=1&y=2", zone: "yellow", malicious_score: 0.62, reliability_score: 38,
            predicted_class: "phishing", normalized_url: "http://example.com/a/b/c/d/e?x=1&y=2",
            reasons: [
              { feature: "path_depth", value: 5, impact: 0.7, direction: "risk" },
              { feature: "num_query_params", value: 2, impact: 0.4, direction: "risk" },
              { feature: "domain_length", value: 11, impact: 0.5, direction: "safe" }] },
  green: { url: "wikipedia.org/wiki/Hanoi", zone: "green", malicious_score: 0.03, reliability_score: 97,
           predicted_class: null, normalized_url: "http://wikipedia.org/wiki/Hanoi",
           reasons: [
             { feature: "num_subdomains", value: 0, impact: 0.6, direction: "safe" },
             { feature: "path_depth", value: 2, impact: 0.4, direction: "safe" }] }
};

async function main() {
  $("logo").innerHTML = ICON_SHIELD;
  const demo = new URLSearchParams(location.search).get("demo");
  if (demo && DEMO[demo]) { render(DEMO[demo].url, DEMO[demo], null); return; }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url;
  if (!/^https?:\/\//i.test(url || "")) { showError("Chỉ kiểm tra được các trang http/https.", url); return; }
  $("url").textContent = url;
  chrome.runtime.sendMessage({ type: "check", url }, (resp) => {
    if (chrome.runtime.lastError || !resp || !resp.ok) {
      showError("Không kết nối được API. Hãy bật server (uvicorn) tại 127.0.0.1:8000.", url);
      return;
    }
    render(url, resp.data, tab.id);
  });
}
main();