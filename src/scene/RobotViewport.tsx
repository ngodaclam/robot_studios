import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { RobotProject } from '../domain/schema';
import { displayPosition } from '../domain/project';
import { createPartGeometry } from './geometry';
import { robotWires, wireBundle, type WireBundle } from '../domain/wiring';
import { harnessPoints } from './harness';
import { defaultFace } from '../domain/expressions';
import type { FaceUpdater } from './phoneScreen';
export type View = 'perspective' | 'front' | 'side' | 'top' | 'face';
interface Props {
  project: RobotProject;
  selected: string | null;
  onSelect: (id: string | null) => void;
  explode: number;
  isolate: string | null;
  view: View;
  fitToken: number;
  grid: boolean;
  lines: boolean;
  showWires?: boolean;
  selectedWire?: string | null;
  wireBundleFilter?: WireBundle | 'all';
  wireFocus?: boolean;
  onSelectWire?: (id: string) => void;
}
export function RobotViewport(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const endpointLabels = useRef<(HTMLButtonElement | null)[]>([]);
  const endpointLeaders = useRef<(SVGLineElement | null)[]>([]);
  const latest = useRef(props);
  latest.current = props;
  const [hover, setHover] = useState<{ name: string; x: number; y: number } | null>(null);
  const [error, setError] = useState('');
  const structure = JSON.stringify([
    props.project.definitions,
    props.project.instances.map(({ visible: _, ...i }) => i),
  ]);
  useEffect(() => {
    const host = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(
        'Không thể khởi tạo WebGL. Hãy bật tăng tốc đồ họa hoặc mở bằng trình duyệt hỗ trợ WebGL. BOM và thông tin linh kiện vẫn dùng được.',
      );
      return;
    }
    setError('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute(
      'aria-label',
      'Mô hình robot 3D. Kéo để xoay, chuột phải để dịch chuyển, cuộn để thu phóng.',
    );
    renderer.domElement.setAttribute('tabindex', '0');
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.001, 50);
    camera.position.set(0.46, 0.39, 0.56);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 0.05;
    controls.maxDistance = 3;
    controls.maxPolarAngle = Math.PI * 0.93;
    controls.target.set(0, 0.075, 0);
    scene.add(new THREE.HemisphereLight('#ffffff', '#93a8aa', 2.4));
    const key = new THREE.DirectionalLight('#ffffff', 4);
    key.position.set(0.3, 0.7, 0.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -0.8;
    key.shadow.camera.right = 0.8;
    key.shadow.camera.top = 0.8;
    key.shadow.camera.bottom = -0.8;
    key.shadow.camera.near = 0.01;
    key.shadow.camera.far = 3;
    key.shadow.normalBias = 0.001;
    key.shadow.bias = -0.0001;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#b6e3ea', 2);
    fill.position.set(-0.6, 0.3, -0.5);
    scene.add(fill);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.ShadowMaterial({ opacity: 0.12 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.003;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(1.8, 60, '#c0d3d4', '#d8e2e2');
    grid.position.y = -0.002;
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.4;
    scene.add(grid);
    const roots = new Map<string, THREE.Group>();
    const faceUpdates: FaceUpdater[] = [];
    let phoneRoot: THREE.Group | undefined;
    const lines = new Map<string, THREE.Line>();
    const defs = new Map(latest.current.project.definitions.map((d) => [d.id, d]));
    for (const i of latest.current.project.instances) {
      const def = defs.get(i.definitionId)!;
      if (def.geometry === 'accessory') continue;
      const root = createPartGeometry(def);
      root.name = i.id;
      if (def.geometry === 'phone') phoneRoot = root;
      root.position.set(...displayPosition(i, 0));
      root.rotation.set(
        ...(i.rotationDeg.map(THREE.MathUtils.degToRad) as [number, number, number]),
      );
      root.traverse((child) => {
        child.userData.instanceId = i.id;
        if (child.userData.updateFace) faceUpdates.push(child.userData.updateFace as FaceUpdater);
      });
      scene.add(root);
      roots.set(i.id, root);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([root.position.clone(), root.position.clone()]),
        new THREE.LineDashedMaterial({
          color: '#8ca8af',
          dashSize: 0.006,
          gapSize: 0.004,
          transparent: true,
          opacity: 0.5,
        }),
      );
      scene.add(line);
      lines.set(i.id, line);
    }
    const endpointMarkers = [0, 1].map(() => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.0018, 12, 8),
        new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false }),
      );
      marker.renderOrder = 10;
      marker.visible = false;
      scene.add(marker);
      return marker;
    });
    const selectBox = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#078994'));
    const harness = robotWires(latest.current.project).map((wire, index) => {
      const options = {
        color: wire.color,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      };
      const cable =
        wire.medium === 'radio' || wire.medium === 'internal'
          ? new THREE.Line(
              new THREE.BufferGeometry(),
              new THREE.LineDashedMaterial({
                ...options,
                dashSize: wire.medium === 'internal' ? 0.0015 : 0.005,
                gapSize: wire.medium === 'internal' ? 0.001 : 0.004,
              }),
            )
          : new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial(options));
      const pickCable = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
      pickCable.visible = false;
      pickCable.userData.wireId = wire.id;
      scene.add(pickCable);
      const material = cable.material;
      cable.renderOrder = 2;
      cable.userData.wireId = wire.id;
      cable.visible = false;
      scene.add(cable);
      const sleeves = [wire.from, wire.to].map((end) => {
        const kind = end.contact?.kind;
        const housing = new THREE.Mesh(
          kind === 'pin'
            ? new THREE.BoxGeometry(0.0023, 0.0045, 0.0023)
            : new THREE.CylinderGeometry(0.0007, 0.001, 0.003, 8),
          new THREE.MeshStandardMaterial({
            color: kind === 'socket' ? '#ece8dd' : '#28383f',
            roughness: 0.7,
          }),
        );
        housing.visible = false;
        scene.add(housing);
        return housing;
      });
      return { wire, index, cable, pickCable, material, sleeves, key: '' };
    });
    scene.add(selectBox);
    selectBox.visible = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lastFit = '',
      frame = 0,
      lastTime = performance.now(),
      fitPending = true,
      dragged = false;
    const desiredPosition = new THREE.Vector3();
    const desiredTarget = new THREE.Vector3();
    let tween = 0;
    const fit = () => {
      const p = latest.current;
      const box = new THREE.Box3();
      const activeWires = harness.filter(
        ({ wire }) =>
          (!p.selectedWire || p.selectedWire === wire.id) &&
          (!p.wireBundleFilter ||
            p.wireBundleFilter === 'all' ||
            wireBundle(wire) === p.wireBundleFilter),
      );
      const focusParts = new Set(
        activeWires
          .filter(
            ({ wire }) => p.selectedWire || p.wireBundleFilter !== 'all' || wire.medium !== 'radio',
          )
          .flatMap(({ wire }) => [wire.from.instanceId, wire.to.instanceId]),
      );
      for (const [id, root] of roots) {
        if (!root.visible || (p.showWires && p.wireFocus && !focusParts.has(id))) continue;
        const part = p.project.instances.find((i) => i.id === id)!;
        const b = new THREE.Box3().setFromObject(root);
        const offset = new THREE.Vector3(...displayPosition(part, p.explode)).sub(root.position);
        b.translate(offset);
        box.union(b);
      }
      if (p.showWires && p.wireFocus) {
        for (const item of activeWires) {
          if (
            item.cable.visible &&
            (item.wire.medium !== 'radio' || p.selectedWire || p.wireBundleFilter !== 'all')
          )
            box.expandByObject(item.cable);
        }
      }
      if (box.isEmpty()) return;
      box.getCenter(desiredTarget);
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.length() / 2, 0.035);
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const distance =
        (radius / Math.sin(Math.min(vFov, hFov) / 2)) *
        (p.showWires && p.wireFocus
          ? p.wireBundleFilter === 'all' && !p.selectedWire
            ? 0.9
            : 0.98
          : 1.22);
      const direction =
        p.view === 'face' && phoneRoot
          ? new THREE.Vector3(0, 0, -1).applyQuaternion(phoneRoot.quaternion)
          : p.view === 'front'
            ? new THREE.Vector3(0, 0.025, 1)
            : p.view === 'side'
              ? new THREE.Vector3(1, 0.025, 0)
              : p.view === 'top'
                ? new THREE.Vector3(0, 1, 0.001)
                : new THREE.Vector3(
                    p.showWires && p.wireFocus ? 0.35 : 1,
                    p.showWires && p.wireFocus ? 1.9 : 0.82,
                    1.25,
                  );
      desiredPosition.copy(desiredTarget).add(direction.normalize().multiplyScalar(distance));
      tween = 1;
    };
    const observer = new ResizeObserver(() => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      fitPending = true;
    });
    observer.observe(host);
    const pointer = new THREE.Vector2(),
      raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.002;
    let down: { x: number; y: number; id: number } | null = null;
    const activePointers = new Set<number>();
    const hit = (event: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer.set(
        ((event.clientX - r.left) / r.width) * 2 - 1,
        (-(event.clientY - r.top) / r.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const objects: THREE.Object3D[] = [
        ...harness
          .filter((h) => h.cable.visible)
          .map((h) => (h.wire.medium === 'radio' ? h.cable : h.pickCable)),
        ...[...roots.values()].filter((r) => r.visible && !r.userData.ghost),
      ];
      const object = raycaster.intersectObjects(objects, true)[0]?.object;
      if (import.meta.env.DEV)
        host.dataset.lastPick = JSON.stringify({
          x: event.clientX - r.left,
          y: event.clientY - r.top,
          wire: object?.userData.wireId,
          part: object?.userData.instanceId,
        });
      return object?.userData as { instanceId?: string; wireId?: string } | undefined;
    };
    const pointerdown = (e: PointerEvent) => {
      activePointers.add(e.pointerId);
      if (activePointers.size > 1) dragged = true;
      else {
        down = { x: e.clientX, y: e.clientY, id: e.pointerId };
        dragged = false;
      }
      tween = 0;
      setHover(null);
    };
    const pointermove = (e: PointerEvent) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) dragged = true;
      if (activePointers.size) return;
      const picked = hit(e);
      const id = picked?.instanceId;
      const pickedWire = harness.find((h) => h.wire.id === picked?.wireId)?.wire;
      const rect = host.getBoundingClientRect();
      setHover(
        id || pickedWire
          ? {
              name: pickedWire
                ? `${pickedWire.id} · ${pickedWire.from.pin} → ${pickedWire.to.pin}`
                : latest.current.project.instances.find((i) => i.id === id)!.name,
              x: Math.min(e.clientX - rect.left + 14, rect.width - 205),
              y: e.clientY - rect.top + 14,
            }
          : null,
      );
      renderer.domElement.style.cursor = picked ? 'pointer' : 'grab';
    };
    const pointerup = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (down && down.id === e.pointerId && !dragged && e.button === 0) {
        const picked = hit(e);
        if (picked?.wireId) latest.current.onSelectWire?.(picked.wireId);
        else latest.current.onSelect(picked?.instanceId ?? null);
      }
      if (!activePointers.size) down = null;
    };
    const cancel = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      down = null;
      setHover(null);
    };
    const leave = () => setHover(null);
    const wheel = () => {
      tween = 0;
    };
    renderer.domElement.addEventListener('pointerdown', pointerdown);
    renderer.domElement.addEventListener('pointermove', pointermove);
    renderer.domElement.addEventListener('pointerup', pointerup);
    renderer.domElement.addEventListener('pointercancel', cancel);
    renderer.domElement.addEventListener('pointerleave', leave);
    renderer.domElement.addEventListener('wheel', wheel);
    const contextLost = (e: Event) => {
      e.preventDefault();
      setError(
        'Ngữ cảnh đồ họa bị gián đoạn. Tải lại trang để khôi phục; dữ liệu đã lưu vẫn được giữ.',
      );
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const p = latest.current;
      const face = p.project.design?.face?.expression ?? defaultFace.expression;
      faceUpdates.forEach((update) => update(now, face, reducedMotion));
      host.dataset.expression = face;
      const visibleAssemblies = new Set(
        p.project.assemblies.filter((a) => a.visible).map((a) => a.id),
      );
      const relevantWires = harness.filter(
        ({ wire }) =>
          (!p.selectedWire || wire.id === p.selectedWire) &&
          (!p.wireBundleFilter ||
            p.wireBundleFilter === 'all' ||
            wireBundle(wire) === p.wireBundleFilter),
      );
      const focusParts = new Set(
        relevantWires
          .filter(
            ({ wire }) => p.selectedWire || p.wireBundleFilter !== 'all' || wire.medium !== 'radio',
          )
          .flatMap(({ wire }) => [wire.from.instanceId, wire.to.instanceId]),
      );
      for (const i of p.project.instances) {
        const root = roots.get(i.id);
        if (!root) continue;
        root.visible = p.isolate
          ? p.isolate === i.id
          : i.visible && visibleAssemblies.has(i.assemblyId);
        const targetPosition = new THREE.Vector3(...displayPosition(i, p.explode));
        root.position.lerp(targetPosition, reducedMotion ? 1 : 1 - Math.exp(-dt * 13));
        if (root.position.distanceToSquared(targetPosition) < 1e-12)
          root.position.copy(targetPosition);
        const ghost = !!p.showWires && !!p.wireFocus && !focusParts.has(i.id);
        root.userData.ghost = ghost;
        root.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            obj.castShadow = !ghost;
            for (const mat of mats) {
              if (mat.userData.originalOpacity === undefined) {
                mat.userData.originalOpacity = mat.opacity;
                mat.userData.originalTransparent = mat.transparent;
                mat.userData.originalDepthWrite = mat.depthWrite;
              }
              mat.opacity = ghost ? 0.055 : mat.userData.originalOpacity;
              const transparent = ghost || mat.userData.originalTransparent;
              if (mat.transparent !== transparent) {
                mat.transparent = transparent;
                mat.needsUpdate = true;
              }
              mat.depthWrite = ghost ? false : mat.userData.originalDepthWrite;
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.emissive.set(p.selected === i.id ? '#087f8c' : '#000000');
                mat.emissiveIntensity = p.selected === i.id ? 0.27 : 0;
              }
            }
          }
        });
        const line = lines.get(i.id)!;
        line.visible = p.lines && p.explode > 0 && root.visible;
        const pos = line.geometry.attributes.position;
        const origin = displayPosition(i, 0);
        pos.setXYZ(0, ...origin);
        pos.setXYZ(1, ...(root.position.toArray() as [number, number, number]));
        pos.needsUpdate = true;
        line.computeLineDistances();
      }
      const key = `${p.view}|${p.fitToken}|${p.showWires}|${p.wireBundleFilter}|${p.wireFocus}|${p.selectedWire}|${p.isolate}|${p.project.instances.map((i) => i.visible).join('')}|${p.project.assemblies.map((a) => a.visible).join('')}`;
      endpointMarkers.forEach((m) => {
        m.visible = false;
      });
      endpointLabels.current.forEach((label) => {
        if (label) label.style.visibility = 'hidden';
      });
      endpointLeaders.current.forEach((line) => {
        if (line) line.style.visibility = 'hidden';
      });
      for (const item of harness) {
        const from = roots.get(item.wire.from.instanceId),
          to = roots.get(item.wire.to.instanceId);
        item.cable.visible =
          !!p.showWires &&
          !!from?.visible &&
          !!to?.visible &&
          (!p.wireBundleFilter ||
            p.wireBundleFilter === 'all' ||
            wireBundle(item.wire) === p.wireBundleFilter);
        item.sleeves.forEach((s) => {
          s.visible = false;
        });
        if (!item.cable.visible || !from || !to) continue;
        from.updateMatrixWorld(true);
        to.updateMatrixWorld(true);
        const a = from.localToWorld(new THREE.Vector3(...item.wire.from.anchorMm));
        const b = to.localToWorld(new THREE.Vector3(...item.wire.to.anchorMm));
        const selected = p.selectedWire === item.wire.id;
        [item.wire.from, item.wire.to].forEach((end, n) => {
          if (
            item.wire.medium !== 'wire' ||
            !end.contact ||
            end.contact.kind === 'screw' ||
            end.contact.kind === 'dc'
          )
            return;
          const root = n ? to : from;
          const normal = new THREE.Vector3(...end.contact.normal).transformDirection(
            root.matrixWorld,
          );
          const sleeve = item.sleeves[n];
          sleeve.position
            .copy(n ? b : a)
            .addScaledVector(normal, end.contact.kind === 'pin' ? 0.00225 : 0.0015);
          sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
          sleeve.visible = true;
        });
        item.material.opacity = p.selectedWire
          ? selected
            ? 1
            : 0.18
          : item.wire.medium === 'radio'
            ? 0.35
            : 0.8;
        const nextKey = [...a.toArray(), ...b.toArray(), selected ? 1 : 0]
          .map((v) => v.toFixed(5))
          .join(',');
        if (nextKey !== item.key) {
          const normalA = new THREE.Vector3(
            ...(item.wire.from.contact?.normal ?? [0, 1, 0]),
          ).transformDirection(from.matrixWorld);
          const normalB = new THREE.Vector3(
            ...(item.wire.to.contact?.normal ?? [0, 1, 0]),
          ).transformDirection(to.matrixWorld);
          const points = harnessPoints(item.wire, a, b, normalA, normalB);
          item.cable.geometry.dispose();
          const curve = new THREE.CatmullRomCurve3(points);
          item.pickCable.geometry.dispose();
          item.pickCable.geometry = new THREE.TubeGeometry(curve, 48, 0.0016, 5, false);
          if (item.cable instanceof THREE.Line) {
            item.cable.geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
            item.cable.computeLineDistances();
          } else {
            item.cable.geometry = new THREE.TubeGeometry(
              curve,
              64,
              item.wire.medium === 'contact' ? 0.00045 : selected ? 0.00085 : 0.00055,
              7,
              false,
            );
          }
          item.key = nextKey;
        }
        if (selected) {
          [a, b].forEach((point, n) => {
            endpointMarkers[n].position.copy(point);
            endpointMarkers[n].visible = true;
            endpointMarkers[n].material.color.set(item.wire.color);
          });
        }
      }
      if (fitPending || key !== lastFit) {
        fit();
        lastFit = key;
        fitPending = false;
      }
      if (tween > 0) {
        const alpha = reducedMotion ? 1 : 1 - Math.exp(-dt * 8);
        camera.position.lerp(desiredPosition, alpha);
        controls.target.lerp(desiredTarget, alpha);
        if (camera.position.distanceTo(desiredPosition) < 0.0001) tween = 0;
      }
      const selected = p.selected ? roots.get(p.selected) : null;
      selectBox.visible = !!selected?.visible && p.view !== 'face';
      if (selected?.visible) {
        selectBox.box.setFromObject(selected);
        selectBox.box.expandByScalar(0.003);
      }
      grid.visible = p.grid;
      controls.update();
      renderer.render(scene, camera);
      endpointMarkers.forEach((marker, n) => {
        const label = endpointLabels.current[n];
        if (!label || !marker.visible) return;
        const screen = marker.position.clone().project(camera);
        if (screen.z < -1 || screen.z > 1) return;
        const x = ((screen.x + 1) / 2) * host.clientWidth;
        const y = ((1 - screen.y) / 2) * host.clientHeight;
        label.style.left = `${Math.max(6, Math.min(host.clientWidth - label.offsetWidth - 6, x - (n === 0 ? label.offsetWidth + 8 : -8)))}px`;
        label.style.top = `${Math.max(6, Math.min(host.clientHeight - label.offsetHeight - 6, y + (n === 0 ? -label.offsetHeight - 10 : 10)))}px`;
        const previous = endpointLabels.current[0];
        if (n === 1 && previous?.style.visibility === 'visible') {
          const left = parseFloat(label.style.left),
            top = parseFloat(label.style.top);
          const priorLeft = parseFloat(previous.style.left),
            priorTop = parseFloat(previous.style.top);
          if (
            left < priorLeft + previous.offsetWidth + 6 &&
            left + label.offsetWidth + 6 > priorLeft &&
            top < priorTop + previous.offsetHeight + 6 &&
            top + label.offsetHeight + 6 > priorTop
          ) {
            const below = priorTop + previous.offsetHeight + 8;
            label.style.top = `${below + label.offsetHeight < host.clientHeight - 6 ? below : Math.max(6, priorTop - label.offsetHeight - 8)}px`;
          }
        }
        label.style.visibility = 'visible';
        const leader = endpointLeaders.current[n];
        if (leader) {
          leader.setAttribute('x1', String(x));
          leader.setAttribute('y1', String(y));
          leader.setAttribute(
            'x2',
            String(parseFloat(label.style.left) + (n === 0 ? label.offsetWidth : 0)),
          );
          leader.setAttribute(
            'y2',
            String(parseFloat(label.style.top) + (n === 0 ? label.offsetHeight : 0)),
          );
          leader.style.visibility = 'visible';
        }
      });
      if (import.meta.env.DEV) {
        host.dataset.partPositions = JSON.stringify(
          Object.fromEntries([...roots.entries()].map(([id, g]) => [id, g.position.toArray()])),
        );
        host.dataset.camera = JSON.stringify(camera.position.toArray());
        host.dataset.ghostParts = JSON.stringify(
          [...roots].filter(([, root]) => root.userData.ghost).map(([id]) => id),
        );
      }
      host.dataset.rendered = 'true';
      host.dataset.explode = String(p.explode);
      host.dataset.visibleParts = String([...roots.values()].filter((g) => g.visible).length);
      host.dataset.visibleWires = String(harness.filter((h) => h.cable.visible).length);
      host.dataset.selectedWire = p.selectedWire ?? '';
      host.dataset.wireFocus = String(!!p.showWires && !!p.wireFocus);
      host.dataset.wireBundle = p.wireBundleFilter ?? 'all';
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerdown);
      renderer.domElement.removeEventListener('pointermove', pointermove);
      renderer.domElement.removeEventListener('pointerup', pointerup);
      renderer.domElement.removeEventListener('pointercancel', cancel);
      renderer.domElement.removeEventListener('pointerleave', leave);
      renderer.domElement.removeEventListener('wheel', wheel);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
            if ('map' in mat && mat.map instanceof THREE.Texture) mat.map.dispose();
            mat.dispose();
          }
        }
      });
      key.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [structure]);
  const activeWire = props.showWires
    ? robotWires(props.project).find((w) => w.id === props.selectedWire)
    : undefined;
  return (
    <div className="viewport" ref={mount} data-testid="viewport">
      {activeWire && (
        <svg className="wire-leaders" aria-hidden="true">
          {[0, 1].map((n) => (
            <line
              key={n}
              ref={(node) => {
                endpointLeaders.current[n] = node;
              }}
              stroke={activeWire.color}
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          ))}
        </svg>
      )}
      {activeWire &&
        [activeWire.from, activeWire.to].map((end, n) => (
          <button
            className="wire-pin-label"
            key={`${activeWire.id}-${n}`}
            ref={(node) => {
              endpointLabels.current[n] = node;
            }}
            style={{ borderColor: activeWire.color, visibility: 'hidden' }}
            title={end.pin}
            onClick={() => props.onSelect(end.instanceId)}
          >
            <small>
              {n + 1} ·{' '}
              {end.instanceId === 'shield'
                ? 'MKE-B01'
                : end.instanceId === 'driver'
                  ? 'MKE-M17'
                  : end.instanceId === 'sonar'
                    ? 'MKE-S01'
                    : props.project.instances.find((i) => i.id === end.instanceId)?.name}
            </small>
            <strong>
              {end.pin === 'SDA / IO8' || end.pin === 'SCL / IO9'
                ? end.pin
                : (end.contact?.label ?? end.pin)}
            </strong>
          </button>
        ))}
      {hover && (
        <div className="model-tooltip" style={{ left: hover.x, top: hover.y }}>
          {hover.name}
        </div>
      )}
      {error && (
        <div className="webgl-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
