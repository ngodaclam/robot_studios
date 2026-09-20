import type { PartDefinition, RobotProject } from './schema';
export interface BomRow {
  definition: PartDefinition;
  required: number;
  owned: number;
  buy: number;
  unitPrice: number | null;
  subtotal: number | null;
  instanceIds: string[];
}
export function buildBom(project: RobotProject): BomRow[] {
  return project.definitions.flatMap((definition) => {
    const instanceIds = project.instances
      .filter((p) => p.definitionId === definition.id)
      .map((p) => p.id);
    if (!instanceIds.length) return [];
    const required = instanceIds.length;
    const owned = definition.includedIn
      ? (project.inventory[definition.includedIn.definitionId] ?? 0) *
        definition.includedIn.quantity
      : (project.inventory[definition.id] ?? 0);
    // Kit components are procured through the kit row, never as duplicate purchases.
    const buy = definition.includedIn ? 0 : Math.max(0, required - owned);
    const unitPrice = definition.includedIn
      ? null
      : Object.hasOwn(project.priceOverrides, definition.id)
        ? project.priceOverrides[definition.id]
        : definition.priceVnd;
    return [
      {
        definition,
        required,
        owned,
        buy,
        unitPrice,
        subtotal:
          buy === 0 || definition.includedIn ? 0 : unitPrice === null ? null : unitPrice * buy,
        instanceIds,
      },
    ];
  });
}
export function summarizeBom(rows: BomRow[]) {
  return {
    knownCost: rows.reduce((s, r) => s + (r.subtotal ?? 0), 0),
    unknownPrices: rows.filter((r) => r.unitPrice === null && !r.definition.includedIn).length,
    unknownPurchasePrices: rows.filter(
      (r) => r.unitPrice === null && r.buy > 0 && !r.definition.includedIn,
    ).length,
    unverified: rows.filter((r) => r.definition.verification !== 'verified').length,
    required: rows.reduce((s, r) => s + r.required, 0),
    buy: rows.reduce((s, r) => s + r.buy, 0),
  };
}
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function exportBomCsv(project: RobotProject): string {
  const header = [
    'Mã linh kiện',
    'Tên linh kiện',
    'Cần',
    'Đã có',
    'Cần mua',
    'Đơn giá VND',
    'Thành tiền VND',
    'Xác minh',
    'Nguồn thông tin',
    'Thuộc bộ kit',
    'Phạm vi',
  ];
  const rows = buildBom(project).map((r) => [
    r.definition.sku,
    r.definition.name,
    r.required,
    r.owned,
    r.buy,
    r.definition.includedIn ? 'Trong giá kit' : (r.unitPrice ?? 'Chưa có giá'),
    r.subtotal ?? 'Chưa tính được',
    r.definition.verification === 'verified'
      ? 'Đã xác minh'
      : r.definition.verification === 'illustrative'
        ? 'MINH HỌA - KHÔNG DÙNG ĐẶT MUA'
        : 'Chưa xác minh',
    r.definition.source,
    r.definition.includedIn?.definitionId ?? '',
    r.definition.placement === 'planned'
      ? 'Đề xuất — chưa chọn mẫu'
      : r.definition.placement === 'offboard'
        ? 'Dụng cụ ngoài xe'
        : 'Trên robot',
  ]);
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
