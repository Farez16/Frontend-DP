/**
 * Reglas del formulario de contacto. Las comparten el cliente
 * (components/sections/LeadForm.tsx) y el servidor (app/api/contacto/route.ts).
 *
 * Vive en un módulo propio en vez de repetirse a cada lado porque el pedido es que
 * el servidor valide con LAS MISMAS reglas que la interfaz. Escritas dos veces, la
 * copia del servidor se atrasa en el primer cambio de requisitos y el endpoint
 * empieza a aceptar cosas que el formulario dice que no acepta (o al revés, que es
 * peor: el usuario ve un error que no puede corregir). Acá hay una sola definición
 * y las dos la importan.
 *
 * No importa nada de React ni de Next a propósito: lo carga igual el bundle del
 * navegador y el runtime del route handler, sin arrastrar nada de más a ninguno.
 */

/**
 * Los 5 motivos son los que pidió el cliente en su documento de información final
 * ("Motivo: patrocinio de deportista / conferencia / gestión comercial de evento /
 * prensa y medios / consulta general"), NO los 4 del prototipo de Stitch — el
 * prototipo ofrecía "Representación Deportiva", que el cliente nunca pidió, y le
 * faltaban tres de estos. El `value` es un slug y no la etiqueta porque es lo que
 * va a viajar al correo del equipo cuando se conecte el envío.
 */
export const MOTIVOS = [
  { value: "patrocinio-deportista", label: "Patrocinio de deportista" },
  { value: "conferencia", label: "Conferencia" },
  { value: "gestion-evento", label: "Gestión comercial de evento" },
  { value: "prensa-medios", label: "Prensa y medios" },
  { value: "consulta-general", label: "Consulta general" },
] as const;

/** Único motivo que revela el campo "Deportista de interés". */
export const MOTIVO_PATROCINIO = "patrocinio-deportista";

/**
 * Motivo con el que llega quien viene del detalle de una conferencia. No revela
 * ningún campo extra —a diferencia del de patrocinio—, solo preselecciona el
 * `<select>`. Existe como constante para que el CTA no escriba a mano un valor que
 * tiene que coincidir con `MOTIVOS` o `leerPrellenado()` lo descarta en silencio.
 */
export const MOTIVO_CONFERENCIA = "conferencia";

/** Motivo del "Quiero saber más" de un proyecto. Misma razón de ser que el anterior. */
export const MOTIVO_CONSULTA_GENERAL = "consulta-general";

/** Motivo del contacto de prensa de /medios. Misma razón de ser que los dos anteriores. */
export const MOTIVO_PRENSA = "prensa-medios";

/**
 * Nombres de los parámetros con los que se puede llegar a /contacto con el
 * formulario prellenado. Los escriben `urlPatrocinio()` (el CTA del perfil de
 * talento) y el redirect de next.config.ts; los lee `leerPrellenado()`.
 */
export const PARAM_MOTIVO = "motivo";
export const PARAM_DEPORTISTA = "deportista";

/**
 * URL de /contacto con el formulario listo para pedir patrocinio de un talento.
 *
 * El `deportista` viaja como **slug**, que es el mismo valor que usa el `<option>`
 * del select (ver `LeadForm`): un solo identificador para la URL, para el control y
 * para la validación, en vez de un nombre para mostrar que habría que traducir de
 * ida y vuelta. Es además la clave canónica del talento en todo el sitio.
 */
export function urlPatrocinio(slugTalento: string): string {
  const parametros = new URLSearchParams({
    [PARAM_MOTIVO]: MOTIVO_PATROCINIO,
    [PARAM_DEPORTISTA]: slugTalento,
  });
  return `/contacto?${parametros.toString()}`;
}

/** Valores con los que arranca el formulario cuando la URL los trae. */
export interface PrellenadoContacto {
  motivo: string;
  deportista: string;
}

/**
 * Traduce los parámetros de la URL en valores iniciales del formulario.
 *
 * Todo lo que llega por la URL es dato hostil: lo escribe quien quiera, y acá
 * termina dentro de un <select>. Por eso no se copia nada — sólo se acepta un valor
 * que ya exista en la lista cerrada correspondiente, y cualquier otra cosa se
 * descarta a "" sin error ni aviso, que es lo mismo que no haber traído parámetro.
 *
 * `params` se pide por forma (`{ get }`) y no como `URLSearchParams` para que este
 * módulo siga sin depender ni del DOM ni de Next: le sirve igual el
 * `ReadonlyURLSearchParams` de `useSearchParams()` que un `URLSearchParams` normal.
 *
 * El descarte es por campo, no del formulario entero: con un motivo válido y un
 * deportista inventado se conserva el motivo. Borrar también lo válido no protegería
 * de nada y le quitaría a la persona algo que sí venía bien.
 */
