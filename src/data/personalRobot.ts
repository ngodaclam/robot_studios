import type {
  Connection,
  PartDefinition,
  PartInstance,
  Port,
  RobotProject,
} from '../domain/schema';

export const personalSources = {
  chassis: 'https://hshop.vn/khung-xe-mke-r01-4wd-robot-car-chassis-tt-motor',
  driver: 'https://hshop.vn/mach-dieu-khien-dong-co-dc-mke-m17-l9110-i2c-motor-driver-module',
  shield: 'https://github.com/makereduvn/MKE-B01-ESP32-S3-DK-IO-SHIELD',
  sensor: 'https://github.com/makereduvn/MKE-S01-ULTRASONIC-DISTANCE-SENSOR',
  phone:
    'https://www.samsung.com/my/support/mobile-devices/what-is-the-difference-between-the-galaxy-note8-and-note9/',
  bluetooth:
    'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-guides/ble/overview.html',
};
const doc =
  'personal_robot_requirements.md do người dùng cung cấp; chưa đo trên linh kiện đang sở hữu.';
const source = (url: string) =>
  `${url} — đối chiếu 20/09/2026. Tọa độ gá và hình dạng chi tiết là bố trí sơ bộ, chưa đo thực tế.`;
const port = (
  id: string,
  name: string,
  kind: Port['kind'],
  direction: Port['direction'],
  voltageV?: [number, number],
  extra: Partial<Port> = {},
): Port => ({ id, name, kind, direction, required: direction === 'in', voltageV, ...extra });
const power = (
  id: string,
  name: string,
  direction: Port['direction'],
  voltage?: [number, number],
  extra: Partial<Port> = {},
) => port(id, name, 'power', direction, voltage, extra);
const signal = (
  id: string,
  name: string,
  direction: Port['direction'],
  voltage?: [number, number],
) => port(id, name, 'logic', direction, voltage);
function definition(
  id: string,
  name: string,
  geometry: PartDefinition['geometry'],
  dimensionsMm: [number, number, number],
  extra: Partial<PartDefinition> = {},
): PartDefinition {
  return {
    id,
    name,
    geometry,
    dimensionsMm,
    category: 'Kết cấu',
    sku: id.toUpperCase(),
    manufacturer: null,
    description: name,
    massG: null,
    priceVnd: null,
    source: doc,
    verification: 'unverified',
    dimensionBasis: 'estimate',
    placement: 'robot',
    color: '#287b86',
    specs: {},
    ports: [],
    ...extra,
  };
}
const kit = (quantity: number) => ({ definitionId: 'mke-r01-kit', quantity });

