import { ImageResponse } from "next/og";

export function generateImageMetadata() {
  return [{ size: { width: 192, height: 192 }, id: "192" }, { size: { width: 512, height: 512 }, id: "512" }];
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const dimension = Number(await id);
  const size = dimension === 192 ? 192 : 512;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#183c32", color: "#f3d58a" }}>
      <div style={{ width: "68%", height: "54%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", border: `${Math.max(2, Math.round(size / 96))}px solid #d6b66f`, borderRadius: size * 0.08, background: "#21483c" }}>
        <div style={{ width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06, background: "#d6b66f" }} />
        <div style={{ marginTop: size * 0.035, fontSize: size * 0.105, fontWeight: 700, letterSpacing: size * 0.012 }}>GIFT</div>
      </div>
    </div>,
    { width: size, height: size },
  );
}
