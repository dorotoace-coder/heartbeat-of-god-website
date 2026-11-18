import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getDailyWordBySlug } from "@/lib/dailyWordData";
import { formatPublishDate, translationOf } from "@/lib/dailyWord";

export const alt = "Daily Word — Heartbeat of God Ministry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

function clamp(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const word = await getDailyWordBySlug(slug);

  let logo: string | null = null;
  try {
    const buf = await readFile(join(process.cwd(), "public/hbg-logo.png"));
    logo = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    logo = null;
  }

  const verse = word ? clamp(word.scripture_text, 230) : "Thy word is a lamp unto my feet, and a light unto my path.";
  const ref = word ? word.scripture_ref : "Psalm 119:105";
  const translation = translationOf(ref);
  const fontSize = verse.length > 170 ? 40 : verse.length > 110 ? 48 : 56;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: "radial-gradient(circle at 20% 0%, #2A1143 0%, #1C0A2D 45%, #0E0716 100%)",
          color: "#FAF7F2",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {logo && <img src={logo} width={74} height={61} alt="" />}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 30, fontStyle: "italic" }}>Heartbeat of God</span>
              <span style={{ fontSize: 16, letterSpacing: 5, color: "#D9B45A", fontFamily: "sans-serif", fontWeight: 700 }}>
                DAILY WORD
              </span>
            </div>
          </div>
          {word && (
            <span style={{ fontSize: 20, color: "rgba(250,247,242,0.6)", fontFamily: "sans-serif" }}>
              {formatPublishDate(word.publish_date, "short")}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize, lineHeight: 1.25, fontStyle: "italic" }}>“{verse}”</div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 24,
              letterSpacing: 4,
              color: "#D9B45A",
              fontFamily: "sans-serif",
              fontWeight: 700,
            }}
          >
            {translation.ref.toUpperCase()} · {translation.short}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(217,180,90,0.35)",
            paddingTop: 22,
            fontSize: 20,
            fontFamily: "sans-serif",
            color: "rgba(250,247,242,0.7)",
          }}
        >
          <span>{word ? clamp(word.title, 60) : "Bringing Men to the Consciousness of God’s Presence"}</span>
          <span style={{ color: "#EAD49A" }}>heartbeatofgod.ca</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
