/* ============================================================
   AquaRagnar · Checkout por transferencia — CONFIGURACIÓN
   ------------------------------------------------------------
   Este es el ÚNICO archivo que tenés que editar para poner en
   marcha el checkout. Todo lo marcado con "COMPLETAR" es tuyo.
   ============================================================ */
window.AR_CHECKOUT_CONFIG = {

  /* ---------- Datos bancarios que ve el cliente ---------- */
  banco: {
    titular: "COMPLETAR: Nombre y apellido del titular",
    alias:   "COMPLETAR.ALIAS.AQUARAGNAR",
    cbu:     "0000000000000000000000",
    banco:   "COMPLETAR: nombre del banco",
    /* Imagen del QR. Dejalo en "" y el modal muestra un recuadro
       punteado indicando dónde va, así no queda una imagen rota.
       Cuando tengas el QR, guardalo en esta carpeta y poné el nombre. */
    qr: ""
  },

  /* ---------- WhatsApp al que llega el comprobante ---------- */
  whatsapp: {
    /* Formato internacional, sin +, sin espacios ni guiones.
       +54 9 11 6262-1831  ->  5491162621831 */
    numero: "5491162621831",
    /* El mensaje que va pre-armado en el chat */
    mensaje: function (orden) {
      return "¡Hola! Realicé la transferencia para la orden " + orden.id +
             ". Adjunto el comprobante.";
    }
  },

  /* ---------- Numeración de órdenes ---------- */
  orden: {
    prefijo: "AQ-",
    /* La primera orden que se emita va a llevar este número */
    desde: 104,
    /* true  -> #AQ-104        (más lindo, pero el contador vive en el
                                navegador de cada cliente: dos personas
                                distintas pueden sacar el mismo número)
       false -> #AQ-0206-104   (le agrega el día y el mes, así no se
                                pisan entre clientes)  */
    simple: true
  },

  /* ---------- Correos (EmailJS) ----------
     Ver checkout-emailjs.md para el paso a paso.
     Mientras estén vacíos, el checkout funciona igual: se salta el
     envío de mails y deja el detalle en la consola del navegador. */
  emailjs: {
    publicKey:        "",   // COMPLETAR: Account -> General -> Public Key
    serviceId:        "",   // COMPLETAR: Email Services -> Service ID
    plantillaTienda:  "",   // COMPLETAR: Template ID del mail para ustedes
    plantillaCliente: "",   // COMPLETAR: Template ID del mail al cliente
    correoTienda:     "equipoaquaragnar@gmail.com"
  },

  /* ---------- Comportamiento ---------- */
  opciones: {
    /* Vaciar el bolso apenas se genera la orden.
       Lo dejo en false a propósito: si el cliente cierra el modal sin
       pagar, no pierde lo que había cargado. */
    vaciarBolsoAlConfirmar: false,
    /* Recordar los datos del cliente para la próxima compra */
    recordarCliente: true
  }
};
