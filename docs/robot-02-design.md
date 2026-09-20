# Robot 02 — hồ sơ thiết kế cá nhân

Bản bố trí trong Robot Studio được tạo từ `personal_robot_requirements.md` do người dùng cung cấp. Bản gốc được giữ tại `public/documents/robot-02-original-requirements.md`. Đây là thiết kế bố trí và quản lý vật tư, chưa phải CAD chế tạo hoặc robot vật lý đã nghiệm thu.

## Cấu hình đã dựng

- 4WD skid-steering: bốn động cơ TT, bốn bánh Ø65, hai nhóm điều khiển trái/phải.
- Khung acrylic chữ U MKE-R01, khay hai cell 18650 nối tiếp phía sau; dung lượng bộ 2S vẫn là 2,5 Ah.
- MKE-K01 ESP32-S3 N4 đặt trên MKE-B01; MKE-M17 có đường VIN motor và nguồn logic 5 V riêng; MKE-S01 ở trước.
- Galaxy Note 9 nằm ngang, camera sau hướng trước và chúc xuống 35° so với phương ngang của trục camera. Gá, chân đế và trụ đỡ mới là phương án sơ bộ cần gia công.
- 70 instance, 32 loại vật tư, 7 cụm; 27 chi tiết dựng 3D. Vật tư chưa chọn mẫu chỉ xuất hiện trong BOM và hồ sơ, không được dựng thành thiết bị thật giả định.
- Đồ có sẵn được nhập theo tài liệu. Vật tư con trong MKE-R01 tính vào giá/khối lượng cả kit; không thu tiền lại bốn motor và bốn bánh. Sạc hai ngăn nằm ngoài xe.

Hộp bao bố trí theo kích thước khai báo khoảng **212 × 176 × 174,1 mm** (dài × rộng × cao). Đây là ước lượng từ hộp bao chi tiết có xoay; không kiểm tra va chạm, sai số hoặc chi tiết nhô nhỏ. Ẩn và tách mô hình không thay đổi hộp bao lắp thật.

## Các khác biệt cần giải quyết

| Mục            | Tài liệu gốc                          | Đối chiếu và quyết định                                                                                                                                                          |
| -------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MKE-R01        | 256 × 160 × 65 mm                     | Hshop ghi bộ 190 × 170 × 120 mm, phần khung U 190 × 125 × 30 mm. Dựng theo nguồn nhà cung cấp và giữ trạng thái chưa xác nhận phiên bản. Nếu đo dài 256 mm thì vượt trần 250 mm. |
| MKE-M17        | 2,5–12 V; sơ đồ ghi VCC chung         | Module có VIN motor 6–9 V và logic 5 V riêng; không dùng dải điện áp của riêng IC thay cho module.                                                                               |
| MKE-B01        | VIN 6–12 V                            | Theo hãng: 7–24 V. Phân tích 2S trong dải giả định 6–8,4 V phát hiện không đủ VIN khi pin giảm. 6 V không phải ngưỡng cắt pin được phê duyệt.                                    |
| Dòng motor     | 400 mA có tải/motor                   | 2 motor/bên ≈0,8 A đã bằng định mức liên tục một kênh MKE-M17; chưa biết dòng khởi động/kẹt trục. Không đưa dòng điển hình vào trường dòng cực đại để làm kiểm tra đạt giả.      |
| MKE-S01        | GPIO10 TRIG, GPIO11 ECHO              | Giữ gán chân dự kiến. Hãng công bố hỗ trợ 3,3/5 V; mức ECHO trên bo đang có vẫn cần đối chiếu/đo.                                                                                |
| Note 9 / ESP32 | Wi-Fi hoặc Bluetooth serial           | Ưu tiên Wi-Fi WebSocket. ESP32-S3 hỗ trợ BLE, không có Bluetooth Classic SPP. Firmware và ứng dụng Android chưa được triển khai hoặc đo trên máy.                                |
| Thử tải        | Đặt Note 9 và quả cân tổng 1kg lên xe | Dùng trần 1kg **toàn xe** theo yêu cầu; không cộng thêm tải 1kg.                                                                                                                 |
| Runtime        | 75–80 phút, kết luận đạt              | Giữ là ước tính. 2,5 Ah × 80% / 1,2–1,8 A → khoảng 67–100 phút. Chưa gồm LiDAR/hút, điều kiện VIN và pin Note 9.                                                                 |

