import type { RobotProject } from './schema';
import { partContacts, type Contact, type Point3 } from './contacts';
import { connectionPlanMarkdown } from './connectionPlan';
import { internalConnections } from './wiringInternals';
import { personalSources } from '../data/personalRobot';

export type WireGroup = 'power' | 'ground' | 'i2c' | 'sonar' | 'motor' | 'radio';
export const wireGroups: Record<WireGroup, string> = {
  power: 'Nguồn',
  ground: 'GND chung',
  i2c: 'Bus I2C',
  sonar: 'Siêu âm',
  motor: 'Motor',
  radio: 'Wi-Fi',
};
export interface WireEnd {
  instanceId: string;
  pin: string;
  anchorMm: Point3;
  contactId?: string;
  contact?: Contact;
}
export interface RobotWire {
  id: string;
  name: string;
  group: WireGroup;
  color: string;
  from: WireEnd;
  to: WireEnd;
  medium: 'wire' | 'header' | 'contact' | 'internal' | 'radio';
  transfer?: 'switch' | 'regulator';
  status: 'reference' | 'confirm' | 'blocked';
  voltage: string;
  cable: string;
  explanation: string;
  check: string;
  source: string;
}
const end = (instanceId: string, pin: string, contact: string | Point3): WireEnd => ({
  instanceId,
  pin,
  anchorMm: typeof contact === 'string' ? [0, 0, 0] : contact,
  contactId: typeof contact === 'string' ? contact : undefined,
});
const ref = personalSources;
const wire = (
  id: string,
  name: string,
  group: WireGroup,
  color: string,
  from: WireEnd,
  to: WireEnd,
  extra: Partial<RobotWire>,
): RobotWire => ({
  id,
  name,
  group,
  color,
  from,
  to,
  medium: 'wire',
  status: 'confirm',
  voltage: 'Cần xác nhận',
  cable: 'Chọn chiều dài sau khi đo đường đi; chưa phải chiều dài cắt dây.',
  explanation: '',
  check: 'Đối chiếu nhãn trên đúng phiên bản bo, không suy ra thứ tự chân từ màu dây.',
  source: ref.shield,
  ...extra,
});
const cables: RobotWire[] = [
  wire(
    'W01',
    'Dương pin vào công tắc',
    'power',
    '#ce4944',
    end('holder', 'PACK+', 'PACK+'),
    end('switch', 'IN (+)', 'IN'),
    {
      voltage: '7,4 V danh định · tối đa 8,4 V',
      cable: 'Dây/tiếp điểm tích hợp khay; cần kiểm tra định mức.',
      explanation:
        'Công tắc ngắt nhánh dương. Hai cell nằm trong khay nối tiếp, dung lượng bộ vẫn là 2,5 Ah. Không hàn cầu nối tùy ý lên cell.',
      check:
        'Chưa chọn cầu chì/bảo vệ 2S ở nhánh nguồn. Đo cực tính tại đầu ra khay trước khi nối tải.',
      source: ref.chassis,
      status: 'blocked',
    },
  ),
  wire(
    'W02',
    'Nguồn công suất tới driver',
    'power',
    '#ce4944',
    end('switch', 'OUT (+)', 'OUT'),
    end('driver', 'VIN motor (+)', 'VIN'),
    {
      status: 'blocked',
      voltage: 'VIN motor yêu cầu 6–9 V',
      cable: 'Dự kiến dây nguồn 22 AWG; phải chốt theo dòng đo, chiều dài và đầu giắc.',
      explanation:
        'Đường cấp năng lượng cho bốn motor. VIN motor tách khỏi chân 5V của cổng I2C. Tuyến hiện minh họa nhánh sau công tắc; cần bổ sung bảo vệ/cầu chì trước khi cấp tải.',
      check:
        'Không đưa pin 2S vào chân 5V logic. Kiểm tra dòng khởi động và khả năng khay/dây/giắc.',
      source: ref.driver,
    },
  ),
  wire(
    'W03',
    'Nguồn vào IO Shield',
    'power',
    '#ce4944',
    end('switch', 'OUT (+)', 'OUT'),
    end('shield', 'VIN / DC (+)', 'dc-vin'),
    {
      status: 'blocked',
      voltage: 'Shield yêu cầu 7–24 V',
      cable: 'Dây nguồn + giắc DC 5,5 × 2,1; kiểm tra cực tính trên bo.',
      explanation:
        'Pin 2S đầy là 8,4 V nhưng khi xả có thể thấp hơn 7 V. Nhánh trực tiếp này chưa bảo đảm nguồn logic ổn định trong cả chu kỳ pin.',
      check:
        'Chốt bộ nguồn phù hợp hoặc giới hạn vận hành trước khi chạy thật. Không tự cấp đồng thời USB và nguồn ngoài khi chưa kiểm tra đường nguồn.',
    },
  ),
  wire(
    'W04',
    'Đường hồi dòng motor',
    'ground',
    '#3d4853',
    end('holder', 'PACK−', 'PACK−'),
    end('driver', 'GND nguồn motor', 'GND'),
    {
      voltage: '0 V tham chiếu',
      cable: 'Dây công suất; đi sát nhánh dương tương ứng.',
      explanation:
        'Dòng motor quay về cực âm pin qua nhánh này. Không cho dòng công suất motor đi qua dây GND nhỏ của cảm biến.',
      source: ref.driver,
    },
  ),
  wire(
    'W05',
    'Đường hồi nguồn shield',
    'ground',
    '#3d4853',
    end('holder', 'PACK−', 'PACK−'),
    end('shield', 'GND nguồn', 'dc-gnd'),
    {
      voltage: '0 V tham chiếu',
      cable: 'Dây nguồn riêng về điểm phân phối âm pin.',
      explanation:
        'Shield và driver phải có chung mốc GND để tín hiệu logic có ý nghĩa. Bố trí nhánh hồi công suất và logic tránh chạy chung đoạn dây nhỏ.',
    },
  ),
  wire(
    'W06',
    'Shield cấp 5V cho ESP32',
    'power',
    '#ce4944',
    end('shield', '5V trên header', 'stack-5v'),
    end('esp32', '5V header', 'stack-5v'),
    {
      medium: 'header',
      voltage: '5 V qua chân cắm',
      cable: 'Tiếp xúc header khi cắm bo; không cần thêm dây jumper song song.',
      status: 'reference',
      explanation:
        'MKE-K01 nhận nguồn qua các chân cắm tương ứng trên MKE-B01. Không đưa điện áp 2S vào chân 5V hoặc 3V3 của ESP32.',
    },
  ),
  wire(
    'W07',
    'GND giữa ESP32 và shield',
    'ground',
    '#3d4853',
    end('shield', 'GND header', 'stack-gnd'),
    end('esp32', 'GND header', 'stack-gnd'),
    {
      medium: 'header',
      voltage: '0 V',
      cable: 'Tiếp xúc header của hai bo.',
      status: 'reference',
      explanation: 'Nối mốc GND của ESP32 với toàn bộ ngoại vi trên shield.',
    },
  ),
  wire(
    'W08',
    'Nguồn logic của MKE-M17',
    'power',
    '#ce4944',
    end('shield', '5V cổng I2C', 'i2c-7-5V'),
    end('driver', '5V cổng I2C', 'i2c-5V'),
    {
      status: 'reference',
      voltage: '5 V logic',
      cable: 'Dây nguồn trong cáp 4P XH2.54–Dupont; kiểm tra thứ tự chân.',
      explanation:
        'Cấp điện cho phần xử lý giao tiếp của module, không thay thế nguồn VIN motor. Tổng tải đường 5V của shield cần được đo.',
      source: ref.driver,
    },
  ),
  wire(
    'W09',
    'GND cáp I2C',
    'ground',
    '#3d4853',
    end('shield', 'GND cổng I2C', 'i2c-7-GND'),
    end('driver', 'GND cổng I2C', 'i2c-GND'),
    {
      status: 'reference',
      voltage: '0 V',
      cable: 'GND trong cùng cáp 4P với 5V/SDA/SCL.',
      explanation:
        'Mốc tham chiếu tín hiệu I2C. Giữ riêng đường hồi công suất W04; không coi W09 là dây chịu dòng motor.',
      source: ref.driver,
    },
  ),
  wire(
    'W10',
    'SDA — dữ liệu điều khiển',
    'i2c',
    '#ba8a12',
    end('shield', 'SDA / IO8', 'i2c-7-SDA'),
    end('driver', 'SDA', 'i2c-SDA'),
    {
      status: 'reference',
      voltage: 'Logic tương thích 3,3 V — cần kiểm tra pull-up',
      cable: 'Dây tín hiệu ngắn, dự kiến 28 AWG; tránh chạy sát dây motor.',
      explanation:
        'SDA là đường dữ liệu hai chiều của bus I2C; ở đây dùng gửi lệnh tốc độ/chiều quay đến driver. GPIO8 là chân SDA trên shield; địa chỉ MKE-M17 mặc định 0x40.',
      check:
        'Đo mức kéo lên của bus đúng bo; không thêm pull-up lên 5V vào GPIO ESP32. Đây là I2C, không phải tín hiệu PWM trực tiếp tới motor.',
      source: ref.driver,
    },
  ),
  wire(
    'W11',
    'SCL — nhịp bus I2C',
    'i2c',
    '#398965',
    end('shield', 'SCL / IO9', 'i2c-7-SCL'),
    end('driver', 'SCL', 'i2c-SCL'),
    {
      status: 'reference',
      voltage: 'Logic tương thích 3,3 V — cần kiểm tra pull-up',
      cable: 'Đi cùng SDA và GND, tránh vòng dây dài.',
      explanation:
        'ESP32 tạo nhịp giao tiếp trên GPIO9. SCL đồng bộ dữ liệu SDA; cả hai chân phải đúng với cấu hình firmware.',
    },
  ),
  wire(
    'W12',
    'Nguồn cảm biến siêu âm',
    'power',
    '#ce4944',
    end('shield', '5V ngoại vi', 'gpio-10-5V'),
    end('sonar', '5V', '5V'),
    {
      status: 'reference',
      voltage: '5 V',
      cable: 'Nguồn trong cáp 4P của MKE-S01; kiểm tra nhãn 5V.',
      explanation: 'Nuôi cảm biến, độc lập với mức logic TRIG/ECHO. Không cấp 2S cho chân này.',
      source: ref.sensor,
    },
  ),
  wire(
    'W13',
    'GND cảm biến siêu âm',
    'ground',
    '#3d4853',
    end('shield', 'GND ngoại vi', 'gpio-10-GND'),
    end('sonar', 'GND', 'GND'),
    {
      status: 'reference',
      voltage: '0 V',
      cable: 'GND đi cùng 5V, TRIG, ECHO trong cáp cảm biến.',
      explanation: 'Giữ chung mốc điện áp cảm biến và ESP32; tránh lấy GND qua đường dòng motor.',
      source: ref.sensor,
    },
  ),
  wire(
    'W14',
    'TRIG — yêu cầu đo khoảng cách',
    'sonar',
    '#b66c22',
    end('shield', 'IO10 → ESP32 GPIO10', 'gpio-10-SIG'),
    end('sonar', 'TRIG', 'TRIG'),
    {
      voltage: 'Xung GPIO 3,3 V',
      cable: 'Một dây tín hiệu, chân GPIO10 là lựa chọn theo tệp yêu cầu.',
      explanation:
        'ESP32 phát xung TRIG 10 µs để khởi động phép đo. Cảm biến phát sóng siêu âm, sau đó trả thông tin qua ECHO.',
      source: ref.sensor,
    },
  ),
  wire(
    'W15',
    'ECHO — trả kết quả đo',
    'sonar',
    '#4977c4',
    end('sonar', 'ECHO', 'ECHO'),
    end('shield', 'IO11 → ESP32 GPIO11', 'gpio-11-SIG'),
    {
      voltage: 'Phải phù hợp đầu vào GPIO 3,3 V',
      cable: 'Một dây tín hiệu về GPIO11 dự kiến; kiểm tra phiên bản bo.',
      explanation:
        'ESP32 đo độ rộng xung ECHO để suy ra quãng đường đi-về của âm thanh: d ≈ thời gian × 343 / 2 (m, s, giả định 20°C). Không có echo phải được xử lý như thiếu số đo.',
      check:
        'Hãng công bố hỗ trợ logic 3,3/5V, nhưng cần xác nhận biên độ ECHO trên bo đang có trước khi nối. Không mặc định mọi cảm biến siêu âm đều giống nhau.',
      source: ref.sensor,
    },
  ),
];
for (const [side, channel] of [
  ['left', 'MA'],
  ['right', 'MB'],
] as const) {
  for (const [index, location] of ['front', 'rear'].entries())
    for (const terminal of [1, 2]) {
      const number = 16 + (side === 'left' ? 0 : 4) + index * 2 + terminal - 1;
      cables.push(
        wire(
          `W${number}`,
          `${channel}${terminal} → motor ${side === 'left' ? 'trái' : 'phải'} ${location === 'front' ? 'trước' : 'sau'}`,
          'motor',
          terminal === 1 ? '#cd7c29' : '#278c9a',
          end('driver', `${channel}${terminal}`, `${channel}${terminal}`),
          end(
            `motor-${side}-${location}`,
            `Cọc ${terminal === 1 ? 'A' : 'B'} (quy ước)`,
            terminal === 1 ? 'A' : 'B',
          ),
          {
            voltage: 'Điện áp motor đảo cực / PWM',
            cable:
              'Hai dây công suất cho mỗi motor; phân nhánh hai motor cùng bên, không nối qua breadboard.',
            explanation: `${channel} điều khiển hai motor ${side === 'left' ? 'trái' : 'phải'} mắc song song. Hai đầu A/B đổi cực khi lùi; cọc A/B là nhãn quy ước, không phải đánh số của hãng.`,
            check:
              'Không nối cọc motor với GND cố định. Nâng bánh để kiểm tra chiều, ngắt nguồn trước khi đảo hai dây nếu một motor quay ngược. Đo tổng dòng cả cặp; 0,8A/kênh chưa có dự phòng theo ước tính tải.',
            source: ref.driver,
          },
        ),
      );
    }
}
cables.push(
  wire(
    'R01',
    'Lệnh vận tốc và trạng thái qua Wi-Fi',
    'radio',
    '#8266b0',
    end('phone', 'Ứng dụng Android', [0, 0, 0]),
    end('esp32', 'Wi-Fi / WebSocket', [0, 0, 0]),
    {
      medium: 'radio',
      voltage: 'Không có dây điện giữa hai thiết bị',
      cable: 'Kết nối không dây; Note 9 dùng pin riêng.',
      explanation:
        'Android dự kiến gửi cmd_vel và nhận trạng thái sonar/motor. ESP32 cần dừng khi mất liên lạc hoặc lệnh quá hạn. Mô phỏng chỉ minh họa hành vi, không gửi lệnh ra Wi-Fi.',
      check:
        'ESP32-S3 không hỗ trợ Bluetooth Classic SPP. Chưa có ứng dụng Android hoặc firmware thật được xác nhận.',
      source: ref.bluetooth,
    },
  ),
);

