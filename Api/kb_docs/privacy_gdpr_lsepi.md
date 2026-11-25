Source: UK GDPR (ICO) & Vietnam Decree 13/2023/ND-CP

## Tuân thủ UK GDPR và Nguyên tắc Tối thiểu hóa Dữ liệu (Data Minimization)
Keywords: gdpr uk gdpr ico data minimization stateless lsepi quyền riêng tư châu âu
Theo chuẩn **UK GDPR (Article 5)** và hướng dẫn của **ICO (Information Commissioner's Office)**, dữ liệu thu thập phải được giới hạn ở mức tối thiểu cần thiết (*Data Minimization*) và chỉ phục vụ đúng mục đích công bố (*Purpose Limitation*). PhishingGuard tuân thủ nghiêm ngặt bằng cách: chỉ gửi duy nhất chuỗi URL tab hiện tại để suy luận phi trạng thái (*stateless*), tuyệt đối không đọc DOM/mật khẩu/cookie, không lưu lịch sử duyệt web vào cơ sở dữ liệu, và tự động xóa bộ đệm cục bộ khi đóng trình duyệt (`chrome.storage.session`).

## Bảo vệ Dữ liệu Cá nhân theo Nghị định 13/2023/NĐ-CP và An toàn AI (Prompt Sanitization)
Keywords: nghị định 13 bảo vệ dữ liệu cá nhân prompt injection sanitize query cắt tham số
Theo **Nghị định 13/2023/NĐ-CP** của Việt Nam về bảo vệ dữ liệu cá nhân, người dùng có quyền được biết và kiểm soát dữ liệu nhạy cảm của mình. Khi người dùng sử dụng tính năng Trợ lý AI (`POST /chat`), PhishingGuard chủ động **cắt bỏ toàn bộ chuỗi truy vấn (`?...`) của URL** (`sanitize_url_for_prompt`) trước khi gửi sang LLM nhằm đạt 2 mục tiêu kép: không để lộ email/token phiên cá nhân ra bên thứ 3 và vô hiệu hóa đòn tấn công **Prompt Injection** nhúng trong URL độc hại.
