import { describe, expect, it } from 'vitest';
import {
  defaultSimConfig,
  initialSimulation,
  intersectsBody,
  rayBox,
  readSonar,
  scenes,
  simulateVision,
  stepSimulation,
  type Obstacle,
  type SimConfig,
  type SimState,
} from './simulation';

function run(config: SimConfig, steps = 20, initial: SimState = initialSimulation()) {
  let state = initial;
  for (let n = 0; n < steps; n++) state = stepSimulation(state, config, 0.05);
  return state;
}
const box: Obstacle = { id: 'test', x: 0, z: 0.6, width: 0.4, depth: 0.2, height: 0.3 };

describe('local kinematic simulation', () => {
  it('moves forward at the requested speed and rotates both wheel pairs without mutating inputs', () => {
    const c = { ...defaultSimConfig(), obstacles: [], left: 1, right: 1 };
    const start = initialSimulation(),
      copy = structuredClone(start),
      configCopy = structuredClone(c);
    const s = run(c, 20, start);
    expect(s.x).toBe(0);
    expect(s.z).toBeCloseTo(-0.58);
    expect(s.time).toBeCloseTo(1);
    expect(s.travelled).toBeCloseTo(0.22);
    expect(s.leftAngle).toBeCloseTo(0.22 / 0.0325);
    expect(s.rightAngle).toBeCloseTo(s.leftAngle);
    expect(start).toEqual(copy);
    expect(c).toEqual(configCopy);
  });
  it('reverses and turns left/right with consistent differential drive signs', () => {
    const c = { ...defaultSimConfig(), obstacles: [], guard: false };
    expect(run({ ...c, left: -1, right: -1 }).z).toBeCloseTo(-1.02);
    const right = run({ ...c, left: 0.5, right: -0.5 });
    const left = run({ ...c, left: -0.5, right: 0.5 });
    expect(right.yaw).toBeCloseTo(0.22 / 0.144);
    expect(left.yaw).toBeCloseTo(-right.yaw);
    expect(right.x).toBe(0);
    expect(right.z).toBe(-0.8);
    expect(right.travelled).toBe(0);
    expect(right.leftAngle).toBeCloseTo(-right.rightAngle);
  });
  it.each([
    [{ emergency: true }, 'Dừng khẩn'],
    [{ link: false }, 'Mất liên lạc'],
    [{ sensor: false }, 'Mất cảm biến'],
    [{ voltage: 6.9 }, 'dưới 7 V'],
    [{ voltage: 8.5 }, 'ngoài cấu hình'],
  ] as [Partial<SimConfig>, string][])('stops on interlock %j', (patch, label) => {
    const c = { ...defaultSimConfig(), left: 1, right: 1, ...patch };
    const s = run(c);
    expect(s.z).toBe(-0.8);
    expect(s.leftSpeed).toBe(0);
    expect(s.rightSpeed).toBe(0);
    expect(s.status).toContain(label);
    expect(s.time).toBeCloseTo(1);
  });
  it('allows reversing out of a near obstacle but blocks advancing with the guard enabled', () => {
    const start = { ...initialSimulation(), z: -0.35 };
    const c = { ...defaultSimConfig(), left: 1, right: 1 };
    expect(readSonar(start, c.obstacles).distance).toBeLessThan(0.25);
    expect(run(c, 1, start).status).toContain('chặn tiến');
    expect(run({ ...c, left: -1, right: -1 }, 1, start).z).toBeLessThan(start.z);
  });
  it('uses the sonar in automatic mode even when the optional manual guard is disabled', () => {
    const s = run({ ...defaultSimConfig(), mode: 'avoid', guard: false, sensor: false });
    expect(s.status).toContain('Mất cảm biến');
    expect(s.travelled).toBe(0);
  });
  it('turns on a near return in auto mode and stays inside the room during a full minute', () => {
    const c: SimConfig = { ...defaultSimConfig(), mode: 'avoid' };
    const close = stepSimulation({ ...initialSimulation(), z: -0.4 }, c, 0.05);
    expect(close.status).toContain('xoay phải');
    expect(close.leftSpeed).toBeGreaterThan(0);
    expect(close.rightSpeed).toBeLessThan(0);
    let state = initialSimulation(),
      turned = false;
    for (let n = 0; n < 1200; n++) {
      state = stepSimulation(state, c, 0.05);
      turned ||= state.status.includes('xoay phải');
      expect(intersectsBody(state.x, state.z, c.bodyRadiusM, c.obstacles)).toBe(false);
      expect(Number.isFinite(state.yaw)).toBe(true);
    }
    expect(turned).toBe(true);
    expect(state.travelled).toBeGreaterThan(0.4);
    expect(state.trail.length).toBeLessThanOrEqual(400);
  });
  it('prevents crossing a room wall or an obstacle even with the optional guard off', () => {
    for (const obstacles of [[], scenes.room.obstacles]) {
      const c = { ...defaultSimConfig(), obstacles, guard: false, left: 1, right: 1 };
      const s = run(c, 700);
      expect(s.status).toContain('Chạm biên');
      expect(s.leftSpeed).toBe(0);
      expect(intersectsBody(s.x, s.z, c.bodyRadiusM, obstacles)).toBe(false);
    }
  });
  it('caps a delayed frame and ignores nonpositive or invalid time steps', () => {
    const s = initialSimulation(),
      c = { ...defaultSimConfig(), left: 1, right: 1 };
    expect(stepSimulation(s, c, 10).time).toBe(0.05);
    for (const dt of [0, -1, NaN, Infinity]) expect(stepSimulation(s, c, dt)).toBe(s);
  });
});