export function leerPrellenado(
  params: { get(clave: string): string | null },
  slugsPublicados: readonly string[],
): PrellenadoContacto {
  const motivoCrudo = params.get(PARAM_MOTIVO) ?? "";
  const deportistaCrudo = params.get(PARAM_DEPORTISTA) ?? "";

  const motivo = esMotivoValido(motivoCrudo) ? motivoCrudo : "";

  // El deportista sólo existe bajo el motivo de patrocinio (es la condición que el
  // propio formulario usa para mostrar el campo). Sin ese motivo no se preselecciona,
  // porque sería un valor en un control que no está en pantalla.
  const deportista =
    motivo === MOTIVO_PATROCINIO && slugsPublicados.includes(deportistaCrudo)
      ? deportistaCrudo
      : "";

  return { motivo, deportista };
}

/**
 * Campo trampa (honeypot). El nombre tiene que ser algo que un bot quiera rellenar
 * y que una persona nunca vea: "sitio_web" es de los más pisados por los que
 * rellenan todo input de texto que encuentran. Si llega con algo, el servidor
 * responde como si todo hubiera ido bien y descarta el envío sin procesarlo.
 */
export const CAMPO_TRAMPA = "sitio_web";

/**
 * Clave con la que el formulario manda, además del slug, el nombre legible del
 * deportista elegido. No es un campo de `DatosContacto` y no se valida con un error:
 * nadie lo escribe a mano, así que un valor hostil no es algo que quien envía pueda
 * corregir. El servidor lo SANEA y sigue — ver `aUnaLinea`.
 */
export const CAMPO_DEPORTISTA_NOMBRE = "deportistaNombre";

export const LIMITE_DEPORTISTA_NOMBRE = 120;

/**
 * Deja un valor listo para ocupar UNA línea del correo: fuera los caracteres de
 * control (incluidos \r y \n), espacios colapsados y recorte a `limite`.
 *
 * Los saltos de línea son el problema de fondo. El cuerpo del correo es texto con
 * forma de "Etiqueta: valor" por renglón, así que un valor con \n puede fabricar
 * renglones falsos y hacer pasar por dato de la agencia algo que escribió quien
 * envía. Sanear en origen es más barato que confiar en cómo se lea después.
 */
export function aUnaLinea(valor: string, limite: number): string {
  return valor
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

/**
 * Igual que `aUnaLinea` pero conservando los saltos: el mensaje es multilínea por
 * naturaleza y va en su propio bloque delimitado del correo, no en un renglón
 * "Etiqueta: valor", así que ahí un salto no puede falsificar ningún campo.
 */
export function limpiarMultilinea(valor: string, limite: number): string {
  return valor
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]+/g, " ")
    .trim()
    .slice(0, limite);
}

/**
 * Etiqueta legible de un motivo válido, o null si no lo es. La usa el asunto del
 * correo, que por eso nunca puede contener texto libre: sale de la lista cerrada
 * `MOTIVOS`, no de lo que llegó en la petición.
 */
export function etiquetaDeMotivo(valor: string): string | null {
  return MOTIVOS.find((motivo) => motivo.value === valor)?.label ?? null;
}

/**
 * Topes de longitud. Existen por dos razones distintas: en el cliente evitan que
 * alguien pegue una novela en un campo de una línea, y en el servidor acotan el
 * tamaño de lo que este endpoint público acepta procesar.
 */
export const LIMITES = {
  nombre: 80,
  empresa: 120,
  correo: 160,
  telefono: 40,
  deportista: 80,
  mensaje: 2000,
} as const;

const MINIMO_NOMBRE = 2;
const MINIMO_MENSAJE = 10;
/** Un teléfono real en Ecuador tiene 7 dígitos (fijo sin código) como piso. */
const MINIMO_DIGITOS_TELEFONO = 7;

/**
 * Deliberadamente permisiva: exige una arroba, algo a cada lado, un punto en el
 * dominio y un TLD de 2+ caracteres. No intenta implementar RFC 5322 — un regex
 * "completo" de correo rechaza direcciones válidas y sigue aceptando inválidas, y
 * el único chequeo que de verdad prueba que un correo existe es enviarle algo.
 */
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface DatosContacto {
  nombre: string;
  empresa: string;
  correo: string;
  telefono: string;
  motivo: string;
  deportista: string;
  mensaje: string;
}

export type CampoContacto = keyof DatosContacto;

export type ErroresContacto = Partial<Record<CampoContacto, string>>;

/**
 * Orden visual de los campos. Lo usa el cliente para mover el foco al PRIMER campo
 * con error y no a uno cualquiera. Está acá y no en el componente para que el tipo
 * `CampoContacto` obligue a que la lista siga coincidiendo con `DatosContacto`.
 */
export const ORDEN_CAMPOS: readonly CampoContacto[] = [
  "nombre",
  "empresa",
  "correo",
  "telefono",
  "motivo",
  "deportista",
  "mensaje",
];

