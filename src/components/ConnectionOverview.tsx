import { Cable, ArrowUpRight } from 'lucide-react';
import type { RobotProject } from '../domain/schema';
import { connectionCoverage, connectionPaths, coverageLabels } from '../domain/connectionPlan';
import { connectionMedia, type RobotWire } from '../domain/wiring';

export function ConnectionOverview({
  project,
  wires,
  onSelect,
  onShowAll,
  onPick,
}: {
  project: RobotProject;
  wires: RobotWire[];
  onSelect: (id: string) => void;
  onShowAll: () => void;
  onPick: (id: string) => void;
}) {
  const coverage = connectionCoverage(project, wires);
  const paths = connectionPaths(project, wires);
  const electrical = coverage.filter((row) => row.kind === 'electrical');
  const accounted = electrical
    .filter((row) => !row.missing.length)
    .reduce((sum, row) => sum + row.required, 0);
  const total = electrical.reduce((sum, row) => sum + row.required, 0);
  return (
    <section className="connection-overview" aria-label="Kết nối toàn bộ robot">
      <div className="connection-overview-heading">
        <div>
          <small>TỪ LINH KIỆN ĐANG CÓ</small>
          <h3>Toàn bộ robot nối với nhau thế nào?</h3>
        </div>
        <button className="primary-button" onClick={onShowAll}>
          <Cable size={16} /> Xem toàn bộ trên 3D
        </button>
      </div>
      <div className="connection-totals">
        <div>
          <strong>
            {accounted}/{total}
          </strong>
          <span>Bộ phận điện có đủ chân dùng trong sơ đồ</span>
        </div>
        <div>
          <strong>{coverage.reduce((sum, row) => sum + row.required, 0)}</strong>
          <span>Chi tiết đã xét vai trò trong {coverage.length} loại</span>
        </div>
        <div>
          <strong>
            {paths.filter((p) => !p.missing.length).length}/{paths.length}
          </strong>
          <span>Nhánh chức năng có đủ tuyến tham chiếu</span>
        </div>
      </div>
      <p className="connection-scope">
        Suy luận theo linh kiện và yêu cầu Robot 02, với công tắc ở ON. “Đủ tuyến” là đủ mô tả kết
        nối; nguồn, dòng motor và phần mềm vẫn cần hoàn thiện, đo thử.
      </p>
      <div className="connection-media">
        {(Object.keys(connectionMedia) as RobotWire['medium'][]).map((medium) => (
          <span key={medium} className={medium}>
            <b>{wires.filter((w) => w.medium === medium).length}</b> {connectionMedia[medium]}
          </span>
        ))}
      </div>
      <div className="connection-paths">
        {paths.map((path, n) => (
          <details key={path.id}>
            <summary>
              <span>{String(n + 1).padStart(2, '0')}</span>
              <strong>{path.title}</strong>
              <small>
                {path.missing.length
                  ? `Thiếu ${path.missing.length} tuyến`
                  : `${path.ids.length} liên kết`}
              </small>
            </summary>
            <p>{path.summary}</p>
            <div className="connection-chips">
              {path.ids.map((id) => (
                <button
                  key={id}
                  disabled={path.missing.includes(id)}
                  onClick={() => onSelect(id)}
                  title={wires.find((w) => w.id === id)?.name}
                >
                  {id}
                  <ArrowUpRight size={11} />
                </button>
              ))}
            </div>
            {!!path.missing.length && (
              <p className="connection-missing">
                Chưa thể hiện được {path.missing.join(', ')}: kiểm tra linh kiện hoặc tiếp điểm đã
                thay đổi.
              </p>
            )}
          </details>
        ))}
      </div>
      <details className="connection-coverage">
        <summary>Rà từng linh kiện: cần dây, gắn cơ khí hay dùng ngoài xe?</summary>
        <div className="connection-coverage-list">
          {coverage.map((row) => (
            <article key={row.definition.id}>
              <div className="coverage-name">
                <button onClick={() => onPick(row.instanceIds[0])}>
                  {row.definition.name} <ArrowUpRight size={13} />
                </button>
                <small>
                  ×{row.required} · {Math.min(row.owned, row.required)}/{row.required} đã có theo
                  BOM
                </small>
              </div>
              <div>
                <strong className={`coverage-role ${row.kind}`}>{coverageLabels[row.kind]}</strong>
                <p>{row.explanation}</p>
                {row.missing.length > 0 && (
                  <p className="connection-missing">Chưa có kết nối: {row.missing.join(', ')}.</p>
                )}
                {row.wireIds.length > 0 && (
                  <div className="connection-chips">
                    {row.wireIds.map((id) => (
                      <button key={id} onClick={() => onSelect(id)}>
                        {id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </details>
      <p className="connection-scope">
        Hai cáp ngoại vi 4P XH–Dupont cần kiểm tra có đi kèm M17/S01 hay không. LiDAR, IMU, quạt
        hút, chổi và mạch bảo vệ chưa chọn mã được giữ ở mục chờ; chưa tự thêm chân hoặc coi là đã
        có.
      </p>
    </section>
  );
}
