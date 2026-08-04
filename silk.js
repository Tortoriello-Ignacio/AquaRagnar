/* ============================================================
   Silk — fondo de ondas suaves.
   Puerto a JS vanilla del componente <Silk /> de React Bits
   (https://reactbits.dev/backgrounds/silk).

   Los shaders son los del registry, sin tocar. Los cambios son de
   integración:
     · sin React ni @react-three/fiber: three.js pelado sobre un <canvas>
       por sección, montado desde atributos data- del HTML
     · un uniform extra, uContraste, para que la onda module el color de la
       sección en vez de reemplazarlo (con el patrón original, que va de 0.2
       a 1.0, cada sección perdía su tono y se iba a oscuro)
     · se pausa el render de las secciones que no están en pantalla
   ============================================================ */
import * as THREE from 'three';

const CONFIG = {
  speed: 3.7,
  scale: 1.1,
  noiseIntensity: 0,
  rotation: 3.71,
  contraste: 0.38 // 0 = color plano, 1 = patrón original de React Bits
};

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;
uniform float uContraste;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  // Único agregado: el patrón se acerca a 1 según uContraste, así la sección
  // conserva su color y la onda sólo lo modula.
  float p = mix(1.0, pattern, uContraste);

  vec4 col = vec4(uColor, 1.0) * vec4(p) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`;

function hexANormalizado(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ];
}

class Silk {
  constructor(contenedor, color) {
    this.contenedor = contenedor;

    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.className = 'silk';
    contenedor.prepend(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.uniforms = {
      uSpeed: { value: CONFIG.speed },
      uScale: { value: CONFIG.scale },
      uNoiseIntensity: { value: CONFIG.noiseIntensity },
      uColor: { value: new THREE.Color(...hexANormalizado(color)) },
      uRotation: { value: CONFIG.rotation },
      uContraste: { value: CONFIG.contraste },
      uTime: { value: Math.random() * 40 } // desfasa cada sección
    };

    this.scene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2, 1, 1),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader })
    ));

    this.medir();
    new ResizeObserver(() => this.medir()).observe(contenedor);

    // Sólo se anima lo que está a la vista.
    this.visible = false;
    new IntersectionObserver(entradas => {
      entradas.forEach(e => {
        this.visible = e.isIntersecting;
        if (this.visible && !this.quieto) this.arrancar();
      });
    }, { rootMargin: '120px' }).observe(contenedor);

    this.quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.quieto) this.renderer.render(this.scene, this.camera);
    else this.arrancar();
  }

  medir() {
    const { clientWidth: w, clientHeight: h } = this.contenedor;
    if (w && h) this.renderer.setSize(w, h, false);
  }

  arrancar() {
    if (this.raf) return;
    let previo = performance.now();
    const paso = ahora => {
      const delta = Math.min((ahora - previo) / 1000, 0.05);
      previo = ahora;
      this.uniforms.uTime.value += 0.1 * delta;
      this.renderer.render(this.scene, this.camera);
      if (this.visible) this.raf = requestAnimationFrame(paso);
      else this.raf = null;
    };
    this.raf = requestAnimationFrame(paso);
  }
}

document.querySelectorAll('[data-silk]').forEach(seccion => {
  try {
    new Silk(seccion, seccion.dataset.silk);
  } catch (error) {
    console.warn('Silk: no se pudo montar en', seccion.id, error);
  }
});
