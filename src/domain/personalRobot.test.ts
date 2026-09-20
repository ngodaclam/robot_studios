import { describe, expect, it } from 'vitest';
import exportedDesign from '../../public/documents/robot-02-design.json?raw';
import exportedBom from '../../public/documents/robot-02-bom.csv?raw';
import { createPersonalRobot } from '../data/personalRobot';
import { buildBom, summarizeBom, exportBomCsv } from './bom';
import { checkCompatibility } from './compatibility';
import {
  massSummary,
  modelEnvelopeLwh,
  estimateRuntimeMinutes,
  personalDesignChecks,
} from './design';
import { parseProject, serializeProject, displayPosition } from './project';
import { addRobot, applyPersonalDesign, initialLibrary, saveLibrary, loadLibrary } from './library';
import { createSampleProject } from '../data/sampleRobot';

describe('Personal Robot 02', () => {
  it('ships valid standalone JSON and a CSV matching the exported design', () => {
    const project = parseProject(exportedDesign);
    expect(project.design?.profile).toBe('personal-v1');
    expect(exportedBom).toBe(exportBomCsv(project));
  });
  it('round-trips a complete four-wheel design with null masses and untouched test records', () => {
    const p = createPersonalRobot();
    expect(parseProject(serializeProject(p))).toEqual(p);
    expect(p.instances.filter((i) => i.definitionId === 'tt-motor')).toHaveLength(4);
    expect(p.instances.filter((i) => i.definitionId === 'tt-wheel')).toHaveLength(4);
    expect(p.instances.filter((i) => i.definitionId === 'sunpower-cell')).toHaveLength(2);
    expect(p.design?.tests.every((t) => t.status === 'untested' && !t.notes && !t.testedOn)).toBe(
      true,
    );
  });
  it('does not charge again for components inside the owned kit or for owned items with unknown price', () => {
    const p = createPersonalRobot();
    const rows = buildBom(p);
    expect(rows.find((r) => r.definition.id === 'tt-motor')).toMatchObject({
      required: 4,
      owned: 4,
      buy: 0,
      subtotal: 0,
    });
    expect(rows.find((r) => r.definition.id === 'note9')).toMatchObject({
      owned: 1,
      buy: 0,
      unitPrice: null,
      subtotal: 0,
    });
    expect(summarizeBom(rows).knownCost).toBe(0);
    expect(summarizeBom(rows).unknownPurchasePrices).toBeGreaterThan(5);
    p.inventory['mke-r01-kit'] = 0;
    expect(summarizeBom(buildBom(p)).knownCost).toBe(245000);
    expect(buildBom(p).find((r) => r.definition.id === 'tt-wheel')?.owned).toBe(0);
    expect(exportBomCsv(p)).toContain('Đề xuất — chưa chọn mẫu');
  });
  it('counts kit weight once, excludes offboard/planned items and keeps missing mass visible', () => {
    const p = createPersonalRobot();
    const summary = massSummary(p);
    expect(summary.knownG).toBe(701);
    expect(summary.missing).toBeGreaterThan(0);
    p.definitions.find((d) => d.id === 'usb-charger')!.massG = 200;
    p.definitions.find((d) => d.id === 'lidar')!.massG = 400;
    expect(massSummary(p)).toEqual(summary);
  });
  it('finds the shield voltage conflict and refuses to infer stall current or echo voltage', () => {
    const results = checkCompatibility(createPersonalRobot());
    expect(results.find((r) => r.id === 'voltage-c-3')?.status).toBe('fail');
    expect(results.find((r) => r.id === 'logic-c-9')?.status).toBe('unknown');
    expect(results.find((r) => r.id === 'channel-current-driver:motors')?.status).toBe('unknown');
    expect(results.find((r) => r.id === 'channels-driver:motors')?.status).toBe('pass');
  });
  it('sums the two motors on each shared channel rather than testing them independently', () => {
    const p = createPersonalRobot();
    p.definitions.find((d) => d.id === 'tt-motor')!.ports[0].currentA = 0.6;
    p.definitions.find((d) => d.id === 'mke-m17')!.ports.find((p) => p.id === 'motors')!.currentA =
      3;
    const results = checkCompatibility(p);
    expect(results.find((r) => r.id === 'current-driver:motors')?.status).toBe('pass');
    expect(results.find((r) => r.id === 'channel-current-driver:motors')?.status).toBe('fail');
  });
  it('updates only the selected robot and preserves its identity and the other robot exactly', () => {
    const original = createSampleProject();
    original.inventory.motor = 5;
    const library = addRobot(initialLibrary(original), createSampleProject(), 'Robot 02');
    const before = structuredClone(library);
    const next = applyPersonalDesign(library);
    expect(next.projects[0]).toEqual(before.projects[0]);
    expect(library).toEqual(before);
    expect(next.activeId).toBe(before.activeId);
    expect(next.projects[1].id).toBe(before.projects[1].id);
    expect(next.projects[1].design?.profile).toBe('personal-v1');
  });
  it('persists an entered measurement with the robot through library and JSON export', () => {
    const p = createPersonalRobot();
    p.design!.tests[0] = {
      ...p.design!.tests[0],
      status: 'fail',
      notes: 'Ví dụ kiểm thử lưu, không phải số đo thật',
      testedOn: '2026-09-20',
    };
    let saved: string | null = null;
    const storage = {
      getItem: () => saved,
      setItem: (_k: string, v: string) => {
        saved = v;
      },
    };
    saveLibrary(initialLibrary(p), storage);
    expect(loadLibrary(storage).projects[0].design).toEqual(p.design);
    expect(parseProject(serializeProject(p)).design).toEqual(p.design);
  });
  it('keeps envelope checks independent of visibility/explode and reacts to moved parts', () => {
    const p = createPersonalRobot();
    const original = modelEnvelopeLwh(p);
    p.instances.forEach((i) => {
      i.visible = false;
      displayPosition(i, 100);
    });
    expect(modelEnvelopeLwh(p)).toEqual(original);
    p.instances.find((i) => i.id === 'phone')!.positionMm[0] = 500;
    expect(personalDesignChecks(p).find((r) => r.id === 'design-envelope')?.status).toBe('fail');
  });
  it('uses 2.5Ah for series cells and handles invalid estimator inputs', () => {
    expect(estimateRuntimeMinutes(1.5)).toBe(80);
    expect(estimateRuntimeMinutes(1.2)).toBe(100);
    expect(estimateRuntimeMinutes(1.8)).toBeCloseTo(66.6667, 3);
    expect(estimateRuntimeMinutes(0)).toBeNull();
    expect(estimateRuntimeMinutes(NaN)).toBeNull();
    expect(estimateRuntimeMinutes(1, 2)).toBeNull();
  });
  it('rejects dangling or circular kit references without breaking legacy sample imports', () => {
    expect(parseProject(serializeProject(createSampleProject())).design).toBeUndefined();
    const p = createPersonalRobot();
    p.definitions.find((d) => d.id === 'tt-motor')!.includedIn!.definitionId = 'missing-kit';
    expect(() => serializeProject(p)).toThrow();
    p.definitions.find((d) => d.id === 'tt-motor')!.includedIn!.definitionId = 'tt-motor';
    expect(() => serializeProject(p)).toThrow();
    p.definitions.find((d) => d.id === 'tt-motor')!.includedIn = {
      definitionId: 'mke-r01-kit',
      quantity: 3,
    };
    expect(() => serializeProject(p)).toThrow();
  });
});
