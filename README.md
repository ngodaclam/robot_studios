# Robot Studio

Ứng dụng React + TypeScript + Vite để khám phá robot 3D, quản lý BOM và kiểm tra tương thích sơ bộ. Chạy trong trình duyệt, không backend, tài khoản, API key hoặc dịch vụ AI. Robot được dựng bằng hình học Three.js; không tải mô hình 3D ngoài.

**Toàn bộ mã DEMO, thông số và giá của robot mẫu do ứng dụng tự đặt để minh họa; chưa dùng đặt mua. Kiểm tra tương thích không chứng nhận an toàn hoặc sẵn sàng chế tạo.**

## Cài đặt và chạy

Cần Node.js 22.12+ (hoặc Node.js 24 LTS) và pnpm. Kho đã có `pnpm-lock.yaml`.

```sh
pnpm install
pnpm dev
```

Mở địa chỉ Vite in trong terminal, mặc định **http://127.0.0.1:5173**. `pnpm-workspace.yaml` cho phép bước cài đặt esbuild.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`pnpm build` tạo thư mục `dist/`, có thể phục vụ bằng một static web server. Không mở `index.html` bằng `file://`. Các phông chữ và thư viện được đóng gói cục bộ; ứng dụng không cần truy cập dịch vụ bên ngoài khi sử dụng. Dữ liệu lưu theo origin trình duyệt; đổi hostname hoặc cổng sẽ có kho lưu riêng.

Nếu máy chưa có Node trên PATH nhưng đang chạy trong Codex desktop, có thể dùng Node từ `load_workspace_dependencies`. Đây chỉ là môi trường cục bộ, không phải yêu cầu của dự án.

## Cách sử dụng

- Kéo trái để xoay; kéo phải để pan; cuộn để zoom. Cảm ứng: một ngón xoay, hai ngón pan/zoom.
- Chọn bộ phận trên mô hình hoặc cây lắp ráp. Nút con mắt bật/tắt bộ phận hoặc cả cụm.
- “Xem riêng” trong bảng chi tiết tự căn camera; “Trở lại toàn bộ” khôi phục trạng thái hiển thị trước đó. Escape thoát xem riêng.
- Bấm/kéo thanh **Tách bộ phận**, hoặc dùng phím mũi tên, Home/End. Khi thả, camera tự căn theo phạm vi mới. “Lắp lại” đưa tất cả về tọa độ lắp gốc.
- Các góc trước/bên/trên/phối cảnh, căn khung, lưới và đường nối đều hoạt động.
- Bảng chi tiết cho sửa vị trí lắp X/Y/Z (mm), số lượng đã có và đơn giá. Thay đổi vị trí là thay đổi thiết kế; thanh tách chỉ thay đổi cách xem.
- BOM tự gộp mỗi PartDefinition, tính cả phụ kiện không dựng 3D. Thay đổi bộ lọc hoặc ẩn mô hình không đổi BOM.
- Số lượng cần mua = `max(0, cần − đã có)`. Giá trống là **chưa biết**, giá `0` là giá bằng không có chủ ý. Tổng chỉ gồm các khoản đã biết, luôn nêu số mục thiếu giá.
- Số lượng và đơn giá được chấp nhận khi rời ô hoặc Enter; giá trị âm, quá giới hạn hay số lượng lẻ bị báo lỗi. Escape hủy bản đang nhập.
- Dự án tự lưu sau 400 ms, có trạng thái thành công/lỗi. Xuất JSON để sao lưu trước khi xóa dữ liệu trình duyệt. Nhập JSON sai giữ nguyên dự án hiện hành. Tối đa 5 MB.
- Khôi phục robot mẫu cần xác nhận; có nút tải JSON dự phòng ngay trong hộp thoại. Ở điện thoại, chức năng này nằm trong menu ba chấm.
- CSV có UTF-8 BOM, dấu phẩy phân cột, escape dấu nháy và bảo vệ tiền tố công thức bảng tính. Trong Excel, dùng nhập CSV và chọn UTF-8 nếu cấu hình vùng không tự nhận dấu phẩy.

