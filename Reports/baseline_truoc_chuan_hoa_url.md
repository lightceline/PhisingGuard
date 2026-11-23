# Baseline: kết quả TRƯỚC khi chuẩn hoá URL (bỏ scheme + `www.`, bỏ `has_https`)

> Ghi lại ngày 15/11/2026, trước khi chạy lại pipeline với `normalize_url` mới.
> Mọi số liệu dưới đây lấy từ output đã lưu trong notebook và các file `Models/*.csv`, `Models/final_features.json` tại thời điểm này.
> Dùng file này để so sánh **trước / sau** trong báo cáo.

---

## 1. Vấn đề phát hiện được (lý do thay đổi)

**Triệu chứng khi thử API / notebook với URL thật:**
- Phần lớn URL **lành tính** dạng `https://...` bị dự đoán là **malware / phishing**.
- Lý do top 1 (SHAP) luôn là **`has_https`**, mức đóng góp khoảng **3**.
- Đổi cùng URL đó sang `http://...` thì model lại dự đoán **benign**.

**Nguyên nhân: shortcut learning do artifact khi thu thập dữ liệu**

Phân bố scheme trong `Data/Raw/dataset1.csv`:

| Nhãn | `https://` | `http://` | Không có scheme |
|---|---|---|---|
| benign | 1 950 (0,5%) | 33 428 | 392 725 (91,7%) |
| phishing | 6 966 | 17 886 | 69 259 |
| malware | 6 764 | 24 546 | 1 210 |
| defacement | 0 | 96 457 | 0 |

- `analysis.ipynb` (bản cũ) **gắn `http://`** vào mọi URL không có scheme, nên khi train, 91,7% URL benign có dạng `http://...`.
- Trong số các URL có `https://`, chỉ khoảng 12% là benign. Từ đó model học được quy tắc: **`http://` → lành tính, `https://` → độc hại** (ngược với thực tế).
- Giá trị trung bình của `has_https` theo lớp (EDA, dataset1): benign 0,005 | defacement 0,000 | malware 0,285 | phishing 0,074.
- Dataset2 không bị lệch scheme (`has_https` trung bình: benign 0,874 | phishing 0,896), nhưng lại lệch về **`www.`**: benign 47,5% so với phishing 3,0%.
- Dataset1 lệch `www.` theo **chiều ngược lại**: benign 3,1% | phishing 38,8% | defacement 69,8% | malware 9,3%.

Holdout và val được tách từ cùng phân bố này nên **không phát hiện được lỗi**. Lỗi chỉ lộ ra khi thử URL ngoài thực tế, và SHAP đã chỉ ra đúng chỗ.

---

## 2. Dữ liệu (bản cũ: chỉ gắn `http://` khi thiếu scheme)

| Bước | Dataset1 | Dataset2 | Merged |
|---|---|---|---|
| URL thiếu scheme được gắn `http://` | 463 192 (71,1%) | 0 | 463 163 (60,1%) |
| Bị loại khi dedup lại sau normalize | 14 012 | 19 950 | 3 948 |
| Số dòng sau khi làm sạch | 637 179 | 129 776 | 766 882 |
| Train (80%) | 509 743 | 103 820 | 613 505 |
| Holdout (20%) | 127 436 | 25 956 | 153 377 |

Phân bố nhãn của Dataset1 sau khi làm sạch: benign 424 134 (66,56%) · defacement 95 308 (14,96%) · phishing 94 092 (14,77%) · malware 23 645 (3,71%).

Số feature: **32** (trong đó có `has_https`).

---

## 3. So sánh model (`Models/model_comparison.csv`, accuracy trên val)

