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
  },
  adversarial_userinfo: {
    label: "Giả mạo địa chỉ bằng ký tự \"@\" (Guardrail)",
    short: () => "Link chèn ký tự \"@\" trước tên miền để đánh lừa địa chỉ thật.",
    detail: () => "Hệ thống phát hiện kỹ thuật userinfo@ (ví dụ: http://facebook.com:80@evil.tk). Trình duyệt sẽ bỏ qua phần trước dấu \"@\" và đưa bạn tới máy chủ đứng sau — đây là chiêu giả mạo thương hiệu rất nguy hiểm."
  },
  idn_homograph: {
    label: "Tên miền ký tự đồng dạng / Punycode (Guardrail)",
    short: () => "Tên miền chứa ký tự đồng dạng (Cyrillic/IDN) có thể dùng để giả mạo thương hiệu.",
    detail: () => "Tên miền chứa ký tự ngoài bảng ASCII hoặc mã hóa Punycode (xn--...). Kẻ tấn công thường thay chữ Latin bằng ký tự Cyrillic giống hệt về mặt hiển thị (như pаypal.com) để đánh lừa mắt người dùng."
  }
};

const FEATURE_INFO_EN = {
  num_subdomains: {
    label: "Subdomain count",
    short: (v, dir) => dir === "safe"
      ? "Clean domain structure with no unusual subdomains."
      : `Domain contains ${n(v)} subdomains, often used to spoof trusted sites.`,
    detail: (v, dir) => dir === "safe"
      ? `Detected ${n(v)} subdomains. The domain structure is concise with no signs of brand spoofing.`
      : `Detected ${n(v)} subdomains. Attackers often chain multiple subdomains (e.g., login.paypal.com.fake.tk) to hide the real root domain.`
  },
  domain_entropy: {
    label: "Domain randomness (entropy)",
    short: (v, dir) => dir === "safe"
      ? "Domain name is readable and looks natural."
      : "Domain looks random and unlike a familiar brand.",
    detail: (v, dir) => dir === "safe"
      ? `Domain Shannon entropy is ${n(v)}, consistent with legitimate brand names.`
      : `Domain Shannon entropy is ${n(v)}. Phishing or auto-generated domains often contain irregular character sequences.`
  },
  url_entropy: {
    label: "URL randomness (entropy)",
    short: (v, dir) => dir === "safe"
      ? "URL structure is clean and readable."
      : "URL contains complex, noisy character patterns.",
    detail: (v, dir) => dir === "safe"
      ? `Overall URL entropy is ${n(v)}, within the normal range for benign pages.`
      : `Overall URL entropy is ${n(v)}, indicating obfuscated or randomly generated segments common in malicious links.`
  },
  url_length: {
    label: "Total URL length",
    short: (v, dir) => dir === "safe"
      ? "Short URL with no signs of obfuscation."
      : `Unusually long URL (${n(v)} chars), which can conceal the true destination.`,
    detail: (v, dir) => dir === "safe"
      ? `Total URL length is ${n(v)} characters — short and easy to inspect.`
      : `URL is ${n(v)} characters long. Attackers pad URLs to push the real domain out of the browser address bar.`
  },
  path_length: {
    label: "Path length",
    short: (v, dir) => dir === "safe"
      ? "Short path with no suspicious padding."
      : `Long URL path (${n(v)} chars) that may hide deceptive parameters.`,
    detail: (v, dir) => dir === "safe"
      ? `Path length is ${n(v)} characters, simple and easy to verify.`
      : `Path length is ${n(v)} characters. Excessively long paths frequently appear in credential-harvesting or redirect links.`
  },
  path_depth: {
    label: "Path directory depth",
    short: (v, dir) => dir === "safe"
      ? "Normal directory depth in the URL path."
      : `Deeply nested path (${n(v)} levels), deeper than typical pages.`,
    detail: (v, dir) => dir === "safe"
      ? `Path has ${n(v)} directory levels, typical for standard websites.`
      : `Path spans ${n(v)} directory levels. Compromised or phishing pages are often buried inside nested subdirectories.`
  },
  num_slashes: {
    label: "Slash \"/\" count",
    short: (v, dir) => dir === "safe"
      ? "Normal URL segmentation."
      : `URL is split into many segments (${n(v)} slashes).`,
    detail: (v, dir) => dir === "safe"
      ? `URL contains ${n(v)} slashes, matching normal path structure.`
      : `URL contains ${n(v)} slashes, which is often associated with nested paths or chained redirects.`
  },
  domain_hyphens: {
    label: "Hyphens \"-\" in domain",
    short: (v, dir) => dir === "safe"
      ? "Domain does not overuse hyphens."
      : `Domain has ${n(v)} hyphens, a common pattern in spoofed brand domains.`,
    detail: (v, dir) => dir === "safe"
      ? `Domain contains ${n(v)} hyphens, consistent with legitimate sites.`
      : `Domain contains ${n(v)} hyphens. Phishing domains often combine keywords with hyphens (e.g., secure-login-bank.com).`
  },
  path_hyphens: {
    label: "Hyphens \"-\" in path",
    short: (v, dir) => dir === "safe"
      ? "Natural path slug formatting."
      : `Path contains ${n(v)} hyphens with an unusual distribution.`,
    detail: (v, dir) => dir === "safe"
      ? `Path has ${n(v)} hyphens, similar to normal article or content slugs.`
      : `Path has ${n(v)} hyphens. The model flagged this pattern as closer to high-risk URLs.`
  },
  num_hyphens: {
    label: "Total hyphens \"-\"",
    short: (v, dir) => dir === "safe"
      ? "Normal hyphen usage."
      : `URL contains ${n(v)} hyphens, often used to assemble fake keywords.`,
    detail: (v, dir) => dir === "safe"
      ? `URL contains ${n(v)} hyphens, within normal bounds.`
      : `URL contains ${n(v)} hyphens, commonly observed in spoofed or auto-generated links.`
  },
  domain_length: {
    label: "Domain length",
    short: (v, dir) => dir === "safe"
      ? "Short, recognizable domain name."
      : `Long domain name (${n(v)} chars), often stuffed with deceptive keywords.`,
    detail: (v, dir) => dir === "safe"
      ? `Domain length is ${n(v)} characters, typical of established websites.`
      : `Domain length is ${n(v)} characters. Phishing domains frequently pack brand and security terms into long hostnames.`
  },
  num_dots: {
    label: "Dot \".\" count",
    short: (v, dir) => dir === "safe"
      ? "Simple domain separation structure."
      : `URL contains ${n(v)} dots, often used to mimic legitimate addresses.`,
    detail: (v, dir) => dir === "safe"
      ? `URL contains ${n(v)} dots, showing no abnormal subdomain chaining.`
      : `URL contains ${n(v)} dots. Extra dots often appear when attackers prepend a trusted brand name to a malicious root domain.`
  },
  num_query_params: {
    label: "Query parameter count",
    short: (v, dir) => dir === "safe"
      ? "No excessive tracking or redirect parameters."
      : `URL passes ${n(v)} query parameters, which may carry hidden payloads.`,
    detail: (v, dir) => dir === "safe"
      ? `URL has ${n(v)} query parameters, clean and concise.`
      : `URL has ${n(v)} query parameters. Phishing links often pass victim emails, session tokens, or redirect targets via queries.`
  },
  longest_token_length: {
    label: "Longest contiguous token",
    short: (v, dir) => dir === "safe"
      ? "URL tokens are short and readable."
      : `Contains a long uninterrupted string (${n(v)} chars), resembling encoded data.`,
    detail: (v, dir) => dir === "safe"
      ? `Longest token is ${n(v)} characters — no suspiciously long encoded strings.`
      : `Longest token reaches ${n(v)} characters, often indicating obfuscated IDs or encoded payloads.`
  },
  avg_token_length: {
    label: "Average token length",
    short: (v, dir) => dir === "safe"
      ? "URL segments have balanced lengths."
      : `Unusually long average segment length (${n(v)} chars).`,
    detail: (v, dir) => dir === "safe"
      ? `Average token length is ${n(v)} characters, consistent with natural words.`
      : `Average token length is ${n(v)} characters — characteristic of concatenated or machine-generated strings.`
  },
  num_digits: {
    label: "Digit count",
    short: (v, dir) => dir === "safe"
      ? "Few digits in the URL."
      : `Contains ${n(v)} digits, often seen in generated links or leetspeak spoofing.`,
    detail: (v, dir) => dir === "safe"
      ? `URL contains ${n(v)} digits, within normal levels.`
      : `URL contains ${n(v)} digits. Attackers may substitute digits for letters (e.g., paypa1) or append random numeric strings.`
  },
  digit_ratio: {
    label: "Digit ratio",
    short: (v, dir) => dir === "safe"
      ? "Low digit ratio; natural URL structure."
      : `High proportion of digits (${pct(v)}), uncommon for legitimate pages.`,
    detail: (v, dir) => dir === "safe"
      ? `Digits account for ${pct(v)} of the URL, within safe thresholds.`
      : `Digits make up ${pct(v)} of the URL — typical of IP-based or auto-generated malicious URLs.`
  },
  letter_ratio: {
    label: "Letter ratio",
    short: (v, dir) => dir === "safe"
      ? "Mostly readable alphabetic characters."
      : `Unusual alphabetic character ratio (${pct(v)}).`,
    detail: (v, dir) => dir === "safe"
      ? `Letters make up ${pct(v)} of the URL, indicating a clear structure.`
      : `Letters make up ${pct(v)} of the URL, meaning a higher share of digits or symbols than normal.`
  },
  special_char_ratio: {
    label: "Special character ratio",
    short: (v, dir) => dir === "safe"
      ? "Minimal special characters."
      : `Unusual proportion of special characters (${pct(v)}).`,
    detail: (v, dir) => dir === "safe"
      ? `Special characters are only ${pct(v)} of the URL.`
      : `Special characters account for ${pct(v)} of the URL, which can be used to obfuscate its true structure.`
  },
  vowel_ratio: {
    label: "Vowel ratio",
    short: (v, dir) => dir === "safe"
      ? "Natural letter composition."
      : "Unnatural vowel distribution resembling random strings.",
    detail: (v, dir) => dir === "safe"
      ? `Vowel ratio is ${pct(v)}, matching natural language naming.`
      : `Vowel ratio is ${pct(v)} — deviates from natural language, common in DGA or random tokens.`
  },
  consonant_ratio: {
    label: "Consonant ratio",
    short: (v, dir) => dir === "safe"
      ? "Natural consonant structure."
      : "Heavy consonant clusters resembling auto-generated strings.",
    detail: (v, dir) => dir === "safe"
      ? `Consonant ratio is ${pct(v)}, consistent with normal words.`
      : `Consonant ratio is ${pct(v)} — often observed in nonsensical or machine-generated domains.`
  },
  has_ip_address: {
    label: "Raw IP address host",
    short: (v) => Number(v)
      ? "Uses a raw IP address instead of a domain name — highly suspicious."
      : "Uses a standard domain name instead of a raw IP address.",
    detail: (v) => Number(v)
      ? "The link points directly to an IP address rather than a registered domain. Legitimate services rarely ask users to log in via raw IPs."
      : "The site uses a standard domain name."
  },
  is_suspicious_tld: {
    label: "Top-Level Domain (TLD)",
    short: (v) => Number(v)
      ? "Uses a low-cost/free TLD (.tk, .top, .xyz...) frequently abused in phishing."
      : "Uses a mainstream TLD.",
    detail: (v) => Number(v)
      ? "The domain uses a TLD commonly registered in bulk for phishing campaigns (.tk, .ml, .top, .xyz, .click...)."
      : "The TLD belongs to standard, widely used extensions."
  },
  has_suspicious_word: {
    label: "Sensitive keywords in URL",
    short: (v) => Number(v)
      ? "Contains sensitive keywords (login, verify, account...) commonly used to lure victims."
      : "No suspicious login or verification keywords detected.",
    detail: (v) => Number(v)
      ? "Contains urgent or credential-related keywords (login, signin, verify, secure, account, banking...) — including leetspeak/homoglyph variants."
      : "No deceptive authentication keywords were found in the URL."
  },
  num_underscores: {
    label: "Underscore \"_\" count",
    short: (v, dir) => dir === "safe"
      ? "No unusual underscore usage."
      : `Contains ${n(v)} underscores, less common on official sites.`,
    detail: (v, dir) => dir === "safe"
      ? `Contains ${n(v)} underscores, within normal range.`
      : `Contains ${n(v)} underscores, frequently seen in auto-generated or spoofed paths.`
  },
  num_question_marks: {
    label: "Question mark \"?\" count",
    short: (v, dir) => dir === "safe"
      ? "Standard query syntax."
      : `Contains ${n(v)} question marks, indicating complex queries or nested redirects.`,
    detail: (v, dir) => dir === "safe"
      ? `Contains ${n(v)} question marks, simple structure.`
      : `Contains ${n(v)} question marks, suggesting layered query strings or embedded redirect URLs.`
  },
  num_equals: {
    label: "Equals \"=\" count",
    short: (v, dir) => dir === "safe"
      ? "No complex parameter assignments."
      : `Contains ${n(v)} \"=\" signs, passing multiple parameter values.`,
    detail: (v, dir) => dir === "safe"
      ? `Contains ${n(v)} \"=\" signs, normal for standard URLs.`
      : `Contains ${n(v)} \"=\" signs, indicating multiple parameters or Base64-encoded strings.`
  },
  num_ampersands: {
    label: "Ampersand \"&\" count",
    short: (v, dir) => dir === "safe"
      ? "Minimal chained parameters."
      : `Chains multiple parameters (${n(v)} \"&\" characters).`,
    detail: (v, dir) => dir === "safe"
      ? `Contains ${n(v)} \"&\" characters, concise structure.`
      : `Contains ${n(v)} \"&\" characters joining numerous sequential query parameters.`
  },
  num_percent: {
    label: "Percent-encoding \"%\" count",
    short: (v, dir) => dir === "safe"
      ? "No suspicious percent-encoding detected."
      : `Contains ${n(v)} \"%\" characters, which may hide obfuscated path text.`,
    detail: (v, dir) => dir === "safe"
      ? `Contains ${n(v)} \"%\" characters, no signs of intentional obfuscation.`
      : `Contains ${n(v)} \"%\" characters. Attackers use %xx encoding to disguise keywords from users and filters.`
  },
  trusted_domain: {
    label: "Trusted Domain (Layer 1)",
    short: (v) => `Domain ${v} is on the verified trusted-domains list.`,
    detail: (v) => `Root domain "${v}" is listed in Tranco Top 20,000 (excluding abused hosting/shortener platforms) or verified Vietnamese services.`
  },
  adversarial_userinfo: {
    label: "Authority \"@\" Spoofing (Guardrail)",
    short: () => "URL injects \"@\" before the real host to disguise its true destination.",
    detail: () => "Detected userinfo@ spoofing (e.g., http://facebook.com:80@evil.tk). Browsers ignore everything before \"@\" and connect to the host after it — a classic phishing deception."
  },
  idn_homograph: {
    label: "IDN / Homograph Domain (Guardrail)",
    short: () => "Domain uses non-ASCII/Cyrillic or Punycode (xn--) characters that may spoof a brand.",
    detail: () => "Detected non-ASCII characters or IDN Punycode (xn--...) in the hostname. Attackers replace Latin letters with visually identical Cyrillic/Greek characters (e.g., pаypal.com) to trick users."
  }
};

