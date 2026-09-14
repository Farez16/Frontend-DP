import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon generado (sin asset externo) — el prototipo no tenía ninguno
 * (auditoría §9.4). "DP" en ámbar sobre negro, coherente con la marca
 * real hasta que exista un ícono definitivo.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0d",
          color: "#ffbf00",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        DP
      </div>
    ),
    { ...size },
  );
}
