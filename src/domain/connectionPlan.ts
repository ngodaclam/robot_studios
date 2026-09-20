import { buildBom } from './bom';
import type { RobotProject } from './schema';
import type { RobotWire } from './wiring';

export const electricalContacts: Record<string, string[]> = {
  holder: ['PACK+', 'PACK−', 'a-plus', 'a-minus', 'b-plus', 'b-minus'],
  switch: ['IN', 'OUT'],
  'cell-a': ['positive', 'negative'],
  'cell-b': ['positive', 'negative'],
  shield: [
    'dc-vin',
    'dc-gnd',
    'stack-5v',
    'stack-gnd',
    'stack-gpio8',
    'stack-gpio9',
    'stack-gpio10',
    'stack-gpio11',
    'i2c-7-5V',
    'i2c-7-GND',
    'i2c-7-SDA',
    'i2c-7-SCL',
    'gpio-10-5V',
    'gpio-10-GND',
    'gpio-10-SIG',
    'gpio-11-SIG',
  ],
  esp32: ['stack-5v', 'stack-gnd', 'stack-gpio8', 'stack-gpio9', 'stack-gpio10', 'stack-gpio11'],
  driver: ['VIN', 'GND', 'i2c-5V', 'i2c-GND', 'i2c-SDA', 'i2c-SCL', 'MA1', 'MA2', 'MB1', 'MB2'],
  sonar: ['5V', 'GND', 'TRIG', 'ECHO'],
  ...Object.fromEntries(
    ['left-front', 'left-rear', 'right-front', 'right-rear'].map((position) => [
      `motor-${position}`,
      ['A', 'B'],
    ]),
  ),
};
const roles: Record<string, { kind: CoverageKind; explanation: string }> = {
  'mke-r01-kit': {
    kind: 'kit',
    explanation:
      'Bộ vật tư gộp. Motor, bánh, khay, công tắc và khung được xét ở từng dòng riêng; không nối dây vào “bộ kit”.',
  },
  'mke-r01-frame': {
    kind: 'mechanical',
    explanation:
      'Gá bốn motor vào khung; đỡ đế pin, trụ shield và cụm giá điện thoại. Khung acrylic không dùng làm GND.',
  },
  'tt-wheel': {
    kind: 'mechanical',
    explanation:
      'Mỗi bánh ép/lắp đúng trục motor TT cùng góc xe. Trục truyền lực, không có dây riêng tới bánh.',
  },
  'battery-deck': {
    kind: 'mechanical',
    explanation:
      'Bắt đế vào khung và giữ khay pin bằng điểm gá của kit; chừa lối tháo cell và dây nguồn.',
  },
  'sonar-bracket': {
    kind: 'mechanical',
    explanation:
      'Giữ S01 ở đầu xe, hai mắt hướng trước; cáp 4P đi phía sau, không bị kẹp giữa gá và PCB.',
  },
  'phone-foot': {
    kind: 'mechanical',
    explanation:
      'Chân đế bắt lên khung, liên kết trụ giá điện thoại. Chi tiết dự kiến gia công, cần kiểm tra độ cứng.',
  },
  'phone-support': {
    kind: 'mechanical',
    explanation: 'Nối chân đế với gá kẹp, chịu tải Note 9. Không cần dây điện qua trụ.',
  },
  'phone-cradle': {
    kind: 'mechanical',
    explanation: 'Kẹp Note 9, nối với trụ; chừa camera, loa và cổng sạc. Góc đặt hiện tại 35°.',
  },
  standoff10: {
    kind: 'mechanical',
    explanation:
      'Bốn trụ đang dựng nối shield với khung. Cần chốt khoảng cách chân ESP32 và khoảng hở dây dưới PCB.',
  },
  m3x6: {
    kind: 'mechanical',
    explanation:
      'Ốc lắp khung/gá theo kit, không phải đầu nối điện. Đo chiều dài ăn ren và tránh chạm đường mạch.',
  },
  m3x30: {
    kind: 'mechanical',
    explanation: 'Bộ ốc/tán dài dùng gá bốn motor theo kit; siết để không kẹp vỏ hộp số.',
  },
  m3x10: {
    kind: 'mechanical',
    explanation: 'Ốc gá khay/cụm theo kit, không có dây. Vị trí lỗ thực tế cần đối chiếu khi lắp.',
  },
  'usb-charger': {
    kind: 'service',
    explanation:
      'Dùng ngoài xe: tháo hai cell khỏi khay, sạc từng ngăn đúng cực. Không nối đầu sạc này vào pack 2S hay VIN robot.',
  },
  'jumper-ribbon': {
    kind: 'material',
    explanation:
      'Cần 8 lõi ngoại vi: 4 cho I2C (W08–W11), 4 cho S01 (W12–W15). Tép M-F không tự thay thế giắc XH 4P; kiểm tra hai cáp đi kèm module/đầu chuyển.',
  },
  'power-wire': {
    kind: 'material',
    explanation:
      'Dây đỏ/đen cho 5 nhánh nguồn và 8 nhánh motor; đoạn trong khay có thể đã đi sẵn. 2 mét đang kê chưa xác nhận đủ chiều dài sau khi đo tuyến thực tế.',
  },
  'dc-jack': {
    kind: 'material',
    explanation:
      'Dùng cặp giắc nguồn nếu phù hợp khay và shield (W03/W05); kiểm tra đực/cái và cực tính, không tính giắc có sẵn thành linh kiện bổ sung.',
  },
};
const electricalExplanations: Record<string, string> = {
  'sunpower-cell':
    'Hai cell lắp ngược chiều trong khay 2S. B01–B04 là tiếp xúc cực với lá khay; B05 nối tiếp Cell 1 + với Cell 2 −. Không hàn dây trực tiếp lên cell.',
  'battery-holder':
    'Khay ghép hai cell thành 2S: PACK+ tới IN công tắc, PACK− chia hai đường hồi tới GND công suất M17 và GND shield. Cầu nối cell đã có trong khay; chưa xác nhận bảo vệ 2S.',
  'power-switch':
    'IN nhận PACK+ qua W01. Khi ON, tiếp điểm S01 nối OUT; W02 cấp VIN motor, W03 cấp giắc DC shield. Không đấu tắt IN với OUT bằng dây ngoài.',
  'mke-b01':
    'Giắc DC nhận nguồn và GND. Bộ hạ áp có sẵn tạo 5V cấp K01, M17 logic và S01. GPIO8/9 tới cột I2C; GPIO10/11 tới chân SIG của đúng hàng ngoại vi. VIN phải nằm trong giới hạn của shield.',
  'mke-k01':
    'Cắm trên B01: nhận 5V/GND và nối GPIO8, GPIO9, GPIO10, GPIO11 qua header. Điều khiển driver bằng I2C, đọc TRIG/ECHO và nhận Wi-Fi từ Note 9. GPIO không dùng để trống; USB dùng khi nạp/debug, không mặc định cấp song song hai nguồn.',
  'mke-m17':
    'VIN/GND cọc vít nhận nguồn công suất. Giắc I2C nhận riêng 5V/GND/SDA(IO8)/SCL(IO9). MA1–MA2 chia cho hai motor trái; MB1–MB2 chia cho hai motor phải. Cổng BLE không sử dụng trong phương án Wi-Fi này; cần đo dòng cả cặp motor.',
  'tt-motor':
    'Mỗi motor có hai tai A/B (quy ước). Hai motor trái dùng MA1/MA2; hai motor phải dùng MB1/MB2. Các đầu đảo cực khi đổi chiều, không nối vào GND cố định. Trục nối bánh tương ứng; nâng bánh để xác nhận chiều.',
  'mke-s01':
    'Giắc 4P phía sau: 5V và GND lấy từ shield, TRIG nối SIG IO10, ECHO nối SIG IO11. Có đường liên tục qua header về GPIO10/11 của ESP32; kiểm tra mức ECHO tương thích 3,3V.',
  note9:
    'Note 9 dùng pin riêng, camera/micro/loa tích hợp; R01 nối Wi-Fi đến ESP32. Không kéo dây nguồn 2S hoặc dây camera sang ESP32. Phần mềm Android/firmware chưa triển khai.',
};
export type CoverageKind =
  | 'electrical'
  | 'mechanical'
  | 'material'
  | 'service'
  | 'planned'
  | 'kit'
  | 'unmapped';
