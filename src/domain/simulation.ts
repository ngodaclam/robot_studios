export interface Obstacle {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}
export interface SimConfig {
  mode: 'manual' | 'avoid';
  speed: number;
  left: number;
  right: number;
  link: boolean;
  sensor: boolean;
  voltage: number;
  emergency: boolean;
  guard: boolean;
  trackM: number;
  wheelRadiusM: number;
  bodyRadiusM: number;
  obstacles: Obstacle[];
}
export interface SimState {
  x: number;
  z: number;
  yaw: number;
  time: number;
  travelled: number;
  leftAngle: number;
  rightAngle: number;
  leftSpeed: number;
  rightSpeed: number;
  avoidRemaining: number;
  status: string;
  trail: [number, number][];
}
export const ROOM_HALF = 1.5;
export const sonarRange = { min: 0.03, max: 2, angle: (15 * Math.PI) / 180, offset: 0.106 };
export const scenes: Record<string, { name: string; obstacles: Obstacle[] }> = {
  room: {
    name: 'Trong phòng · hộp & bàn',
    obstacles: [
      { id: 'box', x: 0, z: 0.12, width: 0.55, depth: 0.3, height: 0.25 },
      { id: 'desk', x: 0.83, z: 0.7, width: 0.65, depth: 0.6, height: 0.5 },
      { id: 'side', x: -0.85, z: 0.5, width: 0.35, depth: 0.5, height: 0.35 },
    ],
  },
  corridor: {
    name: 'Lối hẹp',
    obstacles: [
      { id: 'left-wall', x: -0.58, z: 0.2, width: 0.4, depth: 1.5, height: 0.4 },
      { id: 'right-wall', x: 0.58, z: 0.2, width: 0.4, depth: 1.5, height: 0.4 },
      { id: 'end-box', x: 0, z: 1.1, width: 0.5, depth: 0.2, height: 0.25 },
    ],
  },
  empty: { name: 'Sàn trống', obstacles: [] },
};
export function initialSimulation(): SimState {
  return {
    x: 0,
    z: -0.8,
    yaw: 0,
    time: 0,
    travelled: 0,
    leftAngle: 0,
    rightAngle: 0,
    leftSpeed: 0,
    rightSpeed: 0,
    avoidRemaining: 0,
    status: 'Sẵn sàng',
    trail: [[0, -0.8]],
  };
}
export function defaultSimConfig(): SimConfig {
  return {
    mode: 'manual',
    speed: 0.22,
    left: 0,
    right: 0,
    link: true,
    sensor: true,
    voltage: 7.4,
    emergency: false,
    guard: true,
    trackM: 0.144,
    wheelRadiusM: 0.0325,
    bodyRadiusM: 0.15,
    obstacles: scenes.room.obstacles,
  };
}
export function rayBox(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  box: Obstacle,
): number | null {
  let near = -Infinity,
    far = Infinity;
  for (const [origin, direction, min, max] of [
    [ox, dx, box.x - box.width / 2, box.x + box.width / 2],
    [oz, dz, box.z - box.depth / 2, box.z + box.depth / 2],
  ]) {
    if (Math.abs(direction) < 1e-9) {
      if (origin < min || origin > max) return null;
      continue;
    }
    const a = (min - origin) / direction,
      b = (max - origin) / direction;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  if (far < 0) return null;
  return Math.max(0, near);
}
export function roomWalls(): Obstacle[] {
  return [
    { id: 'wall-n', x: 0, z: ROOM_HALF + 0.05, width: 3.2, depth: 0.1, height: 0.18 },
    { id: 'wall-s', x: 0, z: -ROOM_HALF - 0.05, width: 3.2, depth: 0.1, height: 0.18 },
    { id: 'wall-e', x: ROOM_HALF + 0.05, z: 0, width: 0.1, depth: 3, height: 0.18 },
    { id: 'wall-w', x: -ROOM_HALF - 0.05, z: 0, width: 0.1, depth: 3, height: 0.18 },
  ];
}
export function readSonar(
  state: Pick<SimState, 'x' | 'z' | 'yaw'>,
  obstacles: Obstacle[],
  connected = true,
) {
  const origin: [number, number] = [
    state.x + Math.sin(state.yaw) * sonarRange.offset,
    state.z + Math.cos(state.yaw) * sonarRange.offset,
  ];
  if (!connected)
    return { distance: null, valid: false, reason: 'Mất cảm biến', origin, echoUs: null };
  let distance = Infinity;
  for (let n = 0; n <= 10; n++) {
    const angle = state.yaw + (n / 10 - 0.5) * sonarRange.angle;
    for (const box of [...obstacles, ...roomWalls()]) {
      const hit = rayBox(...origin, Math.sin(angle), Math.cos(angle), box);
      if (hit !== null) distance = Math.min(distance, hit);
    }
  }
  if (distance < sonarRange.min)
    return { distance: null, valid: false, reason: 'Vùng mù dưới 3 cm', origin, echoUs: null };
  if (distance > sonarRange.max)
    return {
      distance: null,
      valid: true,
      reason: 'Không thấy vật trong 2 m',
      origin,
      echoUs: null,
    };
  return {
    distance,
    valid: true,
    reason: 'Có phản hồi',
    origin,
    echoUs: ((distance * 2) / 343) * 1e6,
  };
}
export function intersectsBody(x: number, z: number, radius: number, obstacles: Obstacle[]) {
  if (Math.abs(x) + radius > ROOM_HALF || Math.abs(z) + radius > ROOM_HALF) return true;
  return obstacles.some((b) => {
    const cx = Math.max(b.x - b.width / 2, Math.min(x, b.x + b.width / 2));
    const cz = Math.max(b.z - b.depth / 2, Math.min(z, b.z + b.depth / 2));
    return Math.hypot(x - cx, z - cz) < radius;
  });
}
export function stepSimulation(state: SimState, config: SimConfig, delta: number): SimState {
  const dt = Number.isFinite(delta) ? Math.min(0.05, Math.max(0, delta)) : 0;
  if (!dt) return state;
  const sonar = readSonar(state, config.obstacles, config.sensor);
  let left = Math.max(-1, Math.min(1, config.left)) * config.speed;
  let right = Math.max(-1, Math.min(1, config.right)) * config.speed;
  let avoidRemaining = Math.max(0, state.avoidRemaining - dt);
  let status = 'Điều khiển tay';
  if (config.mode === 'avoid') {
    if (!avoidRemaining && sonar.distance !== null && sonar.distance < 0.3) avoidRemaining = 1.1;
    left = avoidRemaining ? Math.min(config.speed, 0.14) : config.speed * 0.8;
    right = avoidRemaining ? -left : left;
    status = avoidRemaining ? 'Né vật cản · xoay phải' : 'Tự tránh · đi thẳng';
  }
  const blocked = config.emergency
    ? 'Dừng khẩn cấp'
    : !config.link
      ? 'Mất liên lạc · dừng motor'
      : config.voltage < 7
        ? 'VIN shield dưới 7 V · dừng mô phỏng'
        : config.voltage > 8.4
          ? 'Điện áp ngoài cấu hình 2S · dừng'
          : !sonar.valid && (config.guard || config.mode === 'avoid')
            ? `${sonar.reason} · dừng motor`
            : config.guard &&
                config.mode === 'manual' &&
                left + right > 0 &&
                sonar.distance !== null &&
                sonar.distance < 0.25
              ? 'Vật cản gần · chặn tiến'
              : '';
  if (blocked) {
    left = 0;
    right = 0;
    status = blocked;
    avoidRemaining = 0;
  }
  const v = (left + right) / 2;
  const omega = (left - right) / Math.max(0.01, config.trackM);
  let yaw = state.yaw + omega * dt;
  let x = state.x + v * dt * Math.sin(state.yaw + (omega * dt) / 2);
  let z = state.z + v * dt * Math.cos(state.yaw + (omega * dt) / 2);
  if (intersectsBody(x, z, config.bodyRadiusM, config.obstacles)) {
    x = state.x;
    z = state.z;
    yaw = state.yaw;
    left = 0;
    right = 0;
    status = 'Chạm biên hình học · dừng';
  }
  const travelled = state.travelled + Math.hypot(x - state.x, z - state.z);
  const last = state.trail[state.trail.length - 1];
  const trail =
    Math.hypot(x - last[0], z - last[1]) > 0.025
      ? [...state.trail.slice(-399), [x, z] as [number, number]]
      : state.trail;
  return {
    ...state,
    x,
    z,
    yaw: Math.atan2(Math.sin(yaw), Math.cos(yaw)),
    time: state.time + dt,
    travelled,
    leftSpeed: left,
    rightSpeed: right,
    leftAngle: state.leftAngle + (left * dt) / Math.max(0.001, config.wheelRadiusM),
    rightAngle: state.rightAngle + (right * dt) / Math.max(0.001, config.wheelRadiusM),
    avoidRemaining,
    status: !left && !right && !blocked && status === 'Điều khiển tay' ? 'Đã dừng' : status,
    trail,
  };
}

export type VisionScenario = 'none' | 'person' | 'trash';
export function simulateVision(
  scenario: VisionScenario,
  view: 'floor' | 'bed',
  elapsedSeconds: number,
  enabled: boolean,
) {
  const visible =
    enabled &&
    elapsedSeconds >= 0.5 &&
    ((scenario === 'person' && view === 'bed') || (scenario === 'trash' && view === 'floor'));
  return {
    detected: visible,
    label: visible
      ? scenario === 'person'
        ? 'Người trên giường (giả lập)'
        : 'Rác trên sàn (giả lập)'
      : enabled
        ? 'Không có mục tiêu trong góc nhìn giả lập'
        : 'Thị giác đang tắt',
    alarm: visible && scenario === 'person' && elapsedSeconds >= 2,
  };
}
