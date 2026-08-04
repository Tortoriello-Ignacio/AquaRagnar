/* ============================================================
   Galería de programas — puerto a JS vanilla del componente
   CircularGallery de React Bits (dependencia: ogl).

   Diferencias con el original:
     · sin React: se monta sobre un div y lee las fotos del DOM
     · sin curvatura (bend = 0): las tarjetas van en línea recta
     · sin deformación: el vertex shader no ondula los planos
     · sin rótulo bajo cada foto
     · la tarjeta centrada se ve nítida, las laterales desenfocadas
     · loop continuo: se repiten las fotos hasta cubrir el ancho
     · rueda y arrastre se escuchan en el contenedor, no en window
   ============================================================ */
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';

const ANCHO_TARJETA = 2040; // referencia en px sobre una pantalla de 1500 de alto
const ALTO_TARJETA = 1020;  // proporcion 2:1, igual que las fotos
const SEPARACION = 1.5;     // aire entre tarjetas, en unidades de escena
const ANCHO_MAXIMO = 0.9;   // la tarjeta nunca pasa este % del ancho del lienzo
const DERIVA = 0.04;        // avance automatico por frame, en unidades de escena

/* Tamano de la tarjeta en px para un lienzo dado. Se acota por ancho para que
   en pantallas angostas siempre asomen las vecinas. */
