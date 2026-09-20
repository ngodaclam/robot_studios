import { useState } from 'react';
import type { RefObject } from 'react';
import { Bot, Check, Plus, X } from 'lucide-react';
import type { RobotLibrary } from '../domain/library';
export function RobotLibraryDialog({
  dialog,
  library,
  onSwitch,
  onCreate,
  onApplyPersonal,
  onExportBackup,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  library: RobotLibrary;
  onSwitch: (id: string) => void;
  onCreate: (name: string, source: 'sample' | 'current' | 'personal') => void;
  onApplyPersonal: () => void;
  onExportBackup: () => void;
}) {
  const [name, setName] = useState('');
  const [source, setSource] = useState<'sample' | 'current' | 'personal'>('sample');
  const suggestion = `Robot ${String(library.projects.length + 1).padStart(2, '0')}`;
  return (
    <dialog ref={dialog} className="modal robot-library-modal" aria-label="Danh sách robot">
      <button
        className="modal-close"
        aria-label="Đóng danh sách robot"
        onClick={() => dialog.current?.close()}
      >
        <X size={20} />
      </button>
      <div className="modal-icon">
        <Bot size={26} />
      </div>
      <h2>
        Robot của bạn <small>({library.projects.length})</small>
      </h2>
      <p>Mỗi robot có thiết kế, vật tư và đơn giá được lưu riêng trên trình duyệt này.</p>
      <div className="robot-library-list">
        {library.projects.map((p) => (
          <button
            type="button"
            key={p.id}
            className={library.activeId === p.id ? 'active' : ''}
            aria-label={`Mở robot ${p.name}`}
            aria-current={library.activeId === p.id ? 'true' : undefined}
            onClick={() => onSwitch(p.id)}
          >
            <Bot size={23} />
            <span>
              <strong>{p.name}</strong>
              <small>
                {p.instances.length} chi tiết · {p.assemblies.length} cụm
              </small>
              <small>
                {p.design ? 'Cá nhân 4WD · Note 9 · Có mô phỏng' : 'Thiết kế cơ khí & vật tư'}
              </small>
            </span>
            <em className="robot-open-label">
              {library.activeId === p.id ? (
                <>
                  <Check size={15} />
                  Đang mở
                </>
              ) : (
                'Mở robot'
              )}
            </em>
          </button>
        ))}
      </div>
      {!library.projects.find((p) => p.id === library.activeId)?.design && (
        <div className="personal-template-action">
          <h3>Cấu hình cá nhân từ tài liệu của bạn</h3>
          <p>
            Áp dụng MKE-R01 4WD + Note 9 cho robot đang mở. Bản cũ được sao lưu riêng trên trình
            duyệt trước khi thay thế.
          </p>
          <button className="wide-button" onClick={onApplyPersonal}>
            Áp dụng cấu hình cá nhân
          </button>
        </div>
      )}
      {library.projects.find((p) => p.id === library.activeId)?.design && (
        <button className="wide-button" onClick={onExportBackup}>
          Tải bản dự phòng trước khi cập nhật
        </button>
      )}
      <form
        className="create-robot-form"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(name.trim() || suggestion, source);
          setName('');
        }}
      >
        <h3>
          <Plus size={17} />
          Tạo robot mới
        </h3>
        <label>
          Tên robot
          <input
            aria-label="Tên robot mới"
            placeholder={suggestion}
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Bắt đầu từ
          <select
            aria-label="Mẫu robot mới"
            value={source}
            onChange={(e) => setSource(e.target.value as 'sample' | 'current' | 'personal')}
          >
            <option value="sample">Robot mẫu Rover — dữ liệu minh họa</option>
            <option value="current">Bản sao robot đang mở</option>
            <option value="personal">Robot cá nhân 4WD + Note 9 — theo tệp yêu cầu</option>
          </select>
        </label>
        <p>
          {source === 'personal'
            ? 'Bố trí Robot 02 theo tài liệu cá nhân; có BOM, hồ sơ đấu nối và nhật ký đo thử.'
            : source === 'sample'
              ? 'Tạo thiết kế mẫu để bạn chỉnh sửa tiếp. Robot hiện tại được giữ nguyên.'
              : 'Sao chép thiết kế, số lượng đã có và đơn giá. Các thay đổi sau đó độc lập với bản gốc.'}
        </p>
        <button className="primary-button" type="submit" disabled={library.projects.length >= 100}>
          <Plus size={17} />
          Tạo robot
        </button>
      </form>
    </dialog>
  );
}
