import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Radio,
  Volume2,
} from 'lucide-react';
import type { RobotProject } from '../domain/schema';
import {
  defaultSimConfig,
  initialSimulation,
  readSonar,
  scenes,
  stepSimulation,
  simulateVision,
  type SimConfig,
  type SimState,
  type VisionScenario,
} from '../domain/simulation';
import { SimulationViewport } from '../scene/SimulationViewport';
import { RobotFace } from './RobotFace';
import { defaultFace, expressions, simulationExpression } from '../domain/expressions';

export function SimulationPanel({ project }: { project: RobotProject }) {
  const [state, setState] = useState(initialSimulation),
    stateRef = useRef(state);
  const [config, setConfig] = useState(defaultSimConfig),
    configRef = useRef(config);
  configRef.current = config;
  const [running, setRunning] = useState(false),
    runningRef = useRef(running);
  runningRef.current = running;
  const [follow, setFollow] = useState(true),
    [scene, setScene] = useState('room');
  const [scenario, setScenario] = useState<VisionScenario>('none'),
    [cameraView, setCameraView] = useState<'floor' | 'bed'>('floor');
  const [visionStart, setVisionStart] = useState<number | null>(null);
  const [soundError, setSoundError] = useState('');
  const sound = useRef<AudioContext | null>(null),
    held = useRef('');
  const update = (next: SimState) => {
    stateRef.current = next;
    setState(next);
  };
  const patch = (fields: Partial<SimConfig>) => setConfig((c) => ({ ...c, ...fields }));
  function stop(emergency = false) {
    patch({ left: 0, right: 0, mode: 'manual', emergency });
    setRunning(false);
    held.current = '';
    update({
      ...stateRef.current,
      leftSpeed: 0,
      rightSpeed: 0,
      avoidRemaining: 0,
      status: emergency ? 'Dừng khẩn cấp' : 'Đã dừng',
    });
  }
  function drive(left: number, right: number) {
    patch({ left, right, mode: 'manual', emergency: false });
    setRunning(true);
  }
  function reset(nextScene = scene) {
    stop();
    update(initialSimulation());
    setVisionStart(null);
    setScenario('none');
    setCameraView('floor');
    setScene(nextScene);
    setConfig({ ...defaultSimConfig(), obstacles: scenes[nextScene].obstacles });
  }
  useEffect(() => {
    let frame = 0,
      last = performance.now(),
      paint = 0;
    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (runningRef.current) {
        stateRef.current = stepSimulation(stateRef.current, configRef.current, dt);
        if (now - paint > 40) {
          setState(stateRef.current);
          paint = now;
        }
      }
      frame = requestAnimationFrame(animate);
    };
    const suspend = () => {
      runningRef.current = false;
      setRunning(false);
      setConfig((c) => ({ ...c, left: 0, right: 0, mode: 'manual' }));
      held.current = '';
      update({
        ...stateRef.current,
        leftSpeed: 0,
        rightSpeed: 0,
        status: 'Tạm dừng khi rời cửa sổ',
      });
    };
    const visibility = () => {
      if (document.hidden) suspend();
    };
    window.addEventListener('blur', suspend);
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('blur', suspend);
      document.removeEventListener('visibilitychange', visibility);
      void sound.current?.close().catch(() => {});
    };
  }, []);
  const sonar = readSonar(state, config.obstacles, config.sensor);
  const vision = simulateVision(
    scenario,
    cameraView,
    visionStart === null ? 0 : state.time - visionStart,
    visionStart !== null,
  );
  const faceSettings = project.design?.face ?? defaultFace;
  const faceExpression = faceSettings.auto
    ? simulationExpression(state, config, running, sonar.distance, vision.alarm)
    : faceSettings.expression;
  async function playSound() {
    try {
      if (sound.current && sound.current.state !== 'closed') await sound.current.close();
      const ctx = new AudioContext();
      sound.current = ctx;
      await ctx.resume();
      for (let n = 0; n < 3; n++) {
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain();
        const start = ctx.currentTime + n * 0.28;
        oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.055, start + 0.02);
        gain.gain.linearRampToValueAtTime(0, start + 0.2);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.21);
      }
      setSoundError('');
    } catch {
      setSoundError(
        'Trình duyệt chưa phát được âm thanh. Trạng thái báo thức giả lập vẫn hiển thị.',
      );
    }
  }
  const directions: Record<string, [number, number]> = {
    ArrowUp: [1, 1],
    ArrowDown: [-1, -1],
    ArrowLeft: [-0.65, 0.65],
    ArrowRight: [0.65, -0.65],
  };
  return (
    <div
      className="simulation-panel"
      tabIndex={0}
      aria-label="Bảng điều khiển mô phỏng"
      onKeyDown={(e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
        if (directions[e.key]) {
          e.preventDefault();
          held.current = e.key;
          drive(...directions[e.key]);
        }
        if (e.code === 'Space') {
          e.preventDefault();
          stop(true);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === held.current) {
          e.preventDefault();
          stop();
        }
      }}
    >
      <div className="simulation-heading">
        <div>
          <span className="eyebrow">PHÒNG THỬ ẢO · {project.name.toUpperCase()}</span>
          <h2>Thử trước khi lắp</h2>
          <p>Mô phỏng cục bộ. Lệnh không được gửi đến robot thật.</p>
        </div>
        <div className="sim-toolbar">
          <button
            onClick={() => {
              if (running) {
                setRunning(false);
                update({ ...stateRef.current, leftSpeed: 0, rightSpeed: 0, status: 'Tạm dừng' });
              } else {
                patch({ emergency: false });
                setRunning(true);
              }
            }}
          >
            <span>{running ? <Pause size={16} /> : <Play size={16} />}</span>
            {running ? 'Tạm dừng' : 'Tiếp tục'}
          </button>
          <button aria-label="Đặt lại mô phỏng" onClick={() => reset()}>
            <RotateCcw size={16} />
            Đặt lại
          </button>
          <button className="emergency-button" onClick={() => stop(true)}>
            <Square size={16} />
            Dừng khẩn
          </button>
        </div>
      </div>
      <div className="sim-layout">
        <div className="sim-world">
          <div className="sim-world-tools">
            <label>
              Phòng
              <select
                aria-label="Kịch bản phòng"
                value={scene}
                onChange={(e) => reset(e.target.value)}
              >
                {Object.entries(scenes).map(([id, s]) => (
                  <option key={id} value={id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className={follow ? 'active' : ''}
              aria-pressed={follow}
              onClick={() => setFollow(!follow)}
            >
              {follow ? 'Góc nhìn theo xe' : 'Góc nhìn toàn phòng'}
            </button>
          </div>
          <SimulationViewport
            project={project}
            state={state}
            config={config}
            follow={follow}
            expression={faceExpression}
          />
          <div className="sim-status" data-testid="simulation-status">
            <span className={running ? 'running-dot' : 'paused-dot'} />
            <strong>{state.status}</strong>
            <span>
              {running ? 'Đang mô phỏng' : 'Đang dừng'} · {state.time.toFixed(1)} s
            </span>
          </div>
          <div className="sim-telemetry" aria-label="Số liệu mô phỏng">
            <div>
              <span>Siêu âm phía trước</span>
              <strong data-testid="sonar-distance">
                {sonar.distance === null ? '—' : `${(sonar.distance * 100).toFixed(0)} cm`}
              </strong>
              <small>{sonar.reason}</small>
            </div>
            <div>
              <span>Tốc độ trái / phải</span>
              <strong>
                {state.leftSpeed.toFixed(2)} / {state.rightSpeed.toFixed(2)}
              </strong>
              <small>m/s · cùng lệnh mỗi cặp motor</small>
            </div>
            <div>
              <span>Đường đã đi</span>
              <strong>{state.travelled.toFixed(2)} m</strong>
              <small data-testid="sim-pose">
                X {state.x.toFixed(2)} · Z {state.z.toFixed(2)} ·{' '}
                {((state.yaw * 180) / Math.PI).toFixed(0)}°
              </small>
            </div>
          </div>
        </div>
        <aside className="sim-control-panel" aria-label="Điều khiển xe ảo">
          <div className="sim-face-card">
            <RobotFace expression={faceExpression} />
            <div>
              <strong>{expressions[faceExpression].label}</strong>
              <span>{faceSettings.auto ? 'Biểu cảm theo mô phỏng' : 'Biểu cảm đã chọn'}</span>
            </div>
          </div>
          <div className="sim-mode">
            <button
              aria-pressed={config.mode === 'manual'}
              className={config.mode === 'manual' ? 'active' : ''}
              onClick={() => stop()}
            >
              Lái tay
            </button>
            <button
              aria-pressed={config.mode === 'avoid'}
              className={config.mode === 'avoid' ? 'active' : ''}
              onClick={() => {
                patch({ mode: 'avoid', emergency: false, left: 0, right: 0 });
                setRunning(true);
              }}
            >
              Tự tránh vật cản
            </button>
          </div>
          <div className="drive-pad">
            <button aria-label="Lái tiến" onClick={() => drive(1, 1)}>
              <ArrowUp size={24} />
              <span>Tiến</span>
            </button>
            <button aria-label="Xoay trái" onClick={() => drive(-0.65, 0.65)}>
              <RotateCcw size={22} />
              <span>Trái</span>
            </button>
            <button aria-label="Dừng xe mô phỏng" onClick={() => stop()}>
              <Square size={18} />
              <span>Dừng</span>
            </button>
            <button aria-label="Xoay phải" onClick={() => drive(0.65, -0.65)}>
              <RotateCw size={22} />
              <span>Phải</span>
            </button>
            <button aria-label="Lái lùi" onClick={() => drive(-1, -1)}>
              <ArrowDown size={24} />
              <span>Lùi</span>
            </button>
          </div>
          <p className="small-note">
            Nút hướng chạy đến khi bấm Dừng. Có thể giữ phím mũi tên, thả phím để dừng; Space dừng
            khẩn. Rời cửa sổ hoặc rời tab mô phỏng sẽ dừng.
          </p>
          <label className="sim-range">
            Tốc độ tối đa giả định <strong>{config.speed.toFixed(2)} m/s</strong>
            <input
              type="range"
              aria-label="Tốc độ mô phỏng"
              min="0.05"
              max="0.3"
              step="0.01"
              value={config.speed}
              onChange={(e) => patch({ speed: Number(e.target.value) })}
            />
          </label>
          <div className="motor-sliders">
            {(['left', 'right'] as const).map((side, n) => (
              <label className="sim-range" key={side}>
                {n === 0 ? 'MA · cặp trái' : 'MB · cặp phải'}
                <strong>{Math.round(config[side] * 100)}%</strong>
                <input
                  type="range"
                  aria-label={n === 0 ? 'Lệnh motor trái' : 'Lệnh motor phải'}
                  min="-100"
                  max="100"
                  value={config[side] * 100}
                  onChange={(e) => {
                    patch({
                      [side]: Number(e.target.value) / 100,
                      mode: 'manual',
                      emergency: false,
                    });
                    setRunning(true);
                  }}
                />
              </label>
            ))}
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.guard}
              onChange={(e) => patch({ guard: e.target.checked })}
            />
            Chặn tiến khi sonar dưới 25 cm
          </label>
          <div className="sim-faults">
            <h3>
              <Radio size={16} />
              Thử tình huống lỗi
            </h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                aria-label="Liên lạc giả lập hoạt động"
                checked={config.link}
                onChange={(e) => patch({ link: e.target.checked })}
              />
              Liên lạc Note 9 ↔ ESP32
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                aria-label="Cảm biến giả lập hoạt động"
                checked={config.sensor}
                onChange={(e) => patch({ sensor: e.target.checked })}
              />
              Cảm biến MKE-S01 hoạt động
            </label>
            <label className="sim-range">
              Điện áp pin giả lập<strong>{config.voltage.toFixed(1)} V</strong>
              <input
                type="range"
                aria-label="Điện áp pin giả lập"
                min="6"
                max="8.4"
                step="0.1"
                value={config.voltage}
                onChange={(e) => patch({ voltage: Number(e.target.value) })}
              />
            </label>
            <p className="small-note">
              Dưới 7 V: mô phỏng dừng theo giới hạn VIN shield. Đây không phải mô hình BMS hoặc
              ngưỡng cắt pin thật.
            </p>
          </div>
        </aside>
      </div>
      <div className="sim-lower-grid">
        <article className="design-card sim-map-card">
          <h3>Vị trí trong phòng 3 × 3 m</h3>
          <svg
            viewBox="-1.6 -1.6 3.2 3.2"
            role="img"
            aria-label="Bản đồ thật của phòng giả lập, không phải bản đồ SLAM"
          >
            <rect
              x="-1.5"
              y="-1.5"
              width="3"
              height="3"
              rx="0.03"
              fill="#eff5f2"
              stroke="#b7ccc3"
              strokeWidth="0.025"
            />
            {config.obstacles.map((o) => (
              <rect
                key={o.id}
                x={o.x - o.width / 2}
                y={-o.z - o.depth / 2}
                width={o.width}
                height={o.depth}
                fill="#c5b396"
              />
            ))}
            <polyline
              points={state.trail.map(([x, z]) => `${x},${-z}`).join(' ')}
              fill="none"
              stroke="#66a691"
              strokeWidth="0.018"
            />
            <g
              transform={`translate(${state.x} ${-state.z}) rotate(${(state.yaw * 180) / Math.PI})`}
            >
              <rect x="-0.088" y="-0.106" width="0.176" height="0.212" rx="0.025" fill="#347d70" />
              <path d="M 0 -0.2 L -.07 -.1 L .07 -.1 Z" fill="#286c61" />
            </g>
          </svg>
          <p className="small-note">
            Vị trí và vật cản do mô phỏng biết sẵn. Vệt di chuyển không phải bản đồ SLAM hoặc
            odometry đo thực.
          </p>
        </article>
        <article className="design-card vision-simulator">
          <div className="vision-heading">
            <h3>Note 9 · thử luồng nhận diện & báo thức</h3>
            <span className="verification illustrative">Kịch bản giả lập</span>
          </div>
          <p>
            Chọn đối tượng có sẵn trong cảnh để thử phản ứng. Không dùng camera, YOLO hoặc ảnh người
            thật.
          </p>
          <div className="vision-options">
            <label>
              Đối tượng
              <select
                aria-label="Đối tượng giả lập"
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value as VisionScenario);
                  setVisionStart(null);
                }}
              >
                <option value="none">Không có đối tượng</option>
                <option value="trash">Rác trên sàn</option>
                <option value="person">Người trên giường</option>
              </select>
            </label>
            <label>
              Hướng camera
              <select
                aria-label="Hướng camera giả lập"
                value={cameraView}
                onChange={(e) => {
                  setCameraView(e.target.value as typeof cameraView);
                  setVisionStart(null);
                }}
              >
                <option value="floor">Nhìn sàn · 35° hiện tại</option>
                <option value="bed">Hướng lên giường · giả định đổi gá</option>
              </select>
            </label>
          </div>
          <div className={`vision-preview ${vision.detected ? 'detected' : ''}`}>
            <div className="vision-target">
              {scenario === 'person' && cameraView === 'bed' ? (
                <>
                  <span className="person-head" />
                  <span className="person-body" />
                </>
              ) : scenario === 'trash' && cameraView === 'floor' ? (
                <span className="trash-object" />
              ) : (
                <span className="empty-crosshair">+</span>
              )}
            </div>
            <span>{vision.label}</span>
          </div>
          <div className="vision-result" data-testid="vision-result">
            {vision.alarm
              ? 'Đủ 2 giây · kích hoạt báo thức giả lập'
              : vision.detected
                ? 'Đã phát hiện trong kịch bản'
                : visionStart === null
                  ? 'Chưa chạy kịch bản'
                  : 'Đang kiểm tra hướng nhìn…'}
          </div>
          <div className="wire-actions">
            <button
              className="primary-button"
              onClick={() => {
                stop();
                setVisionStart(stateRef.current.time);
                setRunning(true);
              }}
            >
              <Play size={15} />
              Chạy kịch bản
            </button>
            <button className="wide-button" onClick={() => void playSound()}>
              <Volume2 size={15} />
              Phát chuông thử
            </button>
          </div>
          <p className="small-note">
            Chỉ nút Phát chuông thử phát âm thanh qua loa máy đang dùng. Độ trễ 0,5 s và 2 s là quy
            tắc minh họa, không phải hiệu năng AI của Note 9. Đổi góc camera ở đây không chỉnh gá 3D
            đã lưu.
          </p>
          {soundError && <p role="alert">{soundError}</p>}
        </article>
      </div>
      <details className="sim-assumptions">
        <summary>Giả định và phạm vi mô phỏng</summary>
        <p>
          Vận tốc v = (v trái + v phải) / 2; tốc độ quay = (v trái − v phải) / khoảng cách bánh.
          Khoảng cách bánh giả định 144 mm, bán kính bánh 32,5 mm; thân va chạm xấp xỉ bằng hình
          tròn R150 mm. Mô hình động học lý tưởng chưa có trượt bánh, mô-men, dòng kẹt trục hoặc
          nhiệt.
        </p>
        <p>
          Sonar lấy mẫu 11 tia trong góc 15°, dải 3–200 cm, giả định vật cản phản xạ hoàn hảo. ECHO
          minh họa hiện tại: {sonar.echoUs === null ? 'không có' : `${Math.round(sonar.echoUs)} µs`}
          . Tự tránh chỉ đi thẳng và xoay phải khi vật dưới 30 cm; có thể bị kẹt, không lập kế hoạch
          đường đi. Chặn va chạm dùng hình học biết sẵn trong phòng, không chứng minh robot thật
          tránh được vật cản phía sau.
        </p>
        <p>
          SLAM và quét/hút chưa được mô phỏng vì chưa chốt cảm biến, cơ cấu và thuật toán. Mọi thử
          nghiệm tại đây không ghi kết quả vào nhật ký đo phần cứng, không sửa thiết kế hay tồn kho.
        </p>
      </details>
    </div>
  );
}