const UI_STRINGS = {
  vi: {
    title: { red: "Nguy cơ cao", yellow: "Đáng ngờ", green: "Có vẻ an toàn" },
    sub: {
      yellow: "Link này có một vài dấu hiệu đáng ngờ. Hãy cẩn thận.",
      green: "Chưa thấy dấu hiệu đáng ngờ trong link này."
    },
    subRed: {
      phishing: "Link này có nhiều dấu hiệu của trang lừa đảo.",
      malware: "Link này có nhiều dấu hiệu của trang chứa phần mềm độc hại.",
      defacement: "Link này có nhiều dấu hiệu của trang bị can thiệp.",
      fallback: "Link này có nhiều dấu hiệu bất thường, giống các trang độc hại."
    },
    className: {
      benign: "lành tính",
      phishing: "lừa đảo (phishing)",
      malware: "phần mềm độc hại (malware)",
      defacement: "trang bị can thiệp (defacement)"
    },
    checking: "Đang kiểm tra…",
    unknown: "Không xác định",
    reliability: (v) => `Độ tin cậy ${Math.round(v)}%`,
    srcLabel: "Nguồn đánh giá",
    srcWhitelist: "Danh sách tên miền uy tín (Layer 1 Whitelist)",
    scoreLabel: "Điểm rủi ro mô hình",
    scoreVal: (mal, rel) => `${Number(mal).toFixed(4)} (độ tin cậy ${Math.round(rel)}%)`,
    classLabel: "Nhóm rủi ro gần nhất",
    detailHeading: "Giải thích chi tiết các dấu hiệu:",
    tagSafeImpact: "giảm nguy cơ",
    tagRiskImpact: "tăng nguy cơ",
    tagSafe: "An toàn",
    tagRisk: "Đáng chú ý",
    btnDetailShow: "Xem chi tiết",
    btnDetailHide: "Ẩn chi tiết",
    btnChatShow: "Hỏi trợ lý",
    btnChatHide: "Ẩn trợ lý",
    btnLeave: "Rời trang này",
    chatPlaceholder: "Hỏi về link này hoặc cách xử lý sự cố...",
    chatSend: "Gửi",
    chatThinking: "Đang tra cứu RAG...",
    chatWelcome: "Xin chào! Bạn có thể chọn câu hỏi nhanh hoặc nhập câu hỏi bất kỳ về đường link này & an toàn mạng.",
    chatErr: "Không kết nối được trợ lý RAG lúc này. Vui lòng thử lại sau vài giây.",
    chatChips: [
      "Vì sao trang này bị cảnh báo?",
      "Tôi lỡ nhập mật khẩu rồi phải làm sao?",
      "Cách kiểm tra tên miền thật?"
    ],
    note: "Kết quả chỉ mang tính tham khảo.",
    errTitle: "Không kiểm tra được",
    errScheme: "Chỉ kiểm tra được các trang http/https.",
    errConn: "Không kết nối được máy chủ PhishingGuard. Nếu server đang khởi động lại, vui lòng thử lại sau vài giây.",
    measuredVal: (v) => `Giá trị đo được: ${n(v)}.`
  },
  en: {
    title: { red: "High Risk", yellow: "Suspicious", green: "Looks Safe" },
    sub: {
      yellow: "This link shows several suspicious signals. Proceed with caution.",
      green: "No suspicious indicators were found in this link."
    },
    subRed: {
      phishing: "This link shows strong indicators of a phishing page.",
      malware: "This link shows strong indicators of a malware site.",
      defacement: "This link shows strong indicators of a defaced page.",
      fallback: "This link exhibits multiple abnormal signals associated with malicious sites."
    },
    className: {
      benign: "benign",
      phishing: "phishing",
      malware: "malware",
      defacement: "defacement"
    },
    checking: "Checking…",
    unknown: "Unknown",
    reliability: (v) => `Reliability ${Math.round(v)}%`,
    srcLabel: "Assessment source",
    srcWhitelist: "Trusted Domain Whitelist (Layer 1)",
    scoreLabel: "Model risk score",
    scoreVal: (mal, rel) => `${Number(mal).toFixed(4)} (reliability ${Math.round(rel)}%)`,
    classLabel: "Predicted threat class",
    detailHeading: "Detailed SHAP & Guardrail breakdown:",
    tagSafeImpact: "reduces risk",
    tagRiskImpact: "increases risk",
    tagSafe: "Safe",
    tagRisk: "Notable",
    btnDetailShow: "View details",
    btnDetailHide: "Hide details",
    btnChatShow: "Ask AI",
    btnChatHide: "Hide AI",
    btnLeave: "Leave this page",
    chatPlaceholder: "Ask about this link or incident response...",
    chatSend: "Send",
    chatThinking: "Searching RAG knowledge base...",
    chatWelcome: "Hi! Pick a quick question or type anything about this URL, SHAP signals, or phishing response.",
    chatErr: "Unable to reach the RAG assistant right now. Please retry in a few seconds.",
    chatChips: [
      "Why was this link flagged?",
      "I entered my password — what now?",
      "How do I verify the real domain?"
    ],
    note: "For reference only — always verify sensitive URLs.",
    errTitle: "Unable to check",
    errScheme: "Only http:// and https:// pages can be inspected.",
    errConn: "Cannot reach the PhishingGuard server. If the cloud instance is waking up, please retry in a few seconds.",
    measuredVal: (v) => `Measured value: ${n(v)}.`
  }
};

