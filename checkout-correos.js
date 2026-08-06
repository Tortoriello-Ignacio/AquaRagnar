/* ============================================================
   AquaRagnar · Checkout — CORREOS (EmailJS)
   ------------------------------------------------------------
   Dispara los dos mails: uno al club y otro al cliente.
   El SDK de EmailJS se descarga recién cuando hace falta, así que
   no pesa nada mientras el visitante sólo mira la tienda.
   ============================================================ */
window.AR_CHECKOUT = window.AR_CHECKOUT || {};

window.AR_CHECKOUT.correos = (function (CONFIG) {
  "use strict";

  var SDK = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
  var cargando = null;

  function configurado() {
    var e = CONFIG.emailjs;
    return Boolean(e.publicKey && e.serviceId && (e.plantillaTienda || e.plantillaCliente));
  }

  function cargarSDK() {
    if (window.emailjs) return Promise.resolve(window.emailjs);
    if (cargando) return cargando;
    cargando = new Promise(function (listo, falla) {
      var s = document.createElement("script");
      s.src = SDK;
      s.onload = function () {
        window.emailjs.init({ publicKey: CONFIG.emailjs.publicKey });
        listo(window.emailjs);
      };
      s.onerror = function () { falla(new Error("No se pudo cargar EmailJS")); };
      document.head.appendChild(s);
    });
    return cargando;
  }

  /* ---------- Cómo se ve el pedido dentro del mail ---------- */
  function detalleTexto(orden, formato) {
    return orden.items.map(function (i) {
      return "• " + i.cantidad + " × " + i.nombre +
             " — " + formato(i.subtotal);
    }).join("\n");
  }

  function detalleHTML(orden, formato) {
    var filas = orden.items.map(function (i) {
      return "<tr>" +
        '<td style="padding:6px 10px;border-bottom:1px solid #e3edf5">' + i.cantidad + "</td>" +
        '<td style="padding:6px 10px;border-bottom:1px solid #e3edf5">' + i.nombre + "</td>" +
        '<td style="padding:6px 10px;border-bottom:1px solid #e3edf5;text-align:right">' +
          formato(i.subtotal) + "</td>" +
      "</tr>";
    }).join("");
    return '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">' +
      "<thead><tr>" +
        '<th style="padding:6px 10px;text-align:left;border-bottom:2px solid #0f78b4">Cant.</th>' +
        '<th style="padding:6px 10px;text-align:left;border-bottom:2px solid #0f78b4">Producto</th>' +
        '<th style="padding:6px 10px;text-align:right;border-bottom:2px solid #0f78b4">Subtotal</th>' +
      "</tr></thead><tbody>" + filas + "</tbody></table>";
  }

  /* ---------- Variables que reciben las plantillas ---------- */
  function variables(orden, formato) {
    var b = CONFIG.banco;
    return {
      orden_id:        orden.id,
      orden_estado:    orden.estado,
      orden_fecha:     orden.fecha,
      cliente_nombre:  orden.cliente.nombre,
      cliente_apellido: orden.cliente.apellido,
      cliente_completo: orden.cliente.nombre + " " + orden.cliente.apellido,
      cliente_email:   orden.cliente.email,
      cliente_whatsapp: orden.cliente.whatsapp,
      unidades:        orden.unidades,
      total:           formato(orden.total),
      detalle_texto:   detalleTexto(orden, formato),
      detalle_html:    detalleHTML(orden, formato),
      banco_titular:   b.titular,
      banco_alias:     b.alias,
      banco_cbu:       b.cbu,
      banco_nombre:    b.banco,
      correo_tienda:   CONFIG.emailjs.correoTienda
    };
  }

  /* ---------- Envío ----------
     Devuelve siempre una promesa que resuelve (nunca rechaza): el
     cliente ya tiene los datos bancarios en pantalla, un fallo de
     mail no puede romperle la compra. */
  function enviar(orden, formato) {
    var vars = variables(orden, formato);

    if (!configurado()) {
      console.warn(
        "[AquaRagnar] EmailJS sin configurar: no se enviaron correos.\n" +
        "Completá checkout-config.js (ver checkout-emailjs.md).\n" +
        "Datos de la orden que se habrían enviado:", vars
      );
      return Promise.resolve({ configurado: false, tienda: false, cliente: false });
    }

    return cargarSDK().then(function (emailjs) {
      var e = CONFIG.emailjs;

      var aTienda = e.plantillaTienda
        ? emailjs.send(e.serviceId, e.plantillaTienda,
            Object.assign({ to_email: e.correoTienda }, vars))
            .then(function () { return true; })
            .catch(function (err) { console.error("[AquaRagnar] Falló el mail al club:", err); return false; })
        : Promise.resolve(false);

      var alCliente = e.plantillaCliente
        ? emailjs.send(e.serviceId, e.plantillaCliente,
            Object.assign({ to_email: orden.cliente.email }, vars))
            .then(function () { return true; })
            .catch(function (err) { console.error("[AquaRagnar] Falló el mail al cliente:", err); return false; })
        : Promise.resolve(false);

      /* Los dos salen en paralelo */
      return Promise.all([aTienda, alCliente]).then(function (r) {
        return { configurado: true, tienda: r[0], cliente: r[1] };
      });
    }).catch(function (err) {
      console.error("[AquaRagnar] EmailJS no disponible:", err);
      return { configurado: true, tienda: false, cliente: false };
    });
  }

  return { enviar: enviar, configurado: configurado, variables: variables };
})(window.AR_CHECKOUT_CONFIG);
