import * as THREE from 'three';
import { drawFace } from './faceDrawing';
import type { Expression } from '../domain/expressions';

export type FaceUpdater = (now: number, expression: Expression, reducedMotion: boolean) => void;

export function createPhoneScreen(width: number, height: number, depth: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  drawFace(ctx, 'happy');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 15, height - 6),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  screen.rotation.y = Math.PI;
  screen.position.z = -depth / 2 - 0.4;
  screen.name = 'robot-expression-screen';
  let lastTime = -Infinity;
  let lastExpression: Expression | null = null;
  const update: FaceUpdater = (now, expression, reducedMotion) => {
    if (expression === lastExpression && (reducedMotion || now - lastTime < 50)) return;
    drawFace(ctx, expression, reducedMotion ? 0 : now / 1000);
    texture.needsUpdate = true;
    lastTime = now;
    lastExpression = expression;
  };
  screen.userData.updateFace = update;
  return screen;
}
