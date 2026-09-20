import type { SimConfig, SimState } from './simulation';

export const expressionIds = ['happy', 'curious', 'sad', 'sleepy', 'surprised', 'alert'] as const;
export type Expression = (typeof expressionIds)[number];
export const expressions: Record<Expression, { label: string; hint: string; color: string }> = {
  happy: { label: 'Vui vẻ', hint: 'Sẵn sàng làm bạn cùng bạn', color: '#67f5d4' },
  curious: { label: 'Tò mò', hint: 'Quan sát và khám phá xung quanh', color: '#73d8ff' },
  sad: { label: 'Buồn', hint: 'Cần bạn quan tâm một chút', color: '#95adff' },
  sleepy: { label: 'Đang ngủ', hint: 'Nghỉ ngơi, mắt khép nhẹ', color: '#b9a5ef' },
  surprised: { label: 'Ngạc nhiên', hint: 'Ồ, có điều gì ở phía trước!', color: '#ffd585' },
  alert: { label: 'Chú ý', hint: 'Có trạng thái cần kiểm tra', color: '#ff9e83' },
};
export const defaultFace = { expression: 'happy' as Expression, auto: true };

export function simulationExpression(
  state: SimState,
  config: SimConfig,
  running: boolean,
  distance: number | null,
  alarm: boolean,
): Expression {
  if (
    config.emergency ||
    !config.link ||
    !config.sensor ||
    config.voltage < 7 ||
    config.voltage > 8.4
  )
    return 'alert';
  if (alarm) return 'surprised';
  if (!running) return 'sleepy';
  if (distance !== null && distance <= 0.3) return 'surprised';
  if (config.mode === 'avoid' || Math.abs(state.leftSpeed - state.rightSpeed) > 0.01)
    return 'curious';
  return 'happy';
}
