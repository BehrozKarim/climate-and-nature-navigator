import * as THREE from 'three';
import truckUrl from './assets/truck.webp';
import vesselUrl from './assets/vessel.webp';
import coastUrl from './assets/coast.webp';

export const journeyAssets = { truck: truckUrl, vessel: vesselUrl, coast: coastUrl };

export async function mountJourneyScene(host, initial) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'shipment-webgl';
  host.prepend(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-50, 50, 30, -30, .1, 30);
  camera.position.z = 12;
  const textureLoader = new THREE.TextureLoader();
  let textures;
  try {
    textures = await Promise.all([coastUrl, truckUrl, vesselUrl].map((url) => textureLoader.loadAsync(url)));
  } catch {
    renderer.dispose();
    canvas.remove();
    return null;
  }
  if (!host.isConnected) {
    textures.forEach((texture) => texture.dispose());
    renderer.dispose();
    canvas.remove();
    return null;
  }
  textures.forEach((texture) => { texture.colorSpace = THREE.SRGBColorSpace; });
  const geometry = new THREE.PlaneGeometry(1, 1);
  const backdrop = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: textures[0], depthWrite: false }));
  backdrop.position.z = -4;
  scene.add(backdrop);
  const truck = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: textures[1], transparent: true, alphaTest: .02, depthWrite: false }));
  const vessel = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: textures[2], transparent: true, alphaTest: .02, depthWrite: false }));
  truck.renderOrder = 4;
  vessel.renderOrder = 4;
  scene.add(truck, vessel);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 32, 4), new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { clock: { value: 0 }, strength: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv;uniform float clock;uniform float strength;void main(){float wave=sin(vUv.x*110.0+vUv.y*47.0-clock*0.6)*sin(vUv.y*77.0+clock*0.4);float light=smoothstep(0.75,1.0,wave)*0.16*strength;gl_FragColor=vec4(0.85,0.94,1.0,light);}',
  }));
  water.renderOrder = 2;
  scene.add(water);
  const wake = new THREE.Mesh(new THREE.CircleGeometry(1, 44), new THREE.MeshBasicMaterial({
    color: 0xf3f8ff, transparent: true, opacity: .19, depthWrite: false,
  }));
  wake.renderOrder = 3;
  scene.add(wake);

  let value = { ...initial };
  let current = Number(initial.progress) || 0;
  let height = 60;
  let frame;
  let previous = 0;
  let stopped = false;
  const setVisibility = () => {
    truck.visible = value.mode !== 'vessel';
    vessel.visible = value.mode === 'vessel';
    wake.visible = value.mode === 'vessel';
    water.material.uniforms.strength.value = value.mode === 'vessel' ? 1 : .25;
  };
  function position() {
    const vehicleWidth = value.mode === 'vessel' ? vessel.scale.x : truck.scale.x;
    const extent = 48 - vehicleWidth / 2;
    const x = -extent + current / 100 * extent * 2;
    truck.position.set(x, -.203 * height + 4.2, .1);
    vessel.position.set(x, -.393 * height + 4.8, .2);
    wake.position.set(x - 17, -.395 * height - .1, -.3);
    wake.scale.set(13, .9, 1);
  }
  function draw(time) {
    frame = undefined;
    if (stopped || document.hidden) return;
    const delta = previous ? Math.min(time - previous, 48) : 16;
    previous = time;
    const target = Number(value.progress) || 0;
    current = value.paused ? target : current + (target - current) * (1 - Math.exp(-delta / 180));
    if (Math.abs(target - current) < .02) current = target;
    position();
    water.material.uniforms.clock.value = value.paused ? 0 : time / 1000;
    renderer.render(scene, camera);
    if (!value.paused) frame = requestAnimationFrame(draw);
  }
  function requestDraw() {
    if (!frame && !stopped && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function resize() {
    const width = host.clientWidth;
    const pixelHeight = host.clientHeight;
    if (!width || !pixelHeight) return;
    height = 100 * pixelHeight / width;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    backdrop.scale.set(Math.max(100, height * 3), Math.max(height, 100 / 3), 1);
    const truckWidth = width < 400 ? 38 : 32;
    const shipWidth = width < 400 ? 46 : 39;
    truck.scale.set(truckWidth, truckWidth / 3, 1);
    vessel.scale.set(shipWidth, shipWidth / 3, 1);
    water.scale.set(100, height * .22, 1);
    water.position.set(0, -height * .39, -1);
    renderer.setSize(width, pixelHeight, false);
    position();
    requestDraw();
  }
  const observer = new ResizeObserver(resize);
  const visibility = () => {
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = undefined;
    } else {
      previous = 0;
      requestDraw();
    }
  };
  document.addEventListener('visibilitychange', visibility);
  observer.observe(host);
  setVisibility();
  resize();
  host.classList.add('webgl-ready');
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    host.classList.remove('webgl-ready');
    stopped = true;
    if (frame) cancelAnimationFrame(frame);
  });
  return {
    update(next) {
      value = { ...value, ...next };
      if (value.paused) current = Number(value.progress) || 0;
      setVisibility();
      requestDraw();
    },
    dispose() {
      stopped = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      textures.forEach((texture) => texture.dispose());
      geometry.dispose();
      backdrop.material.dispose();
      truck.material.dispose();
      vessel.material.dispose();
      water.geometry.dispose();
      water.material.dispose();
      wake.geometry.dispose();
      wake.material.dispose();
      renderer.dispose();
      canvas.remove();
      host.classList.remove('webgl-ready');
    },
  };
}
