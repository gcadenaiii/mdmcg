/* The studio: one WebGL canvas, a soft room, one key light, a baked contact shadow, and up to four devices.
   It draws only when asked. Used by the home page's stage, the viewer on /device/, and the script that renders the stills. */
import {
  BufferGeometry, CustomBlending, DirectionalLight, DoubleSide, Float32BufferAttribute, HemisphereLight, Mesh, MeshBasicMaterial, NeutralToneMapping,
  NoBlending, OneFactor, OneMinusSrcAlphaFactor, OrthographicCamera, PCFShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Scene, ShaderMaterial,
  ShadowMaterial, Vector3, WebGLRenderer, WebGLRenderTarget,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildDevice, makeMaterials } from './device.js';
import SPECS from './specs.json';

const DEPTH = {
  vertexShader: 'varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float reach; varying float vD; void main(){ float a = clamp(1.0 - vD / reach, 0.0, 1.0); gl_FragColor = vec4(0.0, 0.0, 0.0, a * a); }',
};
const BLUR = {
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D map; uniform vec2 step; varying vec2 vUv;
    void main(){ vec4 s = vec4(0.0);
      s += texture2D(map, vUv - 4.0 * step) * 0.051; s += texture2D(map, vUv - 3.0 * step) * 0.0918; s += texture2D(map, vUv - 2.0 * step) * 0.12245;
      s += texture2D(map, vUv - step) * 0.1531; s += texture2D(map, vUv) * 0.1633; s += texture2D(map, vUv + step) * 0.1531;
      s += texture2D(map, vUv + 2.0 * step) * 0.12245; s += texture2D(map, vUv + 3.0 * step) * 0.0918; s += texture2D(map, vUv + 4.0 * step) * 0.051;
      gl_FragColor = s; }`,
};

/* the haze: a small, blurred copy of the picture laid lightly over the sharp one */
const HAZE = {
  vertexShader: BLUR.vertexShader,
  fragmentShader: `uniform sampler2D map; uniform float amount; varying vec2 vUv;
    void main(){ vec4 c = texture2D(map, vUv);
      gl_FragColor = vec4(c.a > 0.001 ? c.rgb / c.a : vec3(0.0), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      gl_FragColor = vec4(gl_FragColor.rgb * c.a * amount, c.a * amount); }`,
};

export { SPECS };

export class Studio {
  constructor(canvas, { pixelRatio = 1, shadowSize = 1024 } = {}) {
    const r = this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(pixelRatio);
    r.toneMapping = NeutralToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = PCFShadowMap;
    r.shadowMap.autoUpdate = false;
    r.setClearColor(0x000000, 0);
    this.scene = new Scene();
    this.cam = new PerspectiveCamera(24, 1, 5, 6000);
    const pm = new PMREMGenerator(r);
    this.env = pm.fromScene(new RoomEnvironment(), 0.035);
    pm.dispose();
    this.scene.environment = this.env.texture;
    this.scene.environmentIntensity = 0.42;
    this.scene.add(new HemisphereLight(0xffffff, 0xd2d2d0, 0.3));
    const key = this.key = new DirectionalLight(0xffffff, 1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.radius = 24;
    key.shadow.intensity = 0.4;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.5;
    this.scene.add(key, key.target);
    this.M = makeMaterials();
    this.devices = [];
    this.ground = 0;
    /* the key light's shadow on the ground */
    this.catcher = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new ShadowMaterial({ opacity: 0.2, color: 0x0a0e14 }));
    this.catcher.receiveShadow = true;
    this.scene.add(this.catcher);
    /* the contact shadow: the scene seen from the ground looking up, turned to a soft dark patch */
    this.rtA = new WebGLRenderTarget(shadowSize, shadowSize);
    this.rtB = new WebGLRenderTarget(shadowSize, shadowSize, { depthBuffer: false });
    this.depthMat = new ShaderMaterial({ ...DEPTH, uniforms: { reach: { value: 16 } }, blending: NoBlending, side: DoubleSide });
    this.blurMat = new ShaderMaterial({ ...BLUR, uniforms: { map: { value: null }, step: { value: null } }, blending: NoBlending, depthTest: false, depthWrite: false });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.blurMat);
    this.quad.frustumCulled = false;
    this.up = new OrthographicCamera(-1, 1, 1, -1, 0, 16);
    this.up.up.set(0, 0, -1);
    this.contactGeo = new BufferGeometry();
    this.contact = new Mesh(this.contactGeo, new MeshBasicMaterial({ map: this.rtA.texture, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }));
    this.contact.renderOrder = 2;
    this.scene.add(this.contact);
    /* the soft haze over the whole picture (0 turns it off) */
    this.haze = 0.14;
    this.rtH1 = new WebGLRenderTarget(4, 4);
    this.rtH2 = new WebGLRenderTarget(4, 4, { depthBuffer: false });
    this.hazeQuad = new Mesh(this.quad.geometry, new ShaderMaterial({
      ...HAZE, uniforms: { map: { value: this.rtH2.texture }, amount: { value: this.haze } }, transparent: true, depthTest: false, depthWrite: false,
      blending: CustomBlending, blendSrc: OneFactor, blendDst: OneMinusSrcAlphaFactor, blendSrcAlpha: OneFactor, blendDstAlpha: OneMinusSrcAlphaFactor,
    }));
    this.hazeQuad.frustumCulled = false;
    this.frame = null;
    this.dirty = true;
    this.view = { tx: 0, ty: 0, tz: 0, az: 0.5, el: 0.6, dist: 360 };
    this.fitAspect = 1;
    this.w = 1; this.h = 1;
    this.v3 = new Vector3();
  }
  /** the device of option i (0 to 3), built the first time it is asked for */
  device(i) {
    if (!this.devices[i]) {
      const d = this.devices[i] = buildDevice(SPECS[i], this.M, { inside: i === 0 });
      d.group.visible = false;
      this.scene.add(d.group);
      this.ground = -SPECS[i].core.pad_t;
    }
    return this.devices[i];
  }
  /** which devices are on the ground and where (x, z); the shadows cover the frame given */
  arrange(places, frame) {
    this.devices.forEach((d) => { if (d) d.group.visible = false; });
    places.forEach((p) => { if (!p) return; const d = this.device(p.i); d.group.visible = true; d.group.position.set(p.x, 0, p.z); });
    if (frame) this.setFrame(frame);
    this.dirty = true;
  }
  setFrame(f) {
    const same = this.frame && ['cx', 'cz', 'w', 'd'].every((k) => this.frame[k] === f[k]);
    if (same) return;
    this.frame = { ...f };
    const y = this.ground;
    const { cx, cz, w, d } = f;
    this.catcher.scale.set(w * 3, 1, d * 3);
    this.catcher.position.set(cx, y - 0.02, cz);
    const P = [], U = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { P.push(cx + sx * w / 2, y + 0.02, cz + sz * d / 2); U.push(0.5 - sx / 2, 0.5 - sz / 2); }
    this.contactGeo.setAttribute('position', new Float32BufferAttribute(P, 3));
    this.contactGeo.setAttribute('uv', new Float32BufferAttribute(U, 2));
    this.contactGeo.setIndex([0, 2, 1, 0, 3, 2]);
    this.contactGeo.computeBoundingSphere();
    const u = this.up;
    u.left = -w / 2; u.right = w / 2; u.top = d / 2; u.bottom = -d / 2;
    u.updateProjectionMatrix();
    u.position.set(cx, y, cz);
    u.lookAt(cx, y + 1, cz);
    const k = this.key, half = Math.max(w, d) * 0.6;
    k.target.position.set(cx, 0, cz);
    k.position.set(cx - half * 1.0, half * 2.4, cz - half * 0.4);
    Object.assign(k.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: half * 0.5, far: half * 5 });
    k.shadow.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  /** tell the studio that a part moved, so the shadows are made again on the next draw */
  touch() { this.dirty = true; }
  bake() {
    const r = this.renderer, s = this.scene;
    const hide = [this.catcher, this.contact];
    hide.forEach((o) => { o.visible = false; });
    s.overrideMaterial = this.depthMat;
    const alpha = r.getClearAlpha();
    r.setClearAlpha(0);
    r.setRenderTarget(this.rtA);
    r.clear();
    r.render(s, this.up);
    s.overrideMaterial = null;
    hide.forEach((o) => { o.visible = true; });
    const size = this.rtA.width;
    /* blur in millimetres, so the look does not change with the frame */
    const mm = size / Math.max(this.frame.w, this.frame.d);
    for (const reach of [2.0, 0.8]) {
      const px = (reach * mm) / size;
      this.blurMat.uniforms.map.value = this.rtA.texture; this.blurMat.uniforms.step.value = [px, 0];
      r.setRenderTarget(this.rtB); r.render(this.quad, this.up);
      this.blurMat.uniforms.map.value = this.rtB.texture; this.blurMat.uniforms.step.value = [0, px];
      r.setRenderTarget(this.rtA); r.render(this.quad, this.up);
    }
    r.setRenderTarget(null);
    r.setClearAlpha(alpha);
    r.shadowMap.needsUpdate = true;
    this.dirty = false;
  }
  resize(w, h) {
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }
  place(v = this.view) {
    this.view = v;
    /* a view may name its own lens (fov, in degrees); the others use the studio's 24 */
    const fov = v.fov || 24;
    if (this.cam.fov !== fov) { this.cam.fov = fov; this.cam.updateProjectionMatrix(); }
    const d = v.dist * Math.max(1, this.fitAspect / this.cam.aspect);
    const ce = Math.cos(v.el);
    this.cam.position.set(v.tx + d * ce * Math.sin(v.az), v.ty + d * Math.sin(v.el), v.tz + d * ce * Math.cos(v.az));
    this.cam.lookAt(v.tx, v.ty, v.tz);
    this.cam.updateMatrixWorld();
  }
  draw(v) {
    this.place(v);
    if (this.dirty) this.bake();
    const r = this.renderer;
    r.render(this.scene, this.cam);
    if (!(this.haze > 0)) return;
    /* the same picture at a quarter of the size, blurred, then mixed over the sharp one */
    const W = Math.max(8, Math.round(r.domElement.width / 4)), Hh = Math.max(8, Math.round(r.domElement.height / 4));
    if (this.rtH1.width !== W || this.rtH1.height !== Hh) { this.rtH1.setSize(W, Hh); this.rtH2.setSize(W, Hh); }
    r.setRenderTarget(this.rtH1); r.clear(); r.render(this.scene, this.cam);
    for (const reach of [0.0034, 0.0017]) {
      this.blurMat.uniforms.map.value = this.rtH1.texture; this.blurMat.uniforms.step.value = [reach, 0];
      r.setRenderTarget(this.rtH2); r.render(this.quad, this.up);
      this.blurMat.uniforms.map.value = this.rtH2.texture; this.blurMat.uniforms.step.value = [0, reach * W / Hh];
      r.setRenderTarget(this.rtH1); r.render(this.quad, this.up);
    }
    r.setRenderTarget(null);
    this.hazeQuad.material.uniforms.map.value = this.rtH1.texture;
    this.hazeQuad.material.uniforms.amount.value = this.haze;
    const auto = r.autoClear;
    r.autoClear = false; r.render(this.hazeQuad, this.up); r.autoClear = auto;
  }
  /** a point of the scene, in CSS pixels of the canvas */
  project(x, y, z) {
    this.v3.set(x, y, z).project(this.cam);
    return [(this.v3.x * 0.5 + 0.5) * this.w, (-this.v3.y * 0.5 + 0.5) * this.h];
  }
  png() { return this.renderer.domElement.toDataURL('image/png'); }
  dispose() {
    this.devices.forEach((d) => d && d.dispose());
    for (const k in this.M) { const m = this.M[k]; if (m.map) m.map.dispose(); if (m.bumpMap) m.bumpMap.dispose(); m.dispose(); }
    this.rtA.dispose(); this.rtB.dispose(); this.rtH1.dispose(); this.rtH2.dispose(); this.hazeQuad.material.dispose(); this.env.dispose();
    this.renderer.dispose();
  }
}
