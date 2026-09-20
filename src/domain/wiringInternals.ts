import type { RobotWire, WireEnd } from './wiring';
import { personalSources } from '../data/personalRobot';

const end = (instanceId: string, contactId: string, pin: string): WireEnd => ({
  instanceId,
  contactId,
  pin,
  anchorMm: [0, 0, 0],
});
const connection = (
  id: string,
  name: string,
  from: WireEnd,
  to: WireEnd,
  extra: Partial<RobotWire>,
): RobotWire => ({
  id,
  name,
  from,
  to,
  group: 'power',
  color: '#a89961',
  medium: 'internal',
  status: 'reference',
  voltage: 'Theo chân tương ứng',
  cable: 'Đường có sẵn trong linh kiện, không thêm dây jumper.',
  explanation: '',
  check: 'Đường nét đứt biểu diễn chức năng; không phải đường đồng PCB đo thực tế.',
  source: personalSources.shield,
  ...extra,
});

export const internalConnections: RobotWire[] = [
  ...(
    [
      ['H01', 8, 'SDA', '#ba8a12'],
      ['H02', 9, 'SCL', '#398965'],
      ['H03', 10, 'TRIG', '#b66c22'],
      ['H04', 11, 'ECHO', '#4977c4'],
    ] as const
  ).map(([id, gpio, signal, color]) => {
    const controller = end('esp32', `stack-gpio${gpio}`, `GPIO${gpio} · ${signal}`);
    const shield = end('shield', `stack-gpio${gpio}`, `Header IO${gpio}`);
    return connection(
      id,
      `${signal} qua chân cắm ESP32 ↔ shield`,
      gpio === 11 ? shield : controller,
      gpio === 11 ? controller : shield,
      {
        medium: 'header',
        group: gpio < 10 ? 'i2c' : 'sonar',
        color,
        voltage: 'GPIO ESP32 mức 3,3 V',
        explanation: `GPIO${gpio} đi qua chân cắm của K01 xuống đúng lỗ header trên B01. ${gpio < 10 ? 'Chức năng I2C theo nhãn shield.' : 'IO10/IO11 là lựa chọn trong yêu cầu robot, cần cấu hình firmware tương ứng.'} Không kéo thêm jumper song song giữa hai bo đã cắm vào nhau.`,
        cable: 'Tiếp xúc header đực K01 ↔ header cái B01.',
        check:
          'Cắm đúng chiều USB và đúng hàng, không lệch một chân. Tọa độ header trong 3D đã co theo mô hình; đọc nhãn GPIO trên bo.',
      },
    );
  }),
  ...(
    [
      ['B01', 'cell-a', 'positive', 'a-plus', 'Cell 1 +'],
      ['B02', 'cell-a', 'negative', 'a-minus', 'Cell 1 −'],
      ['B03', 'cell-b', 'positive', 'b-plus', 'Cell 2 +'],
      ['B04', 'cell-b', 'negative', 'b-minus', 'Cell 2 −'],
    ] as const
  ).map(([id, cell, pole, clip, label]) =>
    connection(
      id,
      `${label} chạm lá tiếp xúc khay`,
      end(cell, pole, label),
      end('holder', clip, `Lá ${label}`),
      {
        medium: 'contact',
        voltage: '3,7 V danh định mỗi cell',
        status: 'confirm',
        cable: 'Lắp cell vào tiếp điểm/lò xo khay; không hàn trực tiếp lên cell.',
        explanation:
          'Hai cell đặt ngược chiều trong mô hình để tạo bộ 2S. Cực dương nhô và cực âm phẳng phải khớp dấu trên khay đang có.',
        check:
          'Đọc dấu +/− của khay và đo cực tính đầu ra. Không dùng vị trí 3D làm chỉ dẫn nếu khay thực tế bố trí khác.',
        source: personalSources.chassis,
      },
    ),
  ),
  connection(
    'B05',
    'Cầu nối tiếp Cell 1 + → Cell 2 −',
    end('holder', 'a-plus', 'Lá Cell 1 +'),
    end('holder', 'b-minus', 'Lá Cell 2 −'),
    {
      explanation:
        'Cầu nối có sẵn trong khay nối tiếp tạo điểm giữa hai cell. Hai đầu còn lại là PACK− và PACK+. Không nối tắt hai cực của cùng một cell.',
      voltage: 'Điểm giữa bộ 2S',
      status: 'confirm',
      source: personalSources.chassis,
      check:
        'Kiểm tra cấu tạo khay khi đã tháo cả hai cell. Cầu này là giả định khay 2S nối tiếp theo hồ sơ, không phải BMS hoặc dây cân bằng sạc.',
    },
  ),
  connection(
    'B06',
    'Cell 2 + ra PACK+',
    end('holder', 'b-plus', 'Lá Cell 2 +'),
    end('holder', 'PACK+', 'PACK+'),
    {
      color: '#ce4944',
      voltage: '7,4 V danh định cả bộ · tối đa 8,4 V',
      explanation:
        'Đầu dương ngoài cùng của chuỗi hai cell được đưa tới dây dương khay. Nhánh này đi tới công tắc qua W01.',
      source: personalSources.chassis,
    },
  ),
  connection(
    'B07',
    'Cell 1 − ra PACK−',
    end('holder', 'a-minus', 'Lá Cell 1 −'),
    end('holder', 'PACK−', 'PACK−'),
    {
      group: 'ground',
      color: '#3d4853',
      voltage: 'Mốc âm bộ pin',
      explanation:
        'Đầu âm ngoài cùng của chuỗi đưa ra PACK−; W04/W05 là hai nhánh hồi về điểm này.',
      source: personalSources.chassis,
    },
  ),
  connection(
    'S01',
    'Tiếp điểm công tắc ở vị trí ON',
    end('switch', 'IN', 'IN (+)'),
    end('switch', 'OUT', 'OUT (+)'),
    {
      color: '#ce4944',
      transfer: 'switch',
      voltage: 'Điện áp PACK+ khi ON',
      explanation:
        'Sơ đồ đang xét trạng thái công tắc bật: IN nối OUT qua tiếp điểm bên trong. Khi OFF, nhánh này hở; không nối dây tắt qua công tắc.',
      source: personalSources.chassis,
      check:
        'Đo thông mạch khi khay đã tháo pin. Công tắc ngắt nhánh dương, không thay cho bảo vệ quá dòng.',
    },
  ),
  ...(
    [
      ['T01', 'stack-gpio8', 'Header GPIO8', 'i2c-7-SDA', 'SDA / IO8', 'i2c'],
      ['T02', 'stack-gpio9', 'Header GPIO9', 'i2c-7-SCL', 'SCL / IO9', 'i2c'],
      ['T03', 'stack-gpio10', 'Header GPIO10', 'gpio-10-SIG', 'SIG · IO10', 'sonar'],
      ['T04', 'gpio-11-SIG', 'SIG · IO11', 'stack-gpio11', 'Header GPIO11', 'sonar'],
      ['T05', 'stack-5v', 'Rail 5V', 'i2c-7-5V', '5V cổng I2C', 'power'],
      ['T06', 'stack-5v', 'Rail 5V', 'gpio-10-5V', '5V hàng IO10', 'power'],
      ['T07', 'dc-gnd', 'GND giắc DC', 'stack-gnd', 'Rail GND', 'ground'],
      ['T08', 'stack-gnd', 'Rail GND', 'i2c-7-GND', 'GND cổng I2C', 'ground'],
      ['T09', 'stack-gnd', 'Rail GND', 'gpio-10-GND', 'GND hàng IO10', 'ground'],
    ] as const
  ).map(([id, fromId, fromPin, toId, toPin, group]) =>
    connection(
      id,
      `${fromPin} ↔ ${toPin} trong shield`,
      end('shield', fromId, fromPin),
      end('shield', toId, toPin),
      {
        group,
        color: group === 'ground' ? '#69777c' : group === 'power' ? '#b97671' : '#849e98',
        explanation: `B01 đưa ${fromPin} tới ${toPin} bằng đường mạch có sẵn. Đây là đoạn nối giữa header ESP32 và đầu cáp ngoại vi, không phải dây cần mua hay hàn thêm.`,
        voltage:
          group === 'power' ? '5 V' : group === 'ground' ? '0 V tham chiếu' : 'Tín hiệu GPIO 3,3 V',
      },
    ),
  ),
  connection(
    'C01',
    'VIN → bộ hạ áp tích hợp → rail 5V',
    end('shield', 'dc-vin', 'VIN giắc DC'),
    end('shield', 'stack-5v', 'Rail 5V sau bộ hạ áp'),
    {
      transfer: 'regulator',
      color: '#718f91',
      voltage: 'VIN 7–24 V → 5 V qua bộ nguồn',
      explanation:
        'B01 có bộ giảm áp tích hợp. Đường này biểu diễn quá trình chuyển đổi nguồn, KHÔNG phải hai chân thông nhau hay dây cần đấu. Từ rail 5V, bo cấp cho ESP32, driver logic và sonar.',
      cable: 'Mạch nguồn tích hợp trên B01; tuyệt đối không nối jumper VIN sang 5V.',
      check:
        'Pin 2S có thể xuống dưới VIN tối thiểu 7 V. C01 không giải quyết giới hạn này; phương án nguồn ổn định vẫn chưa được chốt.',
    },
  ),
];
