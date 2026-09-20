import { describe, expect, it } from 'vitest';
import { createPersonalRobot } from '../data/personalRobot';
import { createSampleProject } from '../data/sampleRobot';
import { connectionCoverage, connectionPaths } from './connectionPlan';
import { robotWires, wiringMarkdown, type RobotWire } from './wiring';

// Follow conductive connections only. A regulator transfers power but does not
// short VIN to 5V, and Wi-Fi is never part of an electrical net.
function reachable(wires: RobotWire[], source: string, target: string) {
  const graph = new Map<string, Set<string>>();
  for (const wire of wires.filter((w) => w.medium !== 'radio' && w.transfer !== 'regulator')) {
    const [a, b] = [wire.from, wire.to].map((end) => `${end.instanceId}:${end.contactId}`);
    if (!graph.has(a)) graph.set(a, new Set());
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(a)!.add(b);
    graph.get(b)!.add(a);
  }
  const seen = new Set([source]);
  for (const current of seen) for (const next of graph.get(current) ?? []) seen.add(next);
  return seen.has(target);
}

describe('complete connection plan from the existing Robot 02 inventory', () => {
  it('accounts for every instance once, including parts that must not get electrical wires', () => {
    const p = createPersonalRobot(),
      before = structuredClone(p),
      wires = robotWires(p);
    const rows = connectionCoverage(p, wires);
    expect(rows).toHaveLength(32);
    expect(rows.flatMap((row) => row.instanceIds).sort()).toEqual(
      p.instances.map((i) => i.id).sort(),
    );
    const electrical = rows.filter((row) => row.kind === 'electrical');
    expect(electrical.reduce((sum, row) => sum + row.required, 0)).toBe(13);
    expect(electrical.flatMap((row) => row.missing)).toEqual([]);
    expect(rows.filter((row) => row.kind === 'unmapped')).toEqual([]);
    expect(rows.find((row) => row.definition.id === 'tt-wheel')?.wireIds).toEqual([]);
    expect(rows.find((row) => row.definition.id === 'usb-charger')?.kind).toBe('service');
    expect(rows.filter((row) => row.kind === 'planned')).toHaveLength(7);
    expect(rows.filter((row) => row.kind === 'planned').flatMap((row) => row.wireIds)).toEqual([]);
    expect(connectionPaths(p, wires).every((path) => !path.missing.length)).toBe(true);
    expect(p).toEqual(before);
  });
  it('has continuous GPIO paths through ESP32 headers and shield to the peripherals', () => {
    const wires = robotWires(createPersonalRobot());
    for (const [gpio, target] of [
      [8, 'driver:i2c-SDA'],
      [9, 'driver:i2c-SCL'],
      [10, 'sonar:TRIG'],
      [11, 'sonar:ECHO'],
    ] as const)
      expect(reachable(wires, `esp32:stack-gpio${gpio}`, target), `GPIO${gpio}`).toBe(true);
    expect(reachable(wires, 'esp32:stack-gpio8', 'driver:i2c-SCL')).toBe(false);
    expect(reachable(wires, 'esp32:stack-gpio10', 'sonar:ECHO')).toBe(false);
  });
  it('provides common ground and 5V rails without shorting motor VIN to logic power', () => {
    const wires = robotWires(createPersonalRobot());
    for (const target of ['driver:GND', 'driver:i2c-GND', 'esp32:stack-gnd', 'sonar:GND'])
      expect(reachable(wires, 'holder:PACK−', target), target).toBe(true);
    for (const target of ['driver:i2c-5V', 'esp32:stack-5v', 'sonar:5V'])
      expect(reachable(wires, 'shield:stack-5v', target), target).toBe(true);
    expect(reachable(wires, 'holder:PACK+', 'driver:VIN')).toBe(true);
    expect(
      reachable(
        wires.filter((w) => w.id !== 'S01'),
        'holder:PACK+',
        'driver:VIN',
      ),
    ).toBe(false);
    expect(reachable(wires, 'shield:dc-vin', 'shield:stack-5v')).toBe(false);
    expect(reachable(wires, 'holder:PACK+', 'holder:PACK−')).toBe(false);
    expect(reachable(wires, 'holder:PACK−', 'motor-left-front:A')).toBe(false);
  });
  it('models a series holder with contacts, not solder wires across cells', () => {
    const wires = robotWires(createPersonalRobot());
    expect(reachable(wires, 'cell-a:positive', 'cell-b:negative')).toBe(true);
    expect(reachable(wires, 'cell-a:negative', 'holder:PACK−')).toBe(true);
    expect(reachable(wires, 'cell-b:positive', 'holder:PACK+')).toBe(true);
    expect(reachable(wires, 'cell-a:positive', 'cell-a:negative')).toBe(false);
    expect(
      wires
        .filter((w) => [w.from, w.to].some((end) => end.instanceId.startsWith('cell-')))
        .every((w) => w.medium === 'contact'),
    ).toBe(true);
  });
  it('reports a missing physical lead and a missing internal path, instead of always saying complete', () => {
    const p = createPersonalRobot();
    const wires = robotWires(p).filter((w) => !['W12', 'T01'].includes(w.id));
    expect(
      connectionCoverage(p, wires).find((row) => row.definition.id === 'mke-s01')?.missing,
    ).toContain('sonar: 5V');
    expect(connectionPaths(p, wires).find((path) => path.id === 'i2c-data')?.missing).toEqual([
      'T01',
    ]);
    expect(reachable(wires, 'esp32:stack-gpio8', 'driver:i2c-SDA')).toBe(false);
    p.instances = p.instances.filter((i) => i.id !== 'cell-b');
    expect(connectionPaths(p, robotWires(p)).find((path) => path.id === 'cells')?.missing).toEqual([
      'B03',
      'B04',
    ]);
  });
  it('uses kit inventory and flags additions with no known wiring plan', () => {
    const p = createPersonalRobot();
    p.inventory['mke-r01-kit'] = 0;
    const rows = connectionCoverage(p, robotWires(p));
    expect(rows.find((row) => row.definition.id === 'tt-motor')?.owned).toBe(0);
    const custom = { ...p.definitions.find((d) => d.id === 'mke-s01')!, id: 'new-sensor' };
    p.definitions.push(custom);
    p.instances.push({
      ...p.instances.find((i) => i.id === 'sonar')!,
      id: 'new-sensor-1',
      definitionId: custom.id,
    });
    expect(
      connectionCoverage(p, robotWires(p)).find((row) => row.definition.id === custom.id)?.kind,
    ).toBe('unmapped');
  });
  it('exports the complete rationale and keeps the phone wireless and future devices unconnected', () => {
    const p = createPersonalRobot(),
      wires = robotWires(p),
      md = wiringMarkdown(p);
    expect(
      wires
        .filter((w) => w.from.instanceId === 'phone' || w.to.instanceId === 'phone')
        .map((w) => w.medium),
    ).toEqual(['radio']);
    for (const text of [
      'Rà soát từng loại linh kiện',
      'B05',
      'H04',
      'T09',
      'C01',
      'không nối jumper VIN sang 5V',
      'LiDAR',
      'usb-charger',
    ]) {
      // Export displays the charger's human-readable name, not its internal ID.
      expect(md.toLowerCase()).toContain(
        (text === 'usb-charger' ? 'Sạc USB 2 ngăn' : text).toLowerCase(),
      );
    }
    const rover = createSampleProject();
    expect(connectionCoverage(rover, robotWires(rover))).toEqual([]);
    expect(connectionPaths(rover, robotWires(rover))).toEqual([]);
  });
});
