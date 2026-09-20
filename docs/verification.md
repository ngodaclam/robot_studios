# Kiểm tra Robot Studio

Thực hiện ngày 20/09/2026 trên máy cục bộ. Các phép thử dưới đây kiểm tra phần mềm. Robot 02 lấy yêu cầu từ tệp người dùng và có dữ liệu đối chiếu nhà cung cấp; chưa có phép đo phần cứng thật.

## Kiểm tra tự động

- TypeScript: `tsc -b` — đạt.
- Vitest: **34 tests, 1 file — đạt**.
- Vite production build — đạt, tạo `dist/`.
- Cài đặt được chốt bằng `pnpm-lock.yaml`; phông chữ được đóng gói cùng ứng dụng.

Các kiểm tra bao phủ gộp hai động cơ cùng định nghĩa, tổng phụ kiện, clamp số lượng cần mua, giá chưa biết khác giá bằng 0, số mục thiếu giá/xác minh, ẩn chi tiết không thay BOM, CSV UTF-8 và escape, sáu nhóm tương thích với dữ liệu đạt/không đạt/thiếu, dòng tổng/từng kênh, mất kết nối bắt buộc, JSON round-trip, dữ liệu sai, lỗi storage, tọa độ tách/lắp và tìm kiếm tiếng Việt có chữ Đ.

Fixtures tái sử dụng: `src/data/compatibilityFixtures.ts`. `compatibilityFixture('pass')`, `('fail')`, `('unknown')` đều trả về RobotProject để kiểm thử. Bộ “pass” đạt theo khai báo, không có nghĩa an toàn chế tạo.

## Kiểm tra trực tiếp trên trình duyệt

Trình duyệt nhúng của Codex, localhost:5173; đã thử desktop 1440 × 900 và điện thoại 390 × 844.

| Thao tác                | Kết quả quan sát                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Tải mô hình             | Canvas WebGL dựng 23 chi tiết, không có lỗi console được ghi nhận                            |
| Bấm trực tiếp bánh phải | Bảng thông tin và lựa chọn cây cùng chuyển sang Bánh xe phải                                 |
| Xem riêng               | Số chi tiết hiển thị từ 23 về 1, tự căn camera; trở lại phục hồi 23                          |
| Ẩn cụm truyền động      | 23 → 16; hiện lại → 23                                                                       |
| Ẩn từng bánh            | 23 → 22; hiện lại → 23                                                                       |
| Bấm đường ray tại 55%   | Thanh đổi sang 55%, tọa độ mesh bánh thay đổi                                                |
| Kéo thanh               | Đổi từ 55% tới 91%, các bộ phận tách theo hướng đã khai báo                                  |
| Phím End                | Thanh lên 100%                                                                               |
| Lắp lại                 | So sánh trực tiếp tọa độ 23 mesh: bằng chính xác tọa độ trước tách                           |
| Kéo camera              | Vị trí camera đổi; chi tiết đang chọn không đổi                                              |
| Góc nhìn trước/trên     | Góc được chọn và camera thay đổi                                                             |
| Sửa BOM                 | Động cơ: đã có 1, giá 100.000 VND → cần mua 1, thành tiền 100.000 VND                        |
| Giá trị âm              | Hiện lỗi tại ô; BOM vẫn dùng giá trị hợp lệ trước đó                                         |
| Lưu / tải lại trang     | Số lượng và giá động cơ giữ nguyên, tổng còn 1.281.000 VND                                   |
| JSON sai version        | Hiện lỗi và giữ nguyên dự án hiện tại                                                        |
| JSON hợp lệ             | Tên, BOM và tọa độ khung sửa thành [5, 53, 0] mm được mở đúng                                |
| Liên kết từ kiểm tra    | Chọn Cảm biến khoảng cách → trở lại mô hình với thông tin đúng chi tiết                      |
| Màn hình nhỏ            | Cây lắp ráp và thông tin mở/đóng; xem riêng hoạt động; không tràn ngang trang (390 / 390 px) |
| BOM trên điện thoại     | Bảng cuộn ngang riêng, không làm tràn cả trang                                               |
| WebMCP đọc BOM          | Đọc được số lượng/giá mới; đầu vào không đúng bị từ chối                                     |
| Khôi phục mẫu           | Có hộp xác nhận và nút tải bản JSON dự phòng                                                 |

