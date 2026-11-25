Source: PhishingGuard Technical Report & Benchmarks

## Giải thích các đặc trưng thống kê SHAP (vowel_ratio, consonant_ratio, token length, hyphens)
Keywords: vowel_ratio consonant_ratio longest_token_length avg_token_length special_char_ratio domain_hyphens path_hyphens đặc trưng shap
Trong 27 đặc trưng SHAP của PhishingGuard: 1) **`vowel_ratio` & `consonant_ratio`** (tỉ lệ nguyên âm/phụ âm) giúp nhận diện tên miền sinh tự động (DGA) hoặc chuỗi ký tự vô nghĩa thường có mật độ phụ âm bất thường. 2) **`longest_token_length` & `avg_token_length`** phát hiện các chuỗi mã hóa dài hoặc từ ghép bất thường không có dấu phân cách. 3) **`domain_hyphens` vs `path_hyphens`**: dấu gạch nối trong *tên miền* (`secure-login-bank.com`) là dấu hiệu phishing mạnh, trong khi dấu gạch nối trong *đường dẫn* (`/tin-tuc-hom-nay`) rất phổ biến ở trang báo/SEO sạch — việc tách riêng 2 đặc trưng này giúp giảm mạnh báo động giả.

## Vì sao PhishingGuard chọn LightGBM trong 16 mô hình & Độ trễ thực tế (Latency Benchmark)
Keywords: tại sao chọn lightgbm so sánh 16 mô hình random forest bagging latency benchmark p50 p95 độ trễ real-time
Trong thực nghiệm so sánh 16 thuật toán trên `605,474` URL huấn luyện/kiểm định, Bagging (`85.68%`) và Random Forest (`85.57%`) có Accuracy nhỉnh hơn một chút nhưng chi phí suy luận và giải thích SHAP rất chậm. **LightGBM** (`83.33%` baseline, huấn luyện `7.2s`) được chọn làm mô hình triển khai vì cân bằng tối ưu giữa độ chính xác và tốc độ **TreeSHAP nhanh hơn Random Forest ~2,500 lần**. Kết quả benchmark 600 request thực tế: trung vị (**p50**) toàn hệ thống chỉ **`12.30 ms`** (Layer 1 Whitelist `4.27 ms`, Layer 2 ML + TreeSHAP `17.05 ms`, p95 `19.15 ms`), đáp ứng mượt mà yêu cầu thời gian thực (`< 100 ms`).

## Kết quả Phòng thủ Tấn công Đối kháng 2 tầng (Adversarial Defense A1–A7)
Keywords: adversarial defense tấn công đối kháng asr 79.7 2.9 retraining canonicalization benchmark a1 a7
PhishingGuard đánh giá độ bền vững trên **7,000 biến thể URL đối kháng** (7 kịch bản A1–A7 × 1,000 mẫu phishing từ tập Holdout). Mô hình Baseline v0.1 bị vượt mặt với tỷ lệ tấn công thành công (**ASR**) trung bình **`79.7%`**. Sau khi áp dụng **Phòng thủ 2 tầng** (Tầng 1: chuẩn hóa URL, bóc tách Open Redirect, chặn `userinfo@` & IDN Homograph, giải mã `%xx`/Leetspeak; Tầng 2: huấn luyện đối kháng không gian bài toán trên `544,373` mẫu), ASR trung bình giảm mạnh từ **`79.7%` xuống chỉ còn `2.9%`** trong khi vẫn giữ tỷ lệ báo động giả tập sạch ở mức `~1%`.