export function createPersonalRobot(): RobotProject {
  const definitions: PartDefinition[] = [
    definition('mke-r01-kit', 'Bộ khung MKE-R01 4WD', 'accessory', [170, 120, 190], {
      sku: 'MKE-R01',
      manufacturer: 'MakerEDU',
      massG: 500,
      priceVnd: 245000,
      dimensionBasis: 'supplier',
      source: source(personalSources.chassis),
      description:
        'Bộ kit đã có. Giá và khối lượng tính một lần cho cả bộ; các chi tiết thuộc kit không cộng lại.',
      specs: {
        'Kích thước mâu thuẫn':
          'Tệp: 256×160×65 mm; nhà cung cấp: 190×170×120 mm (D×R×C). Cần đo đúng phiên bản.',
        'Khối lượng': 'Khoảng 500 g cả kit theo nhà cung cấp; chưa cân.',
        'Giá tham khảo': '245.000đ / bộ, tra 20/09/2026; không phải báo giá mua mới.',
      },
    }),
    definition('mke-r01-frame', 'Khung chữ U acrylic MKE-R01', 'chassis4wd', [125, 30, 190], {
      includedIn: kit(1),
      dimensionBasis: 'supplier',
      color: '#b54839',
      source: source(personalSources.chassis),
      description:
        'Khung acrylic chữ U dày 2 mm. Mô hình dùng kích thước nhà cung cấp; vị trí lỗ và màu cần đối chiếu bộ đang có.',
      specs: {
        'Độ dày': '2 mm theo nhà cung cấp',
        'Lỗ lắp': 'Chưa có bản vẽ tọa độ lỗ; không dùng mô hình này để khoan.',
      },
    }),
    definition('tt-motor', 'Động cơ TT trong kit', 'ttMotor', [23, 24, 57], {
      includedIn: kit(4),
      category: 'Truyền động',
      color: '#eac34c',
      source: source(personalSources.chassis),
      description:
        '4 động cơ TT; mỗi cặp cùng bên dự kiến dùng chung một kênh. Dòng kẹt trục chưa đo.',
      specs: {
        'Nguồn motor': '3–9 V theo danh mục kit',
        'Dòng tải ước tính': '0,4 A/motor theo tài liệu, không phải dòng cực đại',
        'Kích thước vỏ': 'Ước lượng; cần đo đúng động cơ',
      },
      ports: [
        power('motor', 'Hai dây motor', 'in', [3, 9]),
        port('shaft', 'Trục TT', 'mechanical', 'out'),
      ],
    }),
    definition('tt-wheel', 'Bánh xe TT Ø65 mm', 'wheel', [26, 65, 65], {
      includedIn: kit(4),
      category: 'Truyền động',
      color: '#26373b',
      source: source(personalSources.chassis),
      specs: {
        'Đường kính': '65 mm theo kit',
        'Bề rộng': '26 mm — giả định dựng hình',
        'Lỗ trục': 'Cần đo biên dạng và kích thước thực',
      },
      ports: [port('hub', 'Lỗ trục TT', 'mechanical', 'in')],
    }),
    definition('battery-deck', 'Tấm gá pin acrylic trong kit', 'base', [77, 2, 123], {
      includedIn: kit(1),
      dimensionBasis: 'supplier',
      source: source(personalSources.chassis),
      color: '#b54839',
    }),
    definition('battery-holder', 'Khay 2 × 18650 nối tiếp', 'holder', [42, 20, 76], {
      includedIn: kit(1),
      category: 'Nguồn điện',
      color: '#283d43',
      source: source(personalSources.chassis),
      description:
        'Khay trong kit có công tắc và giắc DC. Đặt phía sau để tiếp cận pin; ray/ngàm quick-swap là phụ kiện cần bổ sung.',
      specs: {
        'Nguồn 2S': '7,4 V danh định; 8,4 V đầy',
        'Dải kiểm tra': '6–8,4 V chỉ là giả định phân tích, KHÔNG phải ngưỡng cắt pin',
        'Bảo vệ': 'Chưa xác nhận BMS, cầu chì, ngưỡng cắt hoặc dòng chịu của khay',
      },
      ports: [power('pack', 'Đầu ra hai cell nối tiếp', 'out', [6, 8.4])],
    }),
    definition('sunpower-cell', 'Sunpower 18650 2500 mAh', 'cell', [18, 18, 65], {
      category: 'Nguồn điện',
      sku: 'SUNPOWER-18650-2500',
      manufacturer: 'Sunpower',
      color: '#65a747',
      dimensionBasis: 'user',
      priceVnd: 45000,
      description:
        'Hai cell đã có, đấu nối tiếp trong khay. Dung lượng bộ vẫn là 2500 mAh, không cộng thành 5000 mAh.',
      specs: {
        'Điện áp danh định': '3,7 V/cell',
        Giá: '90.000đ / cặp theo tài liệu → 45.000đ/cell, chưa xác minh báo giá',
        '10C / 25A': 'Tuyên bố trong tài liệu; chưa dùng làm định mức nguồn cả hệ thống',
        'Khối lượng': 'Cần cân từng cell',
      },
    }),
    definition('power-switch', 'Công tắc tích hợp khay pin', 'switch', [12, 9, 16], {
      includedIn: kit(1),
      category: 'Nguồn điện',
      color: '#27383c',
      ports: [power('in', 'Pin vào', 'in'), power('out', 'Nguồn sau công tắc', 'out', [6, 8.4])],
    }),
    definition('mke-m17', 'MKE-M17 L9110 I2C', 'driver', [35, 18, 45], {
      category: 'Điện tử',
      sku: 'MKE-M17',
      manufacturer: 'MakerEDU',
      dimensionBasis: 'user',
      priceVnd: 85000,
      source: source(personalSources.driver),
      description:
        'Driver hai kênh đã có. VIN motor và nguồn logic 5V là hai đường riêng. Chưa chấp nhận vận hành 4 motor có tải trước khi đo dòng.',
      specs: {
        'VIN motor': '6–9 V theo module, khác dải IC ghi trong tệp',
        'Nguồn logic': '5 V',
        'Dòng liên tục': '0,8 A/kênh; đỉnh 1,5 A theo nhà cung cấp',
        I2C: '0x40 mặc định; logic 3,3/5 V',
        Gá: 'Kích thước từ tệp; tọa độ hai lỗ M3 chưa có',
      },
      ports: [
        power('vin', 'VIN motor 6–9V', 'in', [6, 9]),
        power('logic5v', 'Nguồn logic 5V', 'in', [5, 5]),
        signal('i2c', 'SDA/SCL', 'in', [3.3, 5]),
        power('motors', 'MA / MB', 'out', [0, 8.4], {
          currentA: 1.6,
          perChannelCurrentA: 0.8,
          channels: 2,
        }),
      ],
    }),
    definition('mke-b01', 'MKE-B01 IO Shield', 'controller', [50, 10, 60], {
      category: 'Điện tử',
      sku: 'MKE-B01',
      manufacturer: 'MakerEDU',
      color: '#136c82',
      priceVnd: 90000,
      source: source(personalSources.shield),
      description:
        'Shield đã có. Nguồn vào 7–24 V; dải xả 2S có thể xuống dưới 7 V. Cần xử lý nguồn trước khi chạy hết dung lượng pin.',
      specs: {
        VIN: '7–24 V theo nhà sản xuất',
        'Nguồn ra': '5 V / 1,5 A; 3,3 V / 0,7 A',
        I2C: 'SDA IO8 / SCL IO9',
        Gá: 'Tệp nêu cả cụm 60×50×15 mm và lỗ 52×42 mm; cần đo riêng từng bo',
      },
      ports: [
        power('vin', 'VIN / DC', 'in', [7, 24]),
        power('5v', 'Đường 5V', 'out', [5, 5], { currentA: 1.5 }),
      ],
    }),
    definition('mke-k01', 'MKE-K01 ESP32-S3 N4', 'controller', [26, 10, 51], {
      category: 'Điện tử',
      sku: 'MKE-K01-N4',
      manufacturer: 'MakerEDU',
      color: '#1b4147',
      description:
        'Bo điều khiển đã có; cắm trên IO Shield. Kích thước riêng là ước lượng dựng hình, chưa có phép đo.',
      specs: {
        'Vai trò': 'Nhận cmd_vel, đọc sonar, điều khiển I2C',
        'Giao tiếp dự kiến': 'Wi-Fi WebSocket; BLE tùy chọn (không dùng Bluetooth Classic SPP)',
        Giá: 'Tệp ghi 320.000đ cho ESP32 + shield, chưa tách giá bo',
        'Phần mềm': 'Firmware chưa được nạp/kiểm thử trong Robot Studio',
      },
      ports: [
        power('5v', 'Nguồn từ shield', 'in', [5, 5]),
        signal('i2c', 'GPIO8 SDA / GPIO9 SCL', 'out', [3.3, 3.3]),
        signal('trig', 'GPIO10 TRIG dự kiến', 'out', [3.3, 3.3]),
        signal('echo', 'GPIO11 ECHO dự kiến', 'in', [0, 3.3]),
      ],
    }),
    definition('mke-s01', 'MKE-S01 siêu âm phía trước', 'sensor', [45, 20, 20], {
      category: 'Cảm biến',
      sku: 'MKE-S01',
      manufacturer: 'MakerEDU',
      source: source(personalSources.sensor),
      description:
        'Cảm biến đã có. Đối chiếu đúng phiên bản và mức ECHO trên bo trước khi nối GPIO.',
      specs: {
        Nguồn: '5 V',
        'Giao tiếp': 'Hãng công bố hỗ trợ logic 3,3/5 V; mức ECHO của bo đang có cần xác nhận',
        'Giới hạn': 'Một sonar phía trước không thay thế hệ thống SLAM hoặc cảm biến chống rơi',
      },
      ports: [
        power('5v', 'Nguồn cảm biến', 'in', [5, 5]),
        signal('trig', 'TRIG', 'in', [3.3, 5]),
        signal('echo', 'ECHO — cần xác nhận biên độ', 'out'),
      ],
    }),
    definition('sonar-bracket', 'Gá cảm biến acrylic trong kit', 'sensorMount', [48, 23, 22], {
      includedIn: kit(1),
      color: '#b54839',
    }),
    definition('note9', 'Samsung Galaxy Note 9', 'phone', [161.9, 76.4, 8.8], {
      category: 'Điện tử',
      sku: 'GALAXY-NOTE9',
      manufacturer: 'Samsung',
      massG: 201,
      dimensionBasis: 'supplier',
      color: '#234f85',
      source: source(personalSources.phone),
      description:
        'Điện thoại nằm ngang, camera sau hướng ra trước và chúc xuống 35°. Dùng pin điện thoại độc lập; không lấy nguồn trực tiếp từ 2S.',
      specs: {
        'Kích thước thân': '161,9×76,4×8,8 mm; không tính ốp',
        'Pin riêng': '4000 mAh theo tài liệu; thời lượng AI phải đo riêng',
        'Vai trò dự kiến': 'Thị giác, giọng nói, loa báo thức',
        'Góc nhìn': '35° xuống sàn; nhận diện trên giường cần đổi góc gá và kiểm tra tầm nhìn',
      },
    }),
    definition('phone-cradle', 'Gá kẹp Note 9 — cần gia công', 'phoneMount', [176, 85, 15], {
      color: '#344b50',
      description:
        'Gá tự thiết kế sơ bộ có chừa camera sau và cổng sạc. Kích thước dành cho bố trí, chưa phải bản vẽ in 3D.',
      specs: {
        Góc: '35° từ phương thẳng đứng, camera chúc xuống',
        'Cần đo': 'Ốp máy, mép kẹp, tâm camera, khoảng hở cáp',
        Tải: 'Cần thử giữ chắc điện thoại khi phanh và quay',
      },
    }),
    definition('phone-support', 'Trụ đỡ gá điện thoại — cần gia công', 'post', [14, 52, 14], {
      color: '#405b61',
    }),
    definition('phone-foot', 'Chân đế giá điện thoại — cần gia công', 'base', [65, 4, 32], {
      color: '#405b61',
    }),
    definition('standoff10', 'Trụ M3 F-F 10 mm trong kit', 'post', [6, 10, 6], {
      includedIn: kit(10),
      color: '#dadbd0',
    }),
    definition('usb-charger', 'Sạc USB 2 ngăn — dùng ngoài xe', 'accessory', [1, 1, 1], {
      placement: 'offboard',
      category: 'Nguồn điện',
      description:
        'Sạc ngoài đã có. Tháo cell khỏi xe để sạc đúng hướng dẫn của sạc; không coi đây là bộ sạc pack 2S.',
    }),
    definition('jumper-ribbon', 'Tép dây M-F 20 cm / 40 sợi', 'accessory', [1, 1, 1], {
      category: 'Phụ kiện',
      specs: { 'Đơn vị BOM': '1 tép 40 sợi; không tính thành 40 tép' },
    }),
    definition('power-wire', 'Dây điện đỏ đen — đơn vị mét', 'accessory', [1, 1, 1], {
      category: 'Phụ kiện',
      specs: {
        'Đơn vị BOM': '1 mét',
        'Tiết diện': 'Tài liệu đề xuất 22 AWG; kiểm tra dây đang có và dòng thực tế',
      },
    }),
    definition('dc-jack', 'Giắc DC 5,5 × 2,1 mm', 'accessory', [1, 1, 1], {
      category: 'Phụ kiện',
      specs: {
        'Số lượng': '2 cái theo tài liệu; kiểm tra đực/cái và cực tính',
        'Trong kit': 'Không mua lặp đầu giắc đã đi liền khay pin',
      },
    }),
    definition('m3x6', 'Ốc M3 × 6 trong kit', 'accessory', [1, 1, 1], {
      includedIn: kit(30),
      category: 'Phụ kiện',
    }),
    definition('m3x30', 'Bộ ốc tán M3 × 30 trong kit', 'accessory', [1, 1, 1], {
      includedIn: kit(8),
      category: 'Phụ kiện',
    }),
    definition('m3x10', 'Bộ ốc tán M3 × 10 trong kit', 'accessory', [1, 1, 1], {
      includedIn: kit(5),
      category: 'Phụ kiện',
    }),
    ...[
      [
        'pack-protection',
        'Bảo vệ pin 2S + cầu chì',
        'Chọn theo cell, dây, dòng khởi động và ngưỡng cắt; chưa có mã hoặc định mức.',
      ],
      [
        'logic-regulator',
        'Phương án nguồn ổn định cho logic',
        'Giải quyết VIN shield khi pin xuống dưới 7V; chọn mạch và cách cấp nguồn trước khi nối.',
      ],
      [
        'quick-swap',
        'Ray/ngàm khay pin tháo nhanh',
        'Khay sẵn có chưa được xác nhận có ngàm quick-swap; cần thiết kế và thử cơ khí.',
      ],
      [
        'lidar',
        'LiDAR 2D — chưa chọn mẫu',
        'Mức 500.000–1.700.000đ trong tệp chỉ là dự trù; chưa biết kích thước, giao tiếp, công suất hay giá mua.',
      ],
      [
        'odometry',
        'Phương án odometry / IMU',
        'Cần chọn cảm biến hoặc giải pháp định vị và thuật toán SLAM; kit hiện tại chưa có dữ liệu odometry.',
      ],
      [
        'brush',
        'Cụm chổi quét thử nghiệm',
        'Chưa chọn motor, gá, kích thước, dòng và bộ điều khiển.',
      ],
      [
        'vacuum',
        'Cụm hút + hộp bụi + lọc',
        'Chưa chọn quạt hút, đường gió, lọc, công suất; chưa tính vào thời lượng pin.',
      ],
    ].map(([id, name, description]) =>
      definition(id, name, 'accessory', [1, 1, 1], {
        placement: 'planned',
        category: 'Cần bổ sung',
        description,
      }),
    ),
  ];
  const instances: PartInstance[] = [];
  function add(
    id: string,
    definitionId: string,
    assemblyId: string,
    name: string,
    positionMm: [number, number, number],
    rotationDeg: [number, number, number] = [0, 0, 0],
    explodeDirection: [number, number, number] = [0, 1, 0],
    explodeDistanceMm = 80,
  ) {
    instances.push({
      id,
      definitionId,
      assemblyId,
      name,
      positionMm,
      rotationDeg,
      explodeDirection,
      explodeDistanceMm,
      visible: true,
    });
  }
  add('kit', 'mke-r01-kit', 'chassis', 'Bộ MKE-R01 — vật tư gộp', [0, 0, 0]);
  add(
    'frame',
    'mke-r01-frame',
    'chassis',
    'Khung acrylic chữ U',
    [0, 48, 0],
    [0, 0, 0],
    [0, -1, 0],
    35,
  );
  for (const side of [-1, 1])
    for (const front of [-1, 1]) {
      const id = `${side < 0 ? 'left' : 'right'}-${front > 0 ? 'front' : 'rear'}`;
      const label = `${side < 0 ? 'trái' : 'phải'} ${front > 0 ? 'trước' : 'sau'}`;
      add(
        `motor-${id}`,
        'tt-motor',
        'drive',
        `Động cơ TT ${label}`,
        [side * 48, 32.5, front * 60 + side * 12.54],
        [0, side < 0 ? 180 : 0, 0],
        [side, 0, 0],
        50,
      );
      add(
        `wheel-${id}`,
        'tt-wheel',
        'drive',
        `Bánh Ø65 ${label}`,
        [side * 72, 32.5, front * 60],
        [0, 0, 0],
        [side, 0, 0],
        100,
      );
    }
  add('deck', 'battery-deck', 'power', 'Đế gá pin phía sau', [0, 65, -27]);
  add('holder', 'battery-holder', 'power', 'Khay pin tiếp cận từ phía sau', [0, 77, -52]);
  add(
    'cell-a',
    'sunpower-cell',
    'power',
    'Cell 18650 số 1',
    [-10, 79, -52],
    [0, 0, 0],
    [-0.5, 1, 0],
  );
  add(
    'cell-b',
    'sunpower-cell',
    'power',
    'Cell 18650 số 2',
    [10, 79, -52],
    [0, 180, 0],
    [0.5, 1, 0],
  );
  add(
    'switch',
    'power-switch',
    'power',
    'Công tắc trên khay pin',
    [0, 77, -98],
    [0, 0, 0],
    [0, 0, -1],
  );
  add('driver', 'mke-m17', 'control', 'MKE-M17 · 2 kênh motor', [35, 76, 52]);
  add('shield', 'mke-b01', 'control', 'MKE-B01 · IO Shield', [-26, 76, 48]);
  add(
    'esp32',
    'mke-k01',
    'control',
    'MKE-K01 · ESP32-S3',
    [-26, 88, 48],
    [0, 0, 0],
    [0, 1, 0],
    135,
  );
  add('sonar-bracket', 'sonar-bracket', 'vision', 'Gá siêu âm phía trước', [0, 76, 92]);
  add(
    'sonar',
    'mke-s01',
    'vision',
    'MKE-S01 · nhìn về phía trước',
    [0, 92, 96],
    [0, 0, 0],
    [0, 0.5, 1],
  );
  add('phone-foot', 'phone-foot', 'vision', 'Chân đế giá Note 9', [0, 68, -2]);
  add('phone-support', 'phone-support', 'vision', 'Trụ đỡ Note 9', [0, 96, -2]);
  add('cradle', 'phone-cradle', 'vision', 'Gá kẹp Note 9 · 35°', [0, 135, -5], [35, 0, 0]);
  add(
    'phone',
    'note9',
    'vision',
    'Galaxy Note 9 · camera sau phía trước',
    [0, 135, 3],
    [35, 0, 0],
    [0, 1, 0],
    155,
  );
  for (const x of [-45, -7])
    for (const z of [24, 72])
      add(`post-${x}-${z}`, 'standoff10', 'control', 'Trụ M3 đỡ shield', [x, 68, z]);
  for (const [id, count, assembly] of [
    ['usb-charger', 1, 'service'],
    ['jumper-ribbon', 1, 'control'],
    ['power-wire', 2, 'power'],
    ['dc-jack', 2, 'power'],
    ['m3x6', 16, 'chassis'],
    ['m3x30', 8, 'drive'],
    ['m3x10', 5, 'chassis'],
    ['pack-protection', 1, 'planned'],
    ['logic-regulator', 1, 'planned'],
    ['quick-swap', 1, 'planned'],
    ['lidar', 1, 'planned'],
    ['odometry', 1, 'planned'],
    ['brush', 1, 'planned'],
    ['vacuum', 1, 'planned'],
  ] as const)
    for (let n = 0; n < count; n++)
      add(`${id}-${n + 1}`, id, assembly, definitions.find((d) => d.id === id)!.name, [0, 0, 0]);
  const connections: Connection[] = [];
  function connect(
    kind: Connection['kind'],
    from: string,
    fromPort: string,
    to: string,
    toPort: string,
    channel?: string,
  ) {
    connections.push({
      id: `c-${connections.length + 1}`,
      kind,
      from: { instanceId: from, portId: fromPort },
      to: { instanceId: to, portId: toPort },
      ...(channel ? { channel } : {}),
    });
  }
  connect('power', 'holder', 'pack', 'switch', 'in');
  connect('power', 'switch', 'out', 'driver', 'vin');
  connect('power', 'switch', 'out', 'shield', 'vin');
  for (const [to, targetPort] of [
    ['driver', 'logic5v'],
    ['esp32', '5v'],
    ['sonar', '5v'],
  ])
    connect('power', 'shield', '5v', to, targetPort);
  connect('logic', 'esp32', 'i2c', 'driver', 'i2c');
  connect('logic', 'esp32', 'trig', 'sonar', 'trig');
  connect('logic', 'sonar', 'echo', 'esp32', 'echo');
  for (const side of ['left', 'right'])
    for (const end of ['front', 'rear']) {
      connect('power', 'driver', 'motors', `motor-${side}-${end}`, 'motor', side);
      connect('mechanical', `motor-${side}-${end}`, 'shaft', `wheel-${side}-${end}`, 'hub');
    }
  // PWM's instantaneous output includes 0 V. Voltage compatibility uses the allowed drive envelope.
  definitions.find((d) => d.id === 'tt-motor')!.ports[0].voltageV = [0, 9];
  const tests = [
    [
      'measure',
      'Đo khung và cân xe',
      'Ghi D×R×C thực tế, tọa độ lỗ và khối lượng TOÀN XE ≤1.000g (không cộng thêm 1kg tải).',
    ],
    [
      'power',
      'Kiểm tra nguồn',
      'Đo từng cell, pack, VIN shield và đường 5V cả khi motor khởi động; xác nhận bảo vệ/cầu chì/ngưỡng cắt.',
    ],
    [
      'motor',
      'Motor và driver',
      'Đo dòng khởi động, dòng tải khi quay tại chỗ, nhiệt driver và sụt áp; chọn driver nếu vượt giới hạn.',
    ],
    [
      'sonar',
      'Siêu âm 5–100 cm',
      'So khoảng cách với thước; kiểm tra biên độ ECHO đúng bo; ghi sai số và trường hợp mất echo.',
    ],
    [
      'ai',
      'Camera và AI trên Note 9',
      'Chọn model Android thực tế, đo FPS (mục tiêu ≥15), nhiệt, pin; thử rác/sàn và người trên giường ở hai góc camera.',
    ],
    [
      'link',
      'Liên lạc và dừng xe',
      'Mất Wi-Fi, lệnh quá hạn hoặc lỗi cảm biến phải dừng motor; chưa có firmware để xác nhận.',
    ],
    [
      'floor',
      'Chạy 15 phút và vượt gờ',
      'Toàn xe ≤1kg; thử sàn gạch/gỗ, gờ ≤5mm; ghi độ trượt khi quay, độ vững gá và điện áp sau 15 phút.',
    ],
    [
      'runtime',
      'Thời lượng 60–90 phút',
      'Đo riêng pin xe và Note 9 với tải sử dụng thật; đo lại sau khi thêm LiDAR/cụm hút.',
    ],
    [
      'slam',
      'SLAM và điều hướng',
      'Chọn cảm biến/thuật toán; kiểm tra bản đồ, sai số định vị, vật cản thấp và điểm mù.',
    ],
    [
      'clean',
      'Quét / hút thử nghiệm',
      'Chọn cơ cấu, đo dòng và hiệu quả nhặt bụi/rác; cập nhật cân nặng, nguồn và BOM.',
    ],
  ];
  return {
    schemaVersion: 1,
    id: 'personal-robot-02',
    name: 'Robot 02',
    updatedAt: new Date().toISOString(),
    description:
      'Robot cá nhân 4WD dùng MKE-R01, ESP32-S3 và Galaxy Note 9. Bố trí 3D sơ bộ theo tài liệu của bạn; SLAM, AI và quét/hút là mục tiêu phát triển, chưa chạy trên phần cứng.',
    design: {
      profile: 'personal-v1',
      sourceDocument: 'personal_robot_requirements.md',
      maxDimensionsLwhMm: [250, 220, 200],
      maxMassG: 1000,
      runtimeMin: [60, 90],
      budgetVnd: [1000000, 1500000],
      tests: tests.map(([id, title, criterion]) => ({
        id,
        title,
        criterion,
        status: 'untested',
        notes: '',
        testedOn: '',
      })),
    },
    definitions,
    instances,
    connections,
    assemblies: [
      ['chassis', '01 · Khung MKE-R01', 'Acrylic chữ U và vật tư trong bộ kit'],
      ['drive', '02 · Truyền động 4WD', 'Bốn TT motor, hai nhóm trái/phải'],
      ['power', '03 · Nguồn 2S phía sau', 'Hai cell riêng, khay pin và công tắc'],
      ['control', '04 · ESP32 & điều khiển', 'MKE-K01, MKE-B01 và MKE-M17'],
      ['vision', '05 · Note 9 & cảm biến', 'Camera hướng trước/xuống 35°'],
      ['planned', '06 · Phần cần bổ sung', 'Chưa chọn linh kiện; chỉ có trong BOM'],
      ['service', '07 · Dụng cụ ngoài xe', 'Không tính vào khối lượng xe'],
    ].map(([id, name, description]) => ({ id, name, description, visible: true })),
    inventory: {
      'mke-r01-kit': 1,
      'mke-k01': 1,
      'mke-b01': 1,
      'mke-m17': 1,
      'mke-s01': 1,
      'sunpower-cell': 2,
      note9: 1,
      'usb-charger': 1,
      'jumper-ribbon': 1,
      'power-wire': 2,
      'dc-jack': 2,
    },
    priceOverrides: {},
  };
}
