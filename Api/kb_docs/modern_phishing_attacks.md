Source: CISA, OWASP & APWG Phishing Trends

## Quishing — Tấn công lừa đảo qua mã QR (QR Code Phishing)
Keywords: quishing qr code mã qr quét mã bãi xe hóa đơn qr phishing
Quishing là hình thức nhúng đường link lừa đảo vào mã QR (dán đè lên mã QR thanh toán/gửi xe hoặc chèn trong email giả mạo) để vượt qua bộ lọc link truyền thống của email. Cách phòng tránh: luôn xem trước địa chỉ URL hiển thị sau khi quét mã QR (kiểm tra đúng tên miền gốc eTLD+1) trước khi bấm mở, và không bao giờ nhập mật khẩu/OTP từ trang mở qua mã QR lạ.

## Tấn công trung gian AiTM (Session Hijacking) vượt 2FA SMS và giải pháp Passkeys
Keywords: aitm session hijacking cookie vượt 2fa passkey fido2 phishing-resistant mfa
Adversary-in-the-Middle (AiTM) là kỹ thuật trang lừa đảo đứng làm proxy trung gian giữa nạn nhân và trang thật (như Microsoft/Google), đánh cắp cả mật khẩu, mã OTP SMS lẫn **session cookie** sau đăng nhập. Để chống AiTM hiệu quả theo khuyến cáo của CISA, hãy nâng cấp từ SMS OTP sang **Passkeys / FIDO2** (xác thực gắn chặt với tên miền gốc thật, nên không thể bị lừa trên tên miền giả).

## Typosquatting và Combosquatting (Tên miền gõ nhầm & ghép từ)
Keywords: typosquatting combosquatting gõ nhầm thương hiệu faceb00k gogle lookalike domain
Typosquatting lợi dụng lỗi gõ phím của người dùng (vd: `gogle.com`, `facebok.com`, `vietconbank.com.vn`), còn Combosquatting ghép thêm từ khóa uy tín vào tên thương hiệu (vd: `vietcombank-support.com`, `paypal-security-check.xyz`). Khác với IDN Homograph dùng ký tự Cyrillic, cả hai kỹ thuật này đều dùng chữ Latin chuẩn; hãy luôn đối chiếu kỹ từng ký tự của tên miền gốc và sử dụng bookmark cho các trang ngân hàng/tài chính.

## Giả mạo CAPTCHA (ClickFix) và Cửa sổ đăng nhập giả (Browser-in-the-Browser / BitB)
Keywords: bitb browser-in-the-browser fake captcha clickfix powershell win+r verify you are human
Hai chiêu lừa mới rất nguy hiểm: 1) **BitB** vẽ một cửa sổ pop-up "Đăng nhập bằng Google/Microsoft" giả bằng HTML/CSS ngay bên trong trang web (mẹo phát hiện: thử kéo cửa sổ pop-up ra ngoài viền trình duyệt — nếu không kéo ra được thì đó là giả). 2) **Fake CAPTCHA (ClickFix)** yêu cầu bấm tổ hợp phím `Win + R` rồi dán (`Ctrl + V`) lệnh để "xác minh bạn không phải robot" — thực chất là chạy mã độc PowerShell. Tuyệt đối KHÔNG bao giờ chạy lệnh từ hướng dẫn CAPTCHA.