Nút JSON/CSV tạo nội dung Blob và kích hoạt tải xuống. Công cụ trình duyệt nhúng không trả sự kiện download trong lần kiểm tra, nên chưa xác minh vị trí tệp tải trên đĩa bằng trình duyệt này. Nội dung xuất/nhập và CSV đã được kiểm tra tự động. Nếu trình duyệt nhúng không lưu tệp, mở localhost bằng trình duyệt thông thường để tải. Các thao tác cảm ứng đa điểm và pan bằng chuột phải dựa trên OrbitControls, chưa kiểm tra trên thiết bị cảm ứng vật lý.

Sau kiểm tra đã khôi phục lại robot mẫu; các thay đổi dùng để thử BOM không phải dữ liệu thiết kế bàn giao.

## Bổ sung quản lý nhiều robot

- Thêm 8 kiểm thử thư viện: tổng cộng **42 tests**. Bao phủ chuyển bản lưu cũ, sao chép độc lập, giữ thay đổi khi chuyển nhanh, round-trip toàn bộ danh sách và robot đang mở, khôi phục riêng một robot, nhập trùng ID, dữ liệu hỏng/giới hạn và ngăn tab cũ ghi đè bản lưu mới.
- Trình duyệt: tạo Robot 02 từ mẫu, giữ Rover 01; ẩn khung đáy ở Robot 02 còn 22 chi tiết, chuyển Rover 01 vẫn 23; quay lại Robot 02 vẫn 22. Đã hiện lại khung đáy sau kiểm tra. Tải lại trang vẫn có cả hai robot và Robot 02 đang được chọn.
- Thư viện lưu cục bộ theo trình duyệt. Nếu tab khác đã lưu phiên bản mới, tab cũ báo lỗi thay vì ghi đè; tải JSON để giữ chỉnh sửa riêng rồi tải lại trang.

## Bổ sung Robot 02 theo tài liệu cá nhân

- TypeScript và production build đạt. Tổng **53 tests / 3 files**: thêm 11 test cấu hình 4WD, JSON/CSV mẫu độc lập, BOM kit không tính trùng, khối lượng thiếu, xung đột VIN shield, dòng tổng trên mỗi kênh chung, cập nhật riêng robot đã chọn, nhật ký lưu/xuất JSON, hộp bao không phụ thuộc ẩn/tách, phép tính 2S và ràng buộc kit.
- Đã áp dụng cấu hình lên Robot 02 qua thư viện; giữ ID và bản JSON trước cập nhật. Chuyển qua Rover 01 vẫn 84 instance / 23 chi tiết 3D; Robot 02 là 70 instance / 27 chi tiết 3D.
- Robot 02 tải lại vẫn được chọn. Ghi chú thử lưu trong nhật ký còn nguyên sau reload; đã xóa ghi chú kiểm tra, 10 mục vẫn Chưa thử.
- BOM bộ lọc cần mua hiện 10 mục thiếu giá; những món đã có và thành phần trong kit không bị tính phí lần nữa.
- Kiểm tra tương thích hiện 43 kết quả: 1 không đạt (VIN shield), 18 thiếu dữ liệu và 24 đạt theo các trường đã khai báo. Không có kết luận robot đã sẵn sàng chạy.
- Công cụ pin đổi 1,5 A → 1,8 A làm ước tính đổi 80 → 67 phút. Không ghi nhận thành kết quả đo.
- Trình duyệt desktop 1440×900, di động 390×844: 3D và hồ sơ hiển thị; trang 390px có scrollWidth 390px. Bảng rộng cuộn trong vùng bảng.
- Tách Robot 02 lên 100% rồi Lắp lại: tọa độ của cả 27 mesh khớp chính xác trước khi tách. Không thay đổi vị trí lắp đã lưu.
- Tệp yêu cầu gốc được giữ nguyên trong `public/documents/robot-02-original-requirements.md`; cấu hình mẫu JSON/CSV được tạo bằng `pnpm export:robot02`. Kiểm thử xác nhận JSON hợp lệ và CSV khớp cấu hình xuất.

