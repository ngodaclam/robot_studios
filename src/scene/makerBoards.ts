import * as THREE from 'three';
import type { PartDefinition } from '../domain/schema';
import { partContacts, type Point3 } from '../domain/contacts';

function solid(g: THREE.Group, size: Point3, color: string, pos: Point3, metalness = 0.15) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.48 }),
  );
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
function cylinder(g: THREE.Group, radius: number, height: number, color: string, pos: Point3) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 16),
    new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.4 }),
  );
  mesh.position.set(...pos);
  mesh.castShadow = true;
  g.add(mesh);
  return mesh;
}
function lettering(
  g: THREE.Group,
  text: string,
  pos: Point3,
  width: number,
  height = 2.5,
  color = '#e7eeec',
) {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 58px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 48);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  label.rotation.x = -Math.PI / 2;
  label.position.set(...pos);
  g.add(label);
}

export function makerBoard(def: PartDefinition): THREE.Group | null {
  if (!['mke-m17', 'mke-b01', 'mke-k01'].includes(def.id)) return null;
  const g = new THREE.Group();
  const [w, h, d] = def.dimensionsMm;
  const top = -h / 2 + 2;
  solid(g, [w, 1.6, d], def.id === 'mke-k01' ? '#213d47' : '#08799b', [0, top - 0.8, 0]);
  for (const x of [-w / 2 + 2.5, w / 2 - 2.5])
    for (const z of [-d / 2 + 2.5, d / 2 - 2.5]) {
      cylinder(g, 1.7, 0.2, '#c9b984', [x, top + 0.1, z]);
      cylinder(g, 0.9, 0.3, '#234853', [x, top + 0.2, z]);
    }
  if (def.id === 'mke-m17') {
    for (const x of [-w * 0.28, w * 0.28]) {
      solid(g, [7, 2, 9], '#25333b', [x, top + 1, -4]);
      for (const z of [-3, -1, 1, 3])
        for (const side of [-1, 1])
          solid(g, [1.6, 0.5, 0.7], '#ccd1c3', [x + side * 4, top + 0.5, -4 + z], 0.8);
      lettering(g, 'L9110', [x, top + 2.1, -4], 6, 1.4);
    }
    for (const x of [-3.7, 3.7]) {
      cylinder(g, 3.2, 9, '#bcc2c4', [x, top + 4.5, -3]);
      solid(g, [4.5, 0.2, 0.5], '#4b5b62', [x, top + 9.1, -3]);
    }
    solid(g, [8, 1.5, 8], '#202d35', [0, top + 0.9, 8]);
    solid(g, [5, 2, 4], '#b9c4c6', [-4, top + 1.2, d / 2 - 4]);
    cylinder(g, 1.4, 1.4, '#1c292f', [-4, top + 3, d / 2 - 4]);
    solid(g, [3, 4, 4], '#2b3843', [w / 2 - 5, top + 2, d / 2 - 5]);
    solid(g, [5.5, 7, 12], '#dedbd0', [-w / 2 + 3.5, top + 3.5, 5]);
    lettering(g, 'BLE', [-w / 2 + 4, top + 0.2, 14], 5, 1.5);
    lettering(g, 'I2C', [w / 2 - 4, top + 0.2, 10], 6, 2);
    lettering(g, 'MKE-M17', [0, top + 0.2, d / 2 - 10], 17, 2.5);
    for (const contact of partContacts(def).filter((c) => c.kind === 'screw'))
      lettering(
        g,
        contact.label,
        [contact.position[0], 6.1, -d / 2 + 6.3],
        w / 7 - 0.3,
        1.8,
        '#f0f6e9',
      );
  }
  if (def.id === 'mke-b01') {
    for (const x of [-10, 10]) {
      solid(g, [2.4, 4, 46], '#182c35', [x, top + 2, 0]);
      for (let n = 0; n < 22; n++)
        solid(g, [1, 0.15, 1], '#53656a', [x, top + 4.1, (n - 10.5) * 2.1]);
    }
    solid(g, [11, 9, 12], '#202e37', [w / 2 - 7, top + 4.5, -d / 2 + 3]);
    const plug = cylinder(g, 3.1, 13, '#344149', [w / 2 - 7, -0.5, -d / 2 - 6.5]);
    plug.rotation.x = Math.PI / 2;
    for (const z of [-8, 4]) cylinder(g, 3, 6, '#b7c0c2', [1.5, top + 3, z]);
    solid(g, [8, 4, 8], '#47515a', [1, top + 2, -18]);
    lettering(g, '470', [1, top + 4.1, -18], 6, 2);
    lettering(g, 'MKE-B01', [1, top + 0.1, 15], 14, 3);
    lettering(g, 'USB ↓', [1, top + 0.1, d / 2 - 4], 12, 2.5);
    lettering(g, 'I2C', [-w / 2 + 15, top + 0.1, -d / 2 + 16], 11, 2);
    for (const io of ['10', '11']) {
      const c = partContacts(def).find((c) => c.id === `gpio-${io}-SIG`)!;
      lettering(g, io, [c.position[0] + 3.5, top + 0.2, c.position[2]], 3, 1.6);
    }
  }
  if (def.id === 'mke-k01') {
    solid(g, [w * 0.67, 3, d * 0.43], '#a9b9bd', [0, top + 1.5, -d * 0.13]);
    lettering(g, 'ESP32-S3', [0, top + 3.1, -d * 0.13], w * 0.55, 3);
    solid(g, [w * 0.66, 0.3, 7], '#1f2b32', [0, top + 0.3, -d / 2 + 4]);
    for (let n = 0; n < 5; n++)
      solid(g, [1, 0.1, 5], '#b69b61', [-6 + n * 3, top + 0.5, -d / 2 + 4]);
    for (const x of [-5, 5]) solid(g, [7.5, 3.4, 6], '#b8c4c7', [x, top + 1.7, d / 2 - 2]);
    for (const x of [-10, 10])
      for (let n = 0; n < 22; n++) {
        const z = (n - 10.5) * 2.1;
        solid(g, [2.4, 2, 2.4], '#21333c', [x, -h / 2, z]);
        solid(g, [0.55, 3, 0.55], '#c2a65e', [x, -h / 2 - 1.5, z], 0.8);
      }
  }
  return g;
}