## Cấu trúc dự án

```text
src/
  App.tsx                         Điều phối trạng thái, lưu, nhập/xuất, bố cục
  styles.css                      Giao diện tiếng Việt, responsive
  data/
    sampleRobot.ts                Danh mục, instance, cụm và kết nối robot mẫu
    compatibilityFixtures.ts      Ba bộ dữ liệu đạt / không đạt / thiếu dữ liệu
  domain/
    schema.ts                     Schema Zod version 1 và kiểu TypeScript
    bom.ts                        Tổng hợp vật tư, tổng tiền, CSV
    compatibility.ts              Quy tắc độc lập với UI
    project.ts                    JSON, localStorage, vị trí tách mô hình
    webmcp.ts                     Đọc BOM qua WebMCP nếu trình duyệt hỗ trợ
    domain.test.ts                Kiểm thử dữ liệu và quy tắc
  scene/
    geometry.ts                   Hình học lập trình cho từng loại linh kiện
    RobotViewport.tsx             Three.js, camera, picking, ánh sáng và animation
  components/
    AssemblyTree.tsx              Cây cụm, tìm kiếm, hiển thị
    DetailPanel.tsx               Thông số và chỉnh sửa dữ liệu
    BomPanel.tsx                  Danh sách vật tư
    ChecksPanel.tsx               Kết quả và lựa chọn linh kiện liên quan
    NumberField.tsx               Ô số có kiểm tra trước khi chấp nhận
public/favicon.svg
 docs/personal-robot-requirements.md
```

## Nơi sửa robot

1. Điền **`docs/personal-robot-requirements.md`** trước khi chọn thiết bị thật.
2. Sửa **`sampleDefinitions` trong `src/data/sampleRobot.ts`** để thay danh mục, kích thước, khối lượng, nguồn thông tin, trạng thái xác minh và giá. Không gán số liệu minh họa cho mã thương mại thật.
3. Sửa **`createSampleProject()` trong cùng tệp** để thay PartInstance, vị trí, hướng tách, Assembly và Connection. Mỗi lần dùng một linh kiện là một instance; phụ kiện số lượng lớn vẫn có từng instance, không tạo số lượng phụ ở Assembly để tránh đếm trùng.
4. Thêm kiểu hình học ở `schema.ts` và dựng nó ở `scene/geometry.ts` khi cần.
5. Sau khi sửa mẫu, nhấn **Khôi phục robot mẫu** vì localStorage đã lưu có ưu tiên hơn mẫu trong mã nguồn.

## Hợp đồng dữ liệu

- `PartDefinition`: loại linh kiện dùng chung; `PartInstance`: một lần dùng trong robot.
- `Assembly`: nhóm tổ chức/hiển thị, không đóng góp số lượng BOM độc lập.
- `Connection`: cổng nguồn/tín hiệu/trục ra nối với cổng vào đã khai báo.
- `RobotProject`: schemaVersion, định nghĩa, instance, cụm, kết nối, inventory và priceOverrides.
- Đơn vị nguồn: **mm, g, VND**; tọa độ Three.js: **m**, với Y hướng lên và +Z là phía trước. Góc nguồn là độ.
- `displayPosition()` trả về một tọa độ mới; không bao giờ ghi đè positionMm. Trạng thái tách, chọn, góc camera và xem riêng không được lưu như thiết kế.
- Parser kiểm tra schema version, kiểu/số hữu hạn, dải điện áp, số lượng nguyên, giá không âm, ID trùng, tham chiếu, loại/chiều cổng và đầu vào bị nối trùng. Không nhận thuộc tính không thuộc schema ở các đối tượng lõi.
- localStorage key: `robot-studio.project.v1`. Bản lưu hỏng không bị âm thầm ghi đè; ứng dụng báo lỗi và chỉ mở lưu lại sau khi nhập dự án hợp lệ hoặc xác nhận khôi phục mẫu.

