"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CampoSelect, CampoTexto, CampoTextarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import {
  CAMPO_TRAMPA,
  DATOS_VACIOS,
  LIMITES,
  MOTIVOS,
  MOTIVO_PATROCINIO,
  ORDEN_CAMPOS,
  leerPrellenado,
  normalizarContacto,
  validarContacto,
  type CampoContacto,
  type DatosContacto,
  type ErroresContacto,
} from "@/lib/contacto";

/**
 * Formulario de contacto — el único embudo del sitio: los 7 botones "Contacto" /
 * "Hablemos" / "Trabaja con nosotros" / "Quiero patrocinar a …" llegan acá.
 *
 * Client Component porque necesita estado de envío y validación interactiva. Envía
 * por fetch a /api/contacto (decisión #7 de docs/ARQUITECTURA.md: Route Handler
 * propio, sin persistir nada en Sanity) y no con Server Action, que es lo que pide
 * esa decisión ya tomada.
 *
 * Los campos son los 6 + mensaje que pidió el cliente, no los 4 del prototipo.
 * La lista de motivos y todas las reglas de validación viven en lib/contacto.ts,
 * compartidas con el servidor.
 *
 * **Tiene que ir dentro de un <Suspense>** (ver app/contacto/page.tsx): usa
 * `useSearchParams()` para el prellenado, y en una ruta prerenderizada ese hook
 * obliga a renderizar en cliente el árbol hasta el <Suspense> más cercano. Con el
 * límite puesto, /contacto sigue siendo estática; sin él, el build falla.
 */

interface TalentoOpcion {
  /** Clave canónica: es el `value` del <option> y lo que viaja en la URL y al servidor. */
  slug: string;
  /** Lo que se lee en pantalla. */
  nombre: string;
}

interface LeadFormProps {
  /**
   * Talentos publicados, para el campo "Deportista de interés" — y también la lista
   * cerrada contra la que se valida el parámetro `deportista` de la URL. Llegan como
   * prop desde el Server Component de la página: la consulta a Sanity se hace en el
   * servidor y el cliente nunca habla con Sanity.
   */
  talentos: readonly TalentoOpcion[];
  /** Correo del equipo, para el mensaje de éxito mientras no haya envío real. */
  correoAgencia: string;
}

type Estado =
  | { tipo: "normal" }
  | { tipo: "enviando" }
  | { tipo: "invalido"; cantidad: number }
  | { tipo: "error"; mensaje: string }
  | { tipo: "exito"; entregado: boolean };

const MENSAJE_ERROR_RED =
  "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
const MENSAJE_ERROR_SERVIDOR =
  "Algo falló de nuestro lado y no pudimos procesar el formulario. Inténtalo de nuevo en un momento.";

/** True sólo si el servidor confirmó que el correo salió de verdad. */
function leerEntregado(cuerpo: unknown): boolean {
  if (typeof cuerpo !== "object" || cuerpo === null) return false;
  return (cuerpo as { entregado?: unknown }).entregado === true;
}

/**
 * Traduce un 400 del servidor de vuelta a errores por campo. Cliente y servidor
 * comparten las reglas, así que en la práctica no debería llegar acá nunca — existe
 * para que, si algún día divergen, el usuario vea el error sobre el campo que lo
 * causó en vez de un "algo falló" que no le dice qué corregir.
 */
function leerErroresServidor(cuerpo: unknown): ErroresContacto | null {
  if (typeof cuerpo !== "object" || cuerpo === null) return null;
  const crudo = (cuerpo as { errores?: unknown }).errores;
  if (typeof crudo !== "object" || crudo === null) return null;

  const registro = crudo as Record<string, unknown>;
  const errores: ErroresContacto = {};
  for (const campo of ORDEN_CAMPOS) {
    const mensaje = registro[campo];
    if (typeof mensaje === "string" && mensaje.length > 0) {
      errores[campo] = mensaje;
    }
  }
  return Object.keys(errores).length > 0 ? errores : null;
}