export function addContactGeometry(g: THREE.Group, def: PartDefinition) {
  for (const contact of partContacts(def)) {
    if (contact.kind === 'stack' || contact.kind === 'dc') continue;
    const node = new THREE.Group();
    node.position.set(...contact.position);
    node.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...contact.normal),
    );
    node.userData.contactId = contact.id;
    if (contact.kind === 'screw') {
      // Wire opening faces the back edge; the screw is on the top surface.
      solid(node, [def.dimensionsMm[0] / 7 - 0.1, 8, 10], '#4b9667', [0, -4, 2]);
      cylinder(node, 1.45, 0.3, '#283c40', [0, 0, 0]);
      const screw = cylinder(node, 1.7, 0.6, '#c3cac4', [0, -4, 6.6]);
      screw.rotation.x = Math.PI / 2;
      solid(node, [2.5, 0.6, 0.2], '#566668', [0, -4, 7]);
    } else if (contact.kind === 'battery') {
      if (def.id === 'battery-holder') solid(node, [7, 0.5, 10], '#c8c2a5', [0, -0.25, 0], 0.8);
      else cylinder(node, contact.id === 'positive' ? 2.8 : 6, 0.3, contact.color, [0, 0, 0]);
    } else if (contact.kind === 'tab') {
      solid(node, [2.2, 5, 0.5], contact.color, [0, -2.5, 0], 0.8);
      cylinder(node, 0.8, 0.4, '#c9d2cb', [0, 0, 0]);
    } else {
      const socket = contact.kind === 'socket';
      solid(node, [2.5, socket ? 7 : 2.4, socket ? 5 : 2.5], contact.color, [
        0,
        socket ? -3.5 : -4,
        0,
      ]);
      if (socket) solid(node, [1.7, 0.2, 2.5], '#a5aaa5', [0, -0.1, 0]);
      solid(node, [0.6, socket ? 2 : 4, 0.6], '#cdb274', [0, -1.8, 0], 0.8);
    }
    g.add(node);
  }
}
