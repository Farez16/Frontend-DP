import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

/**
 * Primitivas de campo del proyecto. Son las primeras: antes de esto el sitio no
 * tenía un solo <input>, <select> ni <textarea> en ninguna página.
 *
 * Los tres viven en un archivo y no en tres porque comparten entera la cáscara
 * —label asociado, marca de opcional, mensaje de error, ids derivados— y esa
 * cáscara es justo la parte que no se puede permitir divergir: si el <select>
 * dejara de asociar su label o de anunciar su error, el formulario quedaría
 * inaccesible sólo en ese campo, que es el tipo de defecto que nadie nota. Acá
 * `CampoEnvoltorio` la define una vez y los tres la usan.
 *
 * Estilo tomado del prototipo (contacto_dp_gesti_n_deportiva/code.html): fondo
 * transparente, sin bordes laterales, sólo borde inferior.
 */

interface PropsComunes {
  /** Debe ser único en la página: de él se derivan el `for` del label y el id del error. */
  id: string;
  /** `name` del campo; el formulario lo usa además para poder enfocarlo por selector. */
  name: string;
  label: string;
  /** Mensaje de error a mostrar; `undefined` = el campo está bien. */
  error?: string;
  /**
   * Marca el campo como no obligatorio: agrega "(opcional)" al label y omite
   * `required`. Una sola prop gobierna las dos cosas a propósito — con una prop
   * `required` aparte se podía escribir un campo rotulado "(opcional)" que el
   * navegador igual exigía.
   */
  opcional?: boolean;
}

/**
 * Borde inferior de 2px siempre, cambiando sólo de color al foco. Con 1px en reposo
 * y 2px al foco (como el prototipo) cada enfoque empujaba el contenido de abajo 1px.
 *
 * El foco se marca dos veces: el borde inferior pasa a ámbar (el lenguaje visual del
 * prototipo) y además se dibuja un `outline` ámbar completo. Sólo con el cambio de
 * color del borde el contraste entre estado normal y enfocado es de 1.9:1, por debajo
 * del 3:1 que pide WCAG 2.4.11 — el outline es lo que hace que el foco sea
 * inconfundible, sobre todo para quien navega con teclado.
 */
const CLASES_CONTROL =
  "w-full border-0 border-b-2 bg-transparent px-0 py-2 font-body text-body-lg transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber";

/**
 * El color del texto tampoco va en CLASES_CONTROL, por el mismo motivo que el borde:
 * el <select> sin elegir tiene que verse atenuado como un placeholder, y sumar
 * `text-foreground-muted/60` encima de un `text-foreground` fijo deja que decida el
 * orden de la hoja de Tailwind. Cada control declara su color una sola vez.
 */
const TEXTO_NORMAL = "text-foreground";
const TEXTO_PLACEHOLDER = "text-foreground-muted/60";

const CLASES_PLACEHOLDER = "placeholder:text-foreground-muted/40";

/**
 * El color del borde se elige, no se acumula. Emitir `border-outline` siempre y
 * agregarle `border-danger` cuando hay error no funciona: las dos son utilidades
 * planas sobre la misma propiedad, así que gana la que Tailwind haya puesto después
 * en la hoja, no la que esté después en el atributo `class`. Medido en el navegador,
 * ganaba `border-outline` y el borde de error simplemente no se pintaba nunca.
 *
 * Con error el borde queda rojo incluso enfocado: el error es la información más
 * importante de las dos, y el foco ya se marca aparte con su propio `outline`.
 */
const BORDE_NORMAL = "border-outline focus:border-amber";
const BORDE_ERROR = "border-danger";

function CampoEnvoltorio({
  id,
  label,
  error,
  opcional,
  children,
}: Omit<PropsComunes, "name"> & { children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block font-body text-label-caps text-foreground-muted"
      >
        {label}
        {opcional ? (
          <span className="ml-2 font-normal normal-case tracking-normal opacity-60">
            (opcional)
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        // El id lo referencia `aria-describedby` del control, así que al enfocar el
        // campo el lector de pantalla lee la etiqueta y enseguida el error.
        // El ícono acompaña al color: el mensaje no se comunica sólo con rojo.
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 font-body text-body-md text-danger"
        >
          <Icon name="error" size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

/** `aria-describedby` sólo cuando hay error; si no, no debe existir el atributo. */
function describedBy(id: string, error?: string): string | undefined {
  return error ? `${id}-error` : undefined;
}

interface PropsTexto extends PropsComunes {
  value: string;
  onChange: (valor: string) => void;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
}

export function CampoTexto({
  id,
  name,
  label,
  error,
  opcional,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  autoComplete,
}: PropsTexto) {
  return (
    <CampoEnvoltorio id={id} label={label} error={error} opcional={opcional}>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        required={!opcional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error)}
        className={cn(
          CLASES_CONTROL,
          TEXTO_NORMAL,
          CLASES_PLACEHOLDER,
          error ? BORDE_ERROR : BORDE_NORMAL,
        )}
      />
    </CampoEnvoltorio>
  );
}

interface PropsSelect extends PropsComunes {
  value: string;
  onChange: (valor: string) => void;
  /** Texto de la opción vacía inicial. */
  placeholder: string;
  opciones: ReadonlyArray<{ value: string; label: string }>;
}

export function CampoSelect({
  id,
  name,
  label,
  error,
  opcional,
  value,
  onChange,
  placeholder,
  opciones,
}: PropsSelect) {
  return (
    <CampoEnvoltorio id={id} label={label} error={error} opcional={opcional}>
      {/* `relative` para poder anclar el chevron: con appearance-none el navegador
          deja de dibujar el suyo, y sin reemplazo el select no se lee como
          desplegable. `pr-8` le reserva el espacio para que el texto de una opción
          larga no pase por debajo del ícono. */}
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(evento) => onChange(evento.target.value)}
          required={!opcional}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error)}
          className={cn(
            CLASES_CONTROL,
            "cursor-pointer appearance-none pr-8",
            // Sin valor elegido se ve atenuado como un placeholder real; con valor,
            // al color normal del campo.
            value === "" ? TEXTO_PLACEHOLDER : TEXTO_NORMAL,
            error ? BORDE_ERROR : BORDE_NORMAL,
          )}
        >
          <option value="" className="bg-surface-high text-foreground">
            {placeholder}
          </option>
          {opciones.map((opcion) => (
            <option
              key={opcion.value}
              value={opcion.value}
              className="bg-surface-high text-foreground"
            >
              {opcion.label}
            </option>
          ))}
        </select>
        <Icon
          name="expand_more"
          size={20}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-foreground-muted"
        />
      </div>
    </CampoEnvoltorio>
  );
}

interface PropsTextarea extends PropsComunes {
  value: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}

export function CampoTextarea({
  id,
  name,
  label,
  error,
  opcional,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 5,
}: PropsTextarea) {
  return (
    <CampoEnvoltorio id={id} label={label} error={error} opcional={opcional}>
      {/* `resize-y` y no `resize-none` como el prototipo: el campo admite hasta 2000
          caracteres y negarle a quien escribe un mensaje largo la posibilidad de ver
          lo que escribió no aporta nada. Horizontal sigue bloqueado (rompería la
          columna). */}
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        required={!opcional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error)}
        className={cn(
          CLASES_CONTROL,
          TEXTO_NORMAL,
          CLASES_PLACEHOLDER,
          "resize-y",
          error ? BORDE_ERROR : BORDE_NORMAL,
        )}
      />
    </CampoEnvoltorio>
  );
}