export function LeadForm({ talentos, correoAgencia }: LeadFormProps) {
  const idBase = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const trampaRef = useRef<HTMLInputElement>(null);
  const parametros = useSearchParams();

  /**
   * Inicializador perezoso: el prellenado se resuelve una sola vez, al montar. Si
   * fuera un `useEffect` que llama a `setValores`, la persona vería el formulario
   * vacío y luego saltar a los valores elegidos; y si se recalculara en cada render,
   * cambiar el motivo a mano volvería a pisarlo con el de la URL en el render
   * siguiente. La URL es el punto de partida, no una fuente que mande después.
   */
  const [valores, setValores] = useState<DatosContacto>(() => {
    const prellenado = leerPrellenado(
      parametros,
      talentos.map((talento) => talento.slug),
    );
    return { ...DATOS_VACIOS, ...prellenado };
  });
  const [errores, setErrores] = useState<ErroresContacto>({});
  const [estado, setEstado] = useState<Estado>({ tipo: "normal" });

  const enviando = estado.tipo === "enviando";
  // value = slug (lo canónico, lo que viaja en la URL y al servidor), label = nombre
  // (lo que se lee). Ver `urlPatrocinio` en lib/contacto.ts.
  const opcionesDeportistas = talentos.map((talento) => ({
    value: talento.slug,
    label: talento.nombre,
  }));
  // Sin roster publicado no hay nada que elegir, así que el campo no se muestra
  // aunque el motivo sea patrocinio — un select con una sola opción vacía sería peor
  // que no tenerlo.
  const mostrarDeportista =
    valores.motivo === MOTIVO_PATROCINIO && opcionesDeportistas.length > 0;

  const idDe = (campo: CampoContacto) => `${idBase}-${campo}`;

  function actualizar(campo: CampoContacto, valor: string) {
    setValores((previos) => ({ ...previos, [campo]: valor }));
    limpiarError(campo);
    // Cualquier edición vuelve stale el aviso anterior (éxito, error de red o el
    // resumen de validación): la cuenta de campos con error deja de ser cierta en
    // cuanto se corrige uno.
    setEstado((previo) => (previo.tipo === "normal" ? previo : { tipo: "normal" }));
  }

  function limpiarError(campo: CampoContacto) {
    setErrores((previos) => {
      if (previos[campo] === undefined) return previos;
      const siguientes = { ...previos };
      delete siguientes[campo];
      return siguientes;
    });
  }

  function cambiarMotivo(valor: string) {
    // Al salir del motivo de patrocinio el campo de deportista se desmonta; si se
    // quedara con su valor, se enviaría un deportista de interés junto a un motivo
    // que no lo admite.
    setValores((previos) => ({
      ...previos,
      motivo: valor,
      deportista: valor === MOTIVO_PATROCINIO ? previos.deportista : "",
    }));
    limpiarError("motivo");
    limpiarError("deportista");
    setEstado((previo) => (previo.tipo === "normal" ? previo : { tipo: "normal" }));
  }

  function aplicarErrores(encontrados: ErroresContacto) {
    setErrores(encontrados);
    setEstado({ tipo: "invalido", cantidad: Object.keys(encontrados).length });

    // Foco al PRIMER campo con error en orden visual (no al primero que devuelva el
    // objeto, cuyo orden de claves no es el de la pantalla). Al enfocarlo, el lector
    // de pantalla lee su label y el error asociado por aria-describedby.
    const primero = ORDEN_CAMPOS.find((campo) => encontrados[campo] !== undefined);
    if (primero) {
      formRef.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
    }
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    // Mismo normalizar + validar que corre el servidor, importados del mismo módulo.
    const datos = normalizarContacto(valores);
    const encontrados = validarContacto(datos);
    if (Object.keys(encontrados).length > 0) {
      aplicarErrores(encontrados);
      return;
    }

    setErrores({});
    setEstado({ tipo: "enviando" });

    try {
      const respuesta = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...datos,
          [CAMPO_TRAMPA]: trampaRef.current?.value ?? "",
        }),
      });

      const cuerpo: unknown = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        const erroresServidor = leerErroresServidor(cuerpo);
        if (erroresServidor) {
          aplicarErrores(erroresServidor);
        } else {
          setEstado({ tipo: "error", mensaje: MENSAJE_ERROR_SERVIDOR });
        }
        return;
      }

      // Los valores NO se limpian a propósito mientras `entregado` sea false: el
      // mensaje no llegó a nadie, así que borrar lo que la persona escribió la
      // obligaría a redactarlo otra vez para mandarlo por correo. Cuando se conecte
      // Resend y `entregado` pase a true, acá corresponde un setValores(DATOS_VACIOS).
      setEstado({ tipo: "exito", entregado: leerEntregado(cuerpo) });
    } catch {
      setEstado({ tipo: "error", mensaje: MENSAJE_ERROR_RED });
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={manejarEnvio}
      // Sin noValidate el navegador muestra sus propios globos antes de que corra
      // esta validación: dos sistemas de mensajes a la vez, uno de ellos en el idioma
      // del navegador y no del sitio.
      noValidate
      aria-busy={enviando}
      // Le da nombre al landmark "form", para que quien navega por regiones con
      // lector de pantalla lo encuentre por nombre. Sin nombre, un <form> no cuenta
      // como landmark y queda invisible en esa lista.
      aria-label="Formulario de contacto"
      className="space-y-8"
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <CampoTexto
          id={idDe("nombre")}
          name="nombre"
          label="Nombre y apellido"
          placeholder="Ej. Juan Pérez"
          autoComplete="name"
          maxLength={LIMITES.nombre}
          value={valores.nombre}
          onChange={(valor) => actualizar("nombre", valor)}
          error={errores.nombre}
        />
        <CampoTexto
          id={idDe("empresa")}
          name="empresa"
          label="Empresa u organización"
          placeholder="Ej. Marca Deportiva S.A."
          autoComplete="organization"
          maxLength={LIMITES.empresa}
          value={valores.empresa}
          onChange={(valor) => actualizar("empresa", valor)}
          error={errores.empresa}
          opcional
        />
        <CampoTexto
          id={idDe("correo")}
          name="correo"
          type="email"
          label="Correo electrónico"
          placeholder="juan@ejemplo.com"
          autoComplete="email"
          maxLength={LIMITES.correo}
          value={valores.correo}
          onChange={(valor) => actualizar("correo", valor)}
          error={errores.correo}
        />
        <CampoTexto
          id={idDe("telefono")}
          name="telefono"
          type="tel"
          label="Teléfono"
          placeholder="+593 99 123 4567"
          autoComplete="tel"
          maxLength={LIMITES.telefono}
          value={valores.telefono}
          onChange={(valor) => actualizar("telefono", valor)}
          error={errores.telefono}
          opcional
        />
      </div>

      <CampoSelect
        id={idDe("motivo")}
        name="motivo"
        label="Motivo"
        placeholder="Elige un motivo"
        opciones={MOTIVOS}
        value={valores.motivo}
        onChange={cambiarMotivo}
        error={errores.motivo}
      />

      {mostrarDeportista ? (
        <CampoSelect
          id={idDe("deportista")}
          name="deportista"
          label="Deportista de interés"
          placeholder="Sin preferencia"
          opciones={opcionesDeportistas}
          value={valores.deportista}
          onChange={(valor) => actualizar("deportista", valor)}
          error={errores.deportista}
          opcional
        />
      ) : null}

      <CampoTextarea
        id={idDe("mensaje")}
        name="mensaje"
        label="Mensaje"
        placeholder="Cuéntanos sobre tu interés…"
        maxLength={LIMITES.mensaje}
        value={valores.mensaje}
        onChange={(valor) => actualizar("mensaje", valor)}
        error={errores.mensaje}
      />

      {/* Campo trampa. Fuera de la pantalla (no display:none, que algunos bots saltan),
          aria-hidden para que ningún lector de pantalla lo anuncie y tabIndex -1 para
          que no se pueda llegar con Tab: una persona no puede rellenarlo ni por
          accidente. El -left-[9999px] no genera scroll horizontal porque body ya está
          con overflow-x hidden (app/globals.css). */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden"
      >
        <label htmlFor={`${idBase}-${CAMPO_TRAMPA}`}>Sitio web</label>
        <input
          ref={trampaRef}
          id={`${idBase}-${CAMPO_TRAMPA}`}
          name={CAMPO_TRAMPA}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {/* Región de estado. Se renderiza siempre (vacía en reposo) porque un
          aria-live que aparece junto con su contenido no se anuncia de forma
          confiable: el lector tiene que estar observando el nodo de antes. */}
      <div aria-live="polite" aria-atomic="true">
        {estado.tipo === "enviando" ? (
          <p className="flex items-center gap-2 font-body text-body-md text-foreground-muted">
            <Icon name="progress_activity" size={18} />
            Enviando tu mensaje…
          </p>
        ) : null}

        {estado.tipo === "invalido" ? (
          <p className="flex items-start gap-2 font-body text-body-md text-danger">
            <Icon name="error" size={18} className="mt-0.5 shrink-0" />
            <span>
              {estado.cantidad === 1
                ? "Hay 1 campo por corregir. Lo marcamos abajo."
                : `Hay ${estado.cantidad} campos por corregir. Los marcamos abajo.`}
            </span>
          </p>
        ) : null}

        {estado.tipo === "error" ? (
          <p className="flex items-start gap-2 font-body text-body-md text-danger">
            <Icon name="error" size={18} className="mt-0.5 shrink-0" />
            <span>{estado.mensaje}</span>
          </p>
        ) : null}

        {estado.tipo === "exito" ? (
          <div className="border-l-2 border-amber bg-surface-high/50 p-5">
            {estado.entregado ? (
              <>
                <p className="mb-1 font-body text-label-caps text-amber">
                  Mensaje enviado
                </p>
                <p className="font-body text-body-md text-foreground-muted">
                  Gracias por escribirnos. Te responderemos a este correo a la brevedad.
                </p>
              </>
            ) : (
              /* Mensaje honesto mientras el envío real no exista: el formulario validó
                 los datos, pero nadie los recibió. Se decide por el campo `entregado`
                 que devuelve /api/contacto, no por una constante que alguien tenga que
                 acordarse de cambiar — el día que Resend quede conectado, el handler
                 devuelve entregado:true y este texto se reemplaza solo. */
              <>
                <p className="mb-1 font-body text-label-caps text-amber">
                  Datos validados — todavía sin enviar
                </p>
                <p className="font-body text-body-md text-foreground-muted">
                  Tu formulario está completo y correcto, pero el envío automático de
                  correos aún no está conectado, así que este mensaje todavía no llegó a
                  nuestro equipo. Dejamos tu texto escrito acá arriba para que lo puedas
                  copiar: escríbenos a{" "}
                  <a
                    href={`mailto:${correoAgencia}`}
                    className="text-foreground underline decoration-amber decoration-2 underline-offset-4 transition-colors duration-300 hover:text-amber"
                  >
                    {correoAgencia}
                  </a>{" "}
                  y lo leemos hoy mismo.
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>

      <Button type="submit" disabled={enviando} className="w-full">
        {enviando ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
