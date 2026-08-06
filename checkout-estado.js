/* ============================================================
   AquaRagnar · Checkout — ESTADO
   ------------------------------------------------------------
   Numeración de órdenes, datos del cliente y armado de la orden.
   No toca el DOM: es lógica pura, se puede probar por consola.
   ============================================================ */
window.AR_CHECKOUT = window.AR_CHECKOUT || {};

window.AR_CHECKOUT.estado = (function (CONFIG) {
  "use strict";

  var LLAVE_CONTADOR = "ar_orden_contador";
  var LLAVE_CLIENTE  = "ar_cliente";
  var LLAVE_ORDENES  = "ar_ordenes";

  /* localStorage puede estar bloqueado (modo incógnito estricto,
     cookies de terceros). Nada de esto es crítico, así que si falla
     seguimos con valores en memoria. */
  var memoria = {};
  function leer(llave) {
    try { return window.localStorage.getItem(llave); }
    catch (e) { return memoria[llave] || null; }
  }
  function escribir(llave, valor) {
    try { window.localStorage.setItem(llave, valor); }
    catch (e) { memoria[llave] = valor; }
  }

  /* ---------- Numeración ---------- */
  function siguienteNumero() {
    var actual = parseInt(leer(LLAVE_CONTADOR), 10);
    if (!actual || isNaN(actual)) actual = CONFIG.orden.desde;
    escribir(LLAVE_CONTADOR, String(actual + 1));
    return actual;
  }

  function nuevoId() {
    var n = siguienteNumero();
    if (CONFIG.orden.simple) return "#" + CONFIG.orden.prefijo + n;
    var f = new Date();
    var dia = ("0" + f.getDate()).slice(-2);
    var mes = ("0" + (f.getMonth() + 1)).slice(-2);
    return "#" + CONFIG.orden.prefijo + dia + mes + "-" + n;
  }

  /* ---------- Datos del cliente ---------- */
  function clienteGuardado() {
    try { return JSON.parse(leer(LLAVE_CLIENTE)) || null; }
    catch (e) { return null; }
  }

  function guardarCliente(cliente) {
    if (!CONFIG.opciones.recordarCliente) return;
    try { escribir(LLAVE_CLIENTE, JSON.stringify(cliente)); } catch (e) {}
  }

  function olvidarCliente() {
    try { window.localStorage.removeItem(LLAVE_CLIENTE); }
    catch (e) { delete memoria[LLAVE_CLIENTE]; }
  }

  /* ---------- Validación ---------- */
  var VALIDA = {
    nombre:   function (v) { return v.trim().length >= 2 ? "" : "Escribí tu nombre."; },
    apellido: function (v) { return v.trim().length >= 2 ? "" : "Escribí tu apellido."; },
    email:    function (v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
        ? "" : "Revisá el email: falta el @ o el dominio.";
    },
    whatsapp: function (v) {
      var digitos = v.replace(/\D/g, "");
      return digitos.length >= 8 && digitos.length <= 15
        ? "" : "Poné tu WhatsApp con característica, sin el 0 ni el 15.";
    }
  };

  function validar(cliente) {
    var errores = {};
    Object.keys(VALIDA).forEach(function (campo) {
      var mensaje = VALIDA[campo](cliente[campo] || "");
      if (mensaje) errores[campo] = mensaje;
    });
    return errores;
  }

  /* ---------- Armado de la orden ---------- */
  function crearOrden(cliente, items, total) {
    var f = new Date();
    return {
      id: nuevoId(),
      estado: "Pendiente de pago",
      fecha: f.toLocaleDateString("es-AR") + " " +
             f.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      fechaISO: f.toISOString(),
      cliente: {
        nombre:   cliente.nombre.trim(),
        apellido: cliente.apellido.trim(),
        email:    cliente.email.trim(),
        whatsapp: cliente.whatsapp.trim()
      },
      items: items,
      unidades: items.reduce(function (n, i) { return n + i.cantidad; }, 0),
      total: total
    };
  }

  /* Historial local: sirve para que puedan revisar una orden desde el
     navegador del cliente si algo se pierde. Guarda las últimas 20. */
  function archivar(orden) {
    var lista = [];
    try { lista = JSON.parse(leer(LLAVE_ORDENES)) || []; } catch (e) {}
    lista.unshift({ id: orden.id, fecha: orden.fecha, total: orden.total, estado: orden.estado });
    escribir(LLAVE_ORDENES, JSON.stringify(lista.slice(0, 20)));
  }

  function ordenes() {
    try { return JSON.parse(leer(LLAVE_ORDENES)) || []; }
    catch (e) { return []; }
  }

  return {
    nuevoId: nuevoId,
    clienteGuardado: clienteGuardado,
    guardarCliente: guardarCliente,
    olvidarCliente: olvidarCliente,
    validar: validar,
    crearOrden: crearOrden,
    archivar: archivar,
    ordenes: ordenes
  };
})(window.AR_CHECKOUT_CONFIG);
