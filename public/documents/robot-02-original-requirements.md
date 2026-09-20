# Tài Liệu Yêu Cầu Kỹ Thuật & Thiết Kế Robot Cá Nhân (Personal Robot Specifications)

---

## 1. Chốt Yêu Cầu Sử Dụng (Robot Requirements)

* **Tác vụ chính:**
  * Di chuyển tự hành trong nhà (vẽ bản đồ SLAM, điều hướng tránh vật cản).
  * Nhận diện người nằm trên giường và phát âm thanh/chuông gọi thức dậy.
  * Nhận diện đồ vật/rác dưới sàn (thị giác máy tính).
  * Quét dọn / Hút bụi nhẹ (tác vụ thử nghiệm/prototype).
* **Loại sàn hoạt động:** Sàn gạch phẳng, sàn gỗ nội thất.
* **Khả năng vượt vật cản:** Vượt gờ/ngưỡng cửa thấp ($\le 5\text{ mm}$).
* **Tải trọng mang theo:** Tải trọng tối đa $0.8 - 1.0\text{ kg}$ (bao gồm Samsung Galaxy Note 9, khung xe, pin, cảm biến và module chức năng).
* **Kích thước tối đa:** $250\text{ mm} \times 220\text{ mm} \times 200\text{ mm}$ (Chiều dài $\times$ Chiều rộng $\times$ Chiều cao).
* **Thời lượng pin yêu cầu:** $60 - 90\text{ phút}$ hoạt động liên tục.
* **Ngân sách dự kiến:** $\approx 1.000.000 - 1.500.000\text{ VNĐ}$ (tận dụng tối đa linh kiện sẵn có).

---

## 2. Danh Sách Linh Kiện Đã Có (BOM Hiện Có)

