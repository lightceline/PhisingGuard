# Báo cáo: Kết quả SAU khi chuẩn hoá URL (31 đặc trưng, Dataset1) & Các vấn đề còn tồn tại

> Ghi lại ngày 18/11/2026 (bản sao lưu tại `Backup/after_url_normalization_2026-11-18/`).
> Tài liệu này đối chiếu kết quả của **Phương án 1** (chuẩn hoá URL bỏ `http(s)/ftp` + `www.`, bỏ `has_https`, còn 31 đặc trưng, huấn luyện riêng trên `dataset1`) với Baseline ban đầu (`Reports/baseline_truoc_chuan_hoa_url.md`), đồng thời phân tích nguyên nhân dẫn tới **Phương án 2** (tách `domain_hyphens` / `path_hyphens`, hợp nhất `dataset1` + `dataset2` thành bộ 4 nhãn `merged_dataset`, và giữ đặc trưng chuyên môn).

---

## 1. Những gì Phương án 1 ĐÃ giải quyết được

1. **Triệt tiêu hoàn toàn hiện tượng học tắt (Shortcut Learning) theo `https://` và `www.`:**
   - Ba biến thể của cùng một trang web lành tính (`https://www.facebook.com/`, `http://facebook.com`, `facebook.com`) sau khi qua `normalize_url` đều đưa về cùng một dạng chuẩn và cho **cùng một điểm dự đoán duy nhất**.
   - Các URL lành tính phổ biến có `https://` không còn bị báo nhầm là `malware` / `phishing` vì đặc trưng `has_https`.
2. **Thống kê dữ liệu sau chuẩn hoá mới (`analysis.ipynb`):**
   - `dataset1_clean.csv`: loại bỏ **15.966** dòng trùng lặp sau chuẩn hoá (tăng ~2.000 dòng so với bản cũ), còn **635.225** dòng (`benign`: 423.147 · `defacement`: 95.308 · `phishing`: 93.177 · `malware`: 23.593).
   - `dataset2_clean.csv`: còn **125.040** dòng (`0`: 70.742 · `1`: 54.298).

---

## 2. Kết quả thực nghiệm của Phương án 1 (31 đặc trưng)

### 2.1 So sánh độ chính xác 16 mô hình trên Validation (`Models/model_comparison.csv`)

| Mô hình | Dataset 1 (Trước chuẩn hoá - 32 feat) | Dataset 1 (Sau chuẩn hoá - 31 feat) | Chênh lệch (Dataset 1) | Dataset 2 (Sau chuẩn hoá - 31 feat) |
|---|---|---|---|---|
| bagging | 0.9160 | **0.8749** | -4.11% | 0.9601 |
| random_forest | 0.9109 | **0.8747** | -3.62% | **0.9623** |
| knn | 0.9038 | 0.8694 | -3.44% | 0.9498 |
| xgboost | 0.9009 | 0.8625 | -3.84% | 0.9590 |
| lightgbm | 0.8987 | 0.8596 | -3.91% | 0.9541 |
| decision_tree | 0.8794 | 0.8413 | -3.81% | 0.9463 |
| gradient_boosting | 0.8616 | 0.8185 | -4.31% | 0.9201 |
| extra_trees | 0.8568 | 0.7988 | -5.80% | 0.9492 |
| adaboost | 0.7808 | 0.7682 | -1.26% | 0.8634 |
| svc_poly | 0.8054 | 0.7432 | -6.22% | 0.9220 |
| nusvc | 0.8198 | 0.7294 | -9.04% | 0.8816 |
| sgd | 0.7828 | 0.7248 | -5.80% | 0.8588 |
| svm | 0.7726 | 0.7237 | -4.89% | 0.8499 |
| svc_rbf | 0.8097 | 0.7174 | -9.23% | 0.9313 |
| logistic_regression_custom_manual | 0.7694 | 0.6978 | -7.16% | – |
| logistic_regression | 0.6772 | 0.5509 | -12.63% | 0.8561 |

> **Nhận xét:** Độ chính xác trên `dataset1` giảm ~3,6% – 4,1% ở nhóm mô hình cây/ensemble. Điều này chứng minh bản cũ đã dựa vào "đường tắt" `http(s)://` và `www.` để đoán nhãn trên `dataset1`. Trong khi đó, `dataset2` gần như giữ nguyên độ chính xác (~96,2%).

---

### 2.2 Xếp hạng đồng thuận SHAP (Tier 1 - 8 mô hình) & Chọn đặc trưng

Top 15 đặc trưng quan trọng nhất theo đồng thuận SHAP trên `dataset1` (31 đặc trưng):

