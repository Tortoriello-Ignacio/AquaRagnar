/* ============================================================
   AquaRagnar · armado del maquetado repetido
   Convierte los arrays de datos.js en HTML. Se ejecuta antes que
   los módulos (torpedo.js, galeria.js, silk.js), así que cuando
   ellos arrancan el DOM ya está completo.
   ============================================================ */
(function (D) {
  "use strict";
  if (!D) return;

  /* escapa texto que va dentro de un atributo o del contenido */
  function esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function pintar(id, html) {
    var caja = document.getElementById(id);
    if (caja) caja.insertAdjacentHTML("beforeend", html);
    return caja;
  }

  /* ---------- Programas: fuente de datos de la galería WebGL ---------- */
  (function () {
    pintar("origenProgramas", D.PROGRAMAS.map(function (p) {
      return '' +
      '<li data-texto="' + esc(p.texto) + '" data-grupo="' + esc(p.grupo) + '"' +
      ' data-detalle="' + esc(p.detalle) + '" data-descripcion="' + esc(p.descripcion) + '">' +
        '<img src="' + esc(p.foto) + '" width="1800" height="900" alt="' + esc(p.alt) + '">' +
      '</li>';
    }).join(""));

    /* la ficha arranca mostrando el primer programa */
    var primero = D.PROGRAMAS[0];
    var poner = function (id, texto) {
      var el = document.getElementById(id);
      if (el) el.textContent = texto;
    };
    if (primero) {
      poner("fichaNombre", primero.texto);
      poner("fichaTexto", primero.descripcion);
    }

    /* ---------- Alto reservado de la ficha ----------
       galeria.js cambia el texto de la ficha según la foto que quede
       centrada. Como cada descripción mide distinto, la ficha cambiaba
       de alto y toda la página de abajo saltaba. Se mide la más larga
       una sola vez y se reserva ese alto. */
    var reservar = function (id, campo) {
      var caja = document.getElementById(id);
      if (!caja) return;
      var antes = caja.textContent;
      caja.style.minHeight = "0px";
      var alto = 0;
      D.PROGRAMAS.forEach(function (p) {
        caja.textContent = p[campo];
        alto = Math.max(alto, caja.offsetHeight);
      });
      caja.textContent = antes;
      caja.style.minHeight = alto + "px";
    };

    var medirFicha = function () {
      reservar("fichaNombre", "texto");
      reservar("fichaTexto", "descripcion");
    };

    medirFicha();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(medirFicha).catch(function () {});
    }
    var pendiente;
    window.addEventListener("resize", function () {
      window.clearTimeout(pendiente);
      pendiente = window.setTimeout(medirFicha, 150);
    }, { passive: true });
  })();

  /* ---------- Mosaico del equipo ---------- */
  (function () {
    pintar("mosaico", D.EQUIPO.map(function (f, i) {
      var forma = f.forma ? " mosaico__celda--" + f.forma : "";
      return '' +
      '<button class="mosaico__celda' + forma + '" type="button" data-foto="' + i + '"' +
      ' aria-label="Ampliar foto: ' + esc(f.titulo) + '">' +
        '<img class="mosaico__foto" src="' + esc(f.foto) + '" alt="' + esc(f.alt) + '"' +
        ' loading="lazy" decoding="async" width="' + f.ancho + '" height="' + f.alto + '">' +
        '<span class="mosaico__pie">' + esc(f.titulo) + '</span>' +
      '</button>';
    }).join(""));
  })();

  /* ---------- Vitrina de la tienda ---------- */
  (function () {
    pintar("vitrina", D.DESTACADOS.map(function (p) {
      return '' +
      '<a class="vitrina__item" href="tienda.html">' +
        '<span class="vitrina__arte">' +
          '<img class="vitrina__foto" src="' + D.CDN_TIENDA + esc(p.foto) + '"' +
          ' alt="' + esc(p.nombre) + '" loading="lazy" decoding="async" width="640" height="480">' +
        '</span>' +
        '<span class="vitrina__cuerpo">' +
          '<span class="vitrina__cat">' + esc(p.categoria) + '</span>' +
          '<span class="vitrina__nombre">' + esc(p.nombre) + '</span>' +
          '<span class="vitrina__precio">' + esc(p.precio) + '</span>' +
        '</span>' +
      '</a>';
    }).join(""));
  })();
})(window.AR);
