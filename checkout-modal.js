/* ============================================================
   AquaRagnar · Checkout — MODAL
   ------------------------------------------------------------
   Dos pasos: (1) datos del cliente, (2) orden + datos bancarios.
   Se apoya en window.AR_CARRITO, que expone tienda.html.
   Punto de entrada:  AR_CHECKOUT.iniciar()
   ============================================================ */
window.AR_CHECKOUT = window.AR_CHECKOUT || {};

(function (CONFIG, estado, correos) {
  "use strict";

  var capa = null;      // el overlay
  var caja = null;      // el panel blanco
  var focoPrevio = null;
  var ordenActual = null;

  /* ---------- helpers ---------- */
  function esc(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function carrito() {
    return window.AR_CARRITO || null;
  }

  function formato(n) {
    var c = carrito();
    return c && c.formato ? c.formato(n) : "$" + n;
  }

  /* ---------- armazón ---------- */
  function montar() {
    if (capa) return;
    capa = document.createElement("div");
    capa.className = "co";
    capa.id = "checkout";
    capa.hidden = true;
    capa.setAttribute("role", "dialog");
    capa.setAttribute("aria-modal", "true");
    capa.setAttribute("aria-label", "Finalizar compra");
    capa.innerHTML =
      '<div class="co__fondo" data-cerrar></div>' +
      '<div class="co__caja" role="document">' +
        '<button class="co__cerrar" type="button" data-cerrar aria-label="Cerrar">✕</button>' +
        '<div class="co__cuerpo"></div>' +
      '</div>';
    document.body.appendChild(capa);
    caja = capa.querySelector(".co__cuerpo");

    capa.addEventListener("click", function (ev) {
      if (ev.target.closest("[data-cerrar]")) cerrar();
    });
    document.addEventListener("keydown", function (ev) {
      if (capa.hidden) return;
      if (ev.key === "Escape") cerrar();
      if (ev.key === "Tab") atraparFoco(ev);
    });
  }

  function atraparFoco(ev) {
    var f = capa.querySelectorAll('a[href],button:not([disabled]),input,select,textarea');
    if (!f.length) return;
    var primero = f[0], ultimo = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === primero) { ultimo.focus(); ev.preventDefault(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { primero.focus(); ev.preventDefault(); }
  }

  function abrir() {
    montar();
    focoPrevio = document.activeElement;
    capa.hidden = false;
    document.body.classList.add("co-abierto");
    requestAnimationFrame(function () { capa.classList.add("is-abierto"); });
  }

  function cerrar() {
    if (!capa || capa.hidden) return;
    capa.classList.remove("is-abierto");
    window.setTimeout(function () {
      capa.hidden = true;
      document.body.classList.remove("co-abierto");
      if (focoPrevio) focoPrevio.focus();
    }, 220);
  }

  /* ============================================================
     PASO 1 · Datos del cliente
     ============================================================ */
  function pasoDatos(previos) {
    var c = previos || estado.clienteGuardado() || {};
    caja.innerHTML =
      '<p class="co__paso">Paso 1 de 2</p>' +
      '<h2 class="co__titulo">Tus datos</h2>' +
      '<p class="co__bajada">Los necesitamos para armar la orden y mandarte el resumen.</p>' +
      '<form class="co__form" novalidate>' +
        campo("nombre", "Nombre", "text", "Erika", c.nombre, "given-name") +
        campo("apellido", "Apellido", "text", "Larsen", c.apellido, "family-name") +
        campo("email", "Email", "email", "erika@correo.com", c.email, "email") +
        campo("whatsapp", "WhatsApp", "tel", "11 6262 1831", c.whatsapp, "tel") +
        '<button class="co__btn co__btn--principal" type="submit">Continuar</button>' +
        '<p class="co__nota">No compartimos tus datos con nadie.</p>' +
      "</form>";

    var form = caja.querySelector("form");
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var datos = {
        nombre:   form.nombre.value,
        apellido: form.apellido.value,
        email:    form.email.value,
        whatsapp: form.whatsapp.value
      };
      var errores = estado.validar(datos);
      pintarErrores(form, errores);
      if (Object.keys(errores).length) {
        var primero = form.querySelector(".co__campo.mal input");
        if (primero) primero.focus();
        return;
      }
      estado.guardarCliente(datos);
      generarOrden(datos);
    });

    window.setTimeout(function () {
      var vacio = caja.querySelector("input[value='']") || caja.querySelector("input");
      if (vacio) vacio.focus();
    }, 80);
  }

  function campo(id, etiqueta, tipo, ejemplo, valor, autocomplete) {
    return '<div class="co__campo" data-campo="' + id + '">' +
        '<label for="co-' + id + '">' + etiqueta + "</label>" +
        '<input id="co-' + id + '" name="' + id + '" type="' + tipo + '" ' +
          'placeholder="' + esc(ejemplo) + '" value="' + esc(valor || "") + '" ' +
          'autocomplete="' + autocomplete + '">' +
        '<p class="co__error"></p>' +
      "</div>";
  }

  function pintarErrores(form, errores) {
    Array.prototype.forEach.call(form.querySelectorAll(".co__campo"), function (div) {
      var id = div.dataset.campo;
      var mal = Boolean(errores[id]);
      div.classList.toggle("mal", mal);
      div.querySelector(".co__error").textContent = errores[id] || "";
    });
  }

  /* ============================================================
     PASO 2 · Orden generada + datos para transferir
     ============================================================ */
  function generarOrden(cliente) {
    var c = carrito();
    var items = c ? c.items() : [];
    var total = c ? c.total() : 0;

    if (!items.length) {
      caja.innerHTML = '<h2 class="co__titulo">El bolso está vacío</h2>' +
        '<p class="co__bajada">Agregá algo antes de finalizar la compra.</p>' +
        '<button class="co__btn" type="button" data-cerrar>Volver a la tienda</button>';
      return;
    }

    ordenActual = estado.crearOrden(cliente, items, total);
    estado.archivar(ordenActual);
    pasoPago(ordenActual);

    /* los mails salen en segundo plano, sin bloquear la pantalla */
    correos.enviar(ordenActual, formato).then(function (r) {
      var aviso = caja.querySelector("[data-aviso-mail]");
      if (!aviso) return;
      if (!r.configurado) { aviso.textContent = ""; return; }
      aviso.textContent = r.cliente
        ? "Te mandamos el resumen a " + ordenActual.cliente.email + "."
        : "No pudimos mandarte el mail; guardá esta pantalla o escribinos por WhatsApp.";
    });

    if (CONFIG.opciones.vaciarBolsoAlConfirmar && c && c.vaciar) c.vaciar();
  }

  function pasoPago(orden) {
    var b = CONFIG.banco;
    var enlace = "https://wa.me/" + CONFIG.whatsapp.numero +
                 "?text=" + encodeURIComponent(CONFIG.whatsapp.mensaje(orden));

    caja.innerHTML =
      '<div class="co__ok" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="m4 12 5.5 5.5L20 7"/></svg>' +
      "</div>" +
      '<p class="co__paso">Paso 2 de 2</p>' +
      '<h2 class="co__titulo">¡Listo, ' + esc(orden.cliente.nombre) + "!</h2>" +
      '<p class="co__bajada">Generamos tu orden <b>' + esc(orden.id) + "</b>. " +
        'Queda <b class="co__pendiente">' + esc(orden.estado) + "</b> hasta que recibamos la transferencia.</p>" +

      '<div class="co__total"><span>Total a transferir</span><b>' + formato(orden.total) + "</b></div>" +

      '<div class="co__banco">' +
        '<h3 class="co__subtitulo">Datos para transferir</h3>' +
        dato("Alias", b.alias, true) +
        dato("CBU", b.cbu, true) +
        dato("Titular", b.titular, false) +
        (b.banco ? dato("Banco", b.banco, false) : "") +
        qr(b) +
      "</div>" +

      '<a class="co__btn co__btn--wa" href="' + enlace + '" target="_blank" rel="noopener">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.16 8.16 0 0 1-1.25-4.38c0-4.54 3.7-8.23 8.23-8.23 2.2 0 4.26.86 5.82 2.41a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.15 3.66.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>' +
        "Enviar comprobante por WhatsApp" +
      "</a>" +

      '<p class="co__nota" data-aviso-mail>Te estamos mandando el resumen por mail…</p>' +
      '<button class="co__btn co__btn--suave" type="button" data-cerrar>Seguir mirando la tienda</button>';

    caja.addEventListener("click", copiar);
    window.setTimeout(function () {
      var wa = caja.querySelector(".co__btn--wa");
      if (wa) wa.focus();
    }, 120);
  }

  function dato(etiqueta, valor, copiable) {
    return '<div class="co__dato">' +
        '<span class="co__dato-et">' + esc(etiqueta) + "</span>" +
        '<span class="co__dato-val">' + esc(valor) + "</span>" +
        (copiable
          ? '<button class="co__copiar" type="button" data-copiar="' + esc(valor) + '">Copiar</button>'
          : "") +
      "</div>";
  }

  function qr(b) {
    if (b.qr) {
      return '<figure class="co__qr">' +
          '<img src="' + esc(b.qr) + '" alt="Código QR para transferir" loading="lazy">' +
          "<figcaption>Escaneá con tu app del banco</figcaption>" +
        "</figure>";
    }
    return '<div class="co__qr co__qr--vacio">' +
        "<span>Acá va el QR</span>" +
        '<small>Guardá la imagen en la carpeta y poné su nombre en <code>checkout-config.js</code> → <code>banco.qr</code></small>' +
      "</div>";
  }

  function copiar(ev) {
    var btn = ev.target.closest("[data-copiar]");
    if (!btn) return;
    var texto = btn.dataset.copiar;
    var listo = function () {
      var antes = btn.textContent;
      btn.textContent = "¡Copiado!";
      btn.classList.add("ok");
      window.setTimeout(function () { btn.textContent = antes; btn.classList.remove("ok"); }, 1600);
    };
    /* si el navegador niega el portapapeles (contexto no seguro, permisos)
       caemos al truco del textarea, que funciona en todos lados */
    var respaldo = function () {
      var t = document.createElement("textarea");
      t.value = texto;
      t.setAttribute("readonly", "");
      t.style.cssText = "position:fixed;top:-9999px;opacity:0";
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); listo(); } catch (e) {}
      document.body.removeChild(t);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(listo, respaldo);
    } else {
      respaldo();
    }
  }

  /* ============================================================
     Entrada pública
     ============================================================ */
  window.AR_CHECKOUT.iniciar = function () {
    var c = carrito();
    if (!c || !c.items().length) return;
    abrir();
    var guardado = estado.clienteGuardado();
    /* Si ya compró antes, mostramos igual el paso 1 con los datos
       cargados: le da la chance de corregir el mail antes de pagar. */
    pasoDatos(guardado);
  };

  window.AR_CHECKOUT.cerrar = cerrar;
  window.AR_CHECKOUT.ordenActual = function () { return ordenActual; };

})(window.AR_CHECKOUT_CONFIG, window.AR_CHECKOUT.estado, window.AR_CHECKOUT.correos);