| Model | Dataset1 (4 lớp) | Dataset2 (2 lớp) |
|---|---|---|
| bagging | **0.9160** | 0.9613 |
| random_forest | 0.9109 | **0.9630** |
| knn | 0.9038 | 0.9492 |
| xgboost | 0.9009 | 0.9590 |
| lightgbm | 0.8987 | 0.9540 |
| decision_tree | 0.8794 | 0.9436 |
| gradient_boosting | 0.8616 | 0.9200 |
| extra_trees | 0.8568 | 0.9470 |
| nusvc | 0.8198 | 0.8892 |
| svc_rbf | 0.8097 | 0.9321 |
| svc_poly | 0.8054 | 0.9198 |
| sgd | 0.7828 | 0.8577 |
| adaboost | 0.7808 | 0.8610 |
| svm | 0.7726 | 0.8468 |
| logistic_regression_custom_manual | 0.7694 | – |
| logistic_regression | 0.6772 | 0.8538 |

---

## 4. SHAP: tầm quan trọng của feature (Dataset1, 32 feature)

### 4.1 Vị trí của `has_https` trong top 15 của từng model (Tier 1, val set)

| Model | Hạng của `has_https` | Top 1 |
|---|---|---|
| decision_tree | 8 | num_dots |
| random_forest | 7 | num_subdomains |
| xgboost | 8 | num_subdomains |
| lightgbm | 7 | num_subdomains |
| extra_trees | **3** | num_subdomains |
| logistic_regression_custom_manual | 6 | num_slashes |
| svm | 15 | letter_ratio |
| sgd | 15 | num_slashes |

### 4.2 Xếp hạng đồng thuận (8 model), top 12

| # | Feature | mean_rank | mean_norm_shap | n_models_top10 |
|---|---|---|---|---|
| 1 | num_slashes | 3.75 | 0.1015 | 8 |
| 2 | num_subdomains | 4.25 | 0.0798 | 7 |
| 3 | num_query_params | 6.12 | 0.0462 | 8 |
| 4 | path_length | 7.62 | 0.0522 | 5 |
| 5 | path_depth | 7.62 | 0.0898 | 5 |
| 6 | **has_https** | **8.62** | 0.0399 | 6 |
| 7 | num_dots | 9.50 | 0.0620 | 5 |
| 8 | num_hyphens | 9.75 | 0.0395 | 6 |
| 9 | digit_ratio | 11.62 | 0.0462 | 3 |
| 10 | num_digits | 12.25 | 0.0307 | 4 |
| 11 | vowel_ratio | 12.25 | 0.0473 | 3 |
| 12 | url_length | 12.62 | 0.0288 | 3 |

> Lưu ý: `num_slashes`, `num_subdomains` (bị `www.` làm tăng thêm 1), `url_length` và `num_dots` cũng chịu ảnh hưởng của scheme / `www.`, nên tầm quan trọng của chúng có thể đã bị thổi phồng.

### 4.3 Hard cases (7 122 mẫu mà nhiều model đoán sai)
- Phân bố: defacement 2 596 · phishing 2 530 · benign 1 464 · malware 532.
- Top feature khi đoán sai **không đổi** so với lúc bình thường ở 6/8 model (chủ yếu là `num_subdomains`).
- Ca tệ nhất: `http://www.walldesk.net/default.asp?l=EN` (thật: phishing), **16/16 model đoán sai**.

---

## 5. Feature selection (`feature_selection_results_v2.csv`)

Tiêu chí: macro-F1 ≥ 99% so với bản đủ feature **và** recall của mọi lớp không giảm quá 2 điểm %, áp dụng cho cả 3 model.

| k | LightGBM macro-F1 | XGBoost macro-F1 | DecisionTree macro-F1 | Đạt trên cả 3? |
|---|---|---|---|---|
| 5 | 0.6988 | 0.7011 | 0.7019 | ✗ |
| 8 | 0.7822 | 0.7800 | 0.7906 | ✗ |
| 10 | 0.8240 | 0.8268 | 0.8249 | ✗ |
| 12 | 0.8343 | 0.8389 | 0.8254 | ✗ |
| 15 | 0.8441 | 0.8484 | 0.8333 | ✗ |
| **20** | **0.8591** | **0.8642** | **0.8383** | ✓ |
| 25 | 0.8619 | 0.8659 | 0.8349 | ✓ |
| 32 | 0.8642 | 0.8660 | 0.8365 | ✓ |

Recall từng lớp (LightGBM, k=32): benign 0.9637 · defacement 0.7870 · malware 0.8604 · phishing 0.7288. Benign FPR = 0.0363.