## Quy tắc tương thích và giới hạn

Có sáu nhóm kiểm tra: toàn bộ dải nguồn nằm trong dải vào; mức điện áp logic; dòng tổng và mỗi kênh; số kênh driver; đường kính trục/lỗ bánh; cổng bắt buộc chưa nối. Kết quả gồm đạt theo khai báo, không đạt, hoặc chưa đủ dữ liệu. Dòng tiêu thụ dùng giá trị cực đại cùng điều kiện; thiếu nhu cầu tải hoặc khả năng nguồn luôn trả về chưa đủ dữ liệu, không suy đoán từ dòng điển hình.

Dữ liệu mẫu cố ý thiếu dòng pin, nhu cầu dòng đầu vào một số bộ nguồn và mức logic cảm biến. Fixtures chứng minh cả ba trạng thái; bộ “đạt” chỉ có nghĩa tất cả quy tắc đơn giản đạt theo khai báo. Không mô phỏng mạch, giao thức điện, nhiệt, bảo vệ pin, mô-men, tải trọng, nhiễu hay dung sai gia công. Phòng thử Robot 02 chỉ có chuyển động động học và chặn va chạm hình học đơn giản. Khung, giá và các điểm lắp là minh họa; chưa phải CAD chế tạo. Bộ dây vẫn được tính theo bộ trong BOM; các tuyến trên 3D là lớp minh họa riêng, không tự cộng vật tư.

LocalStorage không đồng bộ giữa thiết bị, không có lịch sử phiên bản hoặc undo thiết kế. Cần tự giữ JSON dự phòng. WebGL phải được trình duyệt hỗ trợ; khi không có, BOM và các bảng vẫn dùng được. Không có mua hàng, tài khoản hoặc API bên ngoài. WebMCP là giao diện đọc BOM tùy chọn ngay trong trình duyệt, không gọi dịch vụ AI.

Xem `docs/verification.md` để biết các kiểm tra đã chạy và phạm vi kiểm tra trình duyệt.

## Quản lý nhiều robot

Chọn robot trực tiếp trong ô **Robot đang mở** trên thanh trên cùng, hoặc bấm **Danh sách robot** (biểu tượng các lớp) rồi chọn **Mở robot**. Ô chọn hiển thị tên và số chi tiết; nút bút chì bên cạnh dùng riêng để đổi tên (Enter lưu, Escape hủy). Khi đổi robot, vùng thiết kế được dựng lại và lựa chọn được lưu ngay cùng toàn bộ dữ liệu thư viện. Trong danh sách, nhập tên rồi bấm **Tạo robot** để thêm robot mới. Có ba lựa chọn: mẫu Rover minh họa, bản sao robot đang mở, hoặc cấu hình cá nhân 4WD + Note 9 từ tài liệu đã cung cấp. Đây là điểm khởi đầu để chỉnh sửa tiếp, không tự xác nhận phần cứng đã hoạt động.

Mỗi robot lưu riêng tên, vị trí lắp, trạng thái hiển thị, số lượng đã có và đơn giá. Chuyển robot không làm mất các thay đổi đang chờ lưu. Robot mở gần nhất được phục hồi khi tải lại trang. Nhập JSON luôn thêm một robot mới, kể cả khi ID trong tệp trùng; khôi phục mẫu chỉ áp dụng cho robot đang mở. Xuất JSON/CSV áp dụng cho robot đang mở.

Danh sách được lưu nguyên khối tại `robot-studio.library.v1` (tối đa 100 robot; vẫn chịu giới hạn dung lượng localStorage). Bản lưu một robot cũ ở `robot-studio.project.v1` được tự động đưa vào danh sách lần đầu và giữ lại như bản dự phòng. Logic nằm ở `src/domain/library.ts`, giao diện ở `src/components/RobotLibraryDialog.tsx`. Chưa có đồng bộ thiết bị hay xuất toàn bộ thư viện cùng lúc; nên xuất JSON riêng cho từng robot quan trọng.

