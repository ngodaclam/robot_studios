import { useState } from 'react';
import { CheckCircle2, AlertTriangle, CircleHelp, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { checkCompatibility, statusLabel, type CheckStatus } from '../domain/compatibility';
import type { RobotProject } from '../domain/schema';
import { personalDesignChecks } from '../domain/design';
const icons = { pass: CheckCircle2, fail: AlertTriangle, unknown: CircleHelp };
export function ChecksPanel({
  project,
  onPick,
}: {
  project: RobotProject;
  onPick: (id: string) => void;
}) {
  const results = [...checkCompatibility(project), ...personalDesignChecks(project)];
  const [filter, setFilter] = useState<CheckStatus | 'all'>('all');
  const filtered = results
    .filter((r) => filter === 'all' || r.status === filter)
    .sort(
      (a, b) =>
        ({ fail: 0, unknown: 1, pass: 2 })[a.status] - { fail: 0, unknown: 1, pass: 2 }[b.status],
    );
  return (
    <div className="data-panel checks-panel">
      <div className="data-heading">
        <div>
          <span className="eyebrow">KIỂM TRA THEO DỮ LIỆU</span>
          <h2>Tương thích của thiết kế</h2>
          <p>Điện áp, dòng điện, số kênh, kích thước trục và kết nối bắt buộc.</p>
        </div>
        <ShieldCheck size={38} className="heading-icon" />
      </div>
      <div className="check-filters">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          Tất cả<span>{results.length}</span>
        </button>
        {(['fail', 'unknown', 'pass'] as CheckStatus[]).map((s) => {
          const Icon = icons[s];
          return (
            <button
              key={s}
              className={`${s} ${filter === s ? 'active' : ''}`}
              onClick={() => setFilter(s)}
            >
              <Icon size={17} />
              {statusLabel[s]}
              <span>{results.filter((r) => r.status === s).length}</span>
            </button>
          );
        })}
      </div>
      <div className="checks-notice">
        <CircleHelp size={18} />
        <p>
          {project.design
            ? 'Kết quả dựa trên tài liệu và các nguồn linh kiện; phần chưa đo được ghi rõ. '
            : 'Kết quả robot mẫu dựa trên dữ liệu minh họa. '}
          Đây là kiểm tra sơ bộ, không xác nhận an toàn hoặc sẵn sàng chế tạo. Chưa đánh giá giao
          thức, bảo vệ pin, nhiệt, sức bền và dung sai thực tế.
        </p>
      </div>
      <div className="check-list">
        {filtered.map((r) => {
          const Icon = icons[r.status];
          return (
            <article className={`check-card ${r.status}`} key={r.id}>
              <Icon size={22} />
              <div>
                <div className="check-card-heading">
                  <h3>{r.title}</h3>
                  <span className={`check-status ${r.status}`}>{statusLabel[r.status]}</span>
                </div>
                <p>{r.reason}</p>
                <div className="related-parts">
                  {r.instanceIds.map((id) => (
                    <button key={id} onClick={() => onPick(id)}>
                      {project.instances.find((i) => i.id === id)?.name}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state">
            <CheckCircle2 size={32} />
            <h3>Không có kết quả trong nhóm này</h3>
            <p>Chọn nhóm khác để xem các kiểm tra còn lại.</p>
          </div>
        )}
      </div>
    </div>
  );
}
