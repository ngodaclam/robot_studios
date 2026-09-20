import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPersonalRobot } from '../data/personalRobot';
import { robotWires } from '../domain/wiring';
import { displayPosition } from '../domain/project';
import { harnessPoints } from './harness';

describe('cable routing under transforms', () => {
  it('keeps both ends on their contacts when motors rotate and parts explode', () => {
    const project = createPersonalRobot();
    for (const explode of [0, 100])
      for (const wire of robotWires(project)) {
        const resolved = [wire.from, wire.to].map((end) => {
          const part = project.instances.find((i) => i.id === end.instanceId)!;
          const root = new THREE.Group();
          root.scale.setScalar(0.001);
          root.position.set(...displayPosition(part, explode));
          root.rotation.set(
            ...(part.rotationDeg.map(THREE.MathUtils.degToRad) as [number, number, number]),
          );
          root.updateMatrixWorld(true);
          return {
            tip: root.localToWorld(new THREE.Vector3(...end.anchorMm)),
            normal: new THREE.Vector3(...(end.contact?.normal ?? [0, 1, 0])).transformDirection(
              root.matrixWorld,
            ),
          };
        });
        const [a, b] = resolved;
        const points = harnessPoints(wire, a.tip, b.tip, a.normal, b.normal);
        const curve = new THREE.CatmullRomCurve3(points);
        expect(curve.getPoint(0).distanceTo(a.tip)).toBeLessThan(1e-10);
        expect(curve.getPoint(1).distanceTo(b.tip)).toBeLessThan(1e-10);
        expect(curve.getPoints(80).every((point) => point.toArray().every(Number.isFinite))).toBe(
          true,
        );
        if (wire.medium === 'wire') {
          expect(points[1].clone().sub(a.tip).normalize().dot(a.normal)).toBeCloseTo(1);
          expect(points.at(-2)!.clone().sub(b.tip).normalize().dot(b.normal)).toBeCloseTo(1);
        }
      }
  });
});
