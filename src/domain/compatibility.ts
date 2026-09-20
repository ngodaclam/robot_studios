import type { Port, RobotProject } from './schema';
export type CheckStatus = 'pass' | 'fail' | 'unknown';
export interface CompatibilityResult {
  id: string;
  rule: 'voltage' | 'logic' | 'current' | 'channels' | 'shaft' | 'required' | 'design';
  title: string;
  status: CheckStatus;
  reason: string;
  instanceIds: string[];
}
export const statusLabel: Record<CheckStatus, string> = {
  pass: 'Đạt theo dữ liệu',
  fail: 'Không đạt',
  unknown: 'Chưa đủ dữ liệu',
};
export function checkCompatibility(project: RobotProject): CompatibilityResult[] {
  const results: CompatibilityResult[] = [];
  const parts = new Map(project.instances.map((i) => [i.id, i]));
  const defs = new Map(project.definitions.map((d) => [d.id, d]));
  const port = (instanceId: string, portId: string): Port | undefined =>
    defs.get(parts.get(instanceId)?.definitionId ?? '')?.ports.find((p) => p.id === portId);
  const name = (id: string) => parts.get(id)?.name ?? id;
  const voltageText = (r: [number, number]) => (r[0] === r[1] ? `${r[0]} V` : `${r[0]}–${r[1]} V`);
  for (const c of project.connections) {
    const from = port(c.from.instanceId, c.from.portId),
      to = port(c.to.instanceId, c.to.portId);
    const ids = [c.from.instanceId, c.to.instanceId];
    if (c.kind === 'power' || c.kind === 'logic') {
      const rule = c.kind === 'power' ? 'voltage' : 'logic';
      const a = from?.voltageV,
        b = to?.voltageV;
      const status: CheckStatus =
        !a || !b ? 'unknown' : a[0] >= b[0] && a[1] <= b[1] ? 'pass' : 'fail';
      results.push({
        id: `${rule}-${c.id}`,
        rule,
        title: `${c.kind === 'power' ? 'Điện áp nguồn' : 'Mức điện áp logic'} · ${name(c.to.instanceId)}`,
        status,
        reason:
          !a || !b
            ? `Chưa có dải điện áp tại ${!a ? name(c.from.instanceId) : name(c.to.instanceId)}. Cần bổ sung dữ liệu cổng.`
            : `${name(c.from.instanceId)} cấp ${voltageText(a)}; đầu vào ${name(c.to.instanceId)} chấp nhận ${voltageText(b)}. ${status === 'pass' ? 'Toàn bộ dải nguồn nằm trong dải đầu vào.' : 'Dải nguồn vượt ra ngoài giới hạn đầu vào.'}`,
        instanceIds: ids,
      });
    } else {
      const a = from?.diameterMm,
        b = to?.diameterMm;
      const status: CheckStatus =
        a === undefined || b === undefined ? 'unknown' : Math.abs(a - b) <= 0.05 ? 'pass' : 'fail';
      results.push({
        id: `shaft-${c.id}`,
        rule: 'shaft',
        title: `Trục và lỗ bánh · ${name(c.to.instanceId)}`,
        status,
        reason:
          a === undefined || b === undefined
            ? 'Thiếu đường kính trục hoặc lỗ bánh xe.'
            : `Trục Ø ${a} mm; lỗ bánh Ø ${b} mm. ${status === 'pass' ? 'Khớp đường kính danh nghĩa (dung sai so sánh 0,05 mm).' : 'Đường kính không khớp.'} Chưa kiểm tra dung sai chế tạo, biên dạng trục hoặc kiểu khóa.`,
        instanceIds: ids,
      });
    }
  }
  const powerGroups = new Map<string, RobotProject['connections']>();
  for (const c of project.connections.filter((c) => c.kind === 'power')) {
    const key = `${c.from.instanceId}:${c.from.portId}`;
    powerGroups.set(key, [...(powerGroups.get(key) ?? []), c]);
  }
  for (const [key, connections] of powerGroups) {
    const first = connections[0];
    const out = port(first.from.instanceId, first.from.portId);
    const demands = connections.map((c) => port(c.to.instanceId, c.to.portId)?.currentA);
    const complete = out?.currentA !== undefined && demands.every((v) => v !== undefined);
    const demand = demands.reduce<number>((sum, v) => sum + (v ?? 0), 0);
    const status: CheckStatus = !complete ? 'unknown' : demand <= out!.currentA! ? 'pass' : 'fail';
    const ids = [first.from.instanceId, ...connections.map((c) => c.to.instanceId)];
    results.push({
      id: `current-${key}`,
      rule: 'current',
      title: `Khả năng cấp dòng · ${name(first.from.instanceId)}`,
      status,
      reason: !complete
        ? 'Thiếu dòng tối đa của nguồn hoặc nhu cầu dòng cực đại của ít nhất một tải. Không dùng giá trị điển hình để kết luận về dòng cực đại.'
        : `Tổng nhu cầu cực đại đã khai báo ${Number(demand.toFixed(3))} A; nguồn khai báo ${out!.currentA} A liên tục. ${status === 'pass' ? 'Đủ theo các giá trị này.' : 'Vượt khả năng cấp dòng đã khai báo.'} Chưa đánh giá nhiệt, xung khởi động, dây dẫn và sụt áp.`,
      instanceIds: ids,
    });
    const motors = connections.filter((c) =>
      ['motor', 'ttMotor'].includes(
        defs.get(parts.get(c.to.instanceId)?.definitionId ?? '')?.geometry ?? '',
      ),
    );
    if (motors.length) {
      const channels = out?.channels;
      const motorDemands = motors.map((c) => port(c.to.instanceId, c.to.portId)?.currentA);
      const grouped = new Map<string, number>();
      motors.forEach((c, n) => {
        const channel = c.channel ?? c.to.instanceId;
        grouped.set(channel, (grouped.get(channel) ?? 0) + (motorDemands[n] ?? 0));
      });
      const channelComplete =
        out?.perChannelCurrentA !== undefined && motorDemands.every((v) => v !== undefined);
      results.push({
        id: `channel-current-${key}`,
        rule: 'current',
        title: `Dòng từng kênh · ${name(first.from.instanceId)}`,
        status: !channelComplete
          ? 'unknown'
          : [...grouped.values()].every((v) => v <= out!.perChannelCurrentA!)
            ? 'pass'
            : 'fail',
        reason: !channelComplete
          ? 'Thiếu giới hạn dòng mỗi kênh hoặc dòng cực đại của động cơ.'
          : `Tổng dòng cực đại từng kênh (cộng các động cơ mắc chung): ${[...grouped.values()].join(' / ')} A; giới hạn mỗi kênh ${out!.perChannelCurrentA} A theo khai báo.`,
        instanceIds: ids,
      });
      results.push({
        id: `channels-${key}`,
        rule: 'channels',
        title: `Số kênh điều khiển · ${name(first.from.instanceId)}`,
        status: channels === undefined ? 'unknown' : channels >= grouped.size ? 'pass' : 'fail',
        reason:
          channels === undefined
            ? 'Chưa khai báo số kênh của cổng điều khiển động cơ.'
            : `${motors.length} động cơ trên ${grouped.size} nhóm điều khiển; driver có ${channels} kênh độc lập theo dữ liệu. Các động cơ chung nhóm không điều khiển độc lập.`,
        instanceIds: ids,
      });
    }
  }
  for (const i of project.instances) {
    const required = defs.get(i.definitionId)?.ports.filter((p) => p.required) ?? [];
    if (!required.length) continue;
    const missing = required.filter(
      (p) =>
        !project.connections.some((c) =>
          p.direction === 'in'
            ? c.to.instanceId === i.id && c.to.portId === p.id
            : c.from.instanceId === i.id && c.from.portId === p.id,
        ),
    );
    results.push({
      id: `required-${i.id}`,
      rule: 'required',
      title: `Kết nối bắt buộc · ${i.name}`,
      status: missing.length ? 'fail' : 'pass',
      reason: missing.length
        ? `Chưa nối: ${missing.map((p) => p.name + ' (' + p.id + ')').join(', ')}.`
        : `Đã khai báo ${required.length}/${required.length} cổng bắt buộc. Việc có kết nối không xác nhận tương thích giao thức.`,
      instanceIds: [i.id],
    });
  }
  return results;
}
