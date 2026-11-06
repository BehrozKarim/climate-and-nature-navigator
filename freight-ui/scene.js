import * as THREE from 'three';
const roadId = 'road';
const seaId = 'vessel';

const color = {
  background: 0x18372b,
  grid: 0x254737,
  outline: 0x688d71,
  road: 0x395847,
  wheel: 0x172d24,
  hub: 0xa6b8a0,
  truck: 0x8ab478,
  trailer: 0xc8d9a4,
  water: 0x2b5c54,
  waterLine: 0x578877,
  amber: 0xe7af61,
  amberLight: 0xf4ce8e,
  teal: 0x69a7b5,
};

export function mountScene(container, missing, onInspect) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  } catch { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  container.prepend(canvas);
  container.classList.add('has-webgl');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(color.background);
  const camera = new THREE.OrthographicCamera(-5, 5, 2.5, -2.5, 0.1, 40);
  camera.position.set(4.6, 6.7, 12);
  camera.lookAt(0, 0.1, 0);
  scene.add(new THREE.HemisphereLight(0xdbeefe, 0x234359, 2.45));
  const light = new THREE.DirectionalLight(0xfff0d9, 2.35);
  light.position.set(-3, 8, 4);
  scene.add(light);

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = new Map();
  function solid(tint) {
    if (!materials.has(tint)) materials.set(tint, new THREE.MeshStandardMaterial({ color: tint, roughness: .82 }));
    return materials.get(tint);
  }
  function box(parent, w, h, d, x, y, z, tint) {
    const mesh = new THREE.Mesh(boxGeometry, solid(tint));
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function line(parent, points, tint, dashed = false) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const material = dashed
      ? new THREE.LineDashedMaterial({ color: tint, dashSize: .11, gapSize: .08 })
      : new THREE.LineBasicMaterial({ color: tint });
    const result = new THREE.Line(geometry, material);
    if (dashed) result.computeLineDistances();
    parent.add(result);
    return result;
  }
  function frame(parent, width, depth, y, tint, dashed = false) {
    const w = width / 2;
    const d = depth / 2;
    return line(parent, [[-w, y, -d], [w, y, -d], [w, y, d], [-w, y, d], [-w, y, -d]], tint, dashed);
  }

  for (let x = -8; x <= 8; x += .55) line(scene, [[x, -.19, -5], [x, -.19, 5]], color.grid);
  for (let z = -5; z <= 5; z += .55) line(scene, [[-8, -.19, z], [8, -.19, z]], color.grid);

  const road = new THREE.Group();
  const sea = new THREE.Group();
  road.position.set(-1.95, 0, .17);
  sea.position.set(1.95, 0, -.17);
  scene.add(road, sea);
  const roadPlate = box(road, 3.3, .17, 2.25, 0, -.08, 0, color.road);
  const seaPlate = box(sea, 3.3, .17, 2.25, 0, -.08, 0, color.water);
  roadPlate.userData.id = roadId;
  seaPlate.userData.id = seaId;
  const roadOutline = frame(road, 3.32, 2.27, .025, color.outline);
  const seaOutline = frame(sea, 3.32, 2.27, .025, missing ? color.amber : color.outline, missing);
  line(scene, [[-.27, .038, .17], [.29, .038, -.17]], color.outline, true);

  for (const z of [-.77, .77]) {
    line(road, [[-1.55, .035, z], [1.55, .035, z]], color.hub, true);
  }
  for (const z of [-.82, -.57, .58, .81]) {
    line(sea, [[-1.52, .032, z], [1.53, .032, z]], color.waterLine, true);
  }

  const truck = new THREE.Group();
  road.add(truck);
  box(truck, 2.06, .14, .76, .03, .23, 0, color.wheel);
  box(truck, 1.49, .62, .81, -.35, .62, 0, color.trailer);
  box(truck, .55, .58, .71, .76, .54, 0, color.truck);
  box(truck, .58, .13, .73, .76, .26, 0, color.truck);
  box(truck, .018, .24, .56, 1.045, .65, 0, color.road);
  box(truck, .26, .18, .012, .87, .65, .36, color.road);
  for (const z of [-.407, .407]) {
    box(truck, 1.41, .073, .015, -.35, .42, z, color.teal);
    for (const x of [-.88, -.58, .72]) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .115, 14), solid(color.wheel));
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, .17, z);
      truck.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.068, .068, .126, 12), solid(color.hub));
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(tire.position);
      truck.add(hub);
    }
  }

  const ship = new THREE.Group();
  sea.add(ship);
  const hull = new THREE.Shape();
  hull.moveTo(-1.18, -.38);
  hull.lineTo(.78, -.38);
  hull.lineTo(1.3, 0);
  hull.lineTo(.78, .38);
  hull.lineTo(-1.18, .38);
  hull.lineTo(-1.32, .24);
  hull.lineTo(-1.32, -.24);
  hull.closePath();
  const hullMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(hull, { depth: .23, bevelEnabled: false }), solid(missing ? color.amber : color.teal));
  hullMesh.rotation.x = -Math.PI / 2;
  hullMesh.position.y = .08;
  ship.add(hullMesh);
  const cargo = missing ? color.amberLight : color.trailer;
  box(ship, .41, .27, .60, -.88, .43, 0, cargo);
  box(ship, .32, .09, .52, -.9, .60, 0, color.road);
  box(ship, .08, .16, .07, -.94, .70, 0, cargo);
  for (const x of [-.4, -.02, .36, .73]) {
    box(ship, .30, .12, .53, x, .34, 0, cargo);
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function hit(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      2 * (event.clientX - rect.left) / rect.width - 1,
      1 - 2 * (event.clientY - rect.top) / rect.height,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects([roadPlate, seaPlate])[0]?.object.userData.id;
  }
  const paint = () => renderer.render(scene, camera);
  let hovered;
  function highlight(id) {
    if (id === hovered) return;
    hovered = id;
    roadOutline.material.color.setHex(id === roadId ? color.trailer : color.outline);
    seaOutline.material.color.setHex(id === seaId ? color.amberLight : missing ? color.amber : color.outline);
    canvas.style.cursor = id ? 'pointer' : '';
    paint();
  }
  const onMove = (event) => highlight(hit(event));
  const onLeave = () => highlight(undefined);
  const onClick = (event) => {
    const id = hit(event);
    if (id) onInspect(id);
  };
  const observer = new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    const aspect = width / height;
    const halfWidth = Math.max(4.1, 2.06 * aspect);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfWidth / aspect;
    camera.bottom = -camera.top;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    paint();
  });
  observer.observe(container);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('webglcontextlost', () => {
    container.classList.remove('has-webgl');
    canvas.hidden = true;
  });
  return () => {
    observer.disconnect();
    const geometries = new Set();
    const usedMaterials = new Set();
    scene.traverse(({ geometry, material }) => {
      if (geometry) geometries.add(geometry);
      if (material) usedMaterials.add(material);
    });
    geometries.forEach((geometry) => geometry.dispose());
    usedMaterials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    container.classList.remove('has-webgl');
  };
}
