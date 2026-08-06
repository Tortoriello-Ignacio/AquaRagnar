/* ============================================================
   AquaRagnar · comportamiento de la portada
   Barra de navegación, menú fluido, formulario, revelado al
   scrollear y visor de fotos del equipo.
   ============================================================ */
(function (D) {
  "use strict";

  /* ---------- Barra: fondo al hacer scroll ---------- */
  (function () {
    var nav = document.getElementById("nav");
    if (!nav) return;
    var alScrollear = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
  })();

  /* ---------- Menú fluido: la capa entra por el borde más cercano ---------- */
  (function () {
    var bordeCercano = function (item, e) {
      var r = item.getBoundingClientRect();
      return (e.clientY - r.top) < r.height / 2 ? "arriba" : "abajo";
    };

    Array.prototype.forEach.call(document.querySelectorAll(".menu__item"), function (item) {
      var capa = item.querySelector(".marquesina");
      var inner = item.querySelector(".marquesina__inner");
      if (!capa || !inner) return;

      var colocar = function (borde, animar) {
        var fuera = borde === "arriba" ? "-101%" : "101%";
        var dentro = borde === "arriba" ? "101%" : "-101%";
        item.classList.toggle("marquesina--sin-transicion", !animar);
        capa.style.transform = "translate3d(0," + fuera + ",0)";
        inner.style.transform = "translate3d(0," + dentro + ",0)";
      };

      item.addEventListener("mouseenter", function (e) {
        colocar(bordeCercano(item, e), false);
        void capa.offsetWidth; /* fuerza el reflow antes de reactivar la transición */
        item.classList.remove("marquesina--sin-transicion");
        capa.style.transform = "translate3d(0,0,0)";
        inner.style.transform = "translate3d(0,0,0)";
      });

      item.addEventListener("mouseleave", function (e) {
        colocar(bordeCercano(item, e), true);
      });
    });
  })();

  /* ---------- Formulario de inscripción ---------- */
  (function () {
    var form = document.getElementById("inscripcion");
    var exito = document.getElementById("exito");
    if (!form) return;

    var marcar = function (id, mensaje) {
      document.getElementById("campo-" + id).classList.toggle("tiene-error", Boolean(mensaje));
      document.getElementById("error-" + id).textContent = mensaje || "";
      return !mensaje;
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var nombre = document.getElementById("nombre");
      var email = document.getElementById("email");
      var grupo = document.getElementById("grupo");

      var okNombre = marcar("nombre", nombre.value.trim().length < 2 ? "Escribí tu nombre completo." : "");
      var okEmail = marcar("email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()) ? "" : "Revisá el email: falta el @ o el dominio.");
      var okGrupo = marcar("grupo", grupo.value ? "" : "Elegí un grupo para empezar.");

      if (!(okNombre && okEmail && okGrupo)) {
        var primero = form.querySelector(".tiene-error input, .tiene-error select");
        if (primero) primero.focus();
        exito.classList.remove("visible");
        return;
      }

      exito.textContent = "Listo, " + nombre.value.trim().split(" ")[0] +
        ". Te escribimos a " + email.value.trim() + " con el horario de tu clase de prueba.";
      exito.classList.add("visible");
      form.reset();
    });
  })();

  /* ---------- Revelado al hacer scroll ---------- */
  (function () {
    var reveladores = document.querySelectorAll(".revelar");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(reveladores, function (el) { el.classList.add("visible"); });
      return;
    }

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada, i) {
        if (!entrada.isIntersecting) return;
        var el = entrada.target;
        window.setTimeout(function () { el.classList.add("visible"); }, (i % 4) * 90);
        observador.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    Array.prototype.forEach.call(reveladores, function (el) { observador.observe(el); });
  })();


  /* ---------- Enlaces que apuntan a un desplegable cerrado ---------- */
  (function () {
    function abrirAncestros(el) {
      var d = el.closest("details");
      while (d) {
        d.open = true;
        d = d.parentElement ? d.parentElement.closest("details") : null;
      }
    }

    document.addEventListener("click", function (ev) {
      var a = ev.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href").slice(1);
      if (!id) return;
      var destino = document.getElementById(id);
      if (!destino) return;
      if (destino.tagName === "DETAILS") destino.open = true;
      abrirAncestros(destino);
    });

    /* si se entra con el ancla puesta en la URL */
    if (location.hash.length > 1) {
      var d = document.getElementById(location.hash.slice(1));
      if (d) {
        if (d.tagName === "DETAILS") d.open = true;
        abrirAncestros(d);
        window.setTimeout(function () { d.scrollIntoView(); }, 60);
      }
    }
  })();

  /* ---------- Visor de las fotos del equipo ---------- */
  (function () {
    var grilla = document.getElementById("mosaico");
    if (!grilla || !D || !D.EQUIPO) return;

    var FOTOS = D.EQUIPO;
    var suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var visor = document.createElement("div");
    visor.className = "visor";
    visor.id = "visor";
    visor.hidden = true;
    visor.setAttribute("role", "dialog");
    visor.setAttribute("aria-modal", "true");
    visor.setAttribute("aria-label", "Foto ampliada");
    visor.innerHTML =
      '<div class="visor__fondo" data-cerrar></div>' +
      '<button class="visor__boton visor__cerrar" type="button" data-cerrar aria-label="Cerrar">×</button>' +
      '<button class="visor__boton visor__ante" type="button" data-paso="-1" aria-label="Foto anterior">‹</button>' +
      '<button class="visor__boton visor__sigue" type="button" data-paso="1" aria-label="Foto siguiente">›</button>' +
      '<figure class="visor__figura">' +
        '<img class="visor__foto" alt="">' +
        '<figcaption class="visor__pie">' +
          '<p class="visor__titulo"></p><p class="visor__texto"></p>' +
        '</figcaption>' +
      '</figure>';
    document.body.appendChild(visor);

    var figura = visor.querySelector(".visor__figura");
    var foto = visor.querySelector(".visor__foto");
    var titulo = visor.querySelector(".visor__titulo");
    var texto = visor.querySelector(".visor__texto");
    var indice = 0;
    var ultimoBoton = null;

    function pintar(i) {
      var d = FOTOS[i];
      if (!d) return;
      indice = i;
      foto.src = d.foto;
      foto.alt = d.alt;
      titulo.textContent = d.titulo;
      texto.textContent = d.texto;
    }

    function abrir(i, boton) {
      ultimoBoton = boton || null;
      pintar(i);
      visor.hidden = false;
      document.body.classList.add("sin-scroll");

      requestAnimationFrame(function () {
        if (suave && boton) {
          var o = boton.getBoundingClientRect();
          var f = figura.getBoundingClientRect();
          var escala = Math.max(0.12, o.width / f.width);
          var dx = (o.left + o.width / 2) - (f.left + f.width / 2);
          var dy = (o.top + o.height / 2) - (f.top + f.height / 2);
          figura.style.transition = "none";
          figura.style.transformOrigin = "center center";
          figura.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + escala + ")";
          figura.style.opacity = "0";
          requestAnimationFrame(function () {
            figura.style.transition = "transform 420ms cubic-bezier(.2,.7,.3,1),opacity 260ms ease";
            figura.style.transform = "none";
            figura.style.opacity = "1";
          });
        }
        visor.classList.add("is-abierto");
        visor.querySelector(".visor__cerrar").focus();
      });
    }

    function cerrar() {
      visor.classList.remove("is-abierto");
      if (suave) {
        figura.style.transition = "transform 260ms ease,opacity 200ms ease";
        figura.style.transform = "scale(.94)";
        figura.style.opacity = "0";
      }
      window.setTimeout(function () {
        visor.hidden = true;
        figura.style.cssText = "";
        document.body.classList.remove("sin-scroll");
        if (ultimoBoton) ultimoBoton.focus();
      }, suave ? 240 : 0);
    }

    function paso(n) {
      pintar((indice + n + FOTOS.length) % FOTOS.length);
    }

    grilla.addEventListener("click", function (ev) {
      var celda = ev.target.closest(".mosaico__celda");
      if (celda) abrir(parseInt(celda.dataset.foto, 10), celda);
    });

    visor.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-cerrar]")) return cerrar();
      var b = ev.target.closest("[data-paso]");
      if (b) paso(parseInt(b.dataset.paso, 10));
    });

    document.addEventListener("keydown", function (ev) {
      if (visor.hidden) return;
      if (ev.key === "Escape") cerrar();
      else if (ev.key === "ArrowRight") paso(1);
      else if (ev.key === "ArrowLeft") paso(-1);
    });
  })();
})(window.AR);
