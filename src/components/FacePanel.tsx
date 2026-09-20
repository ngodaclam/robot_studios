import { useEffect, useRef, useState } from 'react';
import { Maximize, RotateCcw, Smartphone, X } from 'lucide-react';
import { defaultFace, expressionIds, expressions, type Expression } from '../domain/expressions';
import type { RobotProject } from '../domain/schema';
import { RobotFace } from './RobotFace';

export function FacePanel({
  project,
  onChange,
  onShowPhone,
}: {
  project: RobotProject;
  onChange: (edit: (p: RobotProject) => RobotProject) => void;
  onShowPhone: () => void;
}) {
  const settings = project.design?.face ?? defaultFace;
  const expression = settings.expression;
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [screenMessage, setScreenMessage] = useState('');
  const hasPhone = project.instances.some(
    (i) => project.definitions.find((d) => d.id === i.definitionId)?.geometry === 'phone',
  );
  const patch = (fields: Partial<typeof settings>) =>
    onChange((p) => ({
      ...p,
      design: p.design
        ? { ...p.design, face: { ...(p.design.face ?? defaultFace), ...fields } }
        : undefined,
    }));
  const select = (value: Expression) => patch({ expression: value });
  useEffect(() => {
    if (expanded) dialog.current?.showModal();
    else dialog.current?.close();
  }, [expanded]);
  async function closeDisplay() {
    if (document.fullscreenElement === dialog.current)
      await document.exitFullscreen().catch(() => {});
    setExpanded(false);
  }
  return (
    <div className="face-panel">
      <header className="face-heading">
        <div>
          <span className="eyebrow">MÀN HÌNH NOTE 9 · GƯƠNG MẶT ROBOT</span>
          <h2>Một khuôn mặt, nhiều cảm xúc.</h2>
          <p>Chọn biểu cảm để đôi mắt và nụ cười trên điện thoại thay đổi.</p>
        </div>
        <button className="secondary" disabled={!hasPhone} onClick={onShowPhone}>
          <Smartphone size={17} /> Xem màn hình trên 3D
        </button>
      </header>
      <div className="face-layout">
        <section className="face-preview" aria-label="Xem trước màn hình điện thoại">
          <div className="face-preview-label">
            <span className="face-live-dot" /> {project.name} <span>MÀN HÌNH BIỂU CẢM</span>
          </div>
          <div className="face-phone">
            <RobotFace expression={expression} />
          </div>
          <div className="face-caption">
            <div>
              <strong>{expressions[expression].label}</strong>
              <p>{expressions[expression].hint}</p>
            </div>
            <button onClick={() => setExpanded(true)}>
              <Maximize size={17} /> Phóng lớn màn hình
            </button>
          </div>
        </section>
        <section className="face-options" aria-label="Chọn biểu cảm">
          <span className="eyebrow">CẢM XÚC HÔM NAY</span>
          <h3>Robot đang cảm thấy…</h3>
          <div className="expression-grid">
            {expressionIds.map((id) => (
              <button
                key={id}
                aria-pressed={expression === id}
                onClick={() => select(id)}
                style={{ '--expression-color': expressions[id].color } as React.CSSProperties}
              >
                <span className={`expression-symbol ${id}`} aria-hidden="true">
                  {
                    {
                      happy: '⌒ ⌒',
                      curious: '● ◕',
                      sad: '◡ ◡',
                      sleepy: '— —',
                      surprised: '● ●',
                      alert: '• •',
                    }[id]
                  }
                </span>
                <strong>{expressions[id].label}</strong>
              </button>
            ))}
          </div>
          <label className="face-auto">
            <input
              type="checkbox"
              checked={settings.auto}
              onChange={(e) => patch({ auto: e.target.checked })}
            />
            <span>
              <strong>Tự đổi theo mô phỏng</strong>
              <small>
                Nghỉ → ngủ · di chuyển → vui · khám phá → tò mò · gặp vật cản → ngạc nhiên · lỗi →
                chú ý.
              </small>
            </span>
          </label>
          <p className="face-note">
            Màn hình và camera sau ở hai mặt đối diện. Góc xem 3D mở riêng điện thoại để thấy rõ
            khuôn mặt; hướng gá hiện tại vẫn giữ nguyên.
          </p>
        </section>
      </div>
      <p className="face-usage">
        Trên điện thoại, mở trang này và chọn <strong>Phóng lớn màn hình</strong>. Xoay ngang máy
        hoặc dùng nút xoay màn hình. Biểu cảm chạy ngay trong trình duyệt; chế độ tự động dùng trạng
        thái mô phỏng, chưa nhận dữ liệu từ ESP32 thật.
      </p>
      <dialog
        className="face-display"
        ref={dialog}
        aria-label="Màn hình biểu cảm robot"
        onCancel={(e) => {
          e.preventDefault();
          void closeDisplay();
        }}
        onClose={() => setExpanded(false)}
      >
        {expanded && (
          <>
            <div className={`face-display-art ${rotated ? 'rotated' : ''}`}>
              <RobotFace expression={expression} />
            </div>
            <div className="face-display-controls">
              <select
                aria-label="Biểu cảm trên màn hình lớn"
                value={expression}
                onChange={(e) => select(e.target.value as Expression)}
              >
                {expressionIds.map((id) => (
                  <option key={id} value={id}>
                    {expressions[id].label}
                  </option>
                ))}
              </select>
              <button
                aria-label="Xoay màn hình biểu cảm"
                title="Xoay màn hình"
                onClick={() => setRotated(!rotated)}
              >
                <RotateCcw size={19} />
              </button>
              <button
                aria-label="Toàn màn hình trình duyệt"
                title="Toàn màn hình"
                onClick={async () => {
                  try {
                    await dialog.current?.requestFullscreen();
                    setScreenMessage('');
                  } catch {
                    setScreenMessage(
                      'Trình duyệt này không hỗ trợ ẩn thanh công cụ. Bạn vẫn có thể dùng màn hình phóng lớn.',
                    );
                  }
                }}
              >
                <Maximize size={19} />
              </button>
              <button aria-label="Đóng màn hình biểu cảm" onClick={() => void closeDisplay()}>
                <X size={20} />
              </button>
            </div>
            {screenMessage && (
              <p className="face-screen-message" role="status">
                {screenMessage}
              </p>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