| STT | Tên Linh Kiện / Mạch | Mã Chính Xác | Số Lượng | Thông Số / Datasheet Link | Ghi Chú Tận Dụng |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 1 | Khung xe 4WD Robot Car Chassis | MKE-R01 | 1 Bộ | [MKE-R01 Link](https://hshop.vn/products/khung-xe-mke-r01-4wd-robot-car-chassis-tt-motor) | Bao gồm 4 động cơ TT |
| 2 | Mạch phát triển ESP32-S3 Dev Kit - N4 | MKE-K01 | 1 Cái | [MKE-K01 Link](https://hshop.vn/products/mach-phat-trien-mke-k01-esp32-s3-dev-kit-n4) | Bo điều khiển cấp thấp (Low-level) |
| 3 | Mạch đế kết nối IO Shield | MKE-B01 | 1 Cái | [MKE-B01 Link](https://hshop.vn/products/mach-de-ket-noi-mke-b01-esp32-s3-dk-io-shield) | Mở rộng chân cắm dây |
| 4 | Cảm biến siêu âm | MKE-S01 | 1 Cái | [MKE-S01 Link](https://hshop.vn/products/cam-bien-sieu-am-mke-s01-ultrasonic-distance-sensor) | Đo khoảng cách né vật cản khẩn cấp |
| 5 | Mạch điều khiển động cơ DC I2C | MKE-M17 L9110 | 1 Cái | [MKE-M17 Link](https://hshop.vn/products/mach-dieu-khien-dong-co-dc-mke-m17-l9110-i2c-motor-driver-module) | Điều khiển động cơ qua I2C |
| 6 | Pin Sạc Li-Ion 18650 3.7V 2500mAh 10C | Sunpower 18650 | 2 Viên | [Sunpower 18650 Link](https://hshop.vn/products/pin-sac-18650-li-ion-3-7v-2500mah-10c-sunpower) | Nguồn hệ thống (Nối tiếp 2S = 7.4V) |
| 7 | Sạc pin 2 ngăn cổng USB | Lithium-ion Charger | 1 Bộ | [Charger Link](https://hshop.vn/products/sac-pin-2-ngan-cong-usb-lithium-ion) | Sạc pin ngoài |
| 8 | Điện thoại thông minh | Samsung Galaxy Note 9 | 1 Cái | Exynos 9810 / Snapdragon 845, 6GB RAM | Bộ não / High-level Compute (AI Vision/Voice) |
| 9 | Dây cắm Breadboard M-F | 20cm 40p | 1 Tép | Dây cáp dẹt | Tín hiệu |
| 10 | Dây điện đỏ đen | 1 mét | 2 Mét | Hàn động cơ & nguồn | Đi dây công suất |
| 11 | Đầu giắc DC 5.5 x 2.1mm (Cái & Đực) | DC Jack | 2 Cái | Cấp nguồn nhanh | Nối nguồn pin |

---

## 3. Phương Án Cơ Khí, Nguồn Điện & Tính Toán Thiết Kế

### 3.1. Lựa chọn cấu hình kiến trúc
* **Kiểu truyền động:** 4WD Skid-Steering (Trượt bánh khi quay) tận dụng khung MKE-R01.
* **Bố trí tải trọng:** 
  * *Tầng 1 (Đáy):* Động cơ TT, khối pin 2S 18650, mạch điều khiển động cơ L9110.
  * *Tầng 2 (Trung tâm):* Mạch ESP32-S3 + IO Shield, cảm biến siêu âm phía trước.
  * *Tầng 3 (Đỉnh):* Giá đỡ điện thoại Samsung Galaxy Note 9 đặt nghiêng góc $30^\circ - 45^\circ$ hướng về phía trước/xuống dưới.
* **Hệ thống điều khiển:**
  * **Cấp cao (High-Level):** Galaxy Note 9 (Chạy ứng dụng Android xử lý AI Vision YOLO, Speech-to-Text, phát loa báo thức, giao tiếp Wi-Fi WebSocket/Bluetooth).
  * **Cấp thấp (Low-Level):** ESP32-S3 (Chạy micro-ROS / Firmware nhận lệnh di chuyển `cmd_vel`, phát xung điều khiển động cơ L9110, đọc cảm biến siêu âm).

### 3.2. Tính toán Nguồn điện & Động cơ
* **Công suất tiêu thụ ước tính:**
  * 4 Động cơ TT Motor (không tải $\sim 150\text{mA}$, có tải $\sim 400\text{mA}$ mỗi động cơ): $I_{\text{motor}} \approx 1.6\text{A}$ (khi chạy tải full).
  * ESP32-S3 + Cảm biến: $I_{\text{MCU}} \approx 200\text{mA}$.
  * Tổng dòng tiêu thụ trung bình: $I_{\text{total}} \approx 1.2\text{A} - 1.8\text{A}$ tại $7.4\text{V}$.
* **Dung lượng Pin & Thời gian vận hành:**
  * Bộ pin 2S (7.4V - 2500mAh).
  * Thời gian chạy lý thuyết: $T = \frac{2500\text{mAh}}{1500\text{mA}} \approx 1.66\text{ giờ} \approx 100\text{ phút}$.
  * Thời gian thực tế (hiệu suất $80\%$): **$\sim 75 - 80\text{ phút}$** (Thỏa mãn yêu cầu $>60\text{ phút}$).

---

## 4. Dữ Liệu Linh Kiện Thực Tế (Bảng Kiểm Tra Thông Số Lắp Đặt)

| Linh Kiện | Kích Thước Thực ($L \times W \times H$) | Vị Trí Lỗ Lắp M2/M3 | Thông Số Điện / Cơ Khí | Giá Tham Khảo | Nguồn Trích Dẫn / Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Khung xe MKE-R01** | $256 \times 160 \times 65\text{ mm}$ | Lỗ M3 chuẩn gá khung | Mica trong, 4 bánh xe đường kính $65\text{ mm}$ | $245.000\text{ VNĐ}$ | HShop (Đã có) |
| **ESP32-S3 + Shield** | $60 \times 50 \times 15\text{ mm}$ | 4 lỗ góc M3 ($52 \times 42\text{ mm}$) | $5\text{V DC}$ qua Type-C / $6-12\text{V}$ qua giắc VIN | $320.000\text{ VNĐ}$ | HShop (Đã có) |
| **L9110 I2C Module** | $45 \times 35 \times 18\text{ mm}$ | 2 lỗ M3 | Áp hoạt động $2.5 - 12\text{V}$, dòng $0.8\text{A}$/kênh | $85.000\text{ VNĐ}$ | HShop (Đã có) |
| **Pin 18650 x2** | $\varnothing18 \times 65\text{ mm}$ (mỗi viên) | Khay pin 2S M3 | Dòng xả tối đa $10\text{C}$ ($25\text{A}$) | $90.000\text{ VNĐ}$ | HShop (Đã có) |
| **Galaxy Note 9** | $161.9 \times 76.4 \times 8.8\text{ mm}$ | Gá kẹp điện thoại | Nặng $201\text{g}$, Pin $4000\text{mAh}$ độc lập | Tận dụng | Sẵn có |
| **LiDAR 2D (Bổ sung)** | *Chưa xác định* | *Cần đo gá* | *Giao tiếp UART/USB, 5V* | $\approx 500k - 1.7M$ | **[CẦN TRA CỨU TRƯỚC KHI MUA]** |

---

## 5. Dựng Cấu Trúc Bố Trí Bề Mặt & Sơ Đồ Kết Nối (Layout & Wiring)

### 5.1. Bố trí không gian (Layout 3D)
* **Khoảng hở gầm xe (Ground Clearance):** $15\text{ mm}$ (đảm bảo không bị chạm gầm khi qua gờ).
* **Đường dây cáp:** Đi dây nguồn đường công suất ($22\text{ AWG}$) bên dưới khung sàn; dây tín hiệu I2C/Sensor ($28\text{ AWG}$) chạy dọc thân xe cách xa dây động cơ để tránh nhiễu điện từ.
* **Cơ cấu bảo trì Quick-Swap:** Khay pin 18650 đặt phía đuôi xe, hỗ trợ tháo lắp nhanh dạng ngàm bấm để rút pin ra sạc mà không cần tháo mạch điều khiển.

### 5.2. Sơ đồ kết nối điện (Wiring Matrix)

```
[Khối Pin 2S 7.4V] ───► [Công Tắc Nguồn] ───┬───► [L9110 Driver - Cổng VCC] (Động cơ)
                                             └───► [MKE-B01 Shield - Cổng VIN/DC] ───► [ESP32-S3]
                                                                                            │
                                                  ┌─────────────────────────────────────────┼────────────────────────────────────────┐
                                                  ▼                                         ▼                                        ▼
                                        [L9110 Driver (I2C)]                     [Ultrasonic MKE-S01]                     [Samsung Galaxy Note 9]
                                         - SDA  <───► GPIO 8                      - Trig <───► GPIO 10                     - Kết nối: Wi-Fi / Bluetooth
                                         - SCL  <───► GPIO 9                      - Echo <───► GPIO 11                     - Giao thức: WebSockets / Serial
                                         - GND  <───► GND                            - VCC  <───► 5V                          - Chức năng: Truyền lệnh di chuyển
                                                                                  - GND  <───► GND                            và nhận video stream
```

---

## 6. Quyết Toán Lắp Thử & Đo Kiểm Thực Tế (Testing & Validation Log)

### Bước 1: Kiểm thử độc lập từng cụm (Unit Test)
- [ ] **Kiểm tra khối nguồn:** Đo điện áp đầu ra khối pin 2S bằng đồng hồ VOM (Đạt yêu cầu nếu $7.2\text{V} - 8.4\text{V}$).
- [ ] **Kiểm tra động cơ & Driver L9110:** Nạp code test quay tiến/lùi/xoay cho 4 động cơ TT, xác nhận mạch L9110 không bị quá nhiệt.
- [ ] **Kiểm tra Cảm biến siêu âm:** Nạp code đọc khoảng cách từ MKE-S01, đối chiếu với thước đo thực tế từ $5\text{ cm} - 100\text{ cm}$.
- [ ] **Kiểm tra Camera & AI Note 9:** Chạy mô hình YOLOv8 Lite trên Android, đo FPS thực tế (Đạt yêu cầu nếu $\ge 15\text{ FPS}$).

### Bước 2: Kiểm thử toàn hệ thống có tải (System Integration Test)
- [ ] **Thử nghiệm tải trọng:** Đặt Note 9 và quả cân tổng trọng lượng $1.0\text{ kg}$ lên xe. Cho xe chạy liên tục $15\text{ phút}$.
- [ ] **Đo sụt áp:** Đo điện áp pin sau 15 phút chạy tải để tính tốc độ xả thực tế.
- [ ] **Đo bán kính vòng quay:** Kiểm tra độ lệch hướng khi trượt bánh (skid-steering) trên mặt sàn gạch và sàn gỗ để hiệu chỉnh hằng số góc quay trong code ESP32-S3.

### Bước 3: Cập nhật nhật ký kỹ thuật
* *Ngày kiểm thử:* ..... / ..... / 2026
* *Hiện tượng phát sinh:* ........................................................................................................
* *Phương án khắc phục:* ........................................................................................................