# Triển khai thử nghiệm (không thay đổi website chính)

## 1. GPU server (FastAPI)

Đòi hỏi một máy/instance có dung lượng RAM/VRAM đủ tải Qwen3-0.6B.
Không dùng Vercel Functions cho suy luận trực tiếp hoặc fine-tune.

Trên inference host riêng:
1. Cài Python 3.11+, các phụ thuộc trong inference/requirements.txt.
2. Cấu hình MODEL_API_TOKEN là một chuỗi bí mật dài; không commit secret.
3. BASE_MODEL_ID=Qwen/Qwen3-0.6B; MODEL_VERSION=qwen3-0.6b-base;
   MODEL_ADAPTER_PATH để trống nếu dùng base chưa fine-tune.
4. Khởi động từ thư mục repo:
   uvicorn inference.server:app --host 0.0.0.0 --port 8000
5. Đặt HTTPS reverse proxy bên ngoài, giới hạn quyền truy cập; backend
   không cho CORS trực tiếp cho browser.
6. Gọi GET /health bằng Authorization: Bearer <secret>; ready=true
   CHỈ khi tokenizer và trọng số đã tải xong.

Inference là một tiến trình tồn tại lâu dài, có GPU được cấp hợp pháp.
API có cơ chế timeouts và rate limits cơ bản; chưa có autoscale hay streaming.

## 2. Vercel

Kết nối repo Ving1009/Ai-giao-tiep với dự án Vercel tương ứng.
Chọn Root Directory là thư mục gốc, Framework Preset Other hoặc cấu hình
static + Vercel Functions. Tạo environment variables trong Vercel dashboard:

- INFERENCE_BASE_URL: URL HTTPS của inference host (không đặt /api/chat).
- INFERENCE_API_TOKEN: secret trùng MODEL_API_TOKEN trên inference host.
- PUBLIC_ORIGIN: https://aigiaotiep.vercel.app (tuỳ chọn; preview deployments
  có origin khác và sẽ bị từ chối nếu cố định PUBLIC_ORIGIN).

Redeploy và thử GET /api/health: ready chỉ khi mô hình đã tải.
Nếu chưa có inference server, trang hiện "Chưa kết nối mô hình AI",
gửi tin nhắn sẽ báo lỗi, KHÔNG sinh trả lời giả.

## 3. Kiểm tra đầu-cuối

- Kiểm tra build/log Vercel thực tế.
- Dùng smartphone gửi hai câu liên tiếp và đọc ngữ cảnh.
- Tắt FastAPI và xác nhận frontend báo lỗi, không giả AI.
- Kiểm tra 401 khi gọi FastAPI không có Authorization.
- Thử yêu cầu quá dài và nhiều lượt liên tục; đảm bảo 413/422/429/503 hợp lý.
- Kiểm tra mọi secret ở server env, không xuất hiện trong bundle browser.
- Đánh giá chi phí GPU chạy liên tục và thời gian startup.

Lưu ý: commit GitHub thành công KHÔNG chứng minh Vercel đã triển khai hoặc
mô hình đang hoạt động. Không ghi log nội dung câu hỏi cá nhân ở production.
