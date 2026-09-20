import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../data/sampleRobot';
import { compatibilityFixture } from '../data/compatibilityFixtures';
import { buildBom, exportBomCsv, summarizeBom, csvCell } from './bom';
import { checkCompatibility } from './compatibility';
import {
  displayPosition,
  loadProject,
  parseProject,
  saveProject,
  serializeProject,
  STORAGE_KEY,
} from './project';
import type { RobotProject } from './schema';
import { normalizeSearch } from './search';
it('searches Vietnamese regardless of accents and initial Đ case', () => {
  expect(normalizeSearch('Động cơ GIẢM TỐC')).toBe(normalizeSearch('dong co giam toc'));
});

describe('BOM derived only from instances', () => {
  it('groups identical motors under one definition and counts each assembly occurrence once', () => {
    const rows = buildBom(createSampleProject());
    expect(rows).toHaveLength(22);
    expect(rows.find((r) => r.definition.id === 'motor')).toMatchObject({
      required: 2,
      owned: 0,
      buy: 2,
      subtotal: 178000,
      instanceIds: ['motor-left', 'motor-right'],
    });
    expect(rows.find((r) => r.definition.id === 'wheel')?.required).toBe(2);
    expect(rows.find((r) => r.definition.id === 'post')?.required).toBe(4);
  });
  it('includes every non-rendered accessory', () => {
    const rows = buildBom(createSampleProject());
    expect(rows.find((r) => r.definition.id === 'screw')).toMatchObject({
      required: 32,
      owned: 10,
      buy: 22,
    });
    expect(rows.find((r) => r.definition.id === 'connector')?.required).toBe(6);
    expect(summarizeBom(rows).required).toBe(84);
  });
  it('clamps excess inventory, preserves an explicit zero price', () => {
    const p = createSampleProject();
    p.inventory.motor = 10;
    p.priceOverrides.motor = 0;
    expect(buildBom(p).find((r) => r.definition.id === 'motor')).toMatchObject({
      buy: 0,
      unitPrice: 0,
      subtotal: 0,
    });
  });
  it('keeps an unknown price distinct from a zero cost and excludes it from known totals', () => {
    const p = createSampleProject();
    const rows = buildBom(p);
    expect(rows.find((r) => r.definition.id === 'tie')).toMatchObject({
      unitPrice: null,
      subtotal: null,
      buy: 6,
    });
    expect(summarizeBom(rows)).toMatchObject({
      knownCost: 1359000,
      unknownPrices: 1,
      unverified: 22,
      unknownPurchasePrices: 1,
      buy: 66,
    });
    p.priceOverrides.motor = null;
    expect(buildBom(p).find((r) => r.definition.id === 'motor')?.unitPrice).toBeNull();
  });
  it('counts unknown-price rows separately from unknown-price purchases', () => {
    const p = createSampleProject();
    p.inventory.tie = 6;
    expect(summarizeBom(buildBom(p))).toMatchObject({ unknownPrices: 1, unknownPurchasePrices: 0 });
  });
  it('does not change BOM when parts and assemblies are hidden', () => {
    const p = createSampleProject();
    const original = buildBom(p);
    p.instances = p.instances.map((i) => ({ ...i, visible: false }));
    p.assemblies = p.assemblies.map((a) => ({ ...a, visible: false }));
    expect(buildBom(p)).toEqual(original);
  });
  it('emits UTF-8 BOM, Vietnamese text, explicit unknowns, and escaped CSV cells', () => {
    const csv = exportBomCsv(createSampleProject());
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Động cơ giảm tốc');
    expect(csv).toContain('Chưa có giá');
    expect(csv).toContain('MINH HỌA - KHÔNG DÙNG ĐẶT MUA');
    expect(csv.split('\r\n')).toHaveLength(23);
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell('=SUM(A1)')).toBe('"\'=SUM(A1)"');
  });
});

