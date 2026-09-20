import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { RobotProject } from '../domain/schema';
import {
  readSonar,
  roomWalls,
  sonarRange,
  type SimConfig,
  type SimState,
} from '../domain/simulation';
import { createPartGeometry } from './geometry';
import type { Expression } from '../domain/expressions';
import type { FaceUpdater } from './phoneScreen';

export function SimulationViewport(props: {
  project: RobotProject;
  state: SimState;
  config: SimConfig;
  follow: boolean;
  expression: Expression;
}) {
  const host = useRef<HTMLDivElement>(null),
    latest = useRef(props);
  latest.current = props;
  const [error, setError] = useState('');
  const structure = JSON.stringify([
    props.project.definitions,
    props.project.instances.map((i) => [i.id, i.definitionId, i.positionMm, i.rotationDeg]),
    props.config.obstacles,
  ]);
  useEffect(() => {
    const target = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setError('Không mở được WebGL. Các số đo và bản đồ 2D vẫn có thể dùng.');
      return;
    }
    setError('');
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor('#eff5f4');
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute(
      'aria-label',
      'Phòng mô phỏng 3D và Robot 02 đang chuyển động',
    );
    target.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#ffffff', '#8ea9a3', 3));
    const light = new THREE.DirectionalLight('#ffffff', 3);
    light.position.set(2, 4, 1);
    scene.add(light);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 30);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 0.25;
    controls.maxDistance = 6;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 3.1),
      new THREE.MeshStandardMaterial({ color: '#e1ebe7', roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    scene.add(floor);
    const grid = new THREE.GridHelper(3, 30, '#91b2a4', '#c1d3ca');
    grid.position.y = 0.001;
    scene.add(grid);
    for (const [index, b] of [...latest.current.config.obstacles, ...roomWalls()].entries()) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.width, b.height, b.depth),
        new THREE.MeshStandardMaterial({
          color:
            index < latest.current.config.obstacles.length
              ? ['#c4a777', '#b4c3ca', '#a8bfb1'][index % 3]
              : '#b9cdca',
          roughness: 0.8,
        }),
      );
      mesh.position.set(b.x, b.height / 2, b.z);
      scene.add(mesh);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: '#839b96', transparent: true, opacity: 0.4 }),
      );
      mesh.add(edges);
    }
    const faceUpdates: FaceUpdater[] = [];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const robot = new THREE.Group(),
      wheels: { group: THREE.Group; left: boolean; rotation: number }[] = [];
    for (const part of latest.current.project.instances) {
      const def = latest.current.project.definitions.find((d) => d.id === part.definitionId)!;
      if (
        def.geometry === 'accessory' ||
        def.placement === 'offboard' ||
        def.placement === 'planned'
      )
        continue;
      const root = createPartGeometry(def);
      root.traverse((child) => {
        if (child.userData.updateFace) faceUpdates.push(child.userData.updateFace as FaceUpdater);
      });
      root.position.set(...(part.positionMm.map((v) => v / 1000) as [number, number, number]));
      root.rotation.set(
        ...(part.rotationDeg.map(THREE.MathUtils.degToRad) as [number, number, number]),
      );
      robot.add(root);
      if (def.geometry === 'wheel')
        wheels.push({ group: root, left: part.positionMm[0] < 0, rotation: root.rotation.x });
    }
    scene.add(robot);
    const fanGeometry = new THREE.BufferGeometry();
    fanGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 9), 3));
    const fanMaterial = new THREE.MeshBasicMaterial({
      color: '#30a491',
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fan = new THREE.Mesh(fanGeometry, fanMaterial);
    scene.add(fan);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3));
    trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: '#257d6d' }));
    trail.frustumCulled = false;
    scene.add(trail);
    const resize = new ResizeObserver(() => {
      const r = target.getBoundingClientRect();
      renderer.setSize(r.width, r.height);
      camera.aspect = r.width / Math.max(1, r.height);
      camera.updateProjectionMatrix();
    });
    resize.observe(target);
    let frame = 0,
      lastFollow: boolean | null = null,
      lastPosition = new THREE.Vector3();
    const render = (now: number) => {
      const { state, config, follow, expression } = latest.current;
      faceUpdates.forEach((update) => update(now, expression, reducedMotion));
      target.dataset.expression = expression;
      robot.position.set(state.x, 0, state.z);
      robot.rotation.y = state.yaw;
      for (const w of wheels)
        w.group.rotation.x = w.rotation + (w.left ? state.leftAngle : state.rightAngle);
      const targetPosition = new THREE.Vector3(state.x, 0.07, state.z);
      if (lastFollow !== follow) {
        controls.target.copy(follow ? targetPosition : new THREE.Vector3(0, 0, 0));
        camera.position.copy(
          follow
            ? targetPosition.clone().add(new THREE.Vector3(0.72, 0.6, -0.88))
            : new THREE.Vector3(2.65, 3, 2.65),
        );
        lastPosition.copy(targetPosition);
        lastFollow = follow;
      }
      if (follow) {
        const delta = targetPosition.clone().sub(lastPosition);
        controls.target.add(delta);
        camera.position.add(delta);
        lastPosition.copy(targetPosition);
      }
      const sonar = readSonar(state, config.obstacles, config.sensor),
        length = sonar.distance ?? sonarRange.max;
      fan.visible = sonar.valid;
      fanMaterial.color.set(length < 0.3 ? '#d39a42' : '#30a491');
      const positions = fanGeoPositions(fanGeometry);
      for (let i = 0; i < 10; i++) {
        const a = state.yaw + (i / 10 - 0.5) * sonarRange.angle,
          b = state.yaw + ((i + 1) / 10 - 0.5) * sonarRange.angle;
        positions.setXYZ(i * 3, sonar.origin[0], 0.094, sonar.origin[1]);
        positions.setXYZ(
          i * 3 + 1,
          sonar.origin[0] + Math.sin(a) * length,
          0.094,
          sonar.origin[1] + Math.cos(a) * length,
        );
        positions.setXYZ(
          i * 3 + 2,
          sonar.origin[0] + Math.sin(b) * length,
          0.094,
          sonar.origin[1] + Math.cos(b) * length,
        );
      }
      positions.needsUpdate = true;
      fan.frustumCulled = false;
      const path = trailGeo.attributes.position;
      state.trail.forEach(([x, z], i) => path.setXYZ(i, x, 0.004, z));
      path.needsUpdate = true;
      trailGeo.setDrawRange(0, state.trail.length);
      controls.update();
      renderer.render(scene, camera);
      target.dataset.rendered = 'true';
      frame = requestAnimationFrame(render);
    };
    const lost = (event: Event) => {
      event.preventDefault();
      setError('WebGL bị gián đoạn; tải lại để phục hồi cảnh 3D.');
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            if ('map' in m && m.map instanceof THREE.Texture) m.map.dispose();
            m.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [structure]);
  return (
    <div className="simulation-viewport" ref={host} data-testid="simulation-viewport">
      {error && (
        <p className="webgl-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
function fanGeoPositions(geometry: THREE.BufferGeometry) {
  return geometry.attributes.position;
}
