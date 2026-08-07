/* ============================================================
   AquaRagnar · PillNav
   ------------------------------------------------------------
   Port a JS puro del componente PillNav de React Bits.
   La geometría del círculo es la misma del original; la animación
   la resuelve CSS en vez de GSAP (ver pillnav.css).

   Los ítems salen de AR.MENU (datos.js), así que se agregan o
   cambian desde ahí, no acá.
   ============================================================ */
(function (D) {
  "use strict";

  var nav = document.getElementById("pillnav");
  if (!nav || !D || !D.MENU) return;

  var lista, botonMenu, popover, abierto = false;

  /* ---------- armado ---------- */
  function esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function pastilla(item) {
    return '<li role="none">' +
      '<a class="pill" role="menuitem" href="' + item.destino + '" ' +
         'aria-label="' + esc(item.texto) + '">' +
        '<span class="pill__circulo" aria-hidden="true"></span>' +
        '<span class="pill__pila">' +
          '<span class="pill__texto">' + esc(item.texto) + '</span>' +
          '<span class="pill__texto pill__texto--hover" aria-hidden="true">' + esc(item.texto) + '</span>' +
        '</span>' +
      '</a></li>';
  }

  function montar() {
    nav.innerHTML =
      '<div class="pillnav__items">' +
        '<ul class="pillnav__lista" role="menubar">' +
          D.MENU.map(pastilla).join("") +
        "</ul>" +
      "</div>" +
      '<button class="pillnav__hamburguesa" type="button" ' +
              'aria-label="Abrir el menú" aria-expanded="false" aria-controls="pillnavMovil">' +
        '<span class="pillnav__raya"></span><span class="pillnav__raya"></span>' +
      "</button>";

    popover = document.createElement("div");
    popover.className = "pillnav__movil";
    popover.id = "pillnavMovil";
    popover.hidden = true;
    popover.innerHTML = '<ul class="pillnav__movil-lista">' +
      D.MENU.map(function (i) {
        return '<li><a class="pillnav__movil-enlace" href="' + i.destino + '">' +
               esc(i.texto) + "</a></li>";
      }).join("") + "</ul>";
    document.body.appendChild(popover);   /* fixed: mejor colgando del body */

    lista = nav.querySelector(".pillnav__lista");
    botonMenu = nav.querySelector(".pillnav__hamburguesa");
  }

  /* ---------- geometría del círculo ----------
     Misma fórmula que el componente original: el círculo tiene que
     ser lo bastante grande como para tapar la pastilla entera al
     crecer desde el borde de abajo. */
  function medir() {
    Array.prototype.forEach.call(nav.querySelectorAll(".pill"), function (pill) {
      var circulo = pill.querySelector(".pill__circulo");
      var hover = pill.querySelector(".pill__texto--hover");
      var r = pill.getBoundingClientRect();
      var w = r.width, h = r.height;
      if (!w || !h) return;

      var R = ((w * w) / 4 + h * h) / (2 * h);
      var Dm = Math.ceil(2 * R) + 2;
      var delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;

      circulo.style.width = Dm + "px";
      circulo.style.height = Dm + "px";
      circulo.style.bottom = "-" + delta + "px";
      circulo.style.transformOrigin = "50% " + (Dm - delta) + "px";

      /* cuánto viaja cada texto */
      pill.style.setProperty("--salto", (h + 8) + "px");
      if (hover) hover.style.setProperty("--entrada", (h + 100) + "px");
    });
  }

  /* ---------- menú móvil ---------- */
  function moverMovil(abrir) {
    abierto = abrir;
    botonMenu.setAttribute("aria-expanded", String(abrir));
    botonMenu.setAttribute("aria-label", abrir ? "Cerrar el menú" : "Abrir el menú");
    botonMenu.classList.toggle("is-abierto", abrir);
    if (abrir) {
      popover.hidden = false;
      requestAnimationFrame(function () { popover.classList.add("is-abierto"); });
    } else {
      popover.classList.remove("is-abierto");
      window.setTimeout(function () { if (!abierto) popover.hidden = true; }, 220);
    }
  }

  /* ---------- sección activa ---------- */
  function vigilar() {
    var secciones = D.MENU.map(function (i) {
      return i.destino.charAt(0) === "#" ? document.querySelector(i.destino) : null;
    });
    if (!("IntersectionObserver" in window)) return;

    var visibles = {};
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { visibles[e.target.id] = e.isIntersecting; });
      /* gana la primera del menú que esté en pantalla */
      var activo = null;
      secciones.forEach(function (s, i) {
        if (!activo && s && visibles[s.id]) activo = D.MENU[i].destino;
      });
      Array.prototype.forEach.call(nav.querySelectorAll(".pill"), function (p) {
        p.classList.toggle("is-activa", p.getAttribute("href") === activo);
      });
      Array.prototype.forEach.call(popover.querySelectorAll(".pillnav__movil-enlace"), function (a) {
        a.classList.toggle("is-activa", a.getAttribute("href") === activo);
      });
    }, { rootMargin: "-45% 0px -45% 0px" });

    secciones.forEach(function (s) { if (s) obs.observe(s); });
  }

  /* ---------- arranque ---------- */
  montar();
  medir();
  vigilar();

  window.addEventListener("resize", medir, { passive: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(medir).catch(function () {});
  }

  botonMenu.addEventListener("click", function () { moverMovil(!abierto); });
  popover.addEventListener("click", function (ev) {
    if (ev.target.closest("a")) moverMovil(false);
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && abierto) { moverMovil(false); botonMenu.focus(); }
  });
  document.addEventListener("click", function (ev) {
    if (!abierto) return;
    if (!popover.contains(ev.target) && !botonMenu.contains(ev.target)) moverMovil(false);
  });

  /* entrada al cargar */
  requestAnimationFrame(function () { nav.classList.add("is-listo"); });
})(window.AR);