export const coverageLabels: Record<CoverageKind, string> = {
  electrical: 'Điện / tín hiệu',
  mechanical: 'Liên kết cơ khí',
  material: 'Vật tư đấu dây',
  service: 'Dùng ngoài xe',
  planned: 'Chưa chọn mẫu',
  kit: 'Bộ kit',
  unmapped: 'Chưa có phương án',
};

export function connectionCoverage(project: RobotProject, wires: RobotWire[]) {
  if (!project.design) return [];
  return buildBom(project).map((row) => {
    const related = wires.filter(
      (w) =>
        row.instanceIds.includes(w.from.instanceId) || row.instanceIds.includes(w.to.instanceId),
    );
    const expected = row.instanceIds.filter((id) => electricalContacts[id] || id === 'phone');
    const missing = expected.flatMap((id) => {
      if (id === 'phone')
        return wires.some(
          (w) => w.medium === 'radio' && (w.from.instanceId === id || w.to.instanceId === id),
        )
          ? []
          : [`${id}: Wi-Fi`];
      return electricalContacts[id]
        .filter(
          (contact) =>
            !related.some((w) =>
              [w.from, w.to].some((end) => end.instanceId === id && end.contactId === contact),
            ),
        )
        .map((contact) => `${id}: ${contact}`);
    });
    const role =
      row.definition.placement === 'planned'
        ? { kind: 'planned' as const, explanation: row.definition.description }
        : expected.length
          ? {
              kind: 'electrical' as const,
              explanation:
                electricalExplanations[row.definition.id] ??
                'Các chân được ánh xạ theo cấu hình Robot 02; cần đối chiếu linh kiện đã thay đổi.',
            }
          : (roles[row.definition.id] ?? {
              kind: 'unmapped' as const,
              explanation:
                'Linh kiện này chưa có ánh xạ trong phương án Robot 02; cần xác định đúng mã và cổng trước khi thêm dây.',
            });
    return { ...row, ...role, wireIds: related.map((w) => w.id), missing };
  });
}

