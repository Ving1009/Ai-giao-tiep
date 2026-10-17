# AI Giao Tiếp

Giao diện web thử nghiệm để phát triển AI giao tiếp tiếng Việt trong tương lai.

**Lưu ý:** Hiện tại chưa có AI thật, backend hay API. Tin nhắn phản hồi được sinh từ hàm JavaScript **mockReply()** theo các kịch bản viết sẵn.

## Chạy thử

1. Clone hoặc tải repository.
2. Mở **index.html** trên trình duyệt (không cần cài thư viện, chạy npm hay máy chủ).
3. Nhập nội dung, nhấn Enter để gửi; Shift + Enter để xuống dòng.

Trang có thể triển khai bằng GitHub Pages hoặc dịch vụ hosting tĩnh khác sau khi cấu hình hosting.

## Tính năng

- Giao diện chat responsive trên điện thoại và máy tính.
- Gửi tin nhắn, phản hồi giả lập và hiệu ứng đang trả lời.
- Hội thoại mới, chọn lịch sử, xóa tin nhắn hiện tại.
- Lưu tối đa 20 hội thoại trong localStorage (trên trình duyệt của thiết bị, không gửi về server).
- Tin nhắn được hiển thị an toàn bằng textContent.

## Cấu trúc

- **index.html**: bố cục.
- **styles.css**: thiết kế, responsive.
- **app.js**: quản lý trạng thái, lịch sử và phản hồi mẫu.

## Bước phát triển tiếp theo

Thay **mockReply()** trong app.js bằng lời gọi tới backend chạy mô hình AI. Không để API key ở frontend. Khi thêm máy chủ, cần cập nhật thông báo quyền riêng tư và trạng thái kết nối AI.

Xóa dữ liệu trang web sẽ xóa lịch sử demo trong trình duyệt.
