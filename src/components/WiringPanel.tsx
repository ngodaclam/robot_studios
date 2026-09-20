import { useState } from 'react';
import { Cable, Download, ArrowUpRight, ExternalLink, Radio } from 'lucide-react';
import type { RobotProject } from '../domain/schema';
import {
  robotWires,
  wireGroups,
  wireEndLabel,
  wiringMarkdown,
  type WireGroup,
  wireBundle,
  wireBundles,
  connectionMedia,
  type WireBundle,
} from '../domain/wiring';
import { downloadFile } from '../domain/project';
import { normalizeSearch } from '../domain/search';
import { ConnectionOverview } from './ConnectionOverview';
import { HarnessDiagram } from './HarnessDiagram';

export function WiringPanel({
  project,
  onPick,
  onShowWire,
  initialWire,
}: {
  project: RobotProject;
  onPick: (id: string) => void;
  onShowWire: (id: string) => void;
  initialWire?: string | null;
}) {
  const [bundle, setBundle] = useState<WireBundle | 'all'>('all');
  const [group, setGroup] = useState<WireGroup | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(initialWire ?? 'W10');
  const all = robotWires(project);
  const filtered = all.filter(
    (w) =>
      (group === 'all' || group === w.group) &&
      (bundle === 'all' || wireBundle(w) === bundle) &&
      normalizeSearch(`${w.id} ${w.name} ${w.from.pin} ${w.to.pin}`).includes(
        normalizeSearch(query),
      ),
  );
  const wire = filtered.find((w) => w.id === selected) ?? filtered[0];
  return (
    <div className="wiring-panel">
      <div className="wiring-intro">
        <div>
          <h3>
            <Cable size={20} /> Dây nào nối vào chân nào?
          </h3>
          <p>
            {all.filter((w) => w.medium === 'wire').length} dây/nhánh dẫn,{' '}
            {all.filter((w) => w.medium === 'header').length} chân header,{' '}
            {all.filter((w) => w.medium === 'contact').length} tiếp xúc cell,{' '}
            {all.filter((w) => w.medium === 'internal').length} đường có sẵn bên trong và{' '}
            {all.filter((w) => w.medium === 'radio').length} liên kết Wi-Fi. Chọn mã dây để xem giải
            thích và vị trí hai đầu.
          </p>
        </div>
        <button
          className="wide-button"
          onClick={() =>
            downloadFile('robot-wiring.md', wiringMarkdown(project), 'text/markdown;charset=utf-8')
          }
        >
          <Download size={16} />
          Tải hướng dẫn dây
        </button>
      </div>
      <ConnectionOverview
        project={project}
        wires={all}
        onPick={onPick}
        onShowAll={() => onShowWire('all')}
        onSelect={(id) => {
          setSelected(id);
          setGroup('all');
          setBundle('all');
          setQuery('');
          document
            .getElementById('wire-workbench')
            ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }}
      />
      <div className="wiring-caution">
        <strong>Ba điểm cần chốt trước khi đấu nguồn</strong>
        <p>
          Nhánh pin → shield chưa bảo đảm VIN ≥7 V khi pin xả; bảo vệ/cầu chì chưa chọn; dòng hai
          motor mỗi kênh chưa được đo. Các tuyến W01–W03 có nhãn cần xử lý. Tắt nguồn trước khi đổi
          dây.
        </p>
      </div>
      <div className="wiring-bundle-tabs" aria-label="Chọn bó dây">
        <button
          aria-pressed={bundle === 'all'}
          onClick={() => {
            setBundle('all');
            setGroup('all');
            setQuery('');
          }}
        >
          Tất cả · {all.length}
        </button>
        {Object.entries(wireBundles).map(([id, info]) => (
          <button
            key={id}
            aria-pressed={bundle === id}
            onClick={() => {
              const first = all.find((w) => wireBundle(w) === id);
              if (first) {
                setSelected(first.id);
                setBundle(id as WireBundle);
                setGroup('all');
                setQuery('');
              }
            }}
          >
            {info.label}
          </button>
        ))}
      </div>
      <div className="wire-filters">
        <label className="search">
          <input
            aria-label="Tìm dây hoặc chân"
            placeholder="Tìm W10, GPIO, GND…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Nhóm dây dẫn"
          value={group}
          onChange={(e) => setGroup(e.target.value as typeof group)}
        >
          <option value="all">Tất cả kết nối</option>
          {Object.entries(wireGroups).map(([id, label]) => (
            <option value={id} key={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="wire-workbench" id="wire-workbench">
        <div className="wire-list" aria-label="Danh sách dây dẫn">
          {filtered.map((w) => (
            <button
              key={w.id}
              className={wire?.id === w.id ? 'active' : ''}
              aria-pressed={wire?.id === w.id}
              aria-label={`Dây ${w.id}: ${w.name}`}
              onClick={() => setSelected(w.id)}
            >
              <i style={{ background: w.color }} />
              <span>
                <strong>
                  {w.id} · {w.name}
                </strong>
                <small>
                  {w.from.pin} → {w.to.pin}
                </small>
              </span>
              {w.status === 'blocked' && <b title="Chưa chốt nguồn">!</b>}
            </button>
          ))}
          {!filtered.length && <p className="empty-state">Không có dây phù hợp.</p>}
        </div>
        {wire && (
          <article className="wire-detail" data-testid="wire-detail">
            <div className="wire-detail-title">
              <span style={{ borderColor: wire.color, color: wire.color }}>{wire.id}</span>
              <div>
                <small>
                  {wireGroups[wire.group]} · {connectionMedia[wire.medium]}
                </small>
                <h3>{wire.name}</h3>
              </div>
            </div>
            <div className={`wire-state ${wire.status}`}>
              {wire.medium === 'internal'
                ? wire.transfer === 'regulator'
                  ? 'Qua bộ hạ áp tích hợp · KHÔNG nối tắt VIN vào 5V'
                  : 'Đường có sẵn bên trong · không thêm dây nối tắt'
                : wire.status === 'blocked'
                  ? 'Chưa chốt nguồn · cần xử lý trước khi lắp'
                  : wire.status === 'reference'
                    ? 'Theo nhãn chức năng · vẫn cần đối chiếu bo'
                    : 'Phương án dự kiến · cần đo/đối chiếu'}
            </div>
            <HarnessDiagram
              project={project}
              wires={all}
              selected={wire}
              onSelect={(id) => {
                setSelected(id);
                setBundle(wireBundle(all.find((w) => w.id === id)!));
                setGroup('all');
                setQuery('');
              }}
            />
            <div className="wire-endpoints">
              {[wire.from, wire.to].map((end, index) => (
                <button key={index} onClick={() => onPick(end.instanceId)}>
                  <small>{index === 0 ? 'ĐẦU 1' : 'ĐẦU 2'}</small>
                  <strong>{end.pin}</strong>
                  <small>{end.contact?.bank ?? 'Liên kết không dây'}</small>
                  <span>
                    {project.instances.find((i) => i.id === end.instanceId)?.name}
                    <ArrowUpRight size={14} />
                  </span>
                </button>
              ))}
            </div>
            <dl className="wire-facts">
              <dt>Điện áp / tín hiệu</dt>
              <dd>{wire.voltage}</dd>
              <dt>Dây / đầu nối</dt>
              <dd>{wire.cable}</dd>
              <dt>Vì sao cần kết nối này?</dt>
              <dd>{wire.explanation}</dd>
              <dt>Điểm cần kiểm tra</dt>
              <dd>{wire.check}</dd>
            </dl>
            <div className="wire-actions">
              <button className="primary-button" onClick={() => onShowWire(wire.id)}>
                {wire.medium === 'radio' ? <Radio size={16} /> : <Cable size={16} />}Xem {wire.id}{' '}
                trên mô hình 3D
              </button>
              <a href={wire.source} target="_blank" rel="noreferrer">
                Nguồn tham khảo <ExternalLink size={14} />
              </a>
            </div>
            <p className="small-note">
              Bố trí cọc vít M17, hàng I2C/GPIO shield và giắc sau S01 được dựng theo ảnh MakerEDU,
              co theo kích thước mô hình. Tọa độ và chiều dài dây chưa đo; đầu khay, công tắc và
              header ESP32 là quy ước. Đọc nhãn trên bo thực tế, đặc biệt khi lật mặt giắc.
            </p>
          </article>
        )}
      </div>
      <div className="connector-reading-guide">
        <h3>Nhận diện nhanh trên bo</h3>
        <p>
          <b>M17, nhìn từ trên:</b> dãy cọc vít ở mép sau theo thứ tự MA1 · MA2 · VIN · GND · MB1 ·
          MB2. Giắc trắng I2C ở cạnh phải; tránh nhầm với giắc BLE cạnh trái.
        </p>
        <p>
          <b>B01:</b> mỗi cột I2C có 4 hàng SCL/9 · SDA/8 · 5V · GND. Cảm biến lấy SIG ở hàng IO10
          và IO11, không lấy nhầm chân 5V bên cạnh.
        </p>
        <p>
          <b>S01:</b> tìm nhãn GND · 5V · TRIG · ECHO ở giắc sau; mặt trước là hai mắt siêu âm. Màu
          dây trong ứng dụng chỉ giúp phân biệt.
        </p>
        <div>
          <a
            href="https://github.com/makereduvn/MKE-B01-ESP32-S3-DK-IO-SHIELD/blob/main/extras/MKE-B01_2.png"
            target="_blank"
            rel="noreferrer"
          >
            Ảnh chân B01 ↗
          </a>
          <a
            href="https://github.com/makereduvn/MKE-M17-L9110-I2C-MOTOR-DRIVER-MODULE"
            target="_blank"
            rel="noreferrer"
          >
            Tài liệu M17 ↗
          </a>
          <a
            href="https://github.com/makereduvn/MKE-S01-ULTRASONIC-DISTANCE-SENSOR"
            target="_blank"
            rel="noreferrer"
          >
            Tài liệu S01 ↗
          </a>
        </div>
      </div>
      <div className="design-grid wire-explainers">
        <article className="design-card">
          <h3>Phân biệt nguồn, logic và motor</h3>
          <p>
            <strong>Nguồn:</strong> pin cấp năng lượng; 5V nuôi mạch. <strong>GND:</strong> mốc điện
            áp chung. <strong>SDA/SCL:</strong> truyền lệnh số. <strong>MA1/MA2, MB1/MB2:</strong>{' '}
            đầu ra cầu H đảo cực để motor tiến/lùi; không đầu nào là GND cố định.
          </p>
        </article>
        <article className="design-card">
          <h3>Cách bó dây dự kiến</h3>
          <p>
            Dây nguồn/motor đi thành cặp dọc khung, tách khỏi I2C và siêu âm; chừa độ chùng tại khay
            tháo pin, tránh bánh xe và mép acrylic. Màu trên mô hình là quy ước nhận biết; chọn tiết
            diện theo dòng và chiều dài đã đo.
          </p>
        </article>
      </div>
      <details className="wire-reference">
        <summary>Bảng tra nhanh {all.length} kết nối</summary>
        <div className="table-scroll">
          <table className="wiring-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Đầu 1</th>
                <th>Đầu 2</th>
                <th>Chức năng</th>
              </tr>
            </thead>
            <tbody>
              {all.map((w) => (
                <tr key={w.id}>
                  <td>{w.id}</td>
                  <td>{wireEndLabel(project, w.from)}</td>
                  <td>{wireEndLabel(project, w.to)}</td>
                  <td>{w.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