Không kiểm tra motor thật, nguồn điện, pin, Android/ESP32 firmware, SLAM hoặc hiệu năng AI. Các mục này nằm trong hồ sơ và nhật ký cần triển khai/đo tiếp.

## Bổ sung dây dẫn chi tiết và mô phỏng

- Tổng **75 tests / 5 files** đạt, gồm 4 kiểm thử sơ đồ dây và 18 kiểm thử mô phỏng. TypeScript và production build đạt.
- Sơ đồ có 24 mã duy nhất với hai đầu hợp lệ: 21 nhánh dây, 2 liên kết header, 1 liên kết Wi-Fi. Kiểm tra đủ 2 dây cho mỗi motor, đúng 2 kênh dùng chung; các tuyến nguồn chưa chốt vẫn mang nhãn W01–W03. Xuất Markdown giữ hướng dẫn, nguồn và giới hạn.
- Động học được thử tiến/lùi/xoay, góc bánh và quãng đường; cảm biến thử tia song song, vật sau lưng, ngoài góc quét, vùng mù, dải đo và xung ECHO. Interlock thử mất liên lạc, lỗi sonar, dừng khẩn, nguồn thấp/cao và chặn tiến gần vật. Một phút tự tránh được kiểm tra từng bước không xuyên vật thể/biên phòng. Thời gian khung hình được giới hạn; đầu vào không bị sửa.
- Trình duyệt desktop 1440×900: mô hình phòng dựng được, xe tiến đến khoảng 25 cm và bị chặn. Mất liên lạc/lỗi cảm biến hiện trạng thái dừng motor; đưa thanh điện áp xuống 6 V bằng bàn phím hiện dừng VIN. Tự tránh đổi hướng và tiếp tục di chuyển. Dừng khẩn dừng đồng hồ; Đặt lại về 0 giây, vị trí gốc và 7,4 V.
- Kịch bản người + hướng nhìn giường hiện báo thức giả lập sau 2 giây. Không dùng camera hay AI thật; âm thanh chỉ phát khi bấm thử. Việc loa vật lý phát ra âm thanh chưa được xác nhận bằng nghe.
- Mở W10 trên 3D hiện 24 tuyến, làm nổi W10. Chọn W15 rồi Giải thích mở đúng ECHO. Bộ lọc Motor trả 8 nhánh; nhập W10 chỉ còn tuyến SDA. Từ chi tiết driver mở được giải thích đúng dây.
- Tách đến 100% giữ 24 tuyến bám chi tiết; sau Lắp lại và khung hình cập nhật, tọa độ 27 mesh bằng chính xác trước tách. Wi-Fi là nét đứt, không mô tả là dây điện.
- Di động 390×844: mô hình, mô phỏng và bảng đấu nối đều có scrollWidth 390px. Thanh dây được đặt dưới các nút mở bảng để không che thao tác. Các tab cuộn ngang và tự đưa tab đang chọn vào tầm nhìn.
- Thử ba phòng, chuyển ra rồi vào mô phỏng: phiên bắt đầu lại ở trạng thái dừng. Chuyển Rover 01 vẫn giữ 84 instance và ba tab gốc; Robot 02 giữ 70 instance cùng tab dây/mô phỏng. Không áp dụng lại mẫu hay sửa nhật ký phần cứng.

Mô phỏng không xác nhận điện áp chân thực, dòng motor, trượt bánh, nhiệt, BMS hoặc khả năng tránh va chạm thật. SLAM, firmware/Android và bộ phận quét/hút chưa chạy. Các đường dây 3D chỉ là bố trí tham chiếu, không phải bản vẽ chân giắc có thể chế tạo trực tiếp.

## Điều chỉnh thao tác chuyển robot trong trình duyệt

