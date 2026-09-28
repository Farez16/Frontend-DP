import { normalizarContacto, trampaRellenada, validarContacto } from "@/lib/contacto";

/**
 * Endpoint del formulario de contacto (decisión #7 de docs/ARQUITECTURA.md: Route
 * Handler propio de Next, sin persistir nada en Sanity — Sanity queda como CMS de
 * contenido editorial únicamente).
 *
 * Primer route handler del proyecto, y el único endpoint público que acepta escritura.
 * De ahí que no confíe en nada de lo que llega: `normalizarContacto` fuerza todo a
 * string antes de validar, y `validarContacto` es exactamente la misma función que
 * corre el formulario en el navegador (lib/contacto.ts) — no una segunda copia de las
 * reglas que pueda quedar desfasada.
 *
 * Los POST no se cachean nunca en Next, así que no hace falta configuración de caché.
 */

/**
 * TODO(Resend) — acá va la integración de envío, todavía sin hacer a propósito.
 *
 * Hoy este handler valida y responde; NO manda ningún correo, y la dependencia
 * `resend` no está instalada ni hay variable de entorno para su API key. Cuando se
 * conecte:
 *
 *   1. Instalar `resend` y declarar RESEND_API_KEY en .env.local / .env.example.
 *   2. Verificar el dominio somosdp.com en Resend (trámite de cuenta, no de código).
 *   3. Enviar el correo al equipo justo debajo de la validación, con los datos ya
 *      normalizados de `datos`.
 *   4. Reemplazar esta constante por el resultado real del envío. La interfaz muestra
 *      un mensaje de éxito honesto ("datos validados, todavía sin enviar") mientras
 *      llegue false, y pasa sola al mensaje de entrega confirmada cuando llegue true:
 *      no hay ningún texto que haya que acordarse de cambiar en el componente.
 *
 * Lo que este handler NO hace y conviene evaluar junto con el envío: limitar la
 * frecuencia por IP. El honeypot frena bots que rellenan todo, no a alguien decidido
 * a golpear el endpoint, y hacerlo bien necesita estado compartido (Redis/KV) o el
 * rate limiting de la plataforma de despliegue — fuera del alcance de este cambio,
 * que se pidió sin dependencias nuevas.
 */
const ENTREGA_ACTIVA = false;

/**
 * Respuesta de "recibido y validado". La comparten el envío legítimo y el descarte
 * silencioso del honeypot: si el bot recibiera algo distinto, sabría que lo detectamos
 * y podría adaptarse. Un solo helper garantiza que no se puedan separar por descuido.
 *
 * Nunca afirma que el correo salió: `entregado` lo dice explícitamente y la interfaz
 * redacta según ese valor.
 */
function respuestaRecibido(): Response {
  return Response.json({ ok: true, entregado: ENTREGA_ACTIVA }, { status: 200 });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    // Cuerpo que no es JSON: nada que validar campo por campo, así que va sin
    // detalle de errores. El formulario del sitio nunca produce esto.
    return Response.json(
      { ok: false, errores: {}, motivo: "cuerpo-invalido" },
      { status: 400 },
    );
  }

  // Antes de cualquier otra cosa: si el campo trampa vino relleno, se descarta en
  // silencio. Sin log, sin error y con la respuesta de éxito normal.
  if (trampaRellenada(payload)) {
    return respuestaRecibido();
  }

  const datos = normalizarContacto(payload);
  const errores = validarContacto(datos);

  if (Object.keys(errores).length > 0) {
    return Response.json({ ok: false, errores }, { status: 400 });
  }

  return respuestaRecibido();
}