Khi mở nhiều tab, ứng dụng kiểm tra bản lưu trước khi ghi. Nếu tab khác đã thay đổi danh sách, tab cũ sẽ báo lỗi để tránh ghi đè. Khi đó hãy xuất JSON giữ các chỉnh sửa đang có rồi tải lại trang để mở danh sách mới nhất.

## Robot 02 từ yêu cầu cá nhân

Robot 02 có cấu hình MKE-R01 4WD, ESP32-S3 + IO Shield, MKE-M17, MKE-S01, hai cell 18650 và Galaxy Note 9 nghiêng 35°. Tab **Hồ sơ Robot** lưu yêu cầu, sơ đồ đấu nối dự kiến, nguồn đối chiếu và 10 mục nhật ký thử nghiệm. Các trường ngày, trạng thái, ghi chú lưu cùng robot và xuất trong JSON. Công cụ ước tính pin chỉ để thử giả định; không tự đánh dấu đạt thời lượng.

Xem [hồ sơ Robot 02](docs/robot-02-design.md) để biết các khác biệt giữa tệp người dùng và dữ liệu nhà cung cấp, phần cần đo/chọn tiếp. LiDAR, cơ cấu làm sạch, nguồn bảo vệ và linh kiện chưa chọn không có giá hoặc khối lượng giả. Vật tư thuộc kit không tính lại giá và khối lượng. Đồ dùng ngoài xe như sạc không cộng vào khối lượng xe.

Để áp dụng cấu hình lên một robot mẫu đã có, chọn robot đó trong thư viện rồi dùng **Áp dụng cấu hình cá nhân**. Thao tác giữ ID, không thay robot khác, và ghi bản dự phòng tại `robot-studio.before-personal.<robot-id>` trước khi lưu mới. Có thể tải bản cũ từ thư viện và nhập lại như robot độc lập. Robot 02 của phiên làm việc này đã được cập nhật bằng thao tác đó.

`pnpm export:robot02` tạo JSON và BOM CSV mẫu tại `public/documents/`; các tệp mẫu không chứa chỉnh sửa trong trình duyệt. Nguồn dữ liệu nằm tại `src/data/personalRobot.ts`. Schema v1 được mở rộng bằng các trường tùy chọn cho hồ sơ, nguồn kích thước, vị trí dùng vật tư, quan hệ kit và nhóm motor chung kênh; khối lượng chưa biết là `null`. Dự án v1 cũ vẫn đọc được.

## Dây dẫn chi tiết và mô phỏng Robot 02

**Robot 02 mở sẵn toàn bộ 46 liên kết**: 21 dây/nhánh cáp, 6 chân header giữa ESP32 và shield, 4 tiếp xúc cell–khay, 14 đường có sẵn bên trong và 1 liên kết Wi-Fi. Phần bổ sung gồm 2S và lá tiếp xúc khay, trạng thái ON của công tắc, GPIO8/9/10/11 đi qua header, các đường trong shield và bộ hạ áp tích hợp. Nét đứt ngắn là đường chức năng bên trong linh kiện; C01 là chuyển đổi VIN → 5V, **không phải jumper nối tắt**. Tọa độ chỉ mô tả bố trí, không phải bản vẽ PCB.

**Hồ sơ Robot → Đấu nối → Toàn bộ robot nối với nhau thế nào?** giải thích 7 nhánh chức năng, với nút chọn từng liên kết. Bảng rà soát xét đủ 70 chi tiết / 32 loại: 13 bộ phận điện, linh kiện gắn cơ khí, vật tư dây/giắc, sạc ngoài xe và các mục chưa chọn mẫu. Có báo thiếu chân/tuyến khi mất linh kiện hoặc đổi định nghĩa. Số lượng đã có lấy từ BOM, kể cả chi tiết nằm trong kit; không tự tăng tồn kho, thêm BMS, LiDAR hay motor hút tưởng tượng. Note 9 dùng pin riêng, camera/micro/loa tích hợp và Wi-Fi. Bánh nối trục motor; khung và giá gắn cơ khí. Xuất Markdown gồm toàn bộ tuyến, vai trò từng linh kiện và giới hạn chưa chốt.

