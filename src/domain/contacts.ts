import type { PartDefinition } from './schema';

export type Point3 = [number, number, number];
export interface Contact {
  id: string;
  label: string;
  bank: string;
  position: Point3;
  normal: Point3;
  kind: 'pin' | 'screw' | 'socket' | 'tab' | 'dc' | 'stack' | 'battery';
  color: string;
}

// Layout follows MakerEDU reference photos. Coordinates are fitted to the user's
// model dimensions, not measured PCB artwork. Geometry and cables share these tips.
export function partContacts(def: PartDefinition): Contact[] {
  const [w, h, d] = def.dimensionsMm;
  const contacts: Contact[] = [];
  const add = (
    id: string,
    label: string,
    bank: string,
    position: Point3,
    kind: Contact['kind'] = 'pin',
    color = '#263b42',
    normal: Point3 = [0, 1, 0],
  ) => contacts.push({ id, label, bank, position, normal, kind, color });
  if (def.id === 'mke-m17') {
    ['MA1', 'MA2', 'VIN', 'GND', 'MB1', 'MB2'].forEach((pin, n) =>
      add(
        pin,
        pin,
        'Cọc vít · nhìn từ trên',
        [((n - 2.5) * w) / 7, -1, -d / 2 - 1],
        'screw',
        '#4c9767',
        [0, 0, -1],
      ),
    );
    ['GND', '5V', 'SDA', 'SCL'].forEach((pin, n) =>
      add(`i2c-${pin}`, pin, 'I2C · XH 4P', [w / 2 - 4, 2, (n - 1.5) * 2.54], 'socket', '#edeadf'),
    );
  }
  if (def.id === 'mke-b01') {
    const labels = ['SCL', 'SDA', '5V', 'GND'];
    const colors = ['#398965', '#c49e27', '#c95049', '#27363b'];
    for (let col = 0; col < 8; col++)
      labels.forEach((pin, row) =>
        add(
          `i2c-${col}-${pin}`,
          pin,
          'I2C · SCL/9 · SDA/8',
          [-w / 2 + 5 + col * 2.54, 3.4, -d / 2 + 5 + row * 2.54],
          'pin',
          colors[row],
        ),
      );
    const left = [
      '4',
      '5',
      '6',
      '7',
      '15',
      '16',
      '17',
      '18',
      '8',
      '3',
      '46',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
    ];
    const right = [
      'TX',
      'RX',
      '1',
      '2',
      '42',
      '41',
      '40',
      '39',
      '38',
      '37',
      '36',
      '35',
      '0',
      '45',
      '48',
      '47',
      '21',
      '20',
      '19',
    ];
    for (const [side, rows] of [
      [-1, left],
      [1, right],
    ] as const) {
      rows.forEach((io, row) =>
        ['SIG', '5V', 'GND'].forEach((pin, col) =>
          add(
            `gpio-${io}-${pin}`,
            pin === 'SIG' ? `IO${io}` : pin,
            `GPIO ${io} · SIG / 5V / GND`,
            [
              side * (w / 2 - 9 + col * 2.54),
              3.4,
              -d / 2 + 18 + row * Math.min(2.54, (d - 22) / 18),
            ],
            'pin',
            ['#c49e27', '#c95049', '#27363b'][col],
          ),
        ),
      );
    }
    add(
      'dc-vin',
      'VIN',
      'Dây ra giắc DC · xác nhận cực tính',
      [w / 2 - 8, -0.5, -d / 2 - 13],
      'dc',
      '#c95049',
      [0, 0, -1],
    );
    add(
      'dc-gnd',
      'GND',
      'Dây ra giắc DC · xác nhận cực tính',
      [w / 2 - 6, -0.5, -d / 2 - 13],
      'dc',
      '#27363b',
      [0, 0, -1],
    );
  }
  if (def.id === 'mke-k01' || def.id === 'mke-b01') {
    const controller = def.id === 'mke-k01';
    // Used pins on the left header, antenna end first. The pitch is compressed
    // to fit the existing illustrative dimensions; it is not a fabrication grid.
    for (const [pin, row] of [
      ['gpio8', 11],
      ['gpio9', 14],
      ['gpio10', 15],
      ['gpio11', 16],
      ['5v', 20],
      ['gnd', 21],
    ] as const)
      add(
        `stack-${pin}`,
        pin.toUpperCase(),
        'Header K01 ↔ B01 · đọc nhãn chân',
        [-10, controller ? -h / 2 - 2 : 1, (row - 10.5) * 2.1],
        'stack',
        '#27363b',
        [0, controller ? -1 : 1, 0],
      );
  }
  if (def.id === 'mke-s01') {
    // Back-side view reverses X compared with the front transducer view.
    ['GND', '5V', 'TRIG', 'ECHO'].forEach((pin, n) =>
      add(
        pin,
        pin,
        'Giắc sau cảm biến · XH 4P',
        [(1.5 - n) * 2.54, -h / 2 + 3, -d / 2 - 6],
        'socket',
        '#edeadf',
        [0, 0, -1],
      ),
    );
  }
  if (def.id === 'tt-motor') {
    for (const [n, pin] of ['A', 'B'].entries())
      add(
        pin,
        pin,
        'Tai hàn motor · A/B quy ước',
        [(n ? 1 : -1) * w * 0.23, 0, d / 2 + 3],
        'tab',
        '#c0a65e',
        [0, 0, 1],
      );
  }
  if (def.id === 'battery-holder') {
    for (const [id, label, x, z] of [
      ['a-plus', 'Cell 1 +', -10, 34],
      ['a-minus', 'Cell 1 −', -10, -34],
      ['b-plus', 'Cell 2 +', 10, -34],
      ['b-minus', 'Cell 2 −', 10, 34],
    ] as const)
      add(id, label, 'Lá tiếp xúc khay 2S · đối chiếu dấu +/−', [x, 2, z], 'battery', '#c3b98b', [
        0,
        0,
        z > 0 ? -1 : 1,
      ]);
    for (const [n, pin] of ['PACK+', 'PACK−'].entries())
      add(
        pin,
        pin,
        'Đầu dây khay pin · vị trí quy ước',
        [n ? -7 : 7, -4, -d / 2 - 2],
        'tab',
        '#c0a65e',
        [0, 0, -1],
      );
  }
  if (def.id === 'sunpower-cell') {
    add('positive', '+', 'Cực dương nhô của cell', [0, 0, d / 2], 'battery', '#d7d6c5', [0, 0, 1]);
    add('negative', '−', 'Cực âm phẳng của cell', [0, 0, -d / 2], 'battery', '#c2c6c1', [0, 0, -1]);
  }
  if (def.id === 'power-switch') {
    for (const [n, pin] of ['IN', 'OUT'].entries())
      add(
        pin,
        pin,
        'Tai công tắc · vị trí quy ước',
        [n ? -3 : 3, -h / 2 - 3, 0],
        'tab',
        '#c0a65e',
        [0, -1, 0],
      );
  }
  return contacts;
}
