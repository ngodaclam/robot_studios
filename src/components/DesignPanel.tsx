import { useState } from 'react';
import { BookOpen, ExternalLink, FileDown, ClipboardCheck } from 'lucide-react';
import type { RobotProject } from '../domain/schema';
import { massSummary, modelEnvelopeLwh, estimateRuntimeMinutes } from '../domain/design';
import { personalSources } from '../data/personalRobot';
import { NumberField } from './NumberField';
import { buildBom, summarizeBom, money } from '../domain/bom';
import { WiringPanel } from './WiringPanel';

export function DesignPanel({
  project,
  onChange,
  onPick,
  onShowWire,
  initialSection = 'overview',
  initialWire,
}: {
  project: RobotProject;
  onChange: (edit: (p: RobotProject) => RobotProject) => void;
  onPick: (id: string) => void;
  onShowWire: (id: string) => void;
  initialSection?: 'overview' | 'wiring';
  initialWire?: string | null;
}) {
  const [section, setSection] = useState<string>(initialSection);
  const [currentA, setCurrentA] = useState(1.5);
  const [usable, setUsable] = useState(80);
  const design = project.design;
  if (!design) return null;
  const mass = massSummary(project),
    size = modelEnvelopeLwh(project),
    bom = summarizeBom(buildBom(project));
  const minutes = estimateRuntimeMinutes(currentA, usable / 100);
  const updateTest = (id: string, fields: Partial<(typeof design.tests)[number]>) =>
    onChange((p) => ({
      ...p,
      design: p.design && {
        ...p.design,
        tests: p.design.tests.map((t) => (t.id === id ? { ...t, ...fields } : t)),
      },
    }));
  return (
    <div className="data-panel design-panel">
      <div className="data-heading">
        <div>
          <span className="eyebrow">HỒ SƠ THIẾT KẾ · ROBOT CÁ NHÂN</span>
          <h2>{project.name} · từ ý tưởng đến lắp thử</h2>
          <p>MKE-R01 4WD · ESP32-S3 · Galaxy Note 9</p>
        </div>
        <BookOpen size={36} className="heading-icon" />
      </div>
      <div className="design-banner">
        <strong>Bản bố trí sơ bộ · chưa nghiệm thu phần cứng</strong>
        <p>
          Mô hình 3D và BOM đã dựng từ tệp của bạn. Các tác vụ tự hành, AI và làm sạch dưới đây là
          yêu cầu cần triển khai. Kết quả đo thử chỉ thay đổi khi bạn nhập vào nhật ký.
        </p>
      </div>
      <div className="design-sections" aria-label="Các phần hồ sơ">
        {[
          ['overview', 'Yêu cầu & phương án'],
          ['wiring', 'Đấu nối'],
          ['tests', 'Nhật ký đo thử'],
          ['sources', 'Nguồn & khác biệt'],
        ].map(([id, title]) => (
          <button
            key={id}
            aria-pressed={section === id}
            className={section === id ? 'active' : ''}
            onClick={() => setSection(id)}
          >
            {title}
          </button>
        ))}
      </div>
      {section === 'overview' && (
        <>
          <div className="design-metrics">
            <article>
              <span>Giới hạn D × R × C</span>
              <strong>{design.maxDimensionsLwhMm.join(' × ')} mm</strong>
              <small>Mô hình ~{size.join(' × ')} mm · cần đo lại khung</small>
            </article>
            <article>
              <span>Khối lượng toàn xe</span>
              <strong>≤ {design.maxMassG} g</strong>
              <small>
                Đã có số liệu {mass.knownG} g · {mass.missing} chi tiết chưa cân
              </small>
            </article>
            <article>
              <span>Ngân sách dự kiến</span>
              <strong>1–1,5 triệu đồng</strong>
              <small>Tạm hiểu là phần chi thêm; cần chốt sau báo giá</small>
            </article>
            <article>
              <span>Thời lượng yêu cầu</span>
              <strong>{design.runtimeMin.join('–')} phút</strong>
              <small>Pin xe và pin Note 9 độc lập · chưa đo thực tế</small>
            </article>
          </div>
          <div className="design-grid">
            <article className="design-card">
              <h3>Kiến trúc 3 tầng</h3>
              <ol>
                <li>
                  <strong>Đế xe:</strong> 4 TT motor, 4 bánh Ø65, pin 2S tiếp cận từ phía sau.
                </li>
                <li>
                  <strong>Điều khiển:</strong> ESP32-S3 + IO Shield, MKE-M17 và sonar phía trước.
                  Dây công suất đi riêng dây tín hiệu.
                </li>
                <li>
                  <strong>Thị giác:</strong> Note 9 đặt ngang, camera sau hướng trước/xuống 35°. Gá
                  kẹp và chân đế cần gia công.
                </li>
              </ol>
              <button className="wide-button" onClick={() => onPick('phone')}>
                Xem vị trí Note 9 trong mô hình
              </button>
            </article>
            <article className="design-card">
              <h3>Ước tính thời lượng pin xe</h3>
              <p>2 × 3,7 V nối tiếp → 7,4 V, 2,5 Ah (18,5 Wh danh định).</p>
              <div className="runtime-inputs">
                <label>
                  Dòng trung bình tại pin (A)
                  <NumberField
                    label="Dòng trung bình tại pin"
                    value={currentA}
                    max={30}
                    onCommit={(v) => setCurrentA(v ?? 0)}
                  />
                </label>
                <label>
                  Dung lượng sử dụng giả định (%)
                  <NumberField
                    label="Dung lượng sử dụng giả định"
                    value={usable}
                    max={100}
                    onCommit={(v) => setUsable(v ?? 0)}
                  />
                </label>
              </div>
              <div className="runtime-result">
                {minutes === null ? 'Nhập giá trị lớn hơn 0' : `≈ ${Math.round(minutes)} phút`}
              </div>
              <p className="small-note">
                T = 2,5 × tỷ lệ sử dụng / dòng pin × 60. Hệ số 80% là giả định gộp, chưa đo. Chưa
                gồm LiDAR, hút bụi, giới hạn VIN và lão hóa pin; không xác nhận đạt mục tiêu.
              </p>
            </article>
          </div>
          <article className="design-card">
            <h3>Các giai đoạn thực hiện</h3>
            <div className="phase-grid">
              <div>
                <span>01 / LẮP THỬ</span>
                <h4>Điều khiển & tránh vật cản</h4>
                <p>
                  Chốt kích thước, nguồn và dòng driver. Firmware ESP32 xử lý sonar, lệnh có thời
                  hạn và dừng khi mất kết nối. Kiểm tra sàn gạch/gỗ, gờ ≤5 mm.
                </p>
              </div>
              <div>
                <span>02 / THỊ GIÁC</span>
                <h4>Nhìn sàn & đánh thức</h4>
                <p>
                  Ứng dụng Android chạy nhận diện tại máy và phát loa. Đo FPS ≥15 theo mục tiêu; đổi
                  góc camera để nhìn giường. Không có luồng camera trực tiếp trong ứng dụng này.
                </p>
              </div>
              <div>
                <span>03 / MỞ RỘNG</span>
                <h4>SLAM & làm sạch</h4>
                <p>
                  Chọn LiDAR, odometry và nơi chạy SLAM; sau đó mới chọn chổi/quạt/hộp bụi. Cân lại
                  và đo nguồn với từng module bổ sung.
                </p>
              </div>
            </div>
            <p className="small-note">
              BOM hiện biết {money(bom.knownCost)} chi thêm, còn {bom.unknownPurchasePrices} mục cần
              mua chưa có giá. Số tiền đã biết không phải tổng kinh phí hoàn thiện.
            </p>
          </article>
        </>
      )}
      {section === 'wiring' && (
        <WiringPanel
          project={project}
          onPick={onPick}
          onShowWire={onShowWire}
          initialWire={initialWire}
        />
      )}
      {section === 'tests' && (
        <>
          <div className="test-log-heading">
            <ClipboardCheck size={23} />
            <div>
              <h3>Nhật ký của bạn</h3>
              <p>
                {design.tests.filter((t) => t.status !== 'untested').length}/{design.tests.length}{' '}
                mục đã ghi kết quả · tự lưu cùng Robot 02 và xuất trong JSON.
              </p>
            </div>
          </div>
          {design.tests.map((test) => (
            <article className="design-card test-record" key={test.id}>
              <div>
                <h3>{test.title}</h3>
                <p>{test.criterion}</p>
              </div>
              <div className="test-fields">
                <label>
                  Kết quả
                  <select
                    aria-label={`Kết quả ${test.title}`}
                    value={test.status}
                    onChange={(e) =>
                      updateTest(test.id, { status: e.target.value as typeof test.status })
                    }
                  >
                    <option value="untested">Chưa thử</option>
                    <option value="pass">Đạt — do bạn ghi nhận</option>
                    <option value="fail">Không đạt — do bạn ghi nhận</option>
                  </select>
                </label>
                <label>
                  Ngày thử
                  <input
                    aria-label={`Ngày thử ${test.title}`}
                    type="date"
                    value={test.testedOn}
                    onChange={(e) => updateTest(test.id, { testedOn: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Thông số đo / hiện tượng / cách khắc phục
                <textarea
                  aria-label={`Ghi chú ${test.title}`}
                  value={test.notes}
                  maxLength={2000}
                  placeholder="Chưa có số liệu đo thực tế…"
                  onChange={(e) => updateTest(test.id, { notes: e.target.value })}
                />
              </label>
            </article>
          ))}
        </>
      )}
      {section === 'sources' && (
        <>
          <article className="design-card">
            <h3>Tệp gốc & quyết định thiết kế</h3>
            <p>
              Đối chiếu ngày 20/09/2026. Mã sản phẩm và yêu cầu lấy từ tài liệu của bạn; các khác
              biệt được giữ lại để xác nhận phiên bản phần cứng. Mọi vị trí lắp trong mô hình là đề
              xuất, không phải tọa độ khoan.
            </p>
            <a className="wide-button" href="/documents/robot-02-original-requirements.md" download>
              <FileDown size={16} />
              Tải bản yêu cầu gốc
            </a>
          </article>
          <div className="table-scroll">
            <table className="wiring-table">
              <thead>
                <tr>
                  <th>Mục</th>
                  <th>Trong tệp của bạn</th>
                  <th>Đối chiếu & cách xử lý</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Khung MKE-R01</td>
                  <td>256 × 160 × 65 mm</td>
                  <td>
                    Hshop ghi bộ 190 × 170 × 120 mm, khung U 190 × 125 × 30 mm. Dựng theo nhà cung
                    cấp, giữ cảnh báo cần đo; nếu thực dài 256 mm thì vượt yêu cầu 250 mm.
                  </td>
                </tr>
                <tr>
                  <td>MKE-M17</td>
                  <td>2,5–12 V, sơ đồ ghi VCC</td>
                  <td>
                    Dùng thông số module: VIN motor 6–9 V và nguồn logic 5 V riêng. 0,8 A liên
                    tục/kênh; chưa kết luận đủ cho hai motor mỗi kênh.
                  </td>
                </tr>
                <tr>
                  <td>Shield</td>
                  <td>VIN 6–12 V</td>
                  <td>
                    Nhà sản xuất ghi 7–24 V. Giữ kiểm tra không đạt khi phân tích nguồn 2S 6–8,4 V.
                  </td>
                </tr>
                <tr>
                  <td>Khối lượng</td>
                  <td>Toàn xe tối đa 0,8–1kg; bước thử ghi đặt 1kg lên xe</td>
                  <td>
                    Dùng trần 1kg cho toàn bộ robot. Không cộng thêm tải 1kg lên xe đã mang điện
                    thoại.
                  </td>
                </tr>
                <tr>
                  <td>Thời lượng</td>
                  <td>Ước tính 75–80 phút, ghi đã thỏa yêu cầu</td>
                  <td>
                    Giữ là ước tính. Chưa có dữ liệu chạy thực, pin điện thoại, module hút hoặc
                    LiDAR.
                  </td>
                </tr>
                <tr>
                  <td>Kích thước bo, lỗ gá</td>
                  <td>ESP32 + shield 60 × 50 × 15 mm; lỗ 52 × 42 mm</td>
                  <td>
                    Chưa xác nhận từng bo. Hình bo riêng là ước lượng và đánh dấu rõ; không xuất bản
                    vẽ chế tạo từ hình này.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <article className="design-card">
            <h3>Nguồn đã đối chiếu</h3>
            <div className="source-links">
              {Object.entries(personalSources).map(([id, url]) => (
                <a key={id} href={url} target="_blank" rel="noreferrer">
                  {
                    {
                      chassis: 'Hshop · MKE-R01',
                      driver: 'Hshop · MKE-M17',
                      shield: 'MakerEDU · MKE-B01',
                      sensor: 'MakerEDU · MKE-S01',
                      phone: 'Samsung · Note 9',
                      bluetooth: 'Espressif · Bluetooth ESP32-S3',
                    }[id]
                  }
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          </article>
        </>
      )}
    </div>
  );
}
