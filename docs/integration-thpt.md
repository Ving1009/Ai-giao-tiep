# Adapter hướng Tính Điểm THPT (CHƯA tích hợp)

Repository tinhdiemthpt được kiểm tra ở chế độ CHỈ ĐỌC ngày 2026-10-17.
Không có thay đổi hay triển khai sang site chính.

Quan sát:
- public/js/assistant.js gửi POST /api/assistant-chat với question, history,
  context.localSummary/cards và hiển thị data.answer từ {success:true,data:...}.
- public/js/core/localAdmissionsAssistant.js cung cấp knowledge cục bộ,
  card trường/ngành và trả lời hướng dẫn có sẵn.
- server/configuredAssistant.js lựa chọn provider dựa trên môi trường.
- worker/assistantApi.js là endpoint Cloudflare tương ứng.
- Tuyển sinh năm 2026 là dữ liệu THAM KHẢO khi định hướng năm 2027.

Đã thêm integrations/thpt/adapter.mjs để chứng minh hợp đồng
{answer, provider, model} mà không sửa website chính.

Khi được cho phép:
1. Thêm cấu hình provider riêng trong server/configuredAssistant.js hoặc
   service tương đương cho Cloudflare Worker, không sửa UI.
2. Provider gọi API trung gian do chủ sở hữu kiểm soát, truyền
   question/history và truyền metadata nguồn từ dữ liệu tuyển sinh đáng tin.
3. Không đưa token inference vào browser; secrets thuộc môi trường máy chủ.
4. Giữ answerAssistantQuestion / tính điểm xác định và các card/dẫn nguồn.
5. Phân biệt status official/reference/pending/unpublished và năm áp dụng.
6. Test hợp đồng /api/assistant-chat (success/data/answer), cập nhật Worker
   nếu có thay đổi, kiểm chứng quyền hạn trước triển khai thật.
7. Chỉ cho phép rollout sau khi mô hình và RAG có đánh giá thực tế.

Hiện adapter chưa xử lý RAG/công thức điểm và chủ động không coi
context.localSummary là dữ liệu đã xác minh.