Kit ~500 g và Note 9 201 g cho tổng số liệu hiện biết 701 g; còn 14 instance đang lắp thiếu khối lượng. Không dùng tổng chưa đủ này để kết luận đạt 1kg.

## Phần chưa chốt

Nguồn logic ổn định, bảo vệ pin/cầu chì, ngàm tháo nhanh, gá Note 9, LiDAR, odometry/IMU, chổi, quạt hút/hộp bụi/lọc cần chọn hoặc gia công. BOM có **10 mục cần mua chưa có giá**; chi phí mua đã biết 0đ là do linh kiện có giá đều đã sở hữu, không phải chi phí hoàn thiện bằng 0. Ngân sách 1–1,5 triệu được tạm hiểu là chi thêm, chưa xác nhận đủ.

Gá camera nhìn sàn không bảo đảm nhìn được người trên giường. Phải thử/đổi góc, hoặc bổ sung cơ cấu đổi góc. Sonar phía trước không đủ để xác nhận tự hành/SLAM hoặc tránh mọi điểm mù.

Ứng dụng có 10 mục nhật ký, ban đầu đều **Chưa thử**. Ghi ngày, kết quả và ghi chú được lưu với robot, xuất cùng JSON. Đánh dấu kết quả không tự biến kiểm tra dữ liệu thành chứng nhận phần cứng.

## Nguồn đối chiếu ngày 20/09/2026

- [Hshop — MKE-R01](https://hshop.vn/khung-xe-mke-r01-4wd-robot-car-chassis-tt-motor)
- [Hshop — MKE-M17](https://hshop.vn/mach-dieu-khien-dong-co-dc-mke-m17-l9110-i2c-motor-driver-module)
- [MakerEDU — MKE-B01](https://github.com/makereduvn/MKE-B01-ESP32-S3-DK-IO-SHIELD)
- [MakerEDU — MKE-S01](https://github.com/makereduvn/MKE-S01-ULTRASONIC-DISTANCE-SENSOR)
- [Samsung — Note 9](https://www.samsung.com/my/support/mobile-devices/what-is-the-difference-between-the-galaxy-note8-and-note9/)
- [Espressif — ESP32-S3 Bluetooth](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-guides/ble/overview.html)

Kích thước riêng của các bo, tọa độ gá, bộ phận gia công và một số hình bao là ước lượng, có nhãn trong phần thông tin linh kiện. Chưa có đo thực tế; không đánh dấu toàn bộ linh kiện là “đã xác minh”.

## Cách sử dụng và xuất dữ liệu

Robot 02 đã được áp dụng từ thư viện mà vẫn giữ ID; Rover 01 được giữ nguyên. Thao tác áp dụng lưu JSON thiết kế trước đó tại `robot-studio.before-personal.<robot-id>`. Nút **Tải bản dự phòng trước khi cập nhật** trong danh sách robot xuất bản này; nhập JSON sẽ mở thành robot độc lập.

Mẫu mới nằm tại `src/data/personalRobot.ts`; dựng hình tại `src/scene/geometry.ts`; kiểm tra thiết kế tại `src/domain/design.ts`. Các trường mở rộng tùy chọn giữ khả năng đọc dự án schemaVersion 1 cũ: `design`, `includedIn`, `dimensionBasis`, `placement`, `Connection.channel`; `massG: null` biểu thị thiếu số liệu. Parser kiểm tra tham chiếu kit và số lượng con không vượt nội dung kit.

Chạy `pnpm export:robot02` để tạo JSON/CSV mẫu trong `public/documents/`. Đây là bản mẫu, không lấy chỉnh sửa đang lưu trong trình duyệt; dùng nút Lưu JSON / Xuất BOM trong ứng dụng để xuất bản đang chỉnh.