- Thêm ô chọn trực tiếp **Robot đang mở** trên header, tách khỏi thao tác đổi tên. Danh sách có nhãn **Đang mở / Mở robot**, số chi tiết và loại hồ sơ.
- Khi chọn robot, dùng thư viện mới nhất đang ở bộ nhớ, lưu ngay toàn bộ thư viện với kiểm tra chống ghi đè tab khác, rồi giữ robot đó khi tải lại. Vùng làm việc được tạo lại theo ID để không giữ trạng thái giao diện của robot cũ.
- Kiểm thử trình duyệt nhúng: chuyển bằng hộp danh sách và ô chọn đều đổi đúng; Rover 01 có 23 mesh và 3 tab, Robot 02 có 27 mesh và 5 tab. Chọn Robot 02 rồi reload ngay vẫn mở Robot 02. Nhập tên tạm rồi Escape không thay tên đã lưu. Kiểm tra 390×844 không tràn ngang.
- Báo cáo gốc của người dùng là danh sách có nhiều robot nhưng bấm không chuyển. Chưa tái hiện được lỗi đó trong trình duyệt nhúng; không thể kiểm tra Chrome trực tiếp vì quyền Computer Use chưa được cấp. Không kết luận nguyên nhân là dữ liệu giữa trình duyệt.
- TypeScript, 75 kiểm thử hiện có, định dạng và production build đạt. Không thay cấu hình, BOM hay nhật ký đã lưu của các robot.

## Sửa thiếu Robot 02 trong Chrome / kho lưu mới

- Xác định nguyên nhân từ `loadLibrary`: trước đây kho trống chỉ khởi tạo Rover 01; Robot 02 của phiên làm việc nằm riêng trong localStorage của trình duyệt nhúng. Bản sửa ô chọn trước đó chưa xử lý thiếu dữ liệu khởi tạo.
- Bổ sung cấu hình personal-v1 khi đọc kho trống, thư viện cũ hoặc bản lưu một robot đời trước. Giữ nguyên robot đang mở, tên, BOM, tọa độ, nhật ký và dữ liệu gốc; không thay thế khi trùng tên/ID. Không thêm trùng hồ sơ cá nhân đã đổi tên/ID. Thư viện đủ 100 robot được giữ nguyên.
- **80 tests / 5 files đạt**: thêm các trường hợp kho trống, thư viện một robot đã chỉnh, hồ sơ cá nhân đã đổi ID/tên có nhật ký, va chạm tên/ID và giới hạn dung lượng. Kiểm thử di chuyển dữ liệu cũ và chống ghi đè tab khác vẫn đạt. TypeScript và production build đạt.
- Kiểm tra trình duyệt với origin riêng ở cổng 5174: lần đầu hiện Rover 01 (84 instance) và Robot 02 (70 instance); chọn Robot 02 rồi reload vẫn giữ lựa chọn, có đủ 5 tab gồm Mô phỏng và Hồ sơ Robot. Console không có lỗi/cảnh báo. Không xóa hay thay kho người dùng tại cổng 5173. Máy chủ và tab kiểm thử riêng được đóng sau kiểm tra.
- Chrome trực tiếp vẫn chưa được công cụ điều khiển; tình huống dữ liệu của Chrome được kiểm tra qua cùng hàm đọc thư viện và kho lưu trình duyệt độc lập. Người dùng chỉ cần tải lại trang để chạy bước bổ sung này.

## Bổ sung đầu nối và chế độ xem dây Robot 02

