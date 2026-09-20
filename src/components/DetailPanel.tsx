import {
  Bot,
  Cpu,
  X,
  Focus,
  Scan,
  Eye,
  EyeOff,
  CircleHelp,
  ArrowUpRight,
  Package,
  Camera,
  Battery,
  Cog,
  Box,
  Undo2,
  Cable,
} from 'lucide-react';
import { buildBom, money, summarizeBom } from '../domain/bom';
import type { RobotProject } from '../domain/schema';
import { NumberField } from './NumberField';
import { massSummary } from '../domain/design';
import { robotWires } from '../domain/wiring';
interface Props {
  project: RobotProject;
  selected: string | null;
  isolate: string | null;
  onIsolate: () => void;
  onToggle: () => void;
  onClose: () => void;
  onClear: () => void;
  onFit: () => void;
  onBom: () => void;
  onInventory: (id: string, v: number) => void;
  onPrice: (id: string, v: number | null) => void;
  onPosition: (id: string, axis: number, v: number) => void;
  onExplainWire: (id: string) => void;
}
export function DetailPanel({
  project,
  selected,
  isolate,
  onIsolate,
  onToggle,
  onClose,
  onClear,
  onFit,
  onBom,
  onInventory,
  onPrice,
  onPosition,
  onExplainWire,
}: Props) {
  const part = project.instances.find((i) => i.id === selected);
  const def = project.definitions.find((d) => d.id === part?.definitionId);
  const rows = buildBom(project);
  const summary = summarizeBom(rows);
  const row = rows.find((r) => r.definition.id === def?.id);
  const Icon = !def
    ? Bot
    : def.category === 'Cảm biến'
      ? Camera
      : def.category === 'Nguồn điện'
        ? Battery
        : def.category === 'Điện tử'
          ? Cpu
          : def.category === 'Truyền động'
            ? Cog
            : def.geometry === 'accessory'
              ? Package
              : Box;
  const isAccessory = def?.geometry === 'accessory';
  const visible =
    part?.visible && project.assemblies.find((a) => a.id === part.assemblyId)?.visible;
  const mass = massSummary(project);
  const connectedWires = robotWires(project).filter(
    (w) => w.from.instanceId === selected || w.to.instanceId === selected,
  );
  return (
    <>
      <div className="panel-heading">
        <h2>{def ? 'Thông tin bộ phận' : 'Tổng quan thiết kế'}</h2>
        {def ? (
          <button title="Bỏ chọn" aria-label="Bỏ chọn bộ phận" onClick={onClear}>
            <X size={16} />
          </button>
        ) : (
          <Cpu size={17} />
        )}
        <button className="mobile-close" aria-label="Đóng thông tin" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <div className="detail-content">
        <div className={'detail-icon ' + (def ? 'part-preview' : '')}>
          <Icon size={48} />
          <span>{def?.sku ?? (project.design ? 'P E R S O N A L  /  0 2' : project.name)}</span>
        </div>
        <span className="eyebrow">{def ? def.category : 'ROBOT DI CHUYỂN TRONG NHÀ'}</span>
        <h2>{part?.name ?? project.name}</h2>
        <p>{def ? def.description : project.description}</p>
        {part && def && row ? (
          <>
            <div className="selection-actions">
              <button
                className={isolate ? 'active' : ''}
                onClick={onIsolate}
                disabled={isAccessory}
              >
                <Scan size={16} />
                {isolate ? 'Xem toàn bộ' : 'Xem riêng'}
              </button>
              <button onClick={onToggle} disabled={isAccessory}>
                {visible ? <EyeOff size={16} /> : <Eye size={16} />} {visible ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            {isAccessory && (
              <p className="small-note">
                Phụ kiện được tính trong BOM, không dựng riêng trong cảnh 3D.
              </p>
            )}
            <div className="detail-section">
              <h3>Thông số kỹ thuật</h3>
              <div className="spec-list">
                {def.manufacturer && (
                  <div>
                    <span>Hãng / nguồn</span>
                    <strong>{def.manufacturer}</strong>
                  </div>
                )}
                {(!isAccessory || def.id === 'mke-r01-kit') && (
                  <div>
                    <span>
                      Kích thước X × Y × Z
                      {def.dimensionBasis === 'estimate'
                        ? ' · ước lượng'
                        : def.dimensionBasis === 'user'
                          ? ' · từ tệp'
                          : def.dimensionBasis === 'supplier'
                            ? ' · nguồn hãng'
                            : ''}
                    </span>
                    <strong>{def.dimensionsMm.join(' × ')} mm</strong>
                  </div>
                )}
                <div>
                  <span>Khối lượng</span>
                  <strong>
                    {def.includedIn
                      ? 'Tính trong bộ kit'
                      : def.massG === null
                        ? 'Chưa cân / thiếu dữ liệu'
                        : `${def.massG} g`}
                  </strong>
                </div>
                {Object.entries(def.specs).map(([key, value]) => (
                  <div key={key}>
                    <span>{key}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
            {connectedWires.length > 0 && (
              <div className="detail-section part-wires">
                <h3>
                  <Cable size={15} /> Đấu nối tham chiếu · {connectedWires.length}
                </h3>
                {connectedWires.map((w) => (
                  <button
                    key={w.id}
                    aria-label={`Giải thích ${w.id}: ${w.name}`}
                    onClick={() => onExplainWire(w.id)}
                  >
                    <i style={{ background: w.color }} />
                    <span>
                      <strong>
                        {w.id} · {w.name}
                      </strong>
                      <small>
                        {w.from.pin} ↔ {w.to.pin}
                      </small>
                    </span>
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            )}
            <div className="detail-section">
              <h3>Vật tư & chi phí</h3>
              <div className="spec-list">
                <div>
                  <span>Cần trong thiết kế</span>
                  <strong>{row.required}</strong>
                </div>
                <div>
                  <label htmlFor={`owned-${def.id}`}>Số lượng đã có</label>
                  {def.includedIn ? (
                    <strong>{row.owned} · theo số bộ kit đã có</strong>
                  ) : (
                    <NumberField
                      label={`Đã có ${def.name}`}
                      value={row.owned}
                      integer
                      max={1e6}
                      onCommit={(v) => onInventory(def.id, v ?? 0)}
                    />
                  )}
                </div>
                <div>
                  <span>Cần mua</span>
                  <strong>{row.buy}</strong>
                </div>
                <div>
                  <span>Đơn giá (VND)</span>
                  {def.includedIn ? (
                    <strong>Đã tính trong giá kit</strong>
                  ) : (
                    <NumberField
                      label={`Đơn giá ${def.name}`}
                      value={row.unitPrice}
                      nullable
                      max={1e12}
                      onCommit={(v) => onPrice(def.id, v)}
                    />
                  )}
                </div>
              </div>
            </div>
            {!isAccessory && (
              <details className="position-details">
                <summary>Vị trí lắp (mm)</summary>
                <div className="position-fields">
                  {['X', 'Y', 'Z'].map((axis, n) => (
                    <label key={axis}>
                      {axis}
                      <NumberField
                        label={`Vị trí ${axis}`}
                        value={part.positionMm[n]}
                        signed
                        max={10000}
                        onCommit={(v) => onPosition(part.id, n, v ?? 0)}
                      />
                    </label>
                  ))}
                </div>
                <p>Y là chiều cao. Vị trí lắp được lưu; tách mô hình chỉ thay đổi cách xem.</p>
              </details>
            )}
            <div className="source-note">
              <span className={`verification ${def.verification}`}>
                {def.verification === 'illustrative'
                  ? 'Dữ liệu minh họa'
                  : def.verification === 'verified'
                    ? 'Đã xác minh theo khai báo'
                    : 'Chưa xác minh'}
              </span>
              <p>{def.source}</p>
              {/^https?:\/\//.test(def.source) && (
                <a href={def.source.split(' ')[0]} target="_blank" rel="noreferrer">
                  Mở nguồn linh kiện ↗
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="overview-stats">
              <div>
                <strong>{project.assemblies.length.toString().padStart(2, '0')}</strong>
                <span>Cụm lắp ráp</span>
              </div>
              <div>
                <strong>
                  {
                    project.instances.filter(
                      (i) =>
                        project.definitions.find((d) => d.id === i.definitionId)?.geometry !==
                        'accessory',
                    ).length
                  }
                </strong>
                <span>Chi tiết 3D</span>
              </div>
            </div>
            <div className="spec-list">
              <div>
                <span>Khối lượng theo dữ liệu</span>
                <strong>
                  {mass.missing ? 'Chưa đủ · ' : ''}
                  {(mass.knownG / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 })} kg đã
                  biết
                </strong>
              </div>
              <div>
                <span>Nguyên lý di chuyển</span>
                <strong>{project.design ? '4WD · trượt bánh khi quay' : 'Hai bánh vi sai'}</strong>
              </div>
              <div>
                <span>Số loại linh kiện</span>
                <strong>{rows.length}</strong>
              </div>
            </div>
            <div className="cost-preview">
              <span>Chi phí cần mua đã biết</span>
              <strong>{money(summary.knownCost)}</strong>
              <small>Còn {summary.unknownPurchasePrices} mục cần mua chưa có giá</small>
              <button onClick={onBom}>
                Xem danh sách vật tư <ArrowUpRight size={16} />
              </button>
            </div>
            <button className="wide-button" onClick={onFit}>
              <Focus size={16} />
              Đưa mô hình vừa khung
            </button>
          </>
        )}
        <div className="info-card">
          <CircleHelp size={17} />
          <p>
            {project.design
              ? 'Bố trí sơ bộ theo yêu cầu cá nhân. Hình dạng và lỗ gá chưa đo; các module đề xuất chưa có mẫu, giá hoặc khối lượng xác nhận.'
              : def?.verification === 'verified'
                ? 'Thông tin xác minh do người tạo dự án khai báo. Các kiểm tra đơn giản không xác nhận thiết kế an toàn hoặc sẵn sàng chế tạo.'
                : 'Thông số, mã và giá là dữ liệu minh họa. Chưa dùng để đặt mua hoặc kết luận thiết kế an toàn.'}
          </p>
        </div>
        {isolate && (
          <button className="wide-button" onClick={onIsolate}>
            <Undo2 size={16} />
            Trở lại toàn bộ robot
          </button>
        )}
      </div>
    </>
  );
}