describe('Compatibility with complete, incompatible and missing data', () => {
  it('passes complete declared data while making no physical safety claim', () => {
    const checks = checkCompatibility(compatibilityFixture('pass'));
    expect(checks.length).toBeGreaterThan(20);
    expect(checks.every((c) => c.status === 'pass')).toBe(true);
  });
  it('recognizes fail cases for all six rule families', () => {
    const checks = checkCompatibility(compatibilityFixture('fail'));
    for (const rule of ['voltage', 'logic', 'current', 'channels', 'shaft', 'required'])
      expect(
        checks.some((c) => c.rule === rule && c.status === 'fail'),
        rule,
      ).toBe(true);
  });
  it('reports missing numerical information as unknown, not pass', () => {
    const checks = checkCompatibility(compatibilityFixture('unknown'));
    expect(checks.filter((c) => c.rule !== 'required').every((c) => c.status === 'unknown')).toBe(
      true,
    );
    expect(checks.filter((c) => c.rule === 'required').every((c) => c.status === 'pass')).toBe(
      true,
    );
  });
  it('requires the entire source range to fit the receiver range', () => {
    const p = compatibilityFixture('pass');
    p.definitions
      .find((d) => d.id === 'converter')!
      .ports.find((p) => p.id === 'output')!.voltageV = [4, 5];
    expect(checkCompatibility(p).find((c) => c.id === 'voltage-connection-6')?.status).toBe('fail');
  });
  it('sums connected motor stall demands, not one motor or typical current', () => {
    const p = compatibilityFixture('pass');
    p.definitions.find((d) => d.id === 'driver')!.ports.find((p) => p.id === 'motors')!.currentA =
      2;
    expect(checkCompatibility(p).find((c) => c.id === 'current-driver-1:motors')).toMatchObject({
      status: 'fail',
      instanceIds: ['driver-1', 'motor-left', 'motor-right'],
    });
  });
  it('checks per-channel current independently of total capacity', () => {
    const p = compatibilityFixture('pass');
    p.definitions
      .find((d) => d.id === 'driver')!
      .ports.find((p) => p.id === 'motors')!.perChannelCurrentA = 1;
    const checks = checkCompatibility(p);
    expect(checks.find((c) => c.id === 'channel-current-driver-1:motors')?.status).toBe('fail');
    expect(checks.find((c) => c.id === 'current-driver-1:motors')?.status).toBe('pass');
  });
  it('does not infer current demand from missing data or nominal voltage', () => {
    const p = compatibilityFixture('pass');
    delete p.definitions.find((d) => d.id === 'motor')!.ports[0].currentA;
    expect(checkCompatibility(p).find((c) => c.id === 'current-driver-1:motors')?.status).toBe(
      'unknown',
    );
  });
  it('detects a missing required connection even if all ports have ratings', () => {
    const p = compatibilityFixture('pass');
    p.connections = p.connections.filter((c) => c.to.instanceId !== 'motor-right');
    expect(checkCompatibility(p).find((c) => c.id === 'required-motor-right')?.status).toBe('fail');
  });
  it('sample deliberately contains unknowns and no hidden failure', () => {
    const checks = checkCompatibility(createSampleProject());
    expect(checks.some((c) => c.status === 'unknown')).toBe(true);
    expect(checks.some((c) => c.status === 'fail')).toBe(false);
  });
});