// Each path is a functional explanation, while the wire records keep exact pins.
const paths = [
  {
    id: 'cells',
    title: 'Hai cell → bộ pin 2S',
    summary: 'Cell 1 + nối Cell 2 − qua cầu khay; hai đầu ngoài ra PACK+ / PACK−.',
    ids: ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07'],
  },
  {
    id: 'motor-power',
    title: 'Pin → công tắc → VIN driver',
    summary: 'PACK+ qua công tắc ON tới VIN 6–9V của M17; dòng motor về PACK− bằng W04.',
    ids: ['W01', 'S01', 'W02', 'W04'],
  },
  {
    id: 'logic-power',
    title: 'Pin → shield → nguồn logic',
    summary:
      'DC/VIN vào bộ hạ áp của B01 rồi cấp 5V/GND cho ESP32, logic M17 và S01. Không nối tắt VIN với 5V.',
    ids: [
      'W03',
      'W05',
      'C01',
      'W06',
      'W07',
      'T05',
      'W08',
      'T08',
      'W09',
      'T06',
      'W12',
      'T09',
      'W13',
      'T07',
    ],
  },
  {
    id: 'i2c-data',
    title: 'ESP32 → header → shield → M17',
    summary:
      'GPIO8/SDA: H01 → T01 → W10. GPIO9/SCL: H02 → T02 → W11. Hai đường điều khiển I2C của driver.',
    ids: ['H01', 'T01', 'W10', 'H02', 'T02', 'W11'],
  },
  {
    id: 'sonar-signal',
    title: 'ESP32 ↔ cảm biến siêu âm',
    summary:
      'TRIG: GPIO10 → H03 → T03 → W14. ECHO: W15 → T04 → H04 → GPIO11. Đối chiếu biên độ ECHO trước khi lắp.',
    ids: ['H03', 'T03', 'W14', 'W15', 'T04', 'H04'],
  },
  {
    id: 'drive',
    title: 'M17 → bốn motor → bốn bánh',
    summary:
      'MA1/MA2 chia cho cặp trái; MB1/MB2 chia cho cặp phải. Mỗi motor 2 dây, mỗi bánh nhận lực qua trục. Kiểm tra dòng của cả cặp trên từng kênh.',
    ids: ['W16', 'W17', 'W18', 'W19', 'W20', 'W21', 'W22', 'W23'],
  },
  {
    id: 'phone',
    title: 'Note 9 ↔ ESP32 qua Wi-Fi',
    summary:
      'Điện thoại xử lý camera/âm thanh tại máy, gửi lệnh và nhận trạng thái qua Wi-Fi. Không có cáp điện giữa hai thiết bị trong phương án này.',
    ids: ['R01'],
  },
];
export function connectionPaths(project: RobotProject, wires: RobotWire[]) {
  if (!project.design) return [];
  const available = new Set(wires.map((w) => w.id));
  return paths.map((path) => ({ ...path, missing: path.ids.filter((id) => !available.has(id)) }));
}

export function connectionPlanMarkdown(project: RobotProject, wires: RobotWire[]) {
  const coverage = connectionCoverage(project, wires);
  return (
    `## Suy luận kết nối toàn robot\n\nSơ đồ chức năng với công tắc ON; chưa xác nhận lắp thử hoặc firmware.\n\n` +
    connectionPaths(project, wires)
      .map(
        (p) =>
          `### ${p.title}\n\n${p.summary}\n\nTuyến: ${p.ids.join(', ')}${p.missing.length ? ` · Thiếu: ${p.missing.join(', ')}` : ''}\n`,
      )
      .join('\n') +
    `\n## Rà soát từng loại linh kiện\n\n` +
    coverage
      .map(
        (row) =>
          `- **${row.definition.name}** × ${row.required} · ${coverageLabels[row.kind]} · ${Math.min(row.owned, row.required)}/${row.required} đã có theo BOM. ${row.explanation}${row.wireIds.length ? ` Tuyến: ${row.wireIds.join(', ')}.` : ''}${row.missing.length ? ` Chưa nối: ${row.missing.join(', ')}.` : ''}`,
      )
      .join('\n')
  );
}