function medidas(screen) {
  const escala = screen.height / 1500;
  let ancho = ANCHO_TARJETA * escala;
  let alto = ALTO_TARJETA * escala;
  const tope = screen.width * ANCHO_MAXIMO;
  if (ancho > tope) {
    const k = tope / ancho;
    ancho *= k;
    alto *= k;
  }
  return { ancho, alto };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

class Tarjeta {
  constructor(opciones) {
    Object.assign(this, opciones);
    this.extra = 0;
    this.crearPrograma();
    this.plane = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
    this.plane.setParent(this.scene);
    this.onResize();
  }

  crearPrograma() {
    // Sin mipmaps: la textura se muestra casi 1:1 contra los píxeles de
    // pantalla, y el filtrado de mipmap la ablandaba de más.
    const texture = new Texture(this.gl, {
      generateMipmaps: false,
      minFilter: this.gl.LINEAR,
      magFilter: this.gl.LINEAR
    });

    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      // Vertex plano: los planos quedan quietos y alineados.
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        uniform float uBlur;      // 0 = centrada y nitida, 1 = lateral
        varying vec2 vUv;

        float cajaRedondeada(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        // Desenfoque de 9 muestras: solo se calcula si hace falta.
        vec4 muestrear(vec2 uv) {
          if (uBlur < 0.01) return texture2D(tMap, uv);
          float r = uBlur * 0.009;
          float q = r * 0.7;
          vec4 c = texture2D(tMap, uv) * 0.20;
          c += texture2D(tMap, uv + vec2( r, 0.0)) * 0.10;
          c += texture2D(tMap, uv + vec2(-r, 0.0)) * 0.10;
          c += texture2D(tMap, uv + vec2(0.0,  r)) * 0.10;
          c += texture2D(tMap, uv + vec2(0.0, -r)) * 0.10;
          c += texture2D(tMap, uv + vec2( q,  q)) * 0.10;
          c += texture2D(tMap, uv + vec2( q, -q)) * 0.10;
          c += texture2D(tMap, uv + vec2(-q,  q)) * 0.10;
          c += texture2D(tMap, uv + vec2(-q, -q)) * 0.10;
          return c;
        }

        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = muestrear(uv);

          // Las laterales ademas pierden algo de luz y de presencia.
          vec3 rgb = color.rgb * mix(1.0, 0.86, uBlur);

          float d = cajaRedondeada(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float suave = 0.002;
          float alpha = 1.0 - smoothstep(-suave, suave, d);

          gl_FragColor = vec4(rgb, alpha * mix(1.0, 0.72, uBlur));
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uBorderRadius: { value: this.borderRadius },
        uBlur: { value: 0 }
      },
      transparent: true
    });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  update(scroll, direccion) {
    this.plane.position.x = this.x - scroll.current - this.extra;
    this.plane.position.y = 0;
    this.plane.rotation.z = 0;

    // Nitidez segun que tan cerca del centro esta la tarjeta. El umbral es
    // ancho a proposito: como el carrusel deriva sin imantarse, la tarjeta
    // "del medio" casi nunca esta exactamente en x = 0 y se veia borrosa.
    const distancia = Math.abs(this.plane.position.x) / this.plane.scale.x;
    this.program.uniforms.uBlur.value = clamp01((distancia - 0.55) / 0.45);

    // Bucle: la tarjeta que sale por un borde reaparece por el otro.
    const mitad = this.plane.scale.x / 2;
    const borde = this.viewport.width / 2;
    if (direccion === 'right' && this.plane.position.x + mitad < -borde) this.extra -= this.anchoTotal;
    if (direccion === 'left' && this.plane.position.x - mitad > borde) this.extra += this.anchoTotal;
  }

  onResize({ screen, viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    const { ancho, alto } = medidas(this.screen);
    this.plane.scale.y = (this.viewport.height * alto) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * ancho) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.ancho = this.plane.scale.x + SEPARACION;
    this.anchoTotal = this.ancho * this.length;
    this.x = this.ancho * this.index;
  }
}

class Galeria {
  constructor(contenedor, opciones = {}) {
    const {
      items = [],
      borderRadius = 0.06,
      scrollSpeed = 2,
      scrollEase = 0.05,
      onCentrar = () => {}
    } = opciones;

    this.contenedor = contenedor;
    this.items = items;
    this.borderRadius = borderRadius;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCentrar = onCentrar;
    this.centrado = -1;

    this.crearRenderer();
    this.crearCamara();
    this.scene = new Transform();
    this.onResize();
    this.geometry = new Plane(this.gl, { widthSegments: 1, heightSegments: 1 });
    this.crearTarjetas();
    this.escuchar();
    this.update();
  }

  crearRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.contenedor.appendChild(this.gl.canvas);
  }

  crearCamara() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  /* Repite la lista hasta cubrir con holgura el ancho visible: asi el bucle
     nunca deja un hueco, por ancha que sea la pantalla. */
  crearTarjetas() {
    const anchoTarjeta =
      (this.viewport.width * medidas(this.screen).ancho) / this.screen.width + SEPARACION;
    const necesarias = Math.ceil((this.viewport.width * 2.5) / anchoTarjeta);
    const vueltas = Math.max(2, Math.ceil(necesarias / this.items.length));

    const lista = [];
    for (let v = 0; v < vueltas; v++) lista.push(...this.items);

    this.tarjetas = lista.map((dato, index) => new Tarjeta({
      geometry: this.geometry,
      gl: this.gl,
      image: dato.image,
      index,
      length: lista.length,
      scene: this.scene,
      screen: this.screen,
      viewport: this.viewport,
      borderRadius: this.borderRadius
    }));
  }

  /* ---------- interaccion ---------- */
  escuchar() {
    const c = this.contenedor;
    window.addEventListener('resize', this.onResize.bind(this));

    c.addEventListener('wheel', e => {
      const delta = e.deltaY || e.wheelDelta || e.detail;
      this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    }, { passive: true });

    const bajar = e => {
      this.arrastrando = true;
      this.movido = 0;
      this.scroll.position = this.scroll.current;
      this.inicioX = e.touches ? e.touches[0].clientX : e.clientX;
    };
    const mover = e => {
      if (!this.arrastrando) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      this.movido = Math.abs(this.inicioX - x);
      this.scroll.target = this.scroll.position + (this.inicioX - x) * (this.scrollSpeed * 0.025);
    };
    const soltar = e => {
      if (!this.arrastrando) return;
      this.arrastrando = false;
      if (this.movido < 8) this.tocar(e); // fue un clic, no un arrastre
    };

    c.addEventListener('mousedown', bajar);
    c.addEventListener('touchstart', bajar, { passive: true });
    window.addEventListener('mousemove', mover);
    window.addEventListener('touchmove', mover, { passive: true });
    window.addEventListener('mouseup', soltar);
    window.addEventListener('touchend', soltar);

    c.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); this.scroll.target += this.tarjetas[0].ancho; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.scroll.target -= this.tarjetas[0].ancho; }
    });
  }

  /* clic: trae al centro la tarjeta que esta bajo el puntero */
  tocar(e) {
    const rect = this.contenedor.getBoundingClientRect();
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const xMundo = ((clientX - rect.left) / rect.width - 0.5) * this.viewport.width;

    const elegida = this.tarjetas.find(
      t => Math.abs(xMundo - t.plane.position.x) <= t.plane.scale.x / 2
    );
    if (elegida) this.scroll.target = elegida.x - elegida.extra;
  }

  onResize() {
    this.screen = { width: this.contenedor.clientWidth, height: this.contenedor.clientHeight };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const alto = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.viewport = { width: alto * this.camera.aspect, height: alto };
    if (this.tarjetas) {
      this.tarjetas.forEach(t => t.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }

  update() {
    // Movimiento continuo: se detiene solo mientras el usuario arrastra.
    if (!this.arrastrando) this.scroll.target += DERIVA;

    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direccion = this.scroll.current > this.scroll.last ? 'right' : 'left';
    this.tarjetas.forEach(t => t.update(this.scroll, direccion));

    let masCerca = 0;
    let dist = Infinity;
    this.tarjetas.forEach((t, i) => {
      const d = Math.abs(t.plane.position.x);
      if (d < dist) { dist = d; masCerca = i; }
    });
    const indice = masCerca % this.items.length;
    if (indice !== this.centrado) {
      this.centrado = indice;
      this.onCentrar(indice);
    }

    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = requestAnimationFrame(this.update.bind(this));
  }
}

/* ============================================================
   Montaje
   ============================================================ */
const lienzo = document.getElementById('galeriaProgramas');
const origen = document.getElementById('origenProgramas');

if (lienzo && origen) {
  const items = Array.prototype.map.call(origen.querySelectorAll('li'), li => ({
    image: li.querySelector('img').src,
    texto: li.dataset.texto,
    grupo: li.dataset.grupo,
    detalle: li.dataset.detalle,
    descripcion: li.dataset.descripcion
  }));

  const fNombre = document.getElementById('fichaNombre');
  const fDetalle = document.getElementById('fichaDetalle');
  const fTexto = document.getElementById('fichaTexto');
  const fBoton = document.getElementById('fichaBoton');
  let actual = items[0];

  const mostrar = i => {
    actual = items[i];
    if (!fNombre) return;
    fNombre.textContent = actual.texto;
    fDetalle.textContent = actual.detalle;
    fTexto.textContent = actual.descripcion;
  };

  if (fBoton) {
    fBoton.addEventListener('click', () => {
      const select = document.getElementById('grupo');
      if (select) {
        Array.prototype.forEach.call(select.options, o => {
          if (o.value === actual.grupo || o.text === actual.grupo) select.value = o.value;
        });
      }
      document.getElementById('sumate').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  new Galeria(lienzo, {
    items,
    borderRadius: 0.06,
    scrollSpeed: 2,
    scrollEase: 0.05,
    onCentrar: mostrar
  });
}