describe('Versioned project import, export and storage', () => {
  it('round-trips transforms, instances, visibility, inventory and null/zero prices', () => {
    const p = createSampleProject();
    p.instances[0].positionMm = [13, 22, -5];
    p.instances[0].rotationDeg = [0, 45, 0];
    p.instances[0].visible = false;
    p.inventory.motor = 1;
    p.priceOverrides.motor = 0;
    p.priceOverrides.camera = null;
    const restored = parseProject(serializeProject(p));
    expect(restored).toEqual(p);
    expect(buildBom(restored)).toEqual(buildBom(p));
  });
  it.each([
    [
      'version',
      (p: RobotProject) => {
        (p as unknown as { schemaVersion: number }).schemaVersion = 2;
      },
    ],
    [
      'duplicate ID',
      (p: RobotProject) => {
        p.instances.push({ ...p.instances[0] });
      },
    ],
    [
      'missing definition',
      (p: RobotProject) => {
        p.instances[0].definitionId = 'missing';
      },
    ],
    [
      'missing port',
      (p: RobotProject) => {
        p.connections[0].to.portId = 'missing';
      },
    ],
    [
      'wrong direction',
      (p: RobotProject) => {
        p.connections[0].from.portId = 'supply';
      },
    ],
    [
      'negative price',
      (p: RobotProject) => {
        p.priceOverrides.motor = -1;
      },
    ],
    [
      'fractional quantity',
      (p: RobotProject) => {
        p.inventory.motor = 1.5;
      },
    ],
    [
      'reversed voltage range',
      (p: RobotProject) => {
        p.definitions.find((d) => d.id === 'motor')!.ports[0].voltageV = [12, 5];
      },
    ],
    [
      'duplicate input connection',
      (p: RobotProject) => {
        p.connections.push({ ...p.connections[0], id: 'duplicate' });
      },
    ],
    [
      'unknown inventory reference',
      (p: RobotProject) => {
        p.inventory.unknown = 2;
      },
    ],
  ] as const)('rejects %s and leaves the active project untouched', (_name, change) => {
    const active = createSampleProject();
    const before = serializeProject(active);
    const broken = structuredClone(active);
    change(broken);
    expect(() => parseProject(JSON.stringify(broken))).toThrow();
    expect(serializeProject(active)).toBe(before);
  });
  it('rejects invalid JSON, non-finite dimensions and excessively large files', () => {
    expect(() => parseProject('{bad')).toThrow('JSON');
    const p = createSampleProject();
    p.definitions[0].dimensionsMm[0] = Infinity;
    expect(() => parseProject(JSON.stringify(p))).toThrow();
    expect(() => parseProject(' '.repeat(5_000_001))).toThrow('5 MB');
  });
  it('persists and reopens exactly the edited design', () => {
    const data = new Map<string, string>();
    const storage = {
      setItem: (k: string, v: string) => {
        data.set(k, v);
      },
      getItem: (k: string) => data.get(k) ?? null,
    };
    expect(loadProject(storage)).toBeNull();
    const p = createSampleProject();
    p.name = 'Robot cá nhân';
    p.inventory.camera = 1;
    saveProject(p, storage);
    expect(data.has(STORAGE_KEY)).toBe(true);
    expect(loadProject(storage)).toEqual(p);
  });
  it('surfaces storage failure instead of reporting a false save', () => {
    expect(() =>
      saveProject(createSampleProject(), {
        setItem: () => {
          throw new Error('quota');
        },
      }),
    ).toThrow('quota');
    expect(() => loadProject({ getItem: () => '{broken' })).toThrow();
  });
});

describe('Exploded geometry is a reversible view of the design', () => {
  it('moves in the declared direction in metres, without editing the assembly pose', () => {
    const p = createSampleProject();
    const i = p.instances.find((i) => i.id === 'wheel-left')!;
    const original = serializeProject(p);
    Object.freeze(i.positionMm);
    Object.freeze(i.explodeDirection);
    const at100 = displayPosition(i, 100);
    expect(at100).toEqual([-0.247, 0.033, -0.03]);
    expect(displayPosition(i, 0)).toEqual([-0.112, 0.033, -0.03]);
    expect(serializeProject(p)).toBe(original);
  });
  it('returns every part precisely to its original coordinate; clamps percentage', () => {
    const p = createSampleProject();
    for (const i of p.instances) {
      displayPosition(i, 50);
      displayPosition(i, 100);
      expect(displayPosition(i, 0)).toEqual(i.positionMm.map((n) => n / 1000));
      expect(displayPosition(i, -10)).toEqual(displayPosition(i, 0));
      expect(displayPosition(i, 120)).toEqual(displayPosition(i, 100));
    }
  });
  it('uses normalized directions and zero direction safely', () => {
    const p = createSampleProject();
    const i = {
      ...p.instances[0],
      positionMm: [0, 0, 0] as [number, number, number],
      explodeDirection: [3, 4, 0] as [number, number, number],
      explodeDistanceMm: 100,
    };
    expect(displayPosition(i, 100)).toEqual([0.06, 0.08, 0]);
    i.explodeDirection = [0, 0, 0];
    expect(displayPosition(i, 100)).toEqual([0, 0, 0]);
  });
});
