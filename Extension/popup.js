// Popup PhishingGuard. Thử giao diện không cần extension/API: mở popup.html?demo=red | yellow | green

const ICON_SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/></svg>';
const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M12 3.5L2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.2v.1"/></svg>';
const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// Diễn giải tự nhiên cho người dùng cuối (ngắn gọn ở trên + giải thích chi tiết ở khung Xem chi tiết).
const n = (v) => (Number.isInteger(Number(v)) ? String(Number(v)) : Number(v).toFixed(2));
const pct = (v) => `${Math.round(Number(v) * 100)}%`;

const FEATURE_INFO = {
  num_subdomains: {
    label: "Số tên miền phụ",
    short: (v, dir) => dir === "safe"
      ? "Tên miền ngắn, rõ ràng, không có tên miền phụ lạ."
      : `Tên miền có ${n(v)} tên miền phụ, thường dùng để giả dạng trang thật.`,
    detail: (v, dir) => dir === "safe"
      ? `Hệ thống đo được ${n(v)} tên miền phụ. Cấu trúc tên miền gọn gàng, không có dấu hiệu lồng ghép tên thương hiệu giả.`
      : `Hệ thống phát hiện ${n(v)} tên miền phụ. Kẻ lừa đảo thường chèn nhiều tầng tên miền phụ (ví dụ: login.paypal.com.tenmienla.tk) để đánh lừa mắt nhìn và che giấu tên miền thật ở cuối.`
  },
  domain_entropy: {
    label: "Độ ngẫu nhiên tên miền",
    short: (v, dir) => dir === "safe"
      ? "Tên miền dễ đọc, giống cấu trúc của trang web quen thuộc."
      : "Tên miền trông ngẫu nhiên, ít giống một thương hiệu quen thuộc.",
    detail: (v, dir) => dir === "safe"
      ? `Độ ngẫu nhiên (entropy) của tên miền ở mức ${n(v)}, phù hợp với tên miền đặt có chủ đích của các tổ chức bình thường.`
      : `Độ ngẫu nhiên (entropy) của tên miền đạt ${n(v)}. Các tên miền lừa đảo hoặc tạo tự động thường chứa chuỗi ký tự khó đọc, ít giống tên thương hiệu thật.`
  },
  url_entropy: {
    label: "Độ ngẫu nhiên của đường link",
    short: (v, dir) => dir === "safe"
      ? "Cấu trúc link gọn gàng, dễ đọc."
      : "Đường link chứa nhiều ký tự rối rắm, khó đọc.",
    detail: (v, dir) => dir === "safe"
      ? `Độ ngẫu nhiên toàn bộ link là ${n(v)}, nằm trong ngưỡng thông thường của các trang web sạch.`
      : `Độ ngẫu nhiên toàn bộ link đạt ${n(v)}. Link chứa nhiều chuỗi ký tự hỗn hợp hoặc mã hóa bất thường, thường thấy ở link lừa đảo nhằm né bộ lọc.`
  },
  url_length: {
    label: "Độ dài toàn bộ link",
    short: (v, dir) => dir === "safe"
      ? "Đường link ngắn gọn, không bị che giấu."
      : `Đường link dài bất thường (${n(v)} ký tự), dễ che giấu phần địa chỉ thật.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có tổng độ dài ${n(v)} ký tự — ngắn gọn, giúp người dùng dễ quan sát trọn vẹn địa chỉ trang web.`
      : `Link dài tới ${n(v)} ký tự. Kẻ tấn công hay kéo dài link bằng các tham số thừa để đẩy phần tên miền thật khuất khỏi thanh địa chỉ.`
  },
  path_length: {
    label: "Độ dài đường dẫn",
    short: (v, dir) => dir === "safe"
      ? "Đường dẫn ngắn, không có dấu hiệu che giấu."
      : `Đường dẫn sau tên miền dài (${n(v)} ký tự), dễ ẩn chứa tham số bất thường.`,
    detail: (v, dir) => dir === "safe"
      ? `Phần đường dẫn dài ${n(v)} ký tự, cấu trúc đơn giản và dễ kiểm tra.`
      : `Phần đường dẫn dài ${n(v)} ký tự. Đường dẫn quá dài hoặc chứa chuỗi lạ thường xuất hiện ở các trang giả mạo đăng nhập hoặc chuyển hướng.`
  },
  path_depth: {
    label: "Số cấp thư mục trong đường dẫn",
    short: (v, dir) => dir === "safe"
      ? "Đường dẫn bình thường, không bị che giấu."
      : `Đường dẫn lồng qua ${n(v)} cấp thư mục, sâu hơn mức thông thường.`,
    detail: (v, dir) => dir === "safe"
      ? `Đường dẫn chỉ có ${n(v)} cấp thư mục — cấu trúc gọn gàng, đúng kiểu trang web thông thường.`
      : `Đường dẫn đi qua ${n(v)} cấp thư mục. Các trang lừa đảo hoặc bị xâm nhập thường đặt mã độc/form giả sâu trong nhiều lớp thư mục con.`
  },
  num_slashes: {
    label: "Số dấu gạch chéo \"/\"",
    short: (v, dir) => dir === "safe"
      ? "Cấu trúc phân đoạn của link bình thường."
      : `Link bị chia thành nhiều đoạn (${n(v)} dấu "/"), cấu trúc phức tạp.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có ${n(v)} dấu gạch chéo "/", tương ứng cấu trúc đường dẫn thông thường.`
      : `Link chứa ${n(v)} dấu gạch chéo "/". Số lượng dấu phân đoạn bất thường thường gắn với đường dẫn lồng ghép hoặc chuyển hướng phức tạp.`
  },
  domain_hyphens: {
    label: "Dấu gạch nối \"-\" trong tên miền",
    short: (v, dir) => dir === "safe"
      ? "Tên miền không lạm dụng dấu gạch nối."
      : `Tên miền chứa ${n(v)} dấu gạch nối "-", hay gặp ở trang giả mạo thương hiệu.`,
    detail: (v, dir) => dir === "safe"
      ? `Tên miền có ${n(v)} dấu gạch nối "-", phù hợp với tên miền chính thống.`
      : `Tên miền có ${n(v)} dấu gạch nối "-". Kẻ lừa đảo thường ghép từ bằng dấu gạch nối (như secure-login-bank.com) để bắt chước tên thương hiệu thật.`
  },
  path_hyphens: {
    label: "Dấu gạch nối \"-\" trong đường dẫn",
    short: (v, dir) => dir === "safe"
      ? "Đường dẫn trình bày rõ ràng, tự nhiên."
      : `Đường dẫn có ${n(v)} dấu gạch nối "-", cấu trúc khác thường so với trang sạch.`,
    detail: (v, dir) => dir === "safe"
      ? `Đường dẫn có ${n(v)} dấu gạch nối "-", giống kiểu đặt đường dẫn bài viết/trang nội dung thông thường.`
      : `Đường dẫn có ${n(v)} dấu gạch nối "-". Mô hình nhận thấy phân bố dấu gạch nối trong đường dẫn này có xu hướng giống nhóm link rủi ro.`
  },
  num_hyphens: {
    label: "Số dấu gạch nối \"-\"",
    short: (v, dir) => dir === "safe"
      ? "Link không lạm dụng dấu gạch nối."
      : `Link chứa ${n(v)} dấu gạch nối "-", thường dùng để ghép từ khóa giả mạo.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có ${n(v)} dấu gạch nối "-", ở mức bình thường.`
      : `Link chứa ${n(v)} dấu gạch nối "-", đặc điểm hay gặp ở các link giả mạo thương hiệu hoặc tạo tự động.`
  },
  domain_length: {
    label: "Độ dài tên miền",
    short: (v, dir) => dir === "safe"
      ? "Tên miền ngắn gọn, dễ nhận diện."
      : `Tên miền khá dài (${n(v)} ký tự), thường để nhồi thêm từ khóa đánh lừa.`,
    detail: (v, dir) => dir === "safe"
      ? `Tên miền dài ${n(v)} ký tự — ngắn gọn, giống đa số các trang web uy tín.`
      : `Tên miền dài ${n(v)} ký tự. Trang lừa đảo hay đăng ký tên miền dài để nhồi thêm tên ngân hàng, dịch vụ hoặc từ khóa bảo mật.`
  },
  num_dots: {
    label: "Số dấu chấm trong link",
    short: (v, dir) => dir === "safe"
      ? "Tên miền có cấu trúc phân tách đơn giản."
      : `Link có tới ${n(v)} dấu chấm, thường dùng để giả dạng địa chỉ trang thật.`,
    detail: (v, dir) => dir === "safe"
      ? `Link chỉ có ${n(v)} dấu chấm, không có dấu hiệu chia nhỏ tên miền bất thường.`
      : `Link chứa ${n(v)} dấu chấm. Nhiều dấu chấm thường xuất hiện khi kẻ lừa đảo chèn tên miền thật làm tiền tố (vd. google.com.xacminh.tk).`
  },
  num_query_params: {
    label: "Số tham số truy vấn (?...=...)",
    short: (v, dir) => dir === "safe"
      ? "Link không kèm nhiều tham số theo dõi lạ."
      : `Link đính kèm ${n(v)} tham số phía sau dấu "?", thường dùng để truyền dữ liệu ẩn.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có ${n(v)} tham số truy vấn, ở mức gọn gàng bình thường.`
      : `Link đính kèm ${n(v)} tham số truy vấn. Nhiều link lừa đảo truyền sẵn email nạn nhân, mã phiên hoặc địa chỉ chuyển hướng qua các tham số này.`
  },
  longest_token_length: {
    label: "Đoạn chữ dài nhất trong link",
    short: (v, dir) => dir === "safe"
      ? "Các từ trong link ngắn gọn, dễ đọc."
      : `Link chứa đoạn ký tự liền dài tới ${n(v)} ký tự, trông giống chuỗi mã hóa lạ.`,
    detail: (v, dir) => dir === "safe"
      ? `Đoạn ký tự liền dài nhất chỉ ${n(v)} ký tự, không có chuỗi mã hóa dài bất thường.`
      : `Đoạn ký tự liền dài nhất lên tới ${n(v)} ký tự. Chuỗi dài không có dấu phân cách thường là mã định danh hoặc dữ liệu mã hóa ẩn trong link độc hại.`
  },
  avg_token_length: {
    label: "Độ dài trung bình mỗi đoạn chữ",
    short: (v, dir) => dir === "safe"
      ? "Các thành phần trong link có độ dài cân đối."
      : `Các đoạn chữ trong link dài bất thường (trung bình ${n(v)} ký tự).`,
    detail: (v, dir) => dir === "safe"
      ? `Độ dài trung bình mỗi đoạn chữ là ${n(v)} ký tự, phù hợp với từ ngữ tự nhiên.`
      : `Độ dài trung bình mỗi đoạn chữ là ${n(v)} ký tự — dấu hiệu của chuỗi ghép hoặc mã hóa tự động thay vì từ ngữ bình thường.`
  },
  num_digits: {
    label: "Số chữ số trong link",
    short: (v, dir) => dir === "safe"
      ? "Link không chứa nhiều chữ số ngẫu nhiên."
      : `Link chứa ${n(v)} chữ số, dễ là link tạo tự động hoặc thay số cho chữ cái.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có ${n(v)} chữ số, nằm trong mức thông thường.`
      : `Link có ${n(v)} chữ số. Kẻ lừa đảo thường dùng số thay chữ (như paypa1) hoặc tạo đường dẫn kèm dãy số ngẫu nhiên.`
  },
  digit_ratio: {
    label: "Tỉ lệ chữ số trong link",
    short: (v, dir) => dir === "safe"
      ? "Tỉ lệ chữ số thấp, cấu trúc link tự nhiên."
      : `Link chứa tỉ lệ chữ số khá cao (${pct(v)}), ít giống trang web thông thường.`,
    detail: (v, dir) => dir === "safe"
      ? `Chữ số chỉ chiếm ${pct(v)} tổng độ dài link, nằm trong ngưỡng an toàn.`
      : `Chữ số chiếm ${pct(v)} tổng độ dài link — thường gặp ở tên miền/đường dẫn sinh tự động hoặc dùng địa chỉ IP.`
  },
  letter_ratio: {
    label: "Tỉ lệ chữ cái trong link",
    short: (v, dir) => dir === "safe"
      ? "Link chủ yếu gồm chữ cái dễ đọc."
      : `Tỉ lệ chữ cái trong link bất thường (${pct(v)}).`,
    detail: (v, dir) => dir === "safe"
      ? `Chữ cái chiếm ${pct(v)} độ dài link, cấu trúc rõ ràng.`
      : `Chữ cái chiếm ${pct(v)} độ dài link, cho thấy link chứa nhiều số hoặc ký tự đặc biệt hơn thông thường.`
  },
  special_char_ratio: {
    label: "Tỉ lệ ký tự đặc biệt",
    short: (v, dir) => dir === "safe"
      ? "Link ít ký tự đặc biệt, trông gọn gàng."
      : `Link có tỉ lệ ký tự đặc biệt bất thường (${pct(v)}).`,
    detail: (v, dir) => dir === "safe"
      ? `Ký tự đặc biệt chỉ chiếm ${pct(v)} tổng độ dài link, không có dấu hiệu làm rối địa chỉ.`
      : `Ký tự đặc biệt chiếm ${pct(v)} tổng độ dài link. Việc lạm dụng ký tự đặc biệt thường dùng để che giấu cấu trúc thật của URL.`
  },
  vowel_ratio: {
    label: "Tỉ lệ nguyên âm",
    short: (v, dir) => dir === "safe"
      ? "Cách ghép chữ trong link tự nhiên, dễ đọc."
      : "Cách ghép ký tự trong link kém tự nhiên, giống chuỗi tạo ngẫu nhiên.",
    detail: (v, dir) => dir === "safe"
      ? `Tỉ lệ nguyên âm đạt ${pct(v)}, tương đương văn bản/tên gọi tự nhiên.`
      : `Tỉ lệ nguyên âm là ${pct(v)} — lệch khỏi ngôn ngữ tự nhiên, thường gặp ở tên miền hoặc mã token sinh ngẫu nhiên.`
  },
  consonant_ratio: {
    label: "Tỉ lệ phụ âm",
    short: (v, dir) => dir === "safe"
      ? "Cấu trúc chữ cái trong link tự nhiên."
      : "Link có nhiều phụ âm liền nhau, giống chuỗi ký tự sinh tự động.",
    detail: (v, dir) => dir === "safe"
      ? `Tỉ lệ phụ âm ở mức ${pct(v)}, phù hợp với từ ngữ thông thường.`
      : `Tỉ lệ phụ âm đạt ${pct(v)} — dấu hiệu thường thấy ở các chuỗi ký tự vô nghĩa hoặc tên miền tạo tự động.`
  },
  has_ip_address: {
    label: "Dùng địa chỉ IP thay tên miền",
    short: (v, dir) => Number(v)
      ? "Link dùng trực tiếp địa chỉ IP thay vì tên miền, rất đáng ngờ."
      : "Link dùng tên miền rõ ràng, không dùng địa chỉ IP.",
    detail: (v, dir) => Number(v)
      ? "Trang web truy cập trực tiếp bằng dãy số IP thay vì tên miền đăng ký. Các dịch vụ uy tín hầu như không bao giờ yêu cầu người dùng đăng nhập qua địa chỉ IP."
      : "Trang web sử dụng tên miền thông thường thay vì trỏ trực tiếp bằng địa chỉ IP."
  },
  is_suspicious_tld: {
    label: "Đuôi tên miền (TLD)",
    short: (v, dir) => Number(v)
      ? "Tên miền dùng đuôi ít phổ biến (.tk, .top, .xyz...) thường bị lợi dụng để lừa đảo."
      : "Đuôi tên miền thuộc nhóm phổ biến, thông dụng.",
    detail: (v, dir) => Number(v)
      ? "Đuôi tên miền nằm trong nhóm miễn phí hoặc giá rất rẻ (.tk, .ml, .top, .xyz, .click...) nên thường xuyên bị kẻ xấu đăng ký hàng loạt làm trang lừa đảo."
      : "Đuôi tên miền thuộc nhóm phổ biến (.com, .vn, .org...), không nằm trong danh sách đuôi rủi ro cao."
  },
  has_suspicious_word: {
    label: "Từ khóa nhạy cảm trong link",
    short: (v, dir) => Number(v)
      ? "Link chứa từ khóa nhạy cảm (login, verify, account...) thường dùng để dụ đăng nhập."
      : "Link không chứa từ khóa dụ đăng nhập hay xác minh tài khoản.",
    detail: (v, dir) => Number(v)
      ? "Link chứa các từ khóa đánh vào tâm lý gấp gáp hoặc yêu cầu đăng nhập (như login, signin, verify, secure, account, banking...) — rất phổ biến ở trang giả mạo."
      : "Không phát hiện các từ khóa dụ đăng nhập/xác minh đáng ngờ trong đường link."
  },
  num_underscores: {
    label: "Số dấu gạch dưới \"_\"",
    short: (v, dir) => dir === "safe"
      ? "Link không dùng dấu gạch dưới bất thường."
      : `Link chứa ${n(v)} dấu gạch dưới "_", ít thấy ở các trang chính thống.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có ${n(v)} dấu gạch dưới "_", ở mức bình thường.`
      : `Link chứa ${n(v)} dấu gạch dưới "_". Ký tự này thường xuất hiện ở các đường dẫn tự động hoặc trang giả mạo.`
  },
  num_question_marks: {
    label: "Số dấu hỏi chấm \"?\"",
    short: (v, dir) => dir === "safe"
      ? "Cấu trúc tham số trong link bình thường."
      : `Link có ${n(v)} dấu "?", chứa phần truy vấn hoặc chuyển hướng phức tạp.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có ${n(v)} dấu "?", cấu trúc đơn giản.`
      : `Link có ${n(v)} dấu "?", cho thấy có tham số truy vấn hoặc nhúng thêm link phụ phía sau.`
  },
  num_equals: {
    label: "Số dấu bằng \"=\"",
    short: (v, dir) => dir === "safe"
      ? "Link không truyền nhiều cặp dữ liệu phức tạp."
      : `Link có ${n(v)} dấu "=", truyền nhiều giá trị tham số phía sau.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có ${n(v)} dấu "=", nằm trong ngưỡng thông thường.`
      : `Link chứa ${n(v)} dấu "=", dấu hiệu truyền nhiều cặp tham số hoặc chuỗi mã hóa Base64.`
  },
  num_ampersands: {
    label: "Số ký tự \"&\"",
    short: (v, dir) => dir === "safe"
      ? "Link không nối nhiều tham số phức tạp."
      : `Link nối nhiều tham số (${n(v)} ký tự "&"), cấu trúc khá rối.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có ${n(v)} ký tự "&", ở mức gọn gàng.`
      : `Link có ${n(v)} ký tự "&" để ghép nhiều tham số liên tiếp.`
  },
  num_percent: {
    label: "Ký tự mã hóa \"%\"",
    short: (v, dir) => dir === "safe"
      ? "Link không bị mã hóa che giấu ký tự."
      : `Link có ${n(v)} ký tự mã hóa "%", có thể đang che giấu nội dung đường dẫn.`,
    detail: (v, dir) => dir === "safe"
      ? `Link có ${n(v)} ký tự "%", không có dấu hiệu cố tình mã hóa để ẩn địa chỉ.`
      : `Link chứa ${n(v)} ký tự mã hóa "%". Kẻ xấu hay mã hóa ký tự thành dạng %xx để đánh lừa người xem và bộ lọc.`
  },
  trusted_domain: {
    label: "Tên miền uy tín (Layer 1)",
    short: (v) => `Tên miền ${v} nằm trong danh sách trang web uy tín.`,
    detail: (v) => `Tên miền gốc "${v}" thuộc danh sách các trang web phổ biến và đáng tin cậy (Tranco Top 20.000 đã lọc bỏ các nền tảng hay bị lợi dụng & bổ sung trang uy tín tại Việt Nam).`
  }
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

function describeShort(r) {
  const dir = r.direction || "risk";
  const info = FEATURE_INFO[r.feature];
  return info ? info.short(r.value, dir) : `${r.feature}: ${n(r.value)}`;
}

function describeDetail(r) {
  const dir = r.direction || "risk";
  const info = FEATURE_INFO[r.feature];
  return {
    label: info ? info.label : r.feature,
    text: info ? info.detail(r.value, dir) : `Giá trị đo được: ${n(r.value)}.`
  };
}

function fallbackGreenReasons(url) {
  try {
    const u = new URL(url);
    const subs = Math.max(0, u.hostname.replace(/^www\d*\./i, "").split(".").length - 2);
    const depth = u.pathname.split("/").filter(Boolean).length;
    return [
      { feature: "num_subdomains", value: subs, impact: 0, direction: "safe", synthetic: true },
      { feature: "path_depth", value: depth, impact: 0, direction: "safe", synthetic: true }
    ];
  } catch (e) {
    return [];
  }
}

function pickReasons(data, url) {
  const all = (data.reasons || []).map((r) => ({ ...r, direction: r.direction || "risk" }));
  if (!all.length && data.zone === "green") return fallbackGreenReasons(url);
  const risk = all.filter((r) => r.direction === "risk");
  const safe = all.filter((r) => r.direction === "safe");
  if (data.zone === "green") return [...safe.slice(0, 2), ...risk.slice(0, 1)].slice(0, 3);
  return [...risk.slice(0, 2), ...safe.slice(0, 1)].slice(0, 3);
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

  // 1. Phần giải thích ngắn gọn (1 câu tự nhiên kèm biểu tượng, gọn đẹp như bản thiết kế)
  const ul = $("reasons");
  ul.innerHTML = "";
  const shown = pickReasons(data, url);
  shown.forEach((r) => {
    const isSafe = r.direction === "safe";
    const li = el("li", isSafe ? "safe" : "risk");
    const ic = el("span", "ic");
    ic.innerHTML = isSafe ? ICON_OK : ICON_WARN;
    li.appendChild(ic);
    li.appendChild(el("div", "txt", describeShort(r)));
    ul.appendChild(li);
  });

  // 2. Phần Xem chi tiết: giải thích chi tiết bằng tiếng Việt tương ứng từng yếu tố ở trên
  const d = $("details");
  d.innerHTML = "";
  const meta = el("div", "d-meta");
  const addLine = (k, val) => {
    const p = el("div");
    p.appendChild(el("b", "", k + ": "));
    p.appendChild(document.createTextNode(val));
    meta.appendChild(p);
  };
  if (data.whitelisted) {
    addLine("Nguồn đánh giá", "Danh sách tên miền uy tín (Layer 1 Whitelist)");
  } else {
    addLine("Điểm rủi ro mô hình", `${Number(data.malicious_score).toFixed(4)} (độ tin cậy ${Math.round(data.reliability_score)}%)`);
  }
  if (data.predicted_class) addLine("Nhóm rủi ro gần nhất", CLASS_NAME[data.predicted_class] || data.predicted_class);
  d.appendChild(meta);

  const detailItems = (data.reasons && data.reasons.length)
    ? data.reasons.map((r) => ({ ...r, direction: r.direction || "risk" }))
    : shown;

  if (detailItems.length) {
    d.appendChild(el("div", "d-heading", "Giải thích chi tiết các dấu hiệu:"));
    const list = el("ul", "d-list");
    detailItems.forEach((r) => {
      const isSafe = r.direction === "safe";
      const info = describeDetail(r);
      const li = el("li", "d-item " + (isSafe ? "safe" : "risk"));

      const head = el("div", "d-head");
      head.appendChild(el("span", "d-name", info.label));
      if (!r.synthetic && !data.whitelisted && typeof r.impact === "number") {
        const sign = (isSafe ? -1 : 1) * Math.abs(r.impact);
        const tag = isSafe ? "giảm nguy cơ" : "tăng nguy cơ";
        head.appendChild(el("span", "d-badge", `${sign > 0 ? "+" : ""}${sign.toFixed(3)} · ${tag}`));
      } else {
        head.appendChild(el("span", "d-badge", isSafe ? "An toàn" : "Đáng chú ý"));
      }
      li.appendChild(head);
      li.appendChild(el("div", "d-desc", info.text));
      list.appendChild(li);
    });
    d.appendChild(list);
  }

  const bd = $("btn-detail");
  bd.hidden = false;
  bd.textContent = "Xem chi tiết";
  bd.onclick = () => { d.hidden = !d.hidden; bd.textContent = d.hidden ? "Xem chi tiết" : "Ẩn chi tiết"; notifyHeight(); };

  const bl = $("btn-leave");
  bl.hidden = zone !== "red";
  bl.onclick = async () => {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "leave", tabId });
    }
    closePopup();
  };
  notifyHeight();
}

