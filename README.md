# AI Giao Tiếp — Qwen3 + TRL + Vercel

Dự án thử nghiệm AI giao tiếp tiếng Việt riêng cho hệ sinh thái Tính Điểm THPT.

## Trạng thái thực tế

- ✅ Frontend chat HTML/CSS/JS thuần, responsive, lưu hội thoại localStorage.
- ✅ Giao diện kết nối /api/chat và /api/health; **không còn mockReply()**.
- ✅ Vercel proxy giữ secret, FastAPI inference server tải mô hình open-weights.
- ✅ Script chuẩn bị dữ liệu, TRL SFT/LoRA, DPO tùy chọn, xuất adapter và eval.
- ✅ Dataset 35 mẫu hội thoại *chưa review* và 10 câu hỏi eval độc lập.
- ⏳ CHƯA chạy fine-tune, chưa có adapter do dự án này train.
- ⏳ CHƯA triển khai GPU inference, chưa xác nhận Vercel đã deploy bản này.
- ⏳ CHƯA tích hợp vào tinhdiemthpt.id.vn; repo chính chỉ được đọc.

Mô hình nền: [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) (Apache-2.0).
Hệ thống KHÔNG chuyển sang ChatGPT/Gemini/Groq khi model không khả dụng.

## Đọc tiếp

- [Kiến trúc](docs/architecture.md)
- [Huấn luyện](docs/training.md)
- [Triển khai](docs/deployment.md)
- [Đánh giá](docs/evaluation.md)
- [Định hướng tích hợp THPT](docs/integration-thpt.md)
- [Data card](training/datasets/DATA_CARD.md)
- [Notebook Colab](notebooks/train_colab.ipynb)

## Chạy frontend cục bộ

Mở index.html hoặc dùng một static server. Không có mô hình nối sẵn,
frontend sẽ hiển thị trạng thái chưa kết nối chứ không tự giả câu trả lời.

## Chạy kiểm tra CPU

node --test tests/test_proxy.js tests/test_thpt_adapter.mjs
python -m unittest discover -s tests -p "test_*.py"
python -m training.prepare_data

Python schema tests cần pydantic 2.x. Không cần GPU cho các bước này.

## Mục tiêu tiếp theo

Cấp quyền sử dụng GPU hợp lệ (có thể trên Colab), review/mở rộng dữ liệu,
chạy smoke 1 bước rồi fine-tune, kiểm chứng chất lượng base vs adapter và
triển khai inference server. Xem docs/deployment.md để thiết lập secret an toàn.