- **85 tests / 6 files đạt**. Bổ sung kiểm tra dây bám tiếp điểm đã dựng, thứ tự 6 cọc vít M17, VIN tách 5V logic, bốn dây I2C dùng một cột shield, chân SIG sonar, đổi kích thước bo và thay linh kiện không tương thích. Kiểm tra hình học đường dây ở 0/100% tách, có xoay motor 180°, giữ hai đầu và hướng ra khỏi giắc, không có tọa độ NaN.
- Dựng riêng B01/M17/K01 và các tiếp điểm S01, motor, khay, công tắc. Dùng chung `partContacts` cho vị trí chân và đầu dây. Bố trí theo ảnh MakerEDU, vẫn co theo kích thước trong hồ sơ người dùng; không tự sửa BOM, vị trí hoặc nhật ký đã lưu. K01/header nguồn, khay và công tắc ghi rõ vị trí quy ước; đường dây chưa kiểm tra va chạm hoặc đo chiều dài thực.
- Trình duyệt 1440×900: bật **Xem dây & chân cắm**, bó I2C hiện 4 dây; bấm trực tiếp tuyến xanh SCL chọn W11 và hiện B01 SCL/IO9 ↔ M17 SCL. Có giắc, bọc đầu dây, chấm tiếp điểm và đường chỉ đến hai nhãn. Chế độ làm mờ bỏ che khuất bởi ESP32/điện thoại/khung; bỏ chọn khôi phục vật liệu gốc (không còn chi tiết mờ).
- Chọn bó siêu âm hiện 4 dây; W14 nối IO10 ↔ TRIG. Mở sơ đồ, bấm hàng ECHO đổi đúng W15 và nút xem 3D đưa tới ECHO ↔ IO11. Sơ đồ và nhãn cổng phân biệt tín hiệu, nguồn và GND.
- Motor trái hiện 4 nhánh đúng MA1/MA2. Tách 100% vẫn giữ 4 tuyến; lắp lại 0% trả tọa độ 27 phần 3D về đúng giá trị trước tách.
- 390×844: không tràn ngang (`scrollWidth = clientWidth = 390`), bộ chọn ở dưới nút Cấu trúc/Thông tin. Hai nhãn ECHO/IO11 có xử lý tránh chồng nhau; chọn từng đầu có thể mở thông tin linh kiện.
- Chuyển sang Rover 01 giữ 84 instance / 23 phần 3D và không hiện bộ dây cá nhân; trở về Robot 02 giữ 70 instance / 27 phần 3D. Console kiểm tra không có lỗi/cảnh báo mới. TypeScript và production build đạt.

## Hoàn thiện mạng kết nối theo toàn bộ linh kiện Robot 02

- **92 tests / 7 files đạt**; TypeScript và production build đạt. Sơ đồ gồm **46 liên kết**: 21 dây/nhánh cáp, 6 tiếp điểm header, 4 tiếp xúc cell–khay, 14 đường chức năng có sẵn bên trong và 1 liên kết Wi-Fi. Không mô tả tất cả 46 liên kết là dây cần đấu thêm.
- Rà đủ **70 instance / 32 loại**, gồm **13 bộ phận điện** với đủ các chân dùng trong thiết kế. Bánh, khung, giá, ốc được giải thích bằng kết nối cơ khí; sạc cell nằm ngoài xe; vật tư và bộ phận chưa chọn mã được tách rõ. Không tự nối các GPIO dư hoặc tạo chân cho LiDAR, IMU, quạt hút, chổi và bảo vệ chưa có mã.
- Thêm 7 kiểm thử kế hoạch kết nối: chuỗi GPIO8/9 qua header và shield tới SDA/SCL của M17; GPIO10/11 tới TRIG/ECHO; nguồn logic 5V và GND chung; công tắc ON; tiếp điểm hai cell và cầu nối 2S; phát hiện đường/chân thiếu; linh kiện chưa biết và số lượng tồn kho kit; hướng dẫn xuất. Kiểm tra hình học hiện chạy trên cả 46 liên kết ở 0/100% tách.
- Kiểm thử đồ thị phân biệt đường dẫn điện với bộ hạ áp: VIN không bị coi là nối tắt sang 5V, hai cực pin không thông nhau, đầu motor không bị gán GND cố định. Khi bỏ tiếp điểm công tắc, đường nguồn bị ngắt; khi bỏ tuyến SDA hoặc nguồn sonar, báo đúng nhánh thiếu. Đây là kiểm tra dữ liệu sơ đồ, không phải đo điện thực tế.
- Robot 02 tự mở chế độ toàn bộ 46 liên kết. Có 7 chuỗi chức năng và bảng rà 32 loại linh kiện trong **Hồ sơ Robot → Đấu nối**. Chọn H01 từ chuỗi I2C rồi xem 3D hiện 6 liên kết header và hai nhãn GPIO8; chọn B05 hiện 7 liên kết pin cùng hai đầu Cell 1+/Cell 2−. Nút xem toàn bộ phục hồi 46 tuyến.
- C01 hiện rõ **Qua bộ hạ áp tích hợp · KHÔNG nối tắt VIN vào 5V**. Đường có sẵn trong shield, khay và công tắc được phân biệt với cáp phải đấu; các đường nội bộ chỉ thể hiện chức năng, không phải bản vẽ lớp đồng PCB.
- Trình duyệt desktop 1440×900 và điện thoại 390×844 không tràn ngang. Rà linh kiện có đủ 32 hàng. Chuyển Rover 01 vẫn có 84 instance / 23 chi tiết 3D, không có bộ dây cá nhân; quay lại Robot 02 tự hiện 46 liên kết. Tách 100% rồi lắp lại 0% giữ đủ 46 liên kết. Không có lỗi/cảnh báo console mới.
- Đã trả viewport kiểm thử về kích thước cửa sổ bình thường và để Robot 02 mở toàn bộ dây. Chrome trực tiếp chưa được kiểm tra vì công cụ chưa có quyền điều khiển; mã nguồn mới có hiệu lực khi tải lại localhost.

