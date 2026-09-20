import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PartDefinition } from '../domain/schema';
import { makerBoard, addContactGeometry } from './makerBoards';
import { createPhoneScreen } from './phoneScreen';

export function createPartGeometry(def: PartDefinition): THREE.Group {
  const specific = makerBoard(def);
  if (specific) {
    addContactGeometry(specific, def);
    specific.scale.setScalar(0.001);
    return specific;
  }
  const g = new THREE.Group();
  const [w, h, d] = def.dimensionsMm;
  function material(color: string, metalness = 0.15, roughness = 0.5) {
    return new THREE.MeshStandardMaterial({ color, metalness, roughness });
  }
  function mesh(
    geo: THREE.BufferGeometry,
    color: string,
    pos: [number, number, number] = [0, 0, 0],
    metalness = 0.15,
  ) {
    const m = new THREE.Mesh(geo, material(color, metalness));
    m.position.set(...pos);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }
  function box(
    size: [number, number, number],
    color: string,
    pos: [number, number, number] = [0, 0, 0],
    radius = 0,
  ) {
    return mesh(
      radius ? new RoundedBoxGeometry(...size, 2, radius) : new THREE.BoxGeometry(...size),
      color,
      pos,
    );
  }
  function cyl(
    radius: number,
    length: number,
    color: string,
    pos: [number, number, number] = [0, 0, 0],
    axis = 'y',
    metalness = 0.4,
  ) {
    const m = mesh(new THREE.CylinderGeometry(radius, radius, length, 32), color, pos, metalness);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    return m;
  }
  function bolt(x: number, y: number, z: number) {
    cyl(3, 1.2, '#a6b9be', [x, y, z]);
    box([3, 0.4, 0.8], '#536b70', [x, y + 0.7, z]);
  }
  function board() {
    box([w, 2, d], def.color, [0, -h / 2 + 1, 0], 1);
    for (const x of [-w / 2 + 3, w / 2 - 3])
      for (const z of [-d / 2 + 3, d / 2 - 3]) {
        cyl(1.8, 0.5, '#c8b273', [x, -h / 2 + 2.2, z]);
        cyl(2, 3, '#c2ad7c', [x, -h / 2 - 1.5, z]);
      }
    box([w * 0.35, h * 0.55, d * 0.35], '#233339', [0, -1, 0], 1);
    for (let n = 0; n < 8; n++)
      for (const side of [-1, 1])
        box([1.5, 1, 3], '#d2c8a3', [-w * 0.23 + n * w * 0.065, -h / 2 + 2, side * d * 0.32]);
    box([w * 0.35, 5, 6], '#dfdec4', [0, -h / 2 + 4, -d / 2 + 4], 1);
    for (let n = 0; n < 4; n++) box([2, 4, 2], '#d6b15a', [-6 + n * 4, -h / 2 + 7, -d / 2 + 4]);
  }
  switch (def.geometry) {
    case 'chassis4wd':
      box([w, 2, d], def.color, [0, h / 2 - 1, 0], 1);
      for (const side of [-1, 1]) {
        box([2, h, d], def.color, [side * (w / 2 - 1), 0, 0], 1);
        for (const z of [-60, 60]) bolt(side * (w / 2 - 9), h / 2, z);
      }
      for (const z of [-74, -12, 50]) box([28, 0.3, 3], '#78382d', [0, h / 2 + 0.3, z]);
      break;
    case 'ttMotor':
      box([w, h, d * 0.6], def.color, [0, 0, -d * 0.2], 3);
      cyl(h * 0.4, d * 0.45, '#aab8b6', [0, 0, d * 0.25], 'z');
      cyl(3, w + 15, '#e9ded2', [0, 0, -d * 0.22], 'x');
      box([w * 0.7, h * 0.4, 4], '#303c40', [0, 0, d / 2]);
      break;
    case 'cell':
      cyl(w / 2, d - 2, def.color, [0, 0, 0], 'z', 0.1);
      cyl(w / 2 - 1, 1.5, '#cad3d1', [0, 0, -d / 2 + 0.75], 'z');
      cyl(3, 1.5, '#deded1', [0, 0, d / 2 - 0.75], 'z');
      box([w * 0.65, 0.3, d * 0.5], '#dce8d6', [0, h / 2, 0], 1);
      break;
    case 'phone':
      box([w, h, d], '#121f33', [0, 0, 0], 4);
      box([w - 2, h - 2, 0.8], def.color, [0, 0, d / 2], 4);
      // Rear camera faces +Z; an X rotation of 35° points it toward the floor.
      box([14, 29, 1.2], '#0f1d29', [-w / 2 + 22, 0, d / 2 + 0.6], 3);
      for (const y of [-7, 7]) {
        cyl(4.5, 1.4, '#526b79', [-w / 2 + 22, y, d / 2 + 1.2], 'z');
        cyl(3, 1.6, '#0b2139', [-w / 2 + 22, y, d / 2 + 1.4], 'z');
      }
      box([8, 13, 1], '#253d59', [-w / 2 + 39, 0, d / 2 + 0.6], 2);
      box([w - 14, h - 5, 0.5], '#0c2634', [0, 0, -d / 2 - 0.1], 3);
      g.add(createPhoneScreen(w, h, d));
      box([1, 8, 3], '#101922', [w / 2 + 0.2, 0, 0], 0.5);
      break;
    case 'phoneMount':
      // Open frame: support only the perimeter, leaving the expression screen clear.
      for (const side of [-1, 1]) {
        box([5, h, 4], def.color, [side * (w / 2 - 2.5), 0, -d / 2 + 2], 1);
        box([w, 3, d], def.color, [0, side * (h / 2 - 1.5), 0], 1);
        box([55, 2, 2], '#182d33', [18, side * (h / 2 - 1), d / 2 - 1], 0.5);
      }
      break;
    case 'base':
    case 'deck': {
      box([w, h, d], def.color, [0, 0, 0], 2);
      // Cut-like inset slots, mounting pads and service details.
      for (const x of [-w / 2 + Math.min(17, w / 4), w / 2 - Math.min(17, w / 4)])
        for (const z of [-d / 2 + Math.min(20, d / 4), d / 2 - Math.min(20, d / 4)])
          bolt(x, h / 2 + 0.5, z);
      for (const x of [-1, 1])
        for (let n = 0; n < 5; n++)
          box(
            [2, 0.4, Math.min(15, d / 10)],
            '#759396',
            [x * (w / 2 - 12), h / 2 + 0.3, ((n - 2) * d) / 8],
            0.5,
          );
      if (def.geometry === 'deck') {
        box([50, 1, 4], '#078c94', [-48, h / 2 + 0.5, 48], 1);
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, 512, 128);
        ctx.fillStyle = '#315f66';
        ctx.font = '600 54px sans-serif';
        ctx.fillText('R O V E R  /  0 1', 12, 75);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const label = new THREE.Mesh(
          new THREE.PlaneGeometry(64, 16),
          new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
        );
        label.rotation.x = -Math.PI / 2;
        label.position.set(-40, h / 2 + 0.6, 65);
        g.add(label);
      }
      break;
    }
    case 'post':
      cyl(w / 2, h, def.color);
      cyl(2, h + 6, '#bdc6c8');
      break;
    case 'wheel': {
      cyl(h / 2, w, def.color, [0, 0, 0], 'x', 0);
      for (const side of [-1, 1]) {
        cyl(h * 0.34, 2, '#b4cfce', [side * (w / 2 + 0.3), 0, 0], 'x');
        cyl(h * 0.23, 2.8, '#577f84', [side * (w / 2 + 1), 0, 0], 'x');
        cyl(6, 4, '#ccdadd', [side * (w / 2 + 2), 0, 0], 'x');
        for (let n = 0; n < 6; n++) {
          const a = (n * Math.PI) / 3;
          cyl(3, 3, '#29484f', [side * (w / 2 + 2), Math.cos(a) * 12, Math.sin(a) * 12], 'x');
        }
      }
      for (let n = 0; n < 32; n++) {
        const a = (n * Math.PI) / 16;
        const tread = box(
          [w + 1, 2.5, 3.3],
          '#31464a',
          [0, Math.cos(a) * (h / 2 - 0.1), Math.sin(a) * (h / 2 - 0.1)],
          0.6,
        );
        tread.rotation.x = a;
      }
      break;
    }
    case 'motor':
      cyl(11, 31, def.color, [8, 0, 0], 'x');
      box([21, 24, 24], '#d0b478', [-17, 0, 0], 2);
      cyl(2, 18, '#b9c2c5', [-w / 2 - 9, 0, 0], 'x');
      box([3, 9, 14], '#263f44', [w / 2, 0, 0]);
      break;
    case 'motorMount':
      box([w, 3, d], def.color, [0, h / 2 - 1.5, 0]);
      box([3, h, d], def.color, [-w / 2 + 1.5, 0, 0]);
      break;
    case 'caster':
      box([32, 3, 32], '#b1c2c3', [0, h / 2 - 1.5, 0], 2);
      cyl(10, 10, '#a1b6bb', [0, 17, 0]);
      box([3, 23, 19], '#a1b6bb', [-11, -2, 0]);
      box([3, 23, 19], '#a1b6bb', [11, -2, 0]);
      cyl(12, 17, '#334a50', [0, -h / 2 + 12, 0], 'x');
      cyl(4, 24, '#bcc9ca', [0, -h / 2 + 12, 0], 'x');
      break;
    case 'battery':
      box([w, h, d], def.color, [0, 0, 0], 5);
      box([w + 1, 2, d * 0.3], '#25363a', [0, h / 2 + 0.4, 0]);
      box([w * 0.7, 0.5, 22], '#e1e7d9', [0, h / 2 + 0.5, -21], 1);
      box([9, 6, 6], '#d05845', [14, 0, -d / 2 - 2]);
      box([9, 6, 6], '#222f36', [-14, 0, -d / 2 - 2]);
      break;
    case 'holder':
      box([w, 3, d], def.color, [0, -h / 2 + 1.5, 0], 2);
      for (const x of [-1, 1]) box([3, h, d], def.color, [x * (w / 2 - 1.5), 0, 0], 1);
      break;
    case 'controller':
    case 'driver':
    case 'converter':
      board();
      if (def.geometry === 'controller') {
        box([16, 7, 12], '#bac9c7', [w / 2 - 10, 0, 0]);
        box([16, 6, 10], '#3a4a4d', [-w / 2 + 10, 0, d / 2 - 7]);
      }
      if (def.geometry === 'driver') {
        for (let n = 0; n < 5; n++) box([16, 6, 1.5], '#364a50', [0, 4, -5 + n * 2.5]);
        for (const x of [-1, 1]) box([10, 7, 10], '#70a197', [x * (w / 2 - 6), 0, 0]);
      }
      if (def.geometry === 'converter') {
        cyl(6, 7, '#c3a45f', [-7, 1, 0]);
        cyl(4, 9, '#3d525b', [8, 2, 0]);
      }
      break;
    case 'camera':
      box([w, h, 2], def.color, [0, 0, -d / 2 + 1], 1);
      box([20, 20, 8], '#31484b', [0, 0, -3], 2);
      cyl(10, 12, '#22343c', [0, 0, 5], 'z');
      cyl(7, 1, '#162c37', [0, 0, 11.5], 'z');
      cyl(4.6, 1.2, '#27608a', [0, 0, 12], 'z');
      cyl(1.5, 1.3, '#74b7b8', [-2, 2, 12.1], 'z');
      for (const x of [-14, 14]) for (const y of [-10, 10]) cyl(1.8, 2, '#c3b78d', [x, y, -8], 'z');
      break;
    case 'cameraMount':
      box([w, 3, d], def.color, [0, -h / 2 + 1.5, 0], 1);
      for (const x of [-1, 1]) box([3, h, 16], def.color, [x * (w / 2 - 1.5), 0, 3], 1);
      for (const x of [-1, 1]) cyl(4, 4, '#415e64', [x * (w / 2 + 1), 8, 3], 'x');
      break;
    case 'sensor':
      box([w, h, 2], def.color, [0, 0, -d / 2 + 1], 1);
      for (const x of [-13, 13]) {
        cyl(8, 14, '#b9c8c8', [x, 0, 0], 'z');
        cyl(6.2, 1, '#485e63', [x, 0, 7.4], 'z');
        cyl(4.8, 1.1, '#6c8286', [x, 0, 7.6], 'z');
      }
      break;
    case 'sensorMount':
      box([w, 3, d], def.color, [0, -h / 2 + 1.5, 0]);
      box([w, h, 3], def.color, [0, 0, -d / 2]);
      break;
    case 'switch':
      box([w, h, d], def.color, [0, 0, 0], 2);
      box([w - 5, 3, d - 6], '#c7624b', [0, h / 2, 0], 1);
      box([1, 0.5, 4], '#f0e3cd', [0, h / 2 + 1.6, -4]);
      break;
    default:
      break;
  }
  addContactGeometry(g, def);
  g.scale.setScalar(0.001);
  return g;
}