export const DATOS_VACIOS: DatosContacto = {
  nombre: "",
  empresa: "",
  correo: "",
  telefono: "",
  motivo: "",
  deportista: "",
  mensaje: "",
};

export function esMotivoValido(valor: string): boolean {
  return MOTIVOS.some((motivo) => motivo.value === valor);
}

/** Lee una clave de un JSON no confiable como string; cualquier otra cosa es "". */
function leerTexto(payload: unknown, campo: string): string {
  if (typeof payload !== "object" || payload === null) return "";
  const valor = (payload as Record<string, unknown>)[campo];
  return typeof valor === "string" ? valor : "";
}

/**
 * Convierte el cuerpo (no confiable) de la petición en `DatosContacto`. Todo lo que
 * no sea string se vuelve "", así que un payload hostil —números, objetos anidados,
 * arrays, null— no puede llegar a `validarContacto` con una forma que no espera: se
 * vuelve un campo vacío y falla como tal.
 */
export function normalizarContacto(payload: unknown): DatosContacto {
  return {
    nombre: leerTexto(payload, "nombre").trim(),
    empresa: leerTexto(payload, "empresa").trim(),
    correo: leerTexto(payload, "correo").trim(),
    telefono: leerTexto(payload, "telefono").trim(),
    motivo: leerTexto(payload, "motivo").trim(),
    deportista: leerTexto(payload, "deportista").trim(),
    mensaje: leerTexto(payload, "mensaje").trim(),
  };
}

/** True si el campo trampa llegó con contenido. */
export function trampaRellenada(payload: unknown): boolean {
  return leerTexto(payload, CAMPO_TRAMPA).trim().length > 0;
}

function contarDigitos(texto: string): number {
  return (texto.match(/\d/g) ?? []).length;
}

/**
 * Única fuente de verdad de la validación. Recibe datos YA normalizados (con trim) y
 * devuelve un error por campo inválido; un objeto vacío significa válido.
 *
 * Sobre "Deportista de interés": es opcional siempre, incluso con el motivo de
 * patrocinio, y acá sólo se le revisa la longitud — no se contrasta contra el roster
 * publicado. Hacerlo obligaría al route handler a consultar Sanity, con lo que una
 * caída de Sanity tumbaría también el formulario, y no aportaría seguridad real: el
 * campo es una preferencia declarada por el visitante, no un identificador con el
 * que el servidor haga algo.
 */
export function validarContacto(datos: DatosContacto): ErroresContacto {
  const errores: ErroresContacto = {};

  if (datos.nombre.length === 0) {
    errores.nombre = "Escribe tu nombre y apellido.";
  } else if (datos.nombre.length < MINIMO_NOMBRE) {
    errores.nombre = "Ese nombre es demasiado corto.";
  } else if (datos.nombre.length > LIMITES.nombre) {
    errores.nombre = `Máximo ${LIMITES.nombre} caracteres.`;
  }

  if (datos.empresa.length > LIMITES.empresa) {
    errores.empresa = `Máximo ${LIMITES.empresa} caracteres.`;
  }

  if (datos.correo.length === 0) {
    errores.correo = "Escribe tu correo electrónico.";
  } else if (datos.correo.length > LIMITES.correo) {
    errores.correo = `Máximo ${LIMITES.correo} caracteres.`;
  } else if (!FORMATO_CORREO.test(datos.correo)) {
    errores.correo =
      "Ese correo no parece válido. Debe tener la forma nombre@dominio.com.";
  }

  // Opcional: sólo se valida si la persona escribió algo.
  if (datos.telefono.length > 0) {
    if (datos.telefono.length > LIMITES.telefono) {
      errores.telefono = `Máximo ${LIMITES.telefono} caracteres.`;
    } else if (contarDigitos(datos.telefono) < MINIMO_DIGITOS_TELEFONO) {
      errores.telefono = "Ese teléfono no parece válido. Incluye el código de área.";
    }
  }

  if (datos.motivo.length === 0) {
    errores.motivo = "Elige el motivo de tu mensaje.";
  } else if (!esMotivoValido(datos.motivo)) {
    errores.motivo = "Elige un motivo de la lista.";
  }

  if (datos.deportista.length > LIMITES.deportista) {
    errores.deportista = `Máximo ${LIMITES.deportista} caracteres.`;
  }

  if (datos.mensaje.length === 0) {
    errores.mensaje = "Escribe tu mensaje.";
  } else if (datos.mensaje.length < MINIMO_MENSAJE) {
    errores.mensaje = `Cuéntanos un poco más — al menos ${MINIMO_MENSAJE} caracteres.`;
  } else if (datos.mensaje.length > LIMITES.mensaje) {
    errores.mensaje = `Máximo ${LIMITES.mensaje} caracteres.`;
  }

  return errores;
}