export function robotWires(project: RobotProject): RobotWire[] {
  if (!project.design) return [];
  const parts = new Set(project.instances.map((i) => i.id));
  const resolve = (endpoint: WireEnd): WireEnd => {
    const instance = project.instances.find((i) => i.id === endpoint.instanceId);
    const def = project.definitions.find((d) => d.id === instance?.definitionId);
    const contact = def && partContacts(def).find((c) => c.id === endpoint.contactId);
    return contact ? { ...endpoint, anchorMm: contact.position, contact } : { ...endpoint };
  };
  return [...cables, ...internalConnections]
    .filter((w) => parts.has(w.from.instanceId) && parts.has(w.to.instanceId))
    .map((w) => ({ ...w, from: resolve(w.from), to: resolve(w.to) }))
    .filter((w) => w.medium === 'radio' || (w.from.contact && w.to.contact));
}
export function wireEndLabel(project: RobotProject, end: WireEnd) {
  return `${project.instances.find((p) => p.id === end.instanceId)?.name ?? end.instanceId} · ${end.pin}`;
}
export function wiringMarkdown(project: RobotProject) {
  return (
    `# Dây dẫn — ${project.name}\n\nPhương án tham chiếu; đối chiếu nhãn chân, bảo vệ nguồn và dữ liệu đo trước khi lắp. Bố trí đầu nối theo ảnh MakerEDU, co theo kích thước mô hình. Tọa độ, chiều dài dây và các đầu khay/công tắc/header ESP32 còn là quy ước; đọc nhãn trên bo thực tế. Màu dây là quy ước trong ứng dụng.\n\n` +
    robotWires(project)
      .map(
        (w) =>
          `## ${w.id} — ${w.name}\n\n- Từ: ${wireEndLabel(project, w.from)}\n- Đến: ${wireEndLabel(project, w.to)}\n- Cổng đầu 1: ${w.from.contact?.bank ?? 'Không dây'}\n- Cổng đầu 2: ${w.to.contact?.bank ?? 'Không dây'}\n- Loại: ${connectionMedia[w.medium]}\n- Bó dây: ${wireBundles[wireBundle(w)].label}\n- Điện áp: ${w.voltage}\n- Dây/kết nối: ${w.cable}\n- Trạng thái: ${w.status === 'blocked' ? 'Chưa chốt nguồn — không lắp theo tuyến này' : w.status === 'reference' ? 'Theo nhãn chức năng trong nguồn; chưa đo bo' : 'Cần đối chiếu/đo'}\n\n${w.explanation}\n\n${w.check}\n\nNguồn: ${w.source}\n`,
      )
      .join('\n') +
    '\n' +
    connectionPlanMarkdown(project, robotWires(project))
  );
}

