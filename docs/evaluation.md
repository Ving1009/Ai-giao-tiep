# Đánh giá độc lập và tái lập

- Bộ eval độc lập: training/datasets/eval_cases.jsonl, 10 câu hỏi.
- Dataset huấn luyện tách train/validation/test theo hội thoại.
- Thu thập câu trả lời từ mô hình GỐC và SAU SFT bằng cùng câu hỏi:
  python -m training.evaluate --output training/output/base.jsonl --run-evaluation
  python -m training.evaluate --adapter training/output/qwen3-0.6b-vn-lora --output training/output/adapter.jsonl --run-evaluation
- Script chỉ ghi answer, latency_ms, model/version, error và trường
  quality_rating=null; KHÔNG tự chấm điểm hay tuyên bố tăng chất lượng.
- Dùng bảng đánh giá thủ công 1..5: tiếng Việt tự nhiên, hiểu ngữ cảnh,
  chính xác, nhận biết không chắc chắn, trích đúng năm/nguồn tuyển sinh,
  an toàn dữ liệu. Mỗi mục nên có ít nhất hai người đánh giá và ghi chú.
- Với tư vấn tuyển sinh, chạy kiểm chứng tool/source-year-status riêng.
  Mô hình không được tự suy ra điểm chuẩn, công thức là mã xác định.
- Chỉ tính tỷ lệ thành công, cải thiện, độ trễ sau khi có dữ liệu đo thật.
- Không dùng trực tiếp 35 mẫu nhỏ làm benchmark chất lượng.
