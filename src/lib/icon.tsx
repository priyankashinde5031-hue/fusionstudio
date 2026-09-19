import { ImageResponse } from "next/og";

/** Shared "FS" monogram used for the favicon, apple icon and PWA icons. */
export function monogram(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #16161a 0%, #0b0b0d 60%, #1c1c22 100%)",
          color: "#e6c076",
          fontSize: Math.round(size * 0.46),
          fontWeight: 700,
          fontFamily: "Georgia, serif",
          letterSpacing: -2,
        }}
      >
        FS
      </div>
    ),
    { width: size, height: size },
  );
}