| Hạng | Đặc trưng | mean_rank | mean_norm_shap | n_models_top10 | Ghi chú |
|---|---|---|---|---|---|
| 1 | `num_slashes` | 3.00 | 0.1057 | 8 | Tăng từ hạng 1 (3.75 → 3.00) |
| 2 | `path_depth` | 5.75 | 0.0912 | 7 | Tăng từ hạng 5 → 2 |
| 3 | `num_query_params` | 7.50 | 0.0472 | 7 | |
| 4 | **`num_hyphens`** | **7.50** | **0.0505** | **5** | **Leo lên Top 1 của cả LightGBM và XGBoost!** |
| 5 | `url_entropy` | 7.75 | 0.0425 | 7 | |
| 6 | `path_length` | 9.88 | 0.0561 | 4 | |
| 7 | `digit_ratio` | 10.12 | 0.0551 | 4 | |
| 8 | `url_length` | 10.12 | 0.0350 | 4 | |
| 9 | `num_dots` | 10.75 | 0.0511 | 5 | |
| 10 | `num_digits` | 10.75 | 0.0354 | 3 | |
| 11 | `special_char_ratio` | 13.12 | 0.0313 | 2 | |
| 12 | `avg_token_length` | 13.25 | 0.0276 | 4 | |
| 13 | `num_subdomains` | 14.00 | 0.0276 | 3 | Tụt từ hạng 2 (4.25) xuống hạng 13 sau khi bỏ `www.` |
| 14 | `consonant_ratio` | 14.12 | 0.0426 | 3 | |
| 15 | `num_underscores` | 14.25 | 0.0277 | 1 | |

* **Kết quả Feature Selection (`Models/final_features.json`):**
  * Số đặc trưng tối ưu tăng từ `k = 20` lên **`k = 25`** (giảm 19% số đặc trưng).
  * 6 đặc trưng bị loại: `num_at`, `is_suspicious_tld`, `has_port`, `has_fragment`, `is_shortened_url`, `has_suspicious_word`.

---

### 2.3 Hiệu năng mô hình triển khai (LightGBM, k = 25) & Ngưỡng quyết định

**Classification Report trên nửa B của tập Validation (50.818 mẫu):**

| Lớp | Precision | Recall (Trước) | Recall (Sau) | F1-score | Support |
|---|---|---|---|---|---|
| benign | 0.8529 | 0.9623 | **0.9617** | 0.9040 | 33 852 |
| defacement | 0.8869 | 0.7864 | **0.7301** | 0.8009 | 7 624 |
| malware | 0.9735 | 0.8567 | **0.8353** | 0.8991 | 1 888 |
| **phishing** | 0.8169 | 0.7237 | **0.5207** ⚠️ | **0.6360** | 7 454 |
| **accuracy** | | | **0.8576** | | 50 818 |
| **macro avg** | 0.8825 | 0.8323 | **0.7619** | **0.8100** | 50 818 |

**Bảng ngưỡng theo `malicious_score = 1 - P(benign)`:**
* Ngưỡng chọn cho `deploy_bundle.pkl`: **`TAU_HIGH = 0.71`** (FPR = 0.0097, TPR = 0.5411, Precision = 0.9655), **`TAU_LOW = 0.55`** (FPR = 0.0393, TPR = 0.6687).

---

## 3. Phân tích các vấn đề nghiêm trọng còn tồn tại (Lý do phải chuyển sang Phương án 2)

Khi kiểm thử thực tế qua `Api/test_api.py`, URL độc hại số 8:
`http://secure-login.paypal.com.verify-account.tk/signin?id=1`
lại bị dự đoán là **lành tính (`green`)**. Kết hợp với việc **Recall của lớp `phishing` tụt mạnh xuống chỉ còn 52,07%** và số lượng mẫu khó (`hard_cases`) của lớp `phishing` tăng vọt từ 2.530 lên **3.949 mẫu**, nguyên nhân gốc rễ nằm ở 3 điểm sau:

### Vấn đề 1: Đặc trưng `num_hyphens` trộn lẫn 2 tín hiệu ngược chiều nhau (Domain vs Path)
* Sau khi bỏ `has_https` và `www.`, `num_hyphens` leo lên **Top 1 đặc trưng quan trọng nhất của cả LightGBM và XGBoost** (và cũng là **Top 1 đặc trưng gây đoán sai** trên tập `hard_cases` của LightGBM!).
* Thống kê trực tiếp trên `dataset1_clean.csv` cho thấy dấu gạch ngang `-` mang ý nghĩa **trái ngược hoàn toàn** tuỳ theo vị trí:

| Nhãn (`dataset1`) | Trung bình dấu `-` trong **Domain** | Trung bình dấu `-` trong **Path** | Tổng `num_hyphens` |
|---|---|---|---|
| `benign` | 0.101 (chỉ 6,5% URL có) | **1.750** (slug bài báo/SEO) | **1.855** |
| `phishing` | **0.200** (13,4% URL có — gấp đôi benign) | 0.268 | **0.464** |
| `malware` | 0.147 | 0.204 | 0.353 |
| `defacement` | 0.217 | 1.475 | 1.691 |

* **Hệ quả:** Dấu `-` ở tên miền (`secure-login`, `verify-account`) là dấu hiệu giả mạo thương hiệu rõ rệt của phishing, nhưng khi cộng gộp với dấu `-` ở đường dẫn thành `num_hyphens`, trung bình của `benign` (1,855) lại cao gấp 4 lần `phishing` (0,464). Mô hình học quy tắc *"càng nhiều dấu `-` càng lành tính"*, dẫn tới việc 2 dấu `-` trong tên miền của URL số 8 kéo mạnh dự đoán về phía `benign`!

### Vấn đề 2: `dataset1` thiếu mẫu Phishing hiện đại, trong khi `dataset2` có sẵn nhưng lại bị bỏ phí
* Trong `dataset1`, lớp `phishing` chỉ chiếm 14,7% (93k mẫu so với 423k mẫu `benign`), đa số là mẫu cũ:
  * Chỉ **13,4%** mẫu phishing trong `dataset1` có dấu `-` ở domain.
  * Chỉ **2,5%** mẫu phishing dùng TLD đáng ngờ (`.tk`, `.xyz`, `.top`...).
  * Chỉ **1,6%** mẫu phishing có dạng 1 cấp đường dẫn kèm query (`/signin?id=1`).
* Ngược lại, trong `dataset2` (54.298 mẫu phishing):
  * Có tới **40,7%** mẫu phishing chứa dấu `-` ở domain (trung bình 0,527 — cao gấp 3 lần `dataset1`).
  * Số subdomain trung bình là **0,946** (so với 0,594 của `dataset1`).
  * TLD đáng ngờ chiếm **6,1%** ở phishing và **0,0%** ở benign (độ chính xác phân loại gần như tuyệt đối).
* Trước đây, nhánh `merged_dataset.csv` lại gộp dưới dạng nhị phân (`0/1`) và không được nối vào `modeling.ipynb` hay `explainability.ipynb`, gây lãng phí toàn bộ nguồn dữ liệu quý giá của `dataset2`.

### Vấn đề 3: Hai đặc trưng chuyên môn (`is_suspicious_tld`, `has_suspicious_word`) bị loại ở bước chọn đặc trưng
* Vì tần suất xuất hiện trên toàn bộ tập Validation không cao (hiếm nhưng độ đặc hiệu cao), điểm trung bình `mean(|SHAP|)` của `is_suspicious_tld` (hạng 27/31) và `has_suspicious_word` (hạng 26/31) thấp nên bị loại khỏi `k = 25`.
* Khi thiếu 2 đặc trưng này, mô hình hoàn toàn "mù" trước đuôi tên miền miễn phí `.tk` và các từ khoá nhạy cảm `secure`, `login`, `verify`, `account` trong URL số 8.

---

## 4. Giải pháp chuyển tiếp sang Phương án 2

1. **Tách `num_hyphens` thành 2 đặc trưng độc lập:**
   - `domain_hyphens`: số dấu `-` trong phần tên miền `_domain(u)` (bắt trực tiếp hành vi giả mạo thương hiệu).
   - `path_hyphens`: số dấu `-` trong phần đường dẫn `_parse(u).path` (nhận diện đường dẫn bài viết).
2. **Hợp nhất `dataset1` và `dataset2` thành bộ dữ liệu 4 nhãn duy nhất (`merged_dataset.csv`):**
   - Giữ nguyên 4 nhãn của `dataset1` (`benign`, `defacement`, `malware`, `phishing`).
   - Lọc bỏ ~849 dòng `benign` lỗi có chứa `@` ở domain trong `dataset2`, sau đó ánh xạ `0 -> 'benign'`, `1 -> 'phishing'` và gộp chung với `priority_map` ưu tiên nhãn độc hại.
   - Huấn luyện và giải thích mô hình trực tiếp trên tập `merged` (tăng lượng mẫu phishing lên ~147.000 mẫu, giàu mẫu tấn công hiện đại).
3. **Bắt buộc giữ (`force keep`) `is_suspicious_tld` và `has_suspicious_word`** trong danh sách `SELECTED_FEATURES` sau bước chọn đặc trưng bằng SHAP.