**Mô hình 3D → bộ chọn bó dây** chọn nguồn, pin/khay, I2C, siêu âm, motor, header, đường trong shield hoặc Wi-Fi. Chọn một mã hoặc bấm dây để hiện tên chân ở hai đầu. **Làm mờ vật che** làm trong các phần không thuộc tuyến, lấy khung nhìn theo phần liên quan. Tắt dây khôi phục vật liệu. **Sơ đồ & giải thích** mở đúng tuyến trong hồ sơ. **Xem toàn bộ trên 3D** trở lại toàn cảnh dây và hiện các bộ phận liên quan đang ẩn. Dây, header và tiếp điểm đi theo chi tiết khi tách/lắp.

M17 được dựng với 6 cọc vít MA1/MA2/VIN/GND/MB1/MB2, giắc I2C 4P, hai IC và tụ; B01 có hàng I2C, GPIO ba chân, header và giắc DC; S01 có giắc ở mặt sau. Các điểm tiếp xúc được dùng chung cho hình học và đầu dây, gồm cả hướng dây rời giắc, vỏ Dupont và bọc đầu dây. Bố trí tham khảo [ảnh chân B01](https://github.com/makereduvn/MKE-B01-ESP32-S3-DK-IO-SHIELD/blob/main/extras/MKE-B01_2.png), [M17](https://github.com/makereduvn/MKE-M17-L9110-I2C-MOTOR-DRIVER-MODULE) và [S01](https://github.com/makereduvn/MKE-S01-ULTRASONIC-DISTANCE-SENSOR). Kích thước được co theo hồ sơ đang lưu; không thay dữ liệu người dùng bằng kích thước từ ảnh. Tọa độ, đường đi, chiều dài và tiết diện dây chưa được đo/kiểm tra va chạm. Đầu khay, công tắc và các tiếp xúc nguồn header ESP32 vẫn là vị trí quy ước. Đối chiếu nhãn bo khi lắp thật, không suy ra thứ tự chân từ màu hoặc sơ đồ chức năng. W01–W03 vẫn chưa chốt bảo vệ nguồn và VIN shield ≥7 V.

**Mô phỏng** dùng mô hình của robot đang mở trong ba phòng thử:

- Lái tiến/lùi, xoay tại chỗ, đặt riêng lệnh hai cặp motor trái/phải. Nút hướng giữ lệnh đến khi dừng; giữ phím mũi tên rồi thả để dừng, Space dừng khẩn.
- Bánh quay theo vận tốc, sonar có góc quét, số đo khoảng cách, xung ECHO minh họa và vệt vị trí. Góc nhìn theo xe hoặc toàn phòng; dùng chuột xoay/zoom.
- Tự tránh: đi thẳng, xoay phải khi vật dưới 30 cm. Chặn tiến thủ công dưới 25 cm có thể bật/tắt. Hình học phòng chặn xuyên vật thể; đây không phải bảo đảm tránh va chạm của phần cứng.
- Ngắt liên lạc, lỗi sonar hoặc điện áp ngoài cấu hình để thử interlock. VIN dưới 7 V dừng theo giới hạn shield, không giả lập BMS. Lỗi sonar dừng ở tự tránh hoặc khi bật bảo vệ lái tay.
- Kịch bản nhận diện rác/người dùng hình vẽ có sẵn và hướng nhìn giả định, không xử lý camera/AI thật. Người trong hướng nhìn giường kích hoạt trạng thái báo thức sau 2 giây mô phỏng; nút **Phát chuông thử** phát ba tiếng qua trình duyệt.
- Đặt lại khôi phục trạng thái thử; rời cửa sổ tạm dừng, rời tab hủy phiên mô phỏng. Không gửi lệnh đến robot, ghi nhật ký phần cứng, thay tọa độ lắp, BOM hay tồn kho.

Nguồn chính: `src/domain/contacts.ts` (tiếp điểm), `src/domain/wiring.ts` (dây theo cấu hình personal-v1), `src/domain/wiringInternals.ts` (header và đường nội bộ), `src/domain/connectionPlan.ts` (nhánh chức năng và rà soát linh kiện), `src/scene/makerBoards.ts` (bo và giắc 3D), `src/scene/harness.ts` (tuyến dây), `src/domain/simulation.ts` (động học, sonar và kịch bản), `src/scene/SimulationViewport.tsx` (phòng 3D). Các hằng số cơ học/sonar là giả định công khai trong mục **Giả định và phạm vi mô phỏng**. SLAM, Android/ESP32 thật và quét/hút chưa được triển khai. Các robot Rover gốc vẫn giữ chức năng hiện tại, không áp dụng nhầm sơ đồ cá nhân.

Trình duyệt mới tự có **Rover 01** và **Robot 02 (4WD + Note 9)**. Khi đọc thư viện cũ chưa có hồ sơ `personal-v1`, ứng dụng bổ sung cấu hình Robot 02 đi kèm (nếu chưa đạt giới hạn 100 robot), giữ nguyên robot đang chọn và các chỉnh sửa cũ. Nếu trùng ID hoặc tên, robot bổ sung được đặt ID/tên riêng; không thay bản cũ. Robot cá nhân đã đổi tên hoặc có ID khác vẫn được nhận diện qua hồ sơ nên không thêm trùng. Đây là cấu hình đi kèm ứng dụng, không phải đồng bộ các chỉnh sửa giữa Chrome và trình duyệt nhúng.

## Màn hình điện thoại làm khuôn mặt robot

Tab **Biểu cảm** của Robot 02 có 6 trạng thái: vui vẻ, tò mò, buồn, đang ngủ, ngạc nhiên và chú ý. Khuôn mặt có mắt chớp, ánh nhìn và nhịp thở nhẹ; tôn trọng thiết lập giảm chuyển động của hệ điều hành. Hình vẽ dùng chung cho bản xem trước, màn hình Note 9 trong mô hình 3D và xe trong mô phỏng.

**Xem màn hình trên 3D** mở riêng điện thoại và đưa camera tới mặt màn hình. Không xoay gá hoặc thay tọa độ đã lưu; camera sau và màn hình vẫn ở hai mặt đối diện theo thiết kế hiện tại. **Phóng lớn màn hình** mở khuôn mặt chiếm vùng trang, có chọn biểu cảm, xoay 90°, nút toàn màn hình trình duyệt và nút đóng/Escape. Nếu trình duyệt không hỗ trợ Fullscreen API, chế độ phóng lớn vẫn dùng được. Trên điện thoại thật cần truy cập một địa chỉ ứng dụng mà máy đó kết nối được; máy chủ phát triển mặc định chỉ phục vụ loopback của máy tính.

**Tự đổi theo mô phỏng** mặc định bật: dừng/nghỉ → ngủ; di chuyển → vui; tự tránh hoặc đang xoay → tò mò; vật trong 30 cm hoặc báo thức giả lập → ngạc nhiên; dừng khẩn, mất liên lạc, tắt cảm biến hoặc điện áp ngoài 7–8,4 V → chú ý. Khi tắt tự động, mô phỏng giữ biểu cảm đã chọn. Trạng thái lỗi được ưu tiên trước trạng thái nghỉ. Đây là phản hồi từ mô phỏng cục bộ, chưa nhận dữ liệu ESP32 hay chạy ứng dụng Android riêng.

Lựa chọn lưu riêng theo robot trong trường tùy chọn `design.face`, đi cùng JSON và thư viện. Dữ liệu v1 cũ không có trường này dùng mặc định vui vẻ/tự động. Nguồn: `src/domain/expressions.ts`, `src/components/FacePanel.tsx`, `src/components/RobotFace.tsx`, `src/scene/faceDrawing.ts`, `src/scene/phoneScreen.ts`.
