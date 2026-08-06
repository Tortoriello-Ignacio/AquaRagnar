# Correos del checkout — puesta en marcha

El sitio es estático (GitHub Pages), así que no hay servidor propio donde
mandar mails. **EmailJS** es la opción que menos fricción tiene para este
stack: se llama desde el navegador, tiene plan gratuito (200 mails/mes) y no
requiere backend.

> **Lo que tenés que saber antes:** la clave pública de EmailJS queda visible
> en el código del navegador. Es así por diseño, pero significa que alguien
> podría usarla para mandar mails con tus plantillas. Se mitiga en el panel de
> EmailJS activando **Account → Security → Allowed origins** con tu dominio
> (`aquaragnar.club`) y dejando el límite de envíos por hora bajo. Si algún día
> querés cerrarlo del todo, la alternativa es una función serverless (Netlify
> Functions, Cloudflare Workers) que guarde la clave del lado del servidor.

---

## 1. Crear la cuenta y el servicio

1. Entrá a emailjs.com y creá una cuenta con `equipoaquaragnar@gmail.com`.
2. **Email Services → Add New Service → Gmail**, conectá esa misma casilla.
   Copiá el **Service ID** (algo tipo `service_ab12cde`).
3. **Account → General**, copiá la **Public Key** (`aBcD1234...`).

## 2. Plantilla A — el mail que les llega a ustedes

**Email Templates → Create New Template.** Ponele de nombre `orden-tienda`.

- **To email:** `{{to_email}}`
- **Reply to:** `{{cliente_email}}`  ← así al responder le escribís al cliente
- **Subject:** `Nueva orden {{orden_id}} — {{cliente_completo}}`

Contenido (pestaña *Content*, modo HTML):

```html
<h2>Orden {{orden_id}} · {{orden_estado}}</h2>
<p><b>Fecha:</b> {{orden_fecha}}</p>

<h3>Cliente</h3>
<ul>
  <li><b>Nombre:</b> {{cliente_completo}}</li>
  <li><b>Email:</b> {{cliente_email}}</li>
  <li><b>WhatsApp:</b> {{cliente_whatsapp}}</li>
</ul>

<h3>Pedido ({{unidades}} unidades)</h3>
{{{detalle_html}}}
<p style="font-size:18px"><b>Total: {{total}}</b></p>
```

> Ojo con las llaves: `{{{detalle_html}}}` va con **tres**, así EmailJS
> inserta la tabla como HTML en vez de mostrar las etiquetas.

Copiá el **Template ID**.

## 3. Plantilla B — el mail que le llega al cliente

Otra plantilla, `orden-cliente`.

- **To email:** `{{to_email}}`
- **Reply to:** `{{correo_tienda}}`
- **Subject:** `Tu orden {{orden_id}} en AquaRagnar`

```html
<h2>¡Gracias por tu compra, {{cliente_nombre}}!</h2>
<p>Tu orden <b>{{orden_id}}</b> quedó <b>{{orden_estado}}</b>.</p>

<h3>Lo que pediste</h3>
{{{detalle_html}}}
<p style="font-size:18px"><b>Total a transferir: {{total}}</b></p>

<h3>Datos para transferir</h3>
<ul>
  <li><b>Alias:</b> {{banco_alias}}</li>
  <li><b>CBU:</b> {{banco_cbu}}</li>
  <li><b>Titular:</b> {{banco_titular}}</li>
  <li><b>Banco:</b> {{banco_nombre}}</li>
</ul>

<p>Cuando transfieras, mandanos el comprobante por WhatsApp al
   +54 9 11 6262-1831 mencionando tu orden {{orden_id}}.</p>
<p>Cualquier duda, respondé este mail.</p>
```

Copiá el **Template ID**.

## 4. Pegar las cuatro claves

En `checkout-config.js`:

```js
emailjs: {
  publicKey:        "aBcD1234...",
  serviceId:        "service_ab12cde",
  plantillaTienda:  "template_xxxxxxx",
  plantillaCliente: "template_yyyyyyy",
  correoTienda:     "equipoaquaragnar@gmail.com"
}
```

Listo. Los dos mails salen **en paralelo** apenas se genera la orden, sin
frenar la pantalla del cliente.

---

## Variables disponibles en las plantillas

| Variable | Qué trae |
|---|---|
| `{{orden_id}}` | `#AQ-104` |
| `{{orden_estado}}` | `Pendiente de pago` |
| `{{orden_fecha}}` | `06/08/2026 21:40` |
| `{{cliente_nombre}}` / `{{cliente_apellido}}` / `{{cliente_completo}}` | datos del formulario |
| `{{cliente_email}}` / `{{cliente_whatsapp}}` | ídem |
| `{{unidades}}` | cantidad total de productos |
| `{{total}}` | `$ 50.000` ya formateado |
| `{{detalle_texto}}` | el pedido en texto plano, una línea por producto |
| `{{{detalle_html}}}` | el pedido como tabla HTML (triple llave) |
| `{{banco_alias}}` / `{{banco_cbu}}` / `{{banco_titular}}` / `{{banco_nombre}}` | de `checkout-config.js` |
| `{{correo_tienda}}` | `equipoaquaragnar@gmail.com` |

## Mientras no lo configures

El checkout **funciona igual**: genera la orden, muestra los datos bancarios y
el botón de WhatsApp. Lo único que hace de más es dejar en la consola del
navegador el detalle completo de lo que se habría enviado, con el aviso
`[AquaRagnar] EmailJS sin configurar`.

## Para probar que anda

1. Abrí la tienda, agregá algo y completá el checkout con tu propio mail.
2. Tienen que llegar los dos mails en menos de un minuto.
3. Si no llegan, mirá la consola (F12): los errores de EmailJS se loguean con
   el prefijo `[AquaRagnar]`.
