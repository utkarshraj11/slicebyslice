/* "Sketch" render style, after Pocket City's illustrated look: full resolution, antialiased, thin ink outlines
   that wobble a little like a hand-drawn line, and colours washed toward the paper with uneven pigment grain.
   Outlines come from a second render of the scene's normals and depth: a line wherever depth jumps (silhouettes)
   or the surface turns (box edges). */
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const FRAG = /* glsl */ `
uniform sampler2D tColor, tNormal, tDepth;
uniform vec2 res;       // render-target size in device px
uniform float lw;       // line width in device px
uniform vec3 ink, paper;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float edge(vec2 uv) {
  vec2 px = lw / res;
  float d = texture2D(tDepth, uv).x; vec3 n = texture2D(tNormal, uv).xyz;
  float e = 0.;
  for (int i = 0; i < 4; i++) {
    vec2 o = (i == 0 ? vec2(1, 0) : i == 1 ? vec2(-1, 0) : i == 2 ? vec2(0, 1) : vec2(0, -1)) * px;
    e = max(e, step(0.0015, abs(texture2D(tDepth, uv + o).x - d)));                // ~2 world units: silhouettes
    e = max(e, smoothstep(0.2, 0.45, distance(texture2D(tNormal, uv + o).xyz, n)));  // creases between faces
  }
  return e;
}
void main() {
  vec2 p = vUv * res / lw;
  vec2 wob = (vec2(noise(p / 14.), noise(p / 14. + 7.3)) - .5) * 2.2 * lw / res; // the hand-drawn wobble
  float e = edge(vUv + wob) * (0.7 + 0.3 * noise(p / 5.));                          // and uneven pressure
  vec3 c = texture2D(tColor, vUv).rgb;
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(l), c, 1.12);                                    // a touch more saturated, like watercolour
  c = mix(c, paper, .1) * 1.04;                                 // lightly washed toward the paper, a little brighter
  c *= .96 + noise(p / 2.5) * .05 + noise(p / 45.) * .07;       // pigment grain and blotches
  gl_FragColor = vec4(mix(c, ink, e * .78), 1.);
}`;

export class SketchPass extends Pass {
  private color: THREE.WebGLRenderTarget;
  private normals: THREE.WebGLRenderTarget;
  private normalMat = new THREE.MeshNormalMaterial();
  private quad: FullScreenQuad;
  private mat: THREE.ShaderMaterial;

  constructor(private scene: THREE.Scene, private camera: THREE.Camera, dpr: number) {
    super();
    this.color = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.normals = new THREE.WebGLRenderTarget(1, 1);
    this.normals.depthTexture = new THREE.DepthTexture(1, 1);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, tNormal: { value: null }, tDepth: { value: null },
        res: { value: new THREE.Vector2(1, 1) }, lw: { value: Math.max(1, dpr) },
        ink: { value: new THREE.Color('#3d342f') }, paper: { value: new THREE.Color('#f3efe5') },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: FRAG,
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  setSize(w: number, h: number) {
    this.color.setSize(w, h); this.normals.setSize(w, h);
    this.mat.uniforms.res.value.set(w, h);
  }
  /** Ink and paper follow the time of day (light ink on a night sky would vanish otherwise). */
  setTones(ink: string, paper: string) { this.mat.uniforms.ink.value.set(ink); this.mat.uniforms.paper.value.set(paper); }
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(this.color); renderer.clear(); renderer.render(this.scene, this.camera);
    const bg = this.scene.background; this.scene.background = null; this.scene.overrideMaterial = this.normalMat;
    renderer.setRenderTarget(this.normals); renderer.clear(); renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = null; this.scene.background = bg;
    const u = this.mat.uniforms;
    u.tColor.value = this.color.texture; u.tNormal.value = this.normals.texture; u.tDepth.value = this.normals.depthTexture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(renderer);
  }
  dispose() { this.color.dispose(); this.normals.dispose(); this.normalMat.dispose(); this.mat.dispose(); this.quad.dispose(); }
}