describe('simplified sonar', () => {
  it('measures from the front sensor and calculates round-trip pulse time', () => {
    const result = readSonar({ x: 0, z: 0, yaw: 0 }, [box]);
    expect(result.distance).toBeCloseTo(0.5 - 0.106);
    expect(result.echoUs).toBeCloseTo(((0.394 * 2) / 343) * 1e6);
    expect(result.valid).toBe(true);
  });
  it('distinguishes no return from disconnected and too-close measurements', () => {
    expect(readSonar(initialSimulation(), []).distance).toBeNull();
    expect(readSonar(initialSimulation(), []).valid).toBe(true);
    expect(readSonar(initialSimulation(), [], false).valid).toBe(false);
    expect(readSonar({ x: 0, z: 0.38, yaw: 0 }, [box]).reason).toContain('Vùng mù');
  });
  it('ignores obstacles behind and outside the fan, and rotates the beam with the robot', () => {
    const s = initialSimulation();
    expect(readSonar(s, [{ ...box, x: 0.8, z: 0 }]).distance).toBeNull();
    expect(readSonar(s, [{ ...box, z: -1.2 }]).distance).toBeNull();
    expect(
      readSonar({ x: 0, z: 0, yaw: Math.PI / 2 }, [{ ...box, x: 0.6, z: 0 }]).distance,
    ).toBeCloseTo(0.4 - 0.106);
  });
  it('handles parallel rays, a start inside a box, and intersections behind the sensor', () => {
    expect(rayBox(2, 0, 0, 1, box)).toBeNull();
    expect(rayBox(0, 0.6, 0, 1, box)).toBe(0);
    expect(rayBox(0, 1, 0, 1, box)).toBeNull();
  });
});

describe('explicitly synthetic vision scenarios', () => {
  it('requires the correct view, elapsed time and an enabled scenario for a bedroom alarm', () => {
    expect(simulateVision('person', 'floor', 10, true).detected).toBe(false);
    expect(simulateVision('person', 'bed', 0.49, true).detected).toBe(false);
    expect(simulateVision('person', 'bed', 1, true).detected).toBe(true);
    expect(simulateVision('person', 'bed', 1.99, true).alarm).toBe(false);
    expect(simulateVision('person', 'bed', 2, true).alarm).toBe(true);
    expect(simulateVision('person', 'bed', 10, false).alarm).toBe(false);
  });
  it('marks trash only in the floor view and never produces a person alarm for trash or empty scenes', () => {
    expect(simulateVision('trash', 'floor', 1, true).detected).toBe(true);
    expect(simulateVision('trash', 'floor', 10, true).alarm).toBe(false);
    expect(simulateVision('trash', 'bed', 10, true).detected).toBe(false);
    expect(simulateVision('none', 'bed', 10, true).alarm).toBe(false);
  });
});
