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
  contraste: 0.25 // 0 = color plano, 1 = patrón original de React Bits
};

/* CAMBIO: el degradé global de la landing. Tiene que coincidir con
   --grad-a / --grad-b del CSS para que el pie (que no tiene lienzo)
   empalme sin escalón. */
const GRAD_A = '#7ebae0'; // arriba del documento
const GRAD_B = '#f8fcff'; // abajo del documento
const REF_ALTO = 900;     // px de referencia para que la onda no se estire

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
/* CAMBIO: dos colores (arriba/abajo de la sección) en vez de uno plano */
uniform vec3  uColorTop;
uniform vec3  uColorBot;
/* CAMBIO: posición de la sección dentro del documento, para que el patrón
   sea continuo de una sección a la siguiente */
uniform float uYOff;
uniform float uYScale;
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
  // coordenada en el espacio del documento: la onda no se corta entre secciones
  vec2  vUvG       = vec2(vUv.x, uYOff + (1.0 - vUv.y) * uYScale);
  vec2  uv         = rotateUvs(vUvG * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  // El patrón se acerca a 1 según uContraste, así la sección conserva su color
  // y la onda sólo lo modula. Se divide por 0.6 (la media del patrón) para que
  // el promedio quede en 1 y el color coincida con el degradé del CSS.
  float p = mix(1.0, pattern / 0.6, uContraste);

  vec3 base = mix(uColorBot, uColorTop, vUv.y);
  vec4 col = vec4(base, 1.0) * vec4(p) - rnd / 15.0 * uNoiseIntensity;
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

/* CAMBIO: color del degradé global en una posición del documento (0 = arriba,
   1 = abajo). Mismo cálculo que hace el CSS con --grad-a / --grad-b. */
const A = hexANormalizado(GRAD_A);
const B = hexANormalizado(GRAD_B);
function colorEnDocumento(t) {
  const k = Math.min(Math.max(t, 0), 1);
  return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
}
function altoDocumento() {
  return Math.max(document.documentElement.scrollHeight, 1);
}

class Silk {
  constructor(contenedor) {
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
      uColorTop: { value: new THREE.Color(...colorEnDocumento(0)) },
      uColorBot: { value: new THREE.Color(...colorEnDocumento(1)) },
      uYOff: { value: 0 },
      uYScale: { value: 1 },
      uRotation: { value: CONFIG.rotation },
      uContraste: { value: CONFIG.contraste },
      // CAMBIO: mismo tiempo en todas las secciones -> la onda no salta
      uTime: { value: 0 }
    };

    this.scene.add(new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2, 1, 1),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader, fragmentShader })
    ));

    this.medir();
    this.ubicar();
    new ResizeObserver(() => { this.medir(); this.ubicar(); }).observe(contenedor);
    window.addEventListener('resize', () => this.ubicar());
    window.addEventListener('load', () => this.ubicar());

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

  /* CAMBIO: ubica la sección dentro del documento y le asigna el tramo de
     degradé que le toca, más el desfase para que la onda siga de largo. */
  ubicar() {
    const caja = this.contenedor.getBoundingClientRect();
    const arriba = caja.top + window.scrollY;
    const alto = caja.height || 1;
    const doc = altoDocumento();
    this.uniforms.uColorTop.value.setRGB(...colorEnDocumento(arriba / doc));
    this.uniforms.uColorBot.value.setRGB(...colorEnDocumento((arriba + alto) / doc));
    this.uniforms.uYOff.value = arriba / REF_ALTO;
    this.uniforms.uYScale.value = alto / REF_ALTO;
    if (this.quieto) this.renderer.render(this.scene, this.camera);
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

/* CAMBIO: el valor de data-silk ya no se usa como color (el color sale del
   degradé global); el atributo queda sólo como marcador de sección. */
const instancias = [];
document.querySelectorAll('[data-silk]').forEach(seccion => {
  try {
    instancias.push(new Silk(seccion));
  } catch (error) {
    console.warn('Silk: no se pudo montar en', seccion.id, error);
  }
});

/* CAMBIO: si cambia el alto del documento (fuentes, galería, acordeones),
   se recalcula el tramo de degradé de cada sección. */
if (instancias.length) {
  let pendiente = false;
  const recalcular = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      instancias.forEach(i => i.ubicar());
    });
  };
  new ResizeObserver(recalcular).observe(document.body);
}