function getInitialLang() {
  const param = new URLSearchParams(location.search).get("lang");
  if (param === "en" || param === "vi") return param;
  try {
    const saved = localStorage.getItem("pg_lang");
    if (saved === "en" || saved === "vi") return saved;
  } catch (_) {}
  return "vi";
}

let currentLang = getInitialLang();
let lastRenderState = null;

function T() { return UI_STRINGS[currentLang] || UI_STRINGS.vi; }
function getFeatureMap() { return currentLang === "en" ? FEATURE_INFO_EN : FEATURE_INFO; }

function syncStaticChrome() {
  const t = T();
  document.documentElement.lang = currentLang;
  const toggle = $("lang-toggle");
  if (toggle) toggle.textContent = currentLang.toUpperCase();
  const note = $("note");
  if (note) note.textContent = t.note;
  const bl = $("btn-leave");
  if (bl) bl.textContent = t.btnLeave;
}

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

function describeShort(r) {
  const dir = r.direction || "risk";
  const info = getFeatureMap()[r.feature] || FEATURE_INFO[r.feature];
  return info ? info.short(r.value, dir) : `${r.feature}: ${n(r.value)}`;
}

function describeDetail(r) {
  const dir = r.direction || "risk";
  const info = getFeatureMap()[r.feature] || FEATURE_INFO[r.feature];
  return {
    label: info ? info.label : r.feature,
    text: info ? info.detail(r.value, dir) : T().measuredVal(r.value)
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
  lastRenderState = { type: "result", url, data, tabId };
  syncStaticChrome();
  const t = T();
  const zone = data.zone;
  $("url").textContent = url;
  $("url").title = url;

  const v = $("verdict");
  v.className = "verdict " + zone;
  $("rel").textContent = t.reliability(data.reliability_score);
  $("vtitle").textContent = t.title[zone] || t.unknown;
  $("vsub").textContent = zone === "red"
    ? (t.subRed[data.predicted_class] || t.subRed.fallback)
    : (t.sub[zone] || "");

  // 1. Short natural-language explanations
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

  // 2. Detailed SHAP & Guardrail breakdown
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
    addLine(t.srcLabel, t.srcWhitelist);
  } else {
    addLine(t.scoreLabel, t.scoreVal(data.malicious_score, data.reliability_score));
  }
  if (data.predicted_class) addLine(t.classLabel, t.className[data.predicted_class] || data.predicted_class);
  d.appendChild(meta);

  const detailItems = (data.reasons && data.reasons.length)
    ? data.reasons.map((r) => ({ ...r, direction: r.direction || "risk" }))
    : shown;

  if (detailItems.length) {
    d.appendChild(el("div", "d-heading", t.detailHeading));
    const list = el("ul", "d-list");
    detailItems.forEach((r) => {
      const isSafe = r.direction === "safe";
      const info = describeDetail(r);
      const li = el("li", "d-item " + (isSafe ? "safe" : "risk"));

      const head = el("div", "d-head");
      head.appendChild(el("span", "d-name", info.label));
      if (!r.synthetic && !data.whitelisted && typeof r.impact === "number") {
        const sign = (isSafe ? -1 : 1) * Math.abs(r.impact);
        const tag = isSafe ? t.tagSafeImpact : t.tagRiskImpact;
        head.appendChild(el("span", "d-badge", `${sign > 0 ? "+" : ""}${sign.toFixed(3)} · ${tag}`));
      } else {
        head.appendChild(el("span", "d-badge", isSafe ? t.tagSafe : t.tagRisk));
      }
      li.appendChild(head);
      li.appendChild(el("div", "d-desc", info.text));
      list.appendChild(li);
    });
    d.appendChild(list);
  }

  const bd = $("btn-detail");
  bd.hidden = false;
  bd.textContent = d.hidden ? t.btnDetailShow : t.btnDetailHide;
  bd.onclick = () => {
    d.hidden = !d.hidden;
    bd.textContent = d.hidden ? T().btnDetailShow : T().btnDetailHide;
    notifyHeight();
  };

  const bc = $("btn-chat");
  const cb = $("chat-box");
  if (bc && cb) {
    bc.hidden = false;
    bc.textContent = cb.hidden ? t.btnChatShow : t.btnChatHide;
    bc.onclick = () => {
      cb.hidden = !cb.hidden;
      bc.textContent = cb.hidden ? T().btnChatShow : T().btnChatHide;
      if (!cb.hidden) {
        initChatWelcome();
        const inp = $("chat-input");
        if (inp) inp.focus();
      }
      notifyHeight();
    };
    renderChatChrome();
  }

  const bl = $("btn-leave");
  bl.hidden = zone !== "red";
  bl.textContent = t.btnLeave;
  bl.onclick = async () => {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "leave", tabId });
    }
    closePopup();
  };
  notifyHeight();
}

