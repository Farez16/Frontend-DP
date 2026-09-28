import { Resend } from "resend";
import {
  CAMPO_DEPORTISTA_NOMBRE,
  LIMITES,
  LIMITE_DEPORTISTA_NOMBRE,
  aUnaLinea,
  etiquetaDeMotivo,
  limpiarMultilinea,
  normalizarContacto,
  trampaRellenada,
  validarContacto,
  type DatosContacto,
} from "@/lib/contacto";

/**
 * Endpoint del formulario de contacto (decisión #7 de docs/ARQUITECTURA.md: Route
 * Handler propio de Next + Resend, sin persistir nada en Sanity — Sanity queda como
 * CMS de contenido editorial únicamente).
 *
 * Único endpoint público del sitio que acepta escritura, y todo lo que llega termina
 * dentro de un correo. De ahí las tres capas: `normalizarContacto` fuerza cada campo
 * a string, `validarContacto` aplica exactamente las mismas reglas que el formulario
 * en el navegador (lib/contacto.ts, una sola definición para los dos lados) y
 * `aUnaLinea` aplana lo que va a ocupar un renglón del correo.
 *
 * Los POST no se cachean nunca en Next, así que no hace falta configuración de caché.
 */

/** Códigos que devuelve esta ruta. Son opacos a propósito: nombran QUÉ falló para que
 *  la interfaz elija su mensaje, nunca POR QUÉ ni con qué servicio. */
const ERROR_CONFIGURACION = "envio-no-configurado";
const ERROR_ENVIO = "envio-fallido";

interface ConfiguracionCorreo {
  apiKey: string;
  from: string;
  to: string;
}

/**
 * Las tres variables tienen que estar; con cualquiera vacía el envío no puede
 * ocurrir y es preferible decirlo que mandar un correo a ninguna parte.
 */
function leerConfiguracion(): ConfiguracionCorreo | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !from || !to) return null;
  return { apiKey, from, to };
}

/** Valor a mostrar en el correo cuando un campo opcional vino vacío. */
const SIN_DATO = "—";

function renglon(etiqueta: string, valor: string, limite: number): string {
  const limpio = aUnaLinea(valor, limite);
  return `${etiqueta.padEnd(12)}${limpio.length > 0 ? limpio : SIN_DATO}`;
}

/**
 * Cuerpo del correo, en texto plano y nada más. No se manda versión HTML a propósito:
 * cada campo es texto que escribió un desconocido, y en HTML habría que escaparlo sin
 * fallar ni una vez. En texto plano ese riesgo no existe, y "todos los campos, legible"
 * se cumple igual. Si algún día se quiere HTML, hay que escapar cada interpolación.
 */
function componerCorreo(
  datos: DatosContacto,
  etiquetaMotivo: string,
  nombreDeportista: string,
): string {
  const lineas = [
    "Nuevo mensaje desde el formulario de somosdp.com",
    "",
    renglon("Motivo:", etiquetaMotivo, 80),
    renglon("Nombre:", datos.nombre, LIMITES.nombre),
    renglon("Empresa:", datos.empresa, LIMITES.empresa),
    renglon("Correo:", datos.correo, LIMITES.correo),
    renglon("Teléfono:", datos.telefono, LIMITES.telefono),
  ];

  // El deportista se muestra por su nombre legible, con el slug entre paréntesis como
  // referencia. El slug también se sanea: tampoco lo escribe el servidor.
  if (datos.deportista.length > 0) {
    const slug = aUnaLinea(datos.deportista, LIMITES.deportista);
    const nombre = aUnaLinea(nombreDeportista, LIMITE_DEPORTISTA_NOMBRE);
    lineas.push(
      renglon("Deportista:", nombre.length > 0 ? `${nombre} (${slug})` : slug, 220),
    );
  }

  lineas.push(
    "",
    "Mensaje",
    "-".repeat(56),
    limpiarMultilinea(datos.mensaje, LIMITES.mensaje),
    "-".repeat(56),
    "",
    "Responder a este correo contesta directamente a quien escribió.",
  );

  return lineas.join("\n");
}

/**
 * Respuesta de "recibido". La comparten el envío real y el descarte silencioso del
 * honeypot: si el bot recibiera algo distinto sabría que lo detectamos y podría
 * adaptarse. Un solo helper garantiza que no se puedan separar por descuido.
 */
function respuestaEntregado(): Response {
  return Response.json({ ok: true, entregado: true }, { status: 200 });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { ok: false, errores: {}, motivo: "cuerpo-invalido" },
      { status: 400 },
    );
  }

  // Antes que nada: si el campo trampa vino relleno, se descarta en silencio. Sin
  // correo, sin error y con la misma respuesta que un envío bueno.
  if (trampaRellenada(payload)) {
    return respuestaEntregado();
  }

  const datos = normalizarContacto(payload);
  const errores = validarContacto(datos);

  if (Object.keys(errores).length > 0) {
    return Response.json({ ok: false, errores }, { status: 400 });
  }

  // `validarContacto` ya garantizó que el motivo está en la lista cerrada, así que
  // esto no puede ser null; el chequeo existe para que el tipo lo sepa.
  const etiquetaMotivo = etiquetaDeMotivo(datos.motivo);
  if (etiquetaMotivo === null) {
    return Response.json(
      { ok: false, errores: { motivo: "Motivo inválido." } },
      { status: 400 },
    );
  }

  const configuracion = leerConfiguracion();
  if (configuracion === null) {
    // El detalle va al log del servidor, nunca a la respuesta.
    console.error(
      "[contacto] Falta configuración de envío: revisa RESEND_API_KEY, CONTACT_FROM_EMAIL y CONTACT_TO_EMAIL",
    );
    return Response.json({ ok: false, error: ERROR_CONFIGURACION }, { status: 500 });
  }

  const nombreDeportista =
    typeof payload === "object" && payload !== null
      ? String((payload as Record<string, unknown>)[CAMPO_DEPORTISTA_NOMBRE] ?? "")
      : "";

  try {
    const resend = new Resend(configuracion.apiKey);
    const { data, error } = await resend.emails.send({
      from: configuracion.from,
      to: [configuracion.to],
      // Responder al correo lleva directo a quien escribió. `datos.correo` pasó por
      // FORMATO_CORREO, que no admite espacios ni saltos, así que no puede inyectar
      // una cabecera extra.
      replyTo: datos.correo,
      // Sólo la etiqueta del motivo, que sale de la lista cerrada MOTIVOS. Nunca
      // texto que haya escrito quien envía.
      subject: `Nuevo contacto — ${etiquetaMotivo}`,
      text: componerCorreo(datos, etiquetaMotivo, nombreDeportista),
    });

    // El SDK de Resend no lanza ante un error de la API: lo devuelve en `error`. Sin
    // este chequeo, un 403 por dominio no verificado pasaría por envío correcto.
    if (error || !data?.id) {
      console.error("[contacto] Resend no aceptó el envío:", error);
      return Response.json({ ok: false, error: ERROR_ENVIO }, { status: 502 });
    }

    return respuestaEntregado();
  } catch (fallo) {
    // Red caída, DNS, timeout: lo que sea que impida siquiera hablar con Resend.
    console.error("[contacto] Fallo al contactar con Resend:", fallo);
    return Response.json({ ok: false, error: ERROR_ENVIO }, { status: 502 });
  }
}