function notifyHeight() {
  if (window.parent && window.parent !== window) {
    const h = document.body ? document.body.scrollHeight : 320;
    window.parent.postMessage({ type: "pg-resize", height: h }, "*");
  }
}

function closePopup() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "pg-close" }, "*");
  } else {
    window.close();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePopup();
});

if (typeof ResizeObserver !== "undefined") {
  const ro = new ResizeObserver(() => notifyHeight());
  ro.observe(document.documentElement);
}

function showError(msg, url) {
  if (url) { $("url").textContent = url; $("url").title = url; }
  $("verdict").className = "verdict";
  $("rel").textContent = "";
  $("vtitle").textContent = "Không kiểm tra được";
  $("vsub").textContent = msg;
  notifyHeight();
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
  $("logo").innerHTML = '<img src="icons/icon48.png" alt="PhishingGuard">';
  const demo = new URLSearchParams(location.search).get("demo");
  if (demo && DEMO[demo]) { render(DEMO[demo].url, DEMO[demo], null); return; }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url;
  if (!/^https?:\/\//i.test(url || "")) { showError("Chỉ kiểm tra được các trang http/https.", url); return; }
  $("url").textContent = url;
  chrome.runtime.sendMessage({ type: "check", url }, (resp) => {
    if (chrome.runtime.lastError || !resp || !resp.ok) {
      showError("Không kết nối được máy chủ PhishingGuard. Nếu server đang khởi động lại, vui lòng thử lại sau vài giây.", url);
      return;
    }
    render(url, resp.data, tab.id);
  });
}
main();