W01–W03 vẫn giữ các vấn đề nguồn cần chốt. Chưa xác nhận chiều dài/tiết diện dây, đầu cáp đi kèm, dòng motor, bảo vệ pin, va chạm dây hoặc firmware trên phần cứng. Sơ đồ bám chân chức năng và linh kiện đã khai báo, không phải kết luận robot có thể cấp nguồn ngay.

## Màn hình Note 9 hiển thị biểu cảm

- **95 tests / 8 files đạt**; TypeScript, định dạng và production build đạt. Thêm 3 kiểm thử: đọc dự án cũ/round-trip thiết lập và từ chối biểu cảm sai; giữ lựa chọn riêng khi chuyển robot; thứ tự ưu tiên lỗi, báo thức, nghỉ, vật cản, khám phá và di chuyển. Không thay instance, BOM, nhật ký hoặc tọa độ điện thoại.
- Sáu biểu cảm dùng chung hình vẽ canvas cho xem trước, texture trên màn hình 3D và mô phỏng. Texture được giải phóng khi đóng cảnh; tôn trọng giảm chuyển động. Góc xem màn hình tính từ hướng điện thoại đang lưu và mở riêng chi tiết đó, không xoay phần cứng.
- Trình duyệt: chọn Tò mò rồi xem 3D hiển thị khuôn mặt xanh trên đúng mặt màn hình, một chi tiết được xem riêng. Phóng lớn và chọn Ngạc nhiên đổi khuôn mặt; đóng rồi tải lại vẫn giữ lựa chọn.
- 390×844: trang biểu cảm và mô phỏng không tràn ngang; hộp phóng lớn có kích thước đúng 390×844. Xoay 90° hiển thị khuôn mặt theo chiều ngang của điện thoại. Đã kiểm tra nút đóng; chưa thử Fullscreen API và thao tác xoay thiết bị trên Note 9 vật lý.
- Tắt tự động và chọn Buồn: cả thẻ biểu cảm lẫn texture xe mô phỏng nhận `sad`. Bật tự động: khi nghỉ là `sleepy`, bấm tiến thành `happy`, dừng khẩn thành `alert`; thẻ và mô hình đồng bộ. Đã đặt lại mô phỏng sau kiểm tra.
- Chuyển Rover 01 không hiện tab biểu cảm; quay lại Robot 02 giữ lựa chọn. Console không ghi lỗi/cảnh báo mới. Đã trả viewport về cửa sổ bình thường và mở tab Biểu cảm với Vui vẻ/tự động bật.
- Phòng mô phỏng tải theo nhu cầu khi mở tab; kiểm tra vẫn dựng cảnh và biểu cảm ngủ thành công. Bundle chính 485,67 kB, không còn cảnh báo chunk vượt 500 kB trong build.

Chưa kết nối trạng thái phần cứng ESP32 hoặc triển khai Android. Màn hình phóng lớn là giao diện web hoạt động trong trình duyệt.