**k tối ưu = 20** (giảm 38% số feature). Các feature giữ lại (`Models/final_features.json`):

```
num_slashes, num_subdomains, num_query_params, path_length, path_depth,
has_https, num_dots, num_hyphens, digit_ratio, num_digits, vowel_ratio,
url_length, url_entropy, domain_length, consonant_ratio, avg_token_length,
special_char_ratio, longest_token_length, has_ip_address, domain_entropy
```

Các feature bị loại: num_underscores, num_at, num_question_marks, num_equals, num_ampersands, num_percent, letter_ratio, is_suspicious_tld, has_port, has_fragment, is_shortened_url, has_suspicious_word.

---

## 6. Model triển khai (LightGBM, 20 feature) và ngưỡng

### 6.1 Classification report (nửa B của val, argmax)

| Lớp | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| benign | 0.9127 | 0.9623 | 0.9368 | 33 931 |
| defacement | 0.8794 | 0.7864 | 0.8303 | 7 625 |
| malware | 0.9777 | 0.8567 | 0.9132 | 1 891 |
| phishing | 0.8104 | 0.7237 | 0.7646 | 7 528 |
| **accuracy** | | | **0.8968** | 50 975 |
| macro avg | 0.8950 | 0.8323 | 0.8612 | |

Benign FPR (argmax) = 0.0377.

### 6.2 Bảng ngưỡng theo malicious score = 1 − P(benign)

| FPR mục tiêu (nửa A) | τ | FPR (B) | TPR (B) | Precision (B) |
|---|---|---|---|---|
| 0.005 | 0.87 | 0.0044 | 0.5730 | 0.9849 |
| **0.01** | **0.81** | **0.0088** | **0.6480** | **0.9736** |
| 0.02 | 0.71 | 0.0179 | 0.7374 | 0.9538 |
| 0.03 | 0.63 | 0.0285 | 0.7809 | 0.9323 |
| **0.04** | **0.55** | **0.0391** | **0.8184** | **0.9132** |
| argmax | – | 0.0377 | 0.8167 | 0.9158 |

Với τ = 0.81: FPR 95% CI [0.0080, 0.0098] · TPR 95% CI [0.6403, 0.6557].

**`deploy_bundle.pkl` (bản cũ):** `TAU_HIGH = 0.81`, `TAU_LOW = 0.55`, 20 feature (có `has_https`), 4 lớp `['benign', 'defacement', 'malware', 'phishing']`.

> Các con số ở mục 6 **chỉ đúng trong phân bố của dataset1**. Với URL thật dạng `https://` thì FPR thực tế cao hơn nhiều (xem mục 1).

---

## 7. Những gì thay đổi sau mốc này

1. `normalize_url`: bỏ `http(s)://`/`ftp://` và `www.`, chuyển host về chữ thường, gắn lại một scheme cố định `http://` (cả trong `analysis.ipynb` lẫn `Api/features.py`).
2. Bỏ feature `has_https`: còn **31 feature**.
3. Sửa lỗi `f_is_shortened_url`: `lstrip('www.')` xoá nhầm các ký tự `w`/`.` ở đầu domain.
4. Chạy lại toàn bộ: làm sạch dữ liệu → feature → EDA → modeling → SHAP → feature selection → chọn lại τ → `deploy_bundle.pkl`.

### Chỉ số cần so sánh sau khi chạy lại
- [ ] Số dòng bị loại khi dedup (dự kiến tăng vì nhiều URL trùng nhau sau chuẩn hoá)
- [ ] Accuracy và macro-F1 của từng model (dự kiến giảm nhẹ, nhưng phản ánh đúng năng lực thật)
- [ ] Recall của lớp defacement (dự kiến bị ảnh hưởng nhiều nhất: 100% là `http://`, 70% có `www.`)
- [ ] Xếp hạng đồng thuận SHAP mới và k tối ưu mới
- [ ] τ mới và FPR/TPR mới
- [ ] FPR trên tập URL lành tính thật dạng `https://` (trước và sau)

