/* NavMap: shared 3D map for the Climate and Nature Navigator design. Needs window.THREE (r150+). */
(function () {
  'use strict';
  var GEO = {
    sea: [[9.9,54.3],[11.0,54.3],[12.2,54.25],[13.2,54.35],[13.35,54.68],[13.7,54.55],[14.2,54.3],[15.5,54.25],[16.4,54.55],[17.0,54.7],[17.6,54.78],[18.35,54.84],[18.65,54.7],[18.85,54.6],[18.6,54.42],[19.3,54.38],[19.65,54.45],[19.95,54.65],[20.45,54.95],[20.95,55.25],[21.1,55.7],[21.05,56.1],[21.0,56.55],[21.25,56.95],[21.55,57.4],[22.0,57.6],[22.6,57.76],[23.1,57.4],[23.55,57.05],[24.1,57.05],[24.35,57.25],[24.35,57.85],[24.5,58.35],[23.75,58.45],[23.5,58.65],[23.45,58.95],[23.55,59.2],[24.05,59.35],[24.5,59.45],[24.85,59.5],[25.5,59.62],[26.2,59.6],[26.95,59.48],[27.6,59.42],[28.05,59.47],[28.3,59.72],[28.9,59.82],[29.6,59.9],[30.25,59.93],[29.9,60.13],[29.2,60.2],[28.65,60.35],[28.75,60.65],[28.2,60.55],[27.75,60.52],[27.2,60.55],[26.7,60.42],[26.15,60.38],[25.65,60.32],[25.2,60.22],[24.95,60.15],[24.6,60.12],[24.38,60.03],[24.1,60.0],[23.6,59.95],[23.2,59.87],[22.95,59.8],[22.65,59.92],[22.3,60.05],[21.9,60.22],[22.05,60.38],[21.92,60.5],[21.55,60.68],[21.4,60.85],[21.45,61.13],[21.48,61.38],[21.6,61.55],[21.4,61.85],[21.3,62.1],[21.35,62.3],[21.12,62.55],[21.25,62.85],[21.5,63.05],[21.2,63.25],[21.85,63.45],[22.35,63.6],[22.75,63.75],[23.15,63.88],[23.6,64.02],[24.05,64.2],[24.35,64.45],[24.45,64.7],[24.95,64.88],[25.4,65.02],[25.25,65.3],[25.15,65.55],[24.6,65.7],[24.15,65.82],[23.6,65.78],[22.9,65.75],[22.2,65.6],[21.65,65.4],[21.35,65.05],[21.3,64.75],[21.0,64.45],[20.6,64.05],[20.25,63.8],[19.7,63.55],[19.15,63.4],[18.7,63.2],[18.3,62.85],[17.95,62.6],[17.45,62.4],[17.35,62.0],[17.15,61.7],[17.15,61.3],[17.25,60.95],[17.25,60.65],[17.75,60.55],[18.4,60.35],[18.85,60.1],[19.1,59.8],[18.9,59.5],[18.65,59.3],[18.25,59.05],[17.9,58.88],[17.45,58.75],[16.95,58.6],[16.75,58.3],[16.7,57.9],[16.6,57.5],[16.45,57.2],[16.4,56.85],[16.25,56.6],[15.95,56.2],[15.6,56.15],[15.0,56.15],[14.7,56.05],[14.3,55.75],[14.2,55.45],[13.85,55.42],[13.4,55.33],[13.1,55.37],[12.95,55.55],[13.0,55.65],[12.9,55.85],[12.72,56.03],[12.55,56.15],[12.48,56.3],[12.8,56.45],[12.85,56.65],[12.6,56.85],[12.3,57.05],[12.05,57.35],[11.85,57.65],[11.65,58.0],[11.35,58.3],[11.2,58.65],[11.12,58.95],[10.75,59.15],[10.5,59.3],[9.9,59.2],[9.9,57.75],[10.6,57.76],[10.55,57.45],[10.4,57.15],[10.35,56.85],[10.25,56.6],[10.85,56.5],[10.9,56.3],[10.55,56.1],[10.25,56.15],[10.15,55.95],[9.9,55.8]],
    islands: [
      [[9.9,55.6],[10.45,55.6],[10.85,55.3],[10.7,55.05],[10.2,55.05],[9.9,55.25]],
      [[10.95,55.72],[11.35,55.98],[11.8,55.97],[12.3,56.12],[12.6,56.03],[12.6,55.7],[12.45,55.45],[12.2,55.25],[11.9,55.05],[11.6,55.1],[11.2,55.2],[10.95,55.45]],
      [[10.95,54.85],[11.5,54.65],[11.95,54.58],[12.15,54.85],[11.75,54.95],[11.3,54.95]],
      [[14.7,55.1],[14.85,55.28],[15.1,55.2],[15.15,55.07],[14.85,54.99]],
      [[16.38,56.2],[16.5,56.22],[16.75,56.7],[17.05,57.15],[17.08,57.35],[16.95,57.38],[16.6,56.9],[16.42,56.5]],
      [[18.1,57.25],[18.35,56.95],[18.6,57.15],[18.75,57.45],[19.05,57.82],[18.85,57.95],[18.6,57.85],[18.3,57.65],[18.12,57.45]],
      [[21.82,58.3],[22.0,58.55],[22.35,58.6],[22.8,58.62],[23.25,58.55],[23.3,58.43],[22.9,58.28],[22.45,58.1],[22.05,57.92],[21.95,58.12]],
      [[22.05,58.95],[22.3,59.05],[22.7,59.05],[23.0,58.88],[22.75,58.72],[22.4,58.72],[22.15,58.8]],
      [[19.6,60.08],[19.85,59.98],[20.3,60.05],[20.45,60.25],[20.3,60.42],[19.95,60.45],[19.6,60.3]],
      [[24.45,65.0],[24.85,64.95],[24.8,65.1],[24.5,65.1]]
    ],
    lakes: [
      [[30.0,60.65],[30.5,61.1],[31.0,61.4],[31.6,61.65],[31.6,60.2],[31.0,59.95],[30.55,60.1],[30.15,60.35]],
      [[27.55,61.2],[28.0,61.05],[28.5,61.12],[28.9,61.35],[29.15,61.75],[28.85,62.0],[28.5,62.25],[28.1,62.25],[27.85,61.95],[28.2,61.7],[27.8,61.5]],
      [[25.45,61.05],[25.65,61.0],[25.75,61.4],[25.85,61.8],[25.75,62.25],[25.6,62.25],[25.55,61.8],[25.5,61.4]],
      [[22.2,61.08],[22.33,61.08],[22.37,61.0],[22.3,60.95],[22.21,60.98]],
      [[26.6,64.25],[27.0,64.2],[27.6,64.35],[27.45,64.5],[26.9,64.45]],
      [[12.4,58.75],[12.75,58.45],[13.2,58.55],[13.6,58.55],[14.15,58.75],[14.0,59.1],[13.5,59.35],[13.0,59.35],[12.65,59.2]],
      [[14.15,57.85],[14.4,57.8],[14.6,58.15],[14.85,58.6],[14.65,58.85],[14.45,58.7],[14.3,58.3]],
      [[16.0,59.4],[16.6,59.35],[17.2,59.25],[17.75,59.33],[17.5,59.55],[16.8,59.55],[16.3,59.6]],
      [[27.05,58.85],[27.5,59.0],[28.05,58.95],[27.9,58.55],[27.65,58.3],[27.55,57.95],[27.3,58.05],[27.25,58.45]],
      [[13.45,55.86],[13.58,55.85],[13.6,55.92],[13.47,55.93]],
      [[14.6,60.85],[15.0,60.8],[15.0,61.05],[14.7,61.05]],
      [[14.3,63.05],[14.75,63.0],[14.7,63.35],[14.4,63.3]]
    ],
    borders: [
      [[27.75,60.52],[28.35,60.85],[29.1,61.2],[29.85,61.6],[30.6,62.05],[31.4,62.6],[31.55,62.9],[31.2,63.25],[30.5,63.5],[29.98,63.75],[30.5,64.2],[30.05,64.6],[29.6,64.9],[29.8,65.25],[29.65,65.65],[30.1,65.75],[29.6,66.15],[29.1,66.6],[29.05,66.9]],
      [[24.15,65.82],[23.9,66.05],[23.68,66.3],[23.65,66.9]],
      [[11.4,58.95],[11.75,59.25],[11.85,59.65],[12.3,59.9],[12.55,60.3],[12.6,61.0],[12.25,61.55],[12.15,62.3],[12.05,62.8],[12.15,63.6],[13.2,64.0],[14.1,64.4],[14.2,64.9],[14.6,65.3],[15.4,65.9],[15.65,66.3],[16.05,66.9]],
      [[28.05,59.47],[28.15,59.3],[27.85,59.0]], [[27.55,57.95],[27.4,57.6],[27.35,57.53]],
      [[24.33,57.87],[25.0,58.05],[25.35,58.03],[25.85,57.85],[26.5,57.55],[27.35,57.53]],
      [[21.05,56.07],[21.6,56.3],[22.4,56.4],[23.2,56.35],[24.0,56.28],[24.9,56.42],[25.7,56.15],[26.6,55.7]],
      [[27.35,57.53],[27.85,57.3],[27.7,56.85],[28.2,56.15],[27.6,55.8],[26.6,55.7]],
      [[21.25,55.25],[22.0,55.05],[22.6,55.07],[22.8,54.9],[22.75,54.4]],
      [[19.65,54.45],[20.5,54.4],[21.5,54.33],[22.75,54.35]]
    ]
  };

  function hash(x, y) { var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
  function vn(x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y) { return (vn(x, y) * 0.5 + vn(x * 2, y * 2) * 0.25 + vn(x * 4, y * 4) * 0.125 + vn(x * 8, y * 8) * 0.0625) / 0.9375; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  var C = { bg: 0x071420, bgs: '#071420', sea: '#06111B', land: '#2A4964', land2: '#2E4F6B', lake: '#0A1A26', coast: '#4C86AB', glow: 'rgba(90,169,240,0.35)', border: 'rgba(160,184,199,0.5)', grat: 'rgba(143,166,181,0.06)' };

  function Map(canvas, opts) {
    var THREE = window.THREE, self = this; this.T = THREE; this.opts = opts = opts || {};
    var b = this.b = opts.bounds || [10, 54.5, 31.5, 66.8];
    var lon0 = (b[0] + b[2]) / 2, lat0 = (b[1] + b[3]) / 2, S = opts.scale || 12, kx = Math.cos(lat0 * Math.PI / 180);
    this.X = function (lon) { return (lon - lon0) * S * kx; }; this.Z = function (lat) { return -(lat - lat0) * S; };
    this.toLon = function (x) { return x / (S * kx) + lon0; }; this.toLat = function (z) { return -z / S + lat0; };
    this.W = (b[2] - b[0]) * S * kx; this.D = (b[3] - b[1]) * S; this.relief = opts.relief != null ? opts.relief : 0.45;
    this.canvas = canvas; this.wrap = canvas.parentNode; this.rm = reduced();
    var r = this.r = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setClearColor(C.bg, 1);
    var scene = this.scene = new THREE.Scene(); scene.fog = new THREE.Fog(C.bg, this.D * 1.6, this.D * 4);
    var cam = this.cam = new THREE.PerspectiveCamera(36, 2, 0.5, 2000);
    scene.add(new THREE.HemisphereLight(0xe4f0f8, 0x2a4458, 2.3));
    var sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(-this.W * 0.3, this.D, this.D * 0.2); scene.add(sun);
    this.buildTerrain();
    this.layers = {}; this.anim = []; this.hoverObj = null; this.sel = null;
    var ring = this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.95, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 5; scene.add(ring);
    var v = opts.view || {};
    this.home = { lon: v.lon != null ? v.lon : lon0, lat: v.lat != null ? v.lat : lat0, dist: v.dist || this.D * 0.85, az: v.az || 0, pol: v.pol != null ? v.pol : 0.85 };
    this.goal = { tx: this.X(this.home.lon), tz: this.Z(this.home.lat), dist: this.home.dist, az: this.home.az, pol: this.home.pol };
    this.cur = { tx: this.goal.tx, tz: this.goal.tz, dist: this.goal.dist * (this.rm ? 1 : 1.9), az: this.goal.az - (this.rm ? 0 : 0.5), pol: this.rm ? this.goal.pol : 0.35 };
    this.minDist = opts.minDist || 3; this.maxDist = opts.maxDist || this.D * 1.6;
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2(); this.tmpV = new THREE.Vector3();
    this.bindControls();
    this.resize = function () { var w = self.wrap.clientWidth, h = self.wrap.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); self.vw = w; self.vh = h; };
    this.resize(); this.ro = new ResizeObserver(this.resize); this.ro.observe(this.wrap);
    this.vis = true; this.io = new IntersectionObserver(function (es) { self.vis = es[0].isIntersecting; }); this.io.observe(this.wrap);
    this.t0 = performance.now(); this.frame = 0; this.anchorEls = [];
    var loop = function (now) { if (self.dead) return; self.raf = requestAnimationFrame(loop); if (!self.vis) return; self.tick(now); };
    this.raf = requestAnimationFrame(loop);
    (window.__navmaps = window.__navmaps || []).push(this);
  }

  Map.prototype.buildTerrain = function () {
    var THREE = this.T, b = this.b, self = this;
    var TW = this.opts.texW || 2048, TH = Math.round(TW * this.D / this.W); if (TH > 2048) { TW = Math.round(TW * 2048 / TH); TH = 2048; }
    var cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; var g = cv.getContext('2d');
    var px = function (lon) { return (lon - b[0]) / (b[2] - b[0]) * TW; }, py = function (lat) { return (b[3] - lat) / (b[3] - b[1]) * TH; };
    var path = function (ctx, ring, sx, sy) { ctx.beginPath(); for (var i = 0; i < ring.length; i++) { var x = sx(ring[i][0]), y = sy(ring[i][1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); };
    g.fillStyle = C.land; g.fillRect(0, 0, TW, TH);
    var nc = document.createElement('canvas'); nc.width = 220; nc.height = Math.round(220 * TH / TW); var ng = nc.getContext('2d'), id = ng.createImageData(nc.width, nc.height);
    for (var y = 0; y < nc.height; y++) for (var x = 0; x < nc.width; x++) { var lo = b[0] + (x / nc.width) * (b[2] - b[0]), la = b[3] - (y / nc.height) * (b[3] - b[1]); var n = fbm(lo * 1.4, la * 2.4); var k = (y * nc.width + x) * 4; var l = Math.round(36 + n * 46); id.data[k] = l * 0.62; id.data[k + 1] = l * 0.95; id.data[k + 2] = l * 1.25; id.data[k + 3] = 255; }
    ng.putImageData(id, 0, 0); g.save(); g.globalAlpha = 0.55; g.imageSmoothingEnabled = true; g.drawImage(nc, 0, 0, TW, TH); g.restore();
    g.strokeStyle = C.grat; g.lineWidth = 1; for (var lo2 = Math.ceil(b[0]); lo2 <= b[2]; lo2 += 1) { g.beginPath(); g.moveTo(px(lo2), 0); g.lineTo(px(lo2), TH); g.stroke(); } for (var la2 = Math.ceil(b[1] * 2) / 2; la2 <= b[3]; la2 += 0.5) { g.beginPath(); g.moveTo(0, py(la2)); g.lineTo(TW, py(la2)); g.stroke(); }
    g.fillStyle = C.sea; path(g, GEO.sea, px, py); g.fill();
    g.fillStyle = C.land2; GEO.islands.forEach(function (r) { path(g, r, px, py); g.fill(); });
    g.fillStyle = C.lake; GEO.lakes.forEach(function (r) { path(g, r, px, py); g.fill(); });
    var lw = Math.max(1, TW / 1400);
    var strokeAll = function () { path(g, GEO.sea, px, py); g.stroke(); GEO.islands.forEach(function (r) { path(g, r, px, py); g.stroke(); }); GEO.lakes.forEach(function (r) { path(g, r, px, py); g.stroke(); }); };
    g.save(); g.filter = 'blur(' + Math.round(4 * lw) + 'px)'; g.strokeStyle = C.glow; g.lineWidth = 7 * lw; strokeAll(); g.restore();
    g.strokeStyle = C.coast; g.lineWidth = 1.3 * lw; g.lineJoin = 'round'; strokeAll();
    g.save(); g.setLineDash([5 * lw, 4 * lw]); g.strokeStyle = C.border; g.lineWidth = 1.1 * lw; GEO.borders.forEach(function (r) { g.beginPath(); r.forEach(function (p, i) { if (i) g.lineTo(px(p[0]), py(p[1])); else g.moveTo(px(p[0]), py(p[1])); }); g.stroke(); }); g.restore();
    if (this.opts.paint) this.opts.paint(g, px, py, lw);
    var fw = Math.round(Math.min(TW, TH) * 0.07); [[0, 0, fw, 0, 0, 0, fw, TH], [TW, 0, TW - fw, 0, TW - fw, 0, fw, TH], [0, 0, 0, fw, 0, 0, TW, fw], [0, TH, 0, TH - fw, 0, TH - fw, TW, fw]].forEach(function (q) { var gr = g.createLinearGradient(q[0], q[1], q[2], q[3]); gr.addColorStop(0, C.bgs); gr.addColorStop(1, 'rgba(7,20,32,0)'); g.fillStyle = gr; g.fillRect(q[4], q[5], q[6], q[7]); });
    var tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = this.r.capabilities.getMaxAnisotropy(); tex.generateMipmaps = true;
    var MW = 260, MH = Math.round(MW * this.D / this.W); var mc = document.createElement('canvas'); mc.width = MW; mc.height = MH; var mg = mc.getContext('2d');
    var mx = function (lon) { return (lon - b[0]) / (b[2] - b[0]) * MW; }, my = function (lat) { return (b[3] - lat) / (b[3] - b[1]) * MH; };
    mg.fillStyle = '#fff'; mg.fillRect(0, 0, MW, MH); mg.fillStyle = '#000'; path(mg, GEO.sea, mx, my); mg.fill(); mg.fillStyle = '#fff'; GEO.islands.forEach(function (r) { path(mg, r, mx, my); mg.fill(); }); mg.fillStyle = '#000'; GEO.lakes.forEach(function (r) { path(mg, r, mx, my); mg.fill(); });
    var mc2 = document.createElement('canvas'); mc2.width = MW; mc2.height = MH; var mg2 = mc2.getContext('2d'); mg2.filter = 'blur(1.5px)'; mg2.drawImage(mc, 0, 0); var md = mg2.getImageData(0, 0, MW, MH).data;
    var mask = function (lon, lat) { var fx = clamp((lon - b[0]) / (b[2] - b[0]) * (MW - 1), 0, MW - 1), fy = clamp((b[3] - lat) / (b[3] - b[1]) * (MH - 1), 0, MH - 1); var ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, ix1 = Math.min(MW - 1, ix + 1), iy1 = Math.min(MH - 1, iy + 1); var s = function (x, y) { return md[(y * MW + x) * 4] / 255; }; return s(ix, iy) * (1 - u) * (1 - v) + s(ix1, iy) * u * (1 - v) + s(ix, iy1) * (1 - u) * v + s(ix1, iy1) * u * v; };
    var rel = this.relief, scale = (this.opts.scale || 12) / 12;
    this.hAt = function (lon, lat) { var m = mask(lon, lat); if (m <= 0.5) return 0; var t = (m - 0.5) * 2; var boost = 1; if (lon < 14.5 && lat > 61) boost += 2.2 * Math.min(1, (lat - 61) / 2.5); if (lat > 64.8) boost += 0.5; return t * (0.12 + fbm(lon * 1.4, lat * 2.4) * 0.55 * boost) * rel * scale; };
    var SX = Math.min(320, Math.round(this.W * 2.2)), SZ = Math.min(360, Math.round(this.D * 2.2));
    var geo = new THREE.PlaneGeometry(this.W, this.D, SX, SZ); geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position; for (var i = 0; i < pos.count; i++) { pos.setY(i, this.hAt(this.toLon(pos.getX(i)), this.toLat(pos.getZ(i)))); }
    geo.computeVertexNormals();
    this.terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 })); this.scene.add(this.terrain);
    var skirt = new THREE.Mesh(new THREE.PlaneGeometry(this.W * 6, this.D * 6), new THREE.MeshBasicMaterial({ color: C.bg })); skirt.rotation.x = -Math.PI / 2; skirt.position.y = -1.5; this.scene.add(skirt);
  };

  Map.prototype.bindControls = function () {
    var self = this, cv = this.canvas, ptrs = {}, drag = null, moved = 0, lastPinch = 0;
    cv.style.touchAction = 'none';
    var ground = function (cx, cy) { var r = cv.getBoundingClientRect(); self.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); self.ray.setFromCamera(self.ndc, self.cam); var o = self.ray.ray.origin, d = self.ray.ray.direction; if (Math.abs(d.y) < 1e-4) return null; var t = -o.y / d.y; if (t < 0) return null; return { x: o.x + d.x * t, z: o.z + d.z * t }; };
    this.groundAt = ground;
    var zoomAt = function (f, cx, cy) { var g = self.goal; var nd = clamp(g.dist * f, self.minDist, self.maxDist); var p = cx != null ? ground(cx, cy) : null; if (p) { var k = 1 - nd / g.dist; g.tx += (p.x - g.tx) * k; g.tz += (p.z - g.tz) * k; } g.dist = nd; self.clampGoal(); };
    this.zoomAt = zoomAt;
    this._down = function (e) { ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = 0; drag = { mode: (e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey) ? 'pan' : 'rot', x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} };
    this._move = function (e) {
      if (ptrs[e.pointerId]) ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(ptrs);
      if (ids.length === 2) { var a = ptrs[ids[0]], c = ptrs[ids[1]]; var dd = Math.hypot(a.x - c.x, a.y - c.y); if (lastPinch) zoomAt(lastPinch / dd, (a.x + c.x) / 2, (a.y + c.y) / 2); lastPinch = dd; moved += 10; return; }
      if (!drag) { self.hoverAt(e.clientX, e.clientY); return; }
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      var g = self.goal;
      if (drag.mode === 'rot') { g.az -= dx * 0.005; g.pol = clamp(g.pol - dy * 0.004, 0.12, 1.25); }
      else { var s = g.dist * 0.0018, ca = Math.cos(g.az), sa = Math.sin(g.az); g.tx -= (ca * dx) * s; g.tz -= (-sa * dx) * s; g.tx += (-sa * dy) * s; g.tz += (-ca * dy) * s; self.clampGoal(); }
    };
    this._up = function (e) { var was = drag; delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) lastPinch = 0; drag = null; if (was && moved < 6) self.pickAt(e.clientX, e.clientY); };
    this._wheel = function (e) { e.preventDefault(); zoomAt(Math.exp(e.deltaY * 0.0013), e.clientX, e.clientY); };
    this._dbl = function (e) { zoomAt(0.5, e.clientX, e.clientY); };
    this._ctx = function (e) { e.preventDefault(); };
    this._leave = function () { if (!drag) self.setHover(null); };
    cv.addEventListener('pointerdown', this._down); cv.addEventListener('pointermove', this._move); cv.addEventListener('pointerup', this._up); cv.addEventListener('pointercancel', this._up);
    cv.addEventListener('wheel', this._wheel, { passive: false }); cv.addEventListener('dblclick', this._dbl); cv.addEventListener('contextmenu', this._ctx); cv.addEventListener('pointerleave', this._leave);
  };
  Map.prototype.clampGoal = function () { var g = this.goal; g.tx = clamp(g.tx, -this.W / 2, this.W / 2); g.tz = clamp(g.tz, -this.D / 2, this.D / 2); };
  Map.prototype.zoomIn = function () { this.zoomAt(0.6); };
  Map.prototype.zoomOut = function () { this.zoomAt(1.6); };
  Map.prototype.reset = function () { var h = this.home; this.goal = { tx: this.X(h.lon), tz: this.Z(h.lat), dist: h.dist, az: h.az, pol: h.pol }; };
  Map.prototype.flyTo = function (lon, lat, dist, pol) { var g = this.goal; g.tx = this.X(lon); g.tz = this.Z(lat); if (dist) g.dist = clamp(dist, this.minDist, this.maxDist); if (pol != null) g.pol = pol; this.clampGoal(); };
  Map.prototype.fitTo = function (pts, pad) { if (!pts || !pts.length) return; var a = 1e9, b2 = -1e9, c = 1e9, d = -1e9; pts.forEach(function (p) { a = Math.min(a, p[0]); b2 = Math.max(b2, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); }); var span = Math.max((b2 - a) * Math.cos((c + d) / 2 * Math.PI / 180), d - c) * (this.opts.scale || 12); this.flyTo((a + b2) / 2, (c + d) / 2, Math.max(this.minDist * 2, span * (pad || 1.6) + 4), 0.8); };

  Map.prototype.pickables = function () { var out = []; for (var k in this.layers) { var L = this.layers[k]; if (L && L.visible !== false && L.pick) out = out.concat(L.pick); } return out; };
  Map.prototype.hit = function (cx, cy) {
    var r = this.canvas.getBoundingClientRect(); this.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(this.ndc, this.cam);
    this.ray.params.Points = { threshold: Math.max(0.05, this.cur.dist * 0.006) };
    var hs = this.ray.intersectObjects(this.pickables(), false); if (!hs.length) return null; var h = hs[0], o = h.object, ud = o.userData;
    if (ud.items) { var idx = h.instanceId != null ? h.instanceId : h.index; if (idx == null) return null; var it = ud.items[idx]; return { kind: ud.kind, id: it.id, index: idx, item: it, lon: it.lon, lat: it.lat }; }
    return { kind: ud.kind, id: ud.id, item: ud.item, lon: ud.lon, lat: ud.lat };
  };
  Map.prototype.hoverAt = function (cx, cy) { var now = performance.now(); if (now - (this._lh || 0) < 40) return; this._lh = now; this.setHover(this.hit(cx, cy)); };
  Map.prototype.setHover = function (h) { var prev = this.hoverObj; this.hoverObj = h; this.canvas.style.cursor = h ? 'pointer' : 'grab'; if ((prev && prev.id) !== (h && h.id) && this.opts.onHover) this.opts.onHover(h); };
  Map.prototype.pickAt = function (cx, cy) { var h = this.hit(cx, cy); if (this.opts.onPick) this.opts.onPick(h); };
  Map.prototype.select = function (kind, id) {
    this.sel = id ? { kind: kind, id: id } : null; var ring = this.selRing; ring.visible = false; if (!id) return;
    var L = this.layers[kind]; if (!L) return; var it = L.items ? L.items.find(function (x) { return x.id === id; }) : null;
    if (it) { ring.visible = true; ring.position.set(this.X(it.lon), this.hAt(it.lon, it.lat) + (it.top || 0.05), this.Z(it.lat)); ring.userData.base = it.r ? it.r * 2.2 : 1; }
  };

  Map.prototype.setLayerVisible = function (name, on) { var L = this.layers[name]; if (!L) return; L.visible = on; (L.objs || []).forEach(function (o) { o.visible = on; }); };
  Map.prototype.clearLayer = function (name) { var L = this.layers[name]; if (!L) return; var sc = this.scene; (L.objs || []).forEach(function (o) { sc.remove(o); o.traverse(function (c) { if (c.geometry) c.geometry.dispose(); if (c.material) { if (c.material.map) c.material.map.dispose(); c.material.dispose(); } }); }); delete this.layers[name]; };

  // Dots: farms, parcels. items: [{id, lon, lat, r, color}]
  Map.prototype.setDots = function (name, items, o) {
    o = o || {}; this.clearLayer(name); var THREE = this.T, n = items.length, self = this; if (!n) return;
    var geo = new THREE.SphereGeometry(1, 14, 10), mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var mesh = new THREE.InstancedMesh(geo, mat, n); mesh.userData = { kind: name, items: items };
    var halo = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: o.halo != null ? o.halo : 0.22, blending: THREE.AdditiveBlending, depthWrite: false }), n);
    var cur = new Float32Array(n * 3), tgt = new Float32Array(n * 3), st = new Float64Array(n), sz = new Float32Array(n), szT = new Float32Array(n), tmp = new THREE.Color();
    items.forEach(function (it, i) { it.r = it.r || 0.25; it.top = it.r; it.y = self.hAt(it.lon, it.lat); tmp.set(it.color || '#5AA9F0'); cur[i * 3] = tgt[i * 3] = tmp.r; cur[i * 3 + 1] = tgt[i * 3 + 1] = tmp.g; cur[i * 3 + 2] = tgt[i * 3 + 2] = tmp.b; sz[i] = 0; szT[i] = it.r; st[i] = performance.now() + 600 + i % 50 * 12; });
    var z = new THREE.Matrix4().makeScale(0, 0, 0); for (var j = 0; j < n; j++) { mesh.setMatrixAt(j, z); halo.setMatrixAt(j, z); }
    this.scene.add(halo); this.scene.add(mesh);
    this.layers[name] = { items: items, objs: [mesh, halo], pick: [mesh], mesh: mesh, halo: halo, cur: cur, tgt: tgt, st: st, sz: sz, szT: szT, dirty: true, o: o };
  };
  Map.prototype.recolorDots = function (name, colorFn, origin) {
    var L = this.layers[name]; if (!L) return; var tmp = new this.T.Color(), now = performance.now(), self = this;
    L.items.forEach(function (it, i) { var c = colorFn(it, i); if (c == null) return; tmp.set(c); L.tgt[i * 3] = tmp.r; L.tgt[i * 3 + 1] = tmp.g; L.tgt[i * 3 + 2] = tmp.b; var d = origin ? Math.hypot((it.lon - origin[0]) * 0.5, it.lat - origin[1]) : 0; L.st[i] = self.rm ? 0 : now + d * 260; });
    L.dirty = true; if (origin && !this.rm) this.pulse(origin[0], origin[1]);
  };
  Map.prototype.resizeDots = function (name, sizeFn) { var L = this.layers[name]; if (!L) return; L.items.forEach(function (it, i) { var s = sizeFn(it, i); if (s != null) { L.szT[i] = s; it.r = s; it.top = s; } }); L.dirty = true; };
  Map.prototype.pulse = function (lon, lat) {
    var THREE = this.T; var m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(this.X(lon), 0.4, this.Z(lat)); this.scene.add(m); this.anim.push({ m: m, t0: performance.now(), dur: 2200, max: this.D * 0.6 });
  };

  // Sites: [{id, lon, lat, h, color, label}]
  Map.prototype.setSites = function (items) {
    this.clearLayer('sites'); var THREE = this.T, self = this, objs = [], pick = [];
    items.forEach(function (it) {
      var y = self.hAt(it.lon, it.lat), g = new THREE.Group(); g.position.set(self.X(it.lon), y, self.Z(it.lat));
      var col = new THREE.Color(it.color || '#3CCB7F'); var h = it.h || 3;
      var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, h, 16, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: it.dim ? 0.35 : 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); beam.position.y = h / 2;
      var cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), new THREE.MeshBasicMaterial({ color: col, transparent: !!it.dim, opacity: it.dim ? 0.5 : 1 })); cap.position.y = h;
      var base = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })); base.rotation.x = -Math.PI / 2; base.position.y = 0.05;
      var hitbox = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, h + 0.6, 8), new THREE.MeshBasicMaterial({ visible: false })); hitbox.position.y = h / 2;
      hitbox.userData = { kind: 'sites', id: it.id, item: it, lon: it.lon, lat: it.lat }; it.top = h; it.r = 0.4;
      g.add(beam, cap, base, hitbox); self.scene.add(g); objs.push(g); pick.push(hitbox); g.userData.base = base; g.userData.phase = Math.random();
    });
    this.layers.sites = { items: items, objs: objs, pick: pick };
  };

  // Arcs: [{id, a:[lon,lat], b:[lon,lat], color, w}]
  Map.prototype.setArcs = function (items) {
    this.clearLayer('arcs'); var THREE = this.T, self = this, objs = [], pick = [], arcs = [];
    items.forEach(function (it, k) {
      var A = new THREE.Vector3(self.X(it.a[0]), self.hAt(it.a[0], it.a[1]) + 0.1, self.Z(it.a[1])), B = new THREE.Vector3(self.X(it.b[0]), self.hAt(it.b[0], it.b[1]) + 0.1, self.Z(it.b[1]));
      var dist = A.distanceTo(B), M = A.clone().lerp(B, 0.5); M.y += 0.5 + dist * 0.28; var curve = new THREE.QuadraticBezierCurve3(A, M, B);
      var col = new THREE.Color(it.color || '#5AA9F0');
      var tg = new THREE.TubeGeometry(curve, 80, (it.w || 1) * 0.05, 6, false); tg.setDrawRange(0, 0);
      var tube = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      var hit = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.35, 5, false), new THREE.MeshBasicMaterial({ visible: false })); hit.userData = { kind: 'arcs', id: it.id, item: it, lon: (it.a[0] + it.b[0]) / 2, lat: (it.a[1] + it.b[1]) / 2 };
      var dots = []; var nd = Math.max(2, Math.round(dist / 5)); for (var i = 0; i < nd; i++) { var d = new THREE.Mesh(new THREE.SphereGeometry(0.11 * (it.w || 1), 10, 8), new THREE.MeshBasicMaterial({ color: col })); d.visible = false; self.scene.add(d); objs.push(d); dots.push(d); }
      self.scene.add(tube, hit); objs.push(tube, hit); pick.push(hit); arcs.push({ curve: curve, tg: tg, dots: dots, speed: 1.2 / Math.max(4, dist), k: k, t0: performance.now() });
    });
    this.layers.arcs = { items: items, objs: objs, pick: pick, arcs: arcs };
  };

  // Route legs: [{kind:'road'|'sea', pts:[[lon,lat],...], id}]
  Map.prototype.setRoute = function (legs) {
    this.clearLayer('route'); var THREE = this.T, self = this, objs = [], pick = [], L = [], all = [];
    legs.forEach(function (l, i) {
      var pts = l.pts.map(function (p) { all.push(p); return new THREE.Vector3(self.X(p[0]), l.kind === 'sea' ? 0.12 : self.hAt(p[0], p[1]) + 0.12, self.Z(p[1])); });
      if (pts.length === 2) { var A = pts[0], B = pts[1], mid = []; for (var k = 1; k < 8; k++) { var t = k / 8, q = A.clone().lerp(B, t); var nx = -(B.z - A.z), nz = B.x - A.x, nl = Math.hypot(nx, nz) || 1; var w = Math.sin(t * Math.PI) * A.distanceTo(B) * (l.kind === 'sea' ? 0.12 : 0.04) * (i % 2 ? -1 : 1); q.x += nx / nl * w; q.z += nz / nl * w; q.y = l.kind === 'sea' ? 0.12 : self.hAt(self.toLon(q.x), self.toLat(q.z)) + 0.12; mid.push(q); } pts = [A].concat(mid, [B]); }
      var curve = new THREE.CatmullRomCurve3(pts); var col = new THREE.Color(l.kind === 'sea' ? '#5AA9F0' : '#3CCB7F');
      var tg = new THREE.TubeGeometry(curve, 200, 0.09, 8, false); tg.setDrawRange(0, 0);
      var tube = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: col })); var glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.26, 8, false), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })); glow.visible = false;
      var hit = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.5, 5, false), new THREE.MeshBasicMaterial({ visible: false })); var mp = curve.getPointAt(0.5);
      hit.userData = { kind: 'route', id: l.id || ('leg' + i), item: l, lon: self.toLon(mp.x), lat: self.toLat(mp.z) };
      self.scene.add(tube, glow, hit); objs.push(tube, glow, hit); pick.push(hit); L.push({ curve: curve, tg: tg, tube: tube, glow: glow, len: curve.getLength(), kind: l.kind });
    });
    var pin = function (p, color, big) { var g = new THREE.Group(), y = self.hAt(p[0], p[1]); g.position.set(self.X(p[0]), y, self.Z(p[1])); var hgt = big ? 1.6 : 1.0; var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, hgt, 8), new THREE.MeshBasicMaterial({ color: 0xBFD3E0 })); stem.position.y = hgt / 2; var head = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.3 : 0.2, 18, 12), new THREE.MeshBasicMaterial({ color: color })); head.position.y = hgt; g.add(stem, head); g.userData.pin = true; self.scene.add(g); objs.push(g); };
    if (legs.length) { pin(legs[0].pts[0], 0xEAF2F7, true); legs.forEach(function (l, i) { pin(l.pts[l.pts.length - 1], i === legs.length - 1 ? 0xF2C230 : 0x8FA6B5, i === legs.length - 1); }); }
    var truck = new THREE.Group(); var tb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.3), new THREE.MeshBasicMaterial({ color: 0xEAF2F7 })); tb.position.y = 0.25; var tc = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.28), new THREE.MeshBasicMaterial({ color: 0x3CCB7F })); tc.position.set(0.47, 0.22, 0); truck.add(tb, tc);
    var ship = new THREE.Group(); var hull = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0x5AA9F0 })); hull.position.y = 0.11; var deck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.34), new THREE.MeshBasicMaterial({ color: 0xF2C230 })); deck.position.set(0.15, 0.3, 0); var cab = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xEAF2F7 })); cab.position.set(-0.4, 0.36, 0); ship.add(hull, deck, cab);
    truck.visible = ship.visible = false; this.scene.add(truck, ship); objs.push(truck, ship);
    this.layers.route = { items: [], objs: objs, pick: pick, legs: L, truck: truck, ship: ship, t0: performance.now() };
    if (all.length) this.fitTo(all, 2.1);
  };

  // Catchments: [{id, ring:[[lon,lat]...], color, h}]
  Map.prototype.setCatchments = function (items) {
    this.clearLayer('catch'); var THREE = this.T, self = this, objs = [], pick = [], lat0 = this.toLat(0);
    items.forEach(function (it) {
      var sh = new THREE.Shape(); it.ring.forEach(function (p, i) { var x = self.X(p[0]), y = (p[1] - lat0) * (self.opts.scale || 12); if (i) sh.lineTo(x, y); else sh.moveTo(x, y); });
      var geo = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
      var mat = new THREE.MeshStandardMaterial({ color: it.color, transparent: true, opacity: 0.88, roughness: 0.55, emissive: new THREE.Color(it.color), emissiveIntensity: 0.12 });
      var m = new THREE.Mesh(geo, mat); m.scale.y = 0.001; m.position.y = 0.05;
      var edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: 0xEAF2F7, transparent: true, opacity: 0.35 })); edge.scale.y = 0.001; edge.position.y = 0.05;
      var c = it.ring.reduce(function (a, p) { return [a[0] + p[0] / it.ring.length, a[1] + p[1] / it.ring.length]; }, [0, 0]);
      it.lon = c[0]; it.lat = c[1]; m.userData = { kind: 'catch', id: it.id, item: it, lon: c[0], lat: c[1] };
      self.scene.add(m, edge); objs.push(m, edge); pick.push(m); it._m = m; it._e = edge; it._h = 0.001; it._v = 0; it._ht = it.h || 1; it._st = performance.now() + 400 + Math.random() * 600;
    });
    this.layers.catch = { items: items, objs: objs, pick: pick };
  };
  Map.prototype.updateCatchments = function (fn) { var L = this.layers.catch; if (!L) return; var THREE = this.T; L.items.forEach(function (it) { var u = fn(it); if (!u) return; if (u.h != null) it._ht = u.h; if (u.color) { it._m.material.color.set(u.color); it._m.material.emissive.set(u.color); } if (u.opacity != null) it._m.material.opacity = u.opacity; if (u.edge != null) { it._e.material.opacity = u.edge; } }); };

  // Points: parcels. items [{lon,lat,color}]
  Map.prototype.setPoints = function (name, items, size) {
    this.clearLayer(name); var THREE = this.T, self = this, n = items.length; var pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    items.forEach(function (it, i) { pos[i * 3] = self.X(it.lon); pos[i * 3 + 1] = self.hAt(it.lon, it.lat) + 0.08; pos[i * 3 + 2] = self.Z(it.lat); c.set(it.color || '#8FA6B5'); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; });
    var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var pts = new THREE.Points(g, new THREE.PointsMaterial({ size: size || 3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    pts.userData = { kind: name, items: items }; this.scene.add(pts); this.layers[name] = { items: items, objs: [pts], pick: [pts], pts: pts };
  };
  Map.prototype.recolorPoints = function (name, fn) { var L = this.layers[name]; if (!L) return; var a = L.pts.geometry.attributes.color, c = new this.T.Color(); L.items.forEach(function (it, i) { var v = fn(it, i); if (v == null) return; c.set(v); a.setXYZ(i, c.r, c.g, c.b); }); a.needsUpdate = true; };

  Map.prototype.tick = function (now) {
    var self = this, THREE = this.T, cur = this.cur, g = this.goal, t = (now - this.t0) / 1000; this.frame++;
    var k = this.rm ? 1 : (t < 2.6 ? 0.035 : 0.12);
    cur.tx += (g.tx - cur.tx) * k; cur.tz += (g.tz - cur.tz) * k; cur.dist += (g.dist - cur.dist) * k; cur.az += (g.az - cur.az) * k; cur.pol += (g.pol - cur.pol) * k;
    var sp = Math.sin(cur.pol); this.cam.position.set(cur.tx + cur.dist * sp * Math.sin(cur.az), cur.dist * Math.cos(cur.pol), cur.tz + cur.dist * sp * Math.cos(cur.az)); this.cam.lookAt(cur.tx, 0, cur.tz);
    var zoomK = clamp(cur.dist / (this.D * 0.85), 0.25, 1.6);
    for (var name in this.layers) {
      var L = this.layers[name];
      if (L.mesh) {
        var dummy = this._dummy || (this._dummy = new THREE.Object3D()), c = this._c || (this._c = new THREE.Color()), active = L.dirty; var q = this._q || (this._q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)));
        for (var i = 0; i < L.items.length; i++) {
          if (now < L.st[i]) { active = true; continue; }
          var ch = false; for (var cc = 0; cc < 3; cc++) { var d = L.tgt[i * 3 + cc] - L.cur[i * 3 + cc]; if (Math.abs(d) > 0.002) { L.cur[i * 3 + cc] += d * 0.12; ch = true; } }
          var ds = L.szT[i] - L.sz[i]; if (Math.abs(ds) > 0.002) { L.sz[i] += ds * 0.12; ch = true; }
          if (ch || L.dirty || this.frame % 15 === 0) { active = true; var it = L.items[i], s = L.sz[i] * zoomK * (this.hoverObj && this.hoverObj.kind === name && this.hoverObj.index === i ? 1.7 : 1) * (this.sel && this.sel.kind === name && this.sel.id === it.id ? 1.5 : 1);
            dummy.position.set(this.X(it.lon), it.y + s, this.Z(it.lat)); dummy.quaternion.identity(); dummy.scale.setScalar(Math.max(0.0001, s)); dummy.updateMatrix(); L.mesh.setMatrixAt(i, dummy.matrix);
            dummy.position.y = it.y + 0.03; dummy.quaternion.copy(q); dummy.scale.setScalar(Math.max(0.0001, s * 2.6)); dummy.updateMatrix(); L.halo.setMatrixAt(i, dummy.matrix);
            c.setRGB(L.cur[i * 3], L.cur[i * 3 + 1], L.cur[i * 3 + 2]); L.mesh.setColorAt(i, c); L.halo.setColorAt(i, c); }
        }
        if (active) { L.mesh.instanceMatrix.needsUpdate = true; L.halo.instanceMatrix.needsUpdate = true; if (L.mesh.instanceColor) L.mesh.instanceColor.needsUpdate = true; if (L.halo.instanceColor) L.halo.instanceColor.needsUpdate = true; L.mesh.computeBoundingSphere(); }
        L.dirty = false;
      }
      if (name === 'sites') L.objs.forEach(function (o) { o.scale.setScalar(clamp(cur.dist / (self.D * 0.6), 0.12, 1)); var p = (t * 0.5 + o.userData.phase) % 1; o.userData.base.scale.setScalar(1 + p * 2.2); o.userData.base.material.opacity = 0.6 * (1 - p); });
      if (name === 'arcs') { var fa = clamp((cur.dist - 12) / 45, 0.06, 1); L.objs.forEach(function (o) { if (o.material && o.material.transparent && o.material.opacity > 0) o.material.opacity = 0.55 * fa; }); }
      if (name === 'arcs') L.arcs.forEach(function (a) { var gg = clamp((now - a.t0) / 1000 * 0.8 - 0.4 - a.k * 0.08, 0, 1); a.tg.setDrawRange(0, Math.floor(a.tg.index.count * gg / 3) * 3); a.dots.forEach(function (d, j) { d.visible = gg >= 1 && L.visible !== false && cur.dist > 18; if (!d.visible) return; var u = (t * a.speed + j / a.dots.length) % 1; d.position.copy(a.curve.getPoint(u)); }); });
      if (name === 'route') {
        var rk = clamp(cur.dist / 40, 0.1, 1.4); if (!L.rk || Math.abs(rk - L.rk) / L.rk > 0.2) { L.rk = rk; L.legs.forEach(function (l) { l.tube.geometry.dispose(); l.tg = new THREE.TubeGeometry(l.curve, 200, 0.09 * rk, 8, false); l.tube.geometry = l.tg; l.glow.geometry.dispose(); l.glow.geometry = new THREE.TubeGeometry(l.curve, 120, 0.26 * rk, 8, false); }); L.objs.forEach(function (o) { if (o.userData.pin) o.scale.setScalar(Math.max(0.15, rk)); }); }
        var lt = (now - L.t0) / 1000, tot = L.legs.reduce(function (s, l) { return s + l.len; }, 0) || 1, acc = 0, dd = 1.8;
        L.legs.forEach(function (l) { var a0 = acc / tot * dd, b0 = (acc + l.len) / tot * dd; var gg = clamp((lt - 0.3 - a0) / Math.max(0.01, b0 - a0), 0, 1); l.tg.setDrawRange(0, Math.floor(l.tg.index.count * gg / 3) * 3); l.glow.visible = gg >= 1; acc += l.len; });
        L.truck.visible = L.ship.visible = false;
        if (lt > dd + 0.4 && L.legs.length) { var u = ((lt - dd - 0.4) * Math.min(0.2, 6 / tot)) % 1, dist = u * tot, kk = 0; while (kk < L.legs.length - 1 && dist > L.legs[kk].len) { dist -= L.legs[kk].len; kk++; } var lg = L.legs[kk], uu = clamp(dist / lg.len, 0, 0.999), p = lg.curve.getPointAt(uu), p2 = lg.curve.getPointAt(Math.min(1, uu + 0.01)); var veh = lg.kind === 'sea' ? L.ship : L.truck; veh.visible = true; veh.position.copy(p); veh.position.y = lg.kind === 'sea' ? 0.02 : p.y - 0.08; veh.lookAt(p2.x, veh.position.y, p2.z); veh.rotateY(-Math.PI / 2); veh.scale.setScalar(0.11 * Math.pow(cur.dist, 0.6) * (12 / (self.opts.scale || 12))); }
      }
      if (name === 'catch') L.items.forEach(function (it) { if (now < it._st) return; it._v += (it._ht - it._h) * 0.12; it._v *= 0.76; it._h += it._v; var hh = Math.max(0.001, it._h); it._m.scale.y = hh; it._e.scale.y = hh; });
    }
    for (var a = this.anim.length - 1; a >= 0; a--) { var A = this.anim[a], p2 = (now - A.t0) / A.dur; if (p2 >= 1) { this.scene.remove(A.m); A.m.geometry.dispose(); A.m.material.dispose(); this.anim.splice(a, 1); continue; } A.m.scale.setScalar(1 + p2 * A.max); A.m.material.opacity = 0.45 * (1 - p2); }
    if (this.selRing.visible) { var pr = (t * 0.8) % 1, base = (this.selRing.userData.base || 1) * zoomK; this.selRing.scale.setScalar(base * (1 + pr * 0.8)); this.selRing.material.opacity = 0.9 * (1 - pr); }
    if (this.frame % 30 === 1) this.anchorEls = Array.prototype.slice.call(this.wrap.querySelectorAll('[data-anchor]'));
    if (this.anchorEls.length) {
      var w = this.vw || 1, h = this.vh || 1, v = this.tmpV;
      for (var e = 0; e < this.anchorEls.length; e++) { var el = this.anchorEls[e], lo = parseFloat(el.getAttribute('data-lon')), la = parseFloat(el.getAttribute('data-lat')), hh2 = parseFloat(el.getAttribute('data-h') || '0'); if (isNaN(lo)) continue; var hs = el.getAttribute('data-hs'); if (hs === 'site') hh2 *= clamp(cur.dist / (this.D * 0.6), 0.12, 1); else if (hs === 'route') hh2 *= Math.max(0.15, clamp(cur.dist / 40, 0.1, 1.4));
        v.set(this.X(lo), this.hAt(lo, la) + hh2, this.Z(la)).project(this.cam); var out = v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1; var minZ = parseFloat(el.getAttribute('data-maxdist') || '0');
        var hide = out || (minZ && cur.dist > minZ); el.style.opacity = hide ? '0' : '1'; el.style.transform = 'translate(' + ((v.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - v.y) / 2 * h).toFixed(1) + 'px)'; }
    }
    this.r.render(this.scene, this.cam);
  };

  Map.prototype.screenOf = function (lon, lat, h) { var v = new this.T.Vector3(this.X(lon), this.hAt(lon, lat) + (h || 0), this.Z(lat)).project(this.cam); var r = this.canvas.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; };
  Map.prototype.dispose = function (keep) {
    var i = (window.__navmaps || []).indexOf(this); if (i > -1) window.__navmaps.splice(i, 1);
    this.dead = true; cancelAnimationFrame(this.raf); try { this.ro.disconnect(); this.io.disconnect(); } catch (e) {}
    var cv = this.canvas; cv.removeEventListener('pointerdown', this._down); cv.removeEventListener('pointermove', this._move); cv.removeEventListener('pointerup', this._up); cv.removeEventListener('pointercancel', this._up); cv.removeEventListener('wheel', this._wheel); cv.removeEventListener('dblclick', this._dbl); cv.removeEventListener('contextmenu', this._ctx); cv.removeEventListener('pointerleave', this._leave);
    this.scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    try { this.r.dispose(); if (!keep) this.r.forceContextLoss(); } catch (e) {}
  };

  window.NavMap = { create: function (canvas, opts) { return new Map(canvas, opts); }, GEO: GEO, ready: Promise.resolve() };
})();