const CHAT_FALLBACK_ENDPOINT = "https://phishingguard-ai43.onrender.com/chat";
let chatInitialized = false;

function renderChatChrome() {
  const t = T();
  const inp = $("chat-input");
  if (inp) inp.placeholder = t.chatPlaceholder;
  const sendBtn = $("chat-send");
  if (sendBtn) sendBtn.textContent = t.chatSend;

  const chipsWrap = $("chat-chips");
  if (chipsWrap) {
    chipsWrap.innerHTML = "";
    t.chatChips.forEach((q) => {
      const b = el("button", "chip", q);
      b.type = "button";
      b.onclick = () => sendChatMessage(q);
      chipsWrap.appendChild(b);
    });
  }
}

function appendChatBubble(role, text, sources = []) {
  const box = $("chat-messages");
  if (!box) return null;
  const div = el("div", "msg " + role);
  // Strip simple **bold** markdown markers for clean plain-text rendering without innerHTML XSS risk
  div.textContent = String(text || "").replace(/\*\*/g, "");
  if (role === "bot" && Array.isArray(sources) && sources.length) {
    const srcRow = el("div", "msg-sources");
    const seen = new Set();
    sources.forEach((s) => {
      const label = s && s.source ? s.source : "";
      if (label && !seen.has(label)) {
        seen.add(label);
        srcRow.appendChild(el("span", "src-tag", label));
      }
    });
    if (srcRow.childNodes.length) div.appendChild(srcRow);
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  notifyHeight();
  return div;
}

function initChatWelcome() {
  if (chatInitialized) return;
  chatInitialized = true;
  appendChatBubble("bot", T().chatWelcome);
}

function requestChatApi(payload) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "chat", payload }, (resp) => {
        if (chrome.runtime.lastError || !resp || !resp.ok) {
          reject(new Error((resp && resp.error) || "runtime error"));
        } else {
          resolve(resp.data);
        }
      });
      return;
    }
    fetch(CHAT_FALLBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("HTTP " + r.status))))
      .then(resolve)
      .catch(reject);
  });
}

