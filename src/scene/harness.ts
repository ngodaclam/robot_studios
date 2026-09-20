import * as THREE from 'three';
import { wireBundle, type RobotWire } from '../domain/wiring';

/** A proposed service loop, in metres. This is not a cut-length or collision-checked harness. */
export function harnessPoints(
  wire: RobotWire,
  a: THREE.Vector3,
  b: THREE.Vector3,
  normalA: THREE.Vector3,
  normalB: THREE.Vector3,
) {
  if (wire.medium === 'header' || wire.medium === 'contact')
    return [a.clone(), a.clone().lerp(b, 0.5), b.clone()];
  if (wire.medium === 'internal') {
    // A dashed functional link, not fabricated copper artwork or a jumper.
    const bend = a.clone().lerp(b, 0.5).addScaledVector(normalA, 0.003);
    return [a.clone(), bend, b.clone()];
  }
  const bundle = wireBundle(wire);
  const lane = ((Number(wire.id.slice(1)) % 4) - 1.5) * 0.0013;
  const start = a.clone().addScaledVector(normalA, 0.006);
  const finish = b.clone().addScaledVector(normalB, 0.006);
  const height = Math.max(a.y, b.y) + 0.013 + lane;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  let middle: THREE.Vector3[];
  if (bundle === 'i2c') {
    const rear = Math.min(a.z, b.z) - 0.016 - lane;
    const side = b.x + 0.008 + lane;
    middle = [v(a.x, height, rear), v(side, height, rear), v(side, height, b.z)];
  } else if (bundle === 'sonar') {
    // ECHO is logically reversed; route all four conductors along the same bundle.
    const shield = wire.from.instanceId === 'shield' ? a : b;
    const sonar = wire.from.instanceId === 'sonar' ? a : b;
    const side = shield.x - 0.008 + lane;
    middle = [
      v(side, height, shield.z),
      v(side, height, sonar.z - 0.008),
      v(sonar.x, height, sonar.z - 0.009),
    ];
    if (wire.from.instanceId === 'sonar') middle.reverse();
  } else if (bundle === 'left' || bundle === 'right') {
    const side = b.x + (bundle === 'left' ? -0.005 : 0.005) + lane;
    const rear = a.z - 0.014 - lane;
    middle = [
      v(a.x, a.y + 0.004, rear),
      v(side, a.y + 0.004, rear),
      v(side, b.y + 0.019, finish.z),
    ];
  } else if (bundle === 'power') {
    const side = b.x + (b.x < 0 ? -0.014 : 0.014) + lane;
    const rear = Math.min(start.z, finish.z) - 0.006;
    middle = [v(start.x, height, rear), v(side, height, rear), v(side, height, finish.z - 0.01)];
  } else {
    middle = [
      a
        .clone()
        .lerp(b, 0.5)
        .add(v(0, 0.05, 0)),
    ];
  }
  return [a.clone(), start, ...middle, finish, b.clone()];
}
