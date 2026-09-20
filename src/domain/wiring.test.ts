import { describe, expect, it } from 'vitest';
import { createPersonalRobot } from '../data/personalRobot';
import { createSampleProject } from '../data/sampleRobot';
import { robotWires, wiringMarkdown, wireBundle } from './wiring';
import { partContacts } from './contacts';

describe('Robot 02 reference harness', () => {
  it('resolves unique physical/header/radio routes to existing parts without editing the project', () => {
    const p = createPersonalRobot(),
      before = structuredClone(p),
      wires = robotWires(p);
    expect(wires).toHaveLength(46);
    expect(new Set(wires.map((w) => w.id)).size).toBe(46);
    expect(wires.filter((w) => w.medium === 'wire')).toHaveLength(21);
    expect(wires.filter((w) => w.medium === 'header')).toHaveLength(6);
    expect(wires.filter((w) => w.medium === 'contact')).toHaveLength(4);
    expect(wires.filter((w) => w.medium === 'internal')).toHaveLength(14);
    expect(wires.filter((w) => w.medium === 'radio')).toHaveLength(1);
    for (const w of wires) {
      for (const end of [w.from, w.to]) {
        expect(p.instances.some((i) => i.id === end.instanceId)).toBe(true);
        expect(end.pin.length).toBeGreaterThan(1);
        expect(end.anchorMm.every(Number.isFinite)).toBe(true);
      }
      expect(w.explanation).not.toBe('');
      expect(w.source).toMatch(/^https:\/\//);
    }
    wiringMarkdown(p);
    expect(p).toEqual(before);
  });
  it('keeps 4 two-wire motors on 2 shared channels, with no fixed ground on an H-bridge output', () => {
    const wires = robotWires(createPersonalRobot()).filter((w) => w.group === 'motor');
    expect(wires).toHaveLength(8);
    for (const side of ['left', 'right']) {
      for (const position of ['front', 'rear']) {
        const pair = wires.filter((w) => w.to.instanceId === `motor-${side}-${position}`);
        expect(pair).toHaveLength(2);
        expect(pair.map((w) => w.from.pin).sort()).toEqual(
          side === 'left' ? ['MA1', 'MA2'] : ['MB1', 'MB2'],
        );
        expect(pair.every((w) => !w.from.pin.includes('GND'))).toBe(true);
      }
    }
  });
  it('exports unresolved power issues and detailed logic pins along with explanations', () => {
    const p = createPersonalRobot(),
      wires = robotWires(p),
      md = wiringMarkdown(p);
    expect(wires.filter((w) => w.status === 'blocked').map((w) => w.id)).toEqual([
      'W01',
      'W02',
      'W03',
    ]);
    for (const word of [
      'GPIO8',
      'GPIO9',
      'GPIO10',
      'GPIO11',
      'MA1',
      'MB2',
      'Không có dây điện',
      'Bố trí đầu nối theo ảnh MakerEDU',
    ])
      expect(md).toContain(word);
  });
  it('attaches every physical cable to a modelled contact, with no floating fallback anchors', () => {
    const p = createPersonalRobot();
    for (const w of robotWires(p).filter((w) => w.medium !== 'radio')) {
      for (const end of [w.from, w.to]) {
        const instance = p.instances.find((i) => i.id === end.instanceId)!;
        const def = p.definitions.find((d) => d.id === instance.definitionId)!;
        const contact = partContacts(def).find((c) => c.id === end.contactId);
        expect(contact, `${w.id} ${end.instanceId}`).toBeDefined();
        expect(end.anchorMm).toEqual(contact!.position);
        expect(contact!.normal.reduce((sum, n) => sum + n * n, 0)).toBe(1);
      }
    }
  });
  it('separates motor supply screw terminals from the 5V logic socket', () => {
    const p = createPersonalRobot();
    const contacts = partContacts(p.definitions.find((d) => d.id === 'mke-m17')!);
    expect(
      contacts
        .filter((c) => c.kind === 'screw')
        .sort((a, b) => a.position[0] - b.position[0])
        .map((c) => c.id),
    ).toEqual(['MA1', 'MA2', 'VIN', 'GND', 'MB1', 'MB2']);
    const wires = robotWires(p);
    expect(wires.find((w) => w.id === 'W02')!.to.contact!.kind).toBe('screw');
    expect(wires.find((w) => w.id === 'W08')!.to.contact!.kind).toBe('socket');
    expect(wires.find((w) => w.id === 'W02')!.to.anchorMm).not.toEqual(
      wires.find((w) => w.id === 'W08')!.to.anchorMm,
    );
  });
  it('groups all four I2C conductors in one column and separates sonar SIG from 5V', () => {
    const wires = robotWires(createPersonalRobot());
    const i2c = wires.filter((w) => wireBundle(w) === 'i2c');
    expect(i2c.map((w) => w.id)).toEqual(['W08', 'W09', 'W10', 'W11']);
    expect(new Set(i2c.map((w) => w.from.anchorMm[0])).size).toBe(1);
    expect(new Set(i2c.map((w) => w.from.anchorMm[2])).size).toBe(4);
    expect(wires.find((w) => w.id === 'W14')!.from.contactId).toBe('gpio-10-SIG');
    expect(wires.find((w) => w.id === 'W15')!.to.contactId).toBe('gpio-11-SIG');
    expect(wires.filter((w) => wireBundle(w) === 'sonar')).toHaveLength(4);
  });
  it('follows resized board contacts and omits incompatible replacement definitions', () => {
    const p = createPersonalRobot();
    const original = robotWires(p).find((w) => w.id === 'W10')!.from.anchorMm;
    p.definitions.find((d) => d.id === 'mke-b01')!.dimensionsMm = [52, 10, 75];
    const moved = robotWires(p).find((w) => w.id === 'W10')!.from;
    expect(moved.anchorMm).not.toEqual(original);
    expect(moved.anchorMm).toEqual(moved.contact!.position);
    p.instances.find((i) => i.id === 'shield')!.definitionId = 'note9';
    expect(
      robotWires(p).some((w) => w.from.instanceId === 'shield' || w.to.instanceId === 'shield'),
    ).toBe(false);
  });
  it('keeps the original robot unaffected and omits routes whose endpoints are absent', () => {
    expect(robotWires(createSampleProject())).toEqual([]);
    const p = createPersonalRobot();
    p.instances = p.instances.filter((i) => i.id !== 'sonar');
    expect(
      robotWires(p).some((w) => w.from.instanceId === 'sonar' || w.to.instanceId === 'sonar'),
    ).toBe(false);
  });
});