export const connectionMedia: Record<RobotWire['medium'], string> = {
  wire: 'Dây / nhánh cáp',
  header: 'Chân cắm giữa hai bo',
  contact: 'Tiếp xúc pin với khay',
  internal: 'Có sẵn bên trong · không đấu thêm',
  radio: 'Liên kết không dây',
};

export const wireBundles = {
  battery: {
    label: 'Pin & tiếp điểm khay',
    hint: 'Hai cell → lá tiếp xúc → cầu nối tiếp có sẵn → PACK+ / PACK−. Không hàn trực tiếp lên cell.',
  },
  power: {
    label: '1 · Nguồn',
    hint: 'Khay pin → công tắc → VIN driver và giắc DC shield. Nhánh nguồn chưa chốt bảo vệ.',
  },
  i2c: {
    label: '2 · Driver I2C',
    hint: 'Cáp 4 sợi: 5V, GND, SDA / IO8, SCL / IO9. Cắm đúng nhãn, không dò theo màu.',
  },
  sonar: {
    label: '3 · Siêu âm',
    hint: 'Giắc sau S01 → 5V, GND và hàng SIG của IO10 / IO11 trên shield.',
  },
  left: {
    label: '4 · Motor trái',
    hint: 'MA1 / MA2 chia ra hai motor trái. Mỗi motor có 2 dây; A/B là quy ước.',
  },
  right: {
    label: '5 · Motor phải',
    hint: 'MB1 / MB2 chia ra hai motor phải. Hai đầu đảo cực, không nối cố định vào GND.',
  },
  stack: {
    label: '6 · ESP32',
    hint: 'Cắm ESP32 lên hai hàng header của shield; đây là tiếp xúc chân, không thêm jumper.',
  },
  board: {
    label: 'Bên trong shield',
    hint: 'Nét đứt là đường có sẵn trong bo. C01 là bộ hạ áp VIN → 5V, không phải dây nối tắt.',
  },
  radio: { label: '7 · Wi-Fi', hint: 'Note 9 dùng pin riêng, truyền lệnh không dây đến ESP32.' },
} as const;
export type WireBundle = keyof typeof wireBundles;
export function wireBundle(wire: RobotWire): WireBundle {
  if (wire.medium === 'radio') return 'radio';
  if (wire.medium === 'header') return 'stack';
  if (
    wire.medium === 'contact' ||
    (wire.medium === 'internal' && wire.from.instanceId === 'holder')
  )
    return 'battery';
  if (wire.medium === 'internal' && wire.from.instanceId === 'shield') return 'board';
  if (wire.to.instanceId.startsWith('motor-left')) return 'left';
  if (wire.to.instanceId.startsWith('motor-right')) return 'right';
  if (wire.from.instanceId === 'sonar' || wire.to.instanceId === 'sonar') return 'sonar';
  if (wire.from.contactId?.startsWith('i2c-')) return 'i2c';
  return 'power';
}