async function sendChatMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return;
  initChatWelcome();
  appendChatBubble("user", text);

  const inp = $("chat-input");
  const sendBtn = $("chat-send");
  if (inp) inp.value = "";
  if (sendBtn) sendBtn.disabled = true;

  const pending = appendChatBubble("bot", T().chatThinking);
  const scanContext = (lastRenderState && lastRenderState.type === "result") ? lastRenderState.data : null;

  try {
    const data = await requestChatApi({
      message: text,
      lang: currentLang,
      scan_context: scanContext
    });
    if (pending) pending.remove();
    appendChatBubble("bot", data.reply || T().chatErr, data.sources || []);
  } catch (_) {
    if (pending) pending.remove();
    appendChatBubble("bot", T().chatErr);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (inp) inp.focus();
  }
}

function setupChatForm() {
  const form = $("chat-form");
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault();
    const inp = $("chat-input");
    if (inp) sendChatMessage(inp.value);
  };
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

function showError(msgKeyOrText, url, isKey = false) {
  lastRenderState = { type: "error", msgKeyOrText, url, isKey };
  syncStaticChrome();
  const t = T();
  if (url) { $("url").textContent = url; $("url").title = url; }
  $("verdict").className = "verdict";
  $("rel").textContent = "";
  $("vtitle").textContent = t.errTitle;
  $("vsub").textContent = isKey ? t[msgKeyOrText] : msgKeyOrText;
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

function setupLangToggle() {
  const btn = $("lang-toggle");
  if (!btn) return;
  btn.onclick = () => {
    currentLang = currentLang === "vi" ? "en" : "vi";
    try { localStorage.setItem("pg_lang", currentLang); } catch (_) {}
    syncStaticChrome();
    if (lastRenderState) {
      if (lastRenderState.type === "result") {
        render(lastRenderState.url, lastRenderState.data, lastRenderState.tabId);
      } else if (lastRenderState.type === "error") {
        showError(lastRenderState.msgKeyOrText, lastRenderState.url, lastRenderState.isKey);
      }
    } else {
      $("vtitle").textContent = T().checking;
    }
  };
}

async function main() {
  $("logo").innerHTML = '<img src="icons/icon48.png" alt="PhishingGuard">';
  syncStaticChrome();
  setupLangToggle();
  setupChatForm();
  $("vtitle").textContent = T().checking;

  const demo = new URLSearchParams(location.search).get("demo");
  if (demo && DEMO[demo]) { render(DEMO[demo].url, DEMO[demo], null); return; }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab && tab.url;
  if (!/^https?:\/\//i.test(url || "")) { showError("errScheme", url, true); return; }
  $("url").textContent = url;
  chrome.runtime.sendMessage({ type: "check", url }, (resp) => {
    if (chrome.runtime.lastError || !resp || !resp.ok) {
      showError("errConn", url, true);
      return;
    }
    render(url, resp.data, tab.id);
  });
}
main();