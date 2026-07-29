"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Youtube } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Vlog {
  id: string;
  title: string;
  preacher: string;
  category: string;
  date_preached: string;
  duration: string;
  thumbnail_url?: string | null;
  youtube_url?: string | null;
  video_url?: string | null;
}

/** The playable video URL, whichever column the DB uses. */
function videoUrlOf(v?: Vlog | null): string | null {
  return v?.youtube_url || v?.video_url || null;
}

/** Extract a YouTube video id from common URL shapes. */
function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

function thumbFor(v: Vlog): string {
  if (v.thumbnail_url) return v.thumbnail_url;
  const id = youtubeId(videoUrlOf(v));
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return "https://images.unsplash.com/photo-1478147427282-58a87a120781?q=80&w=2070&auto=format&fit=crop";
}

export default function VlogSection() {
  const [vlogs, setVlogs] = useState<Vlog[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null); // currently *playing* embed
  const [featured, setFeatured] = useState<Vlog | null>(null);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("sermons")
          .select("*")
          .order("date_preached", { ascending: false })
          .limit(7);
        if (error) throw error;
        const rows = (data as Vlog[]) || [];
        setVlogs(rows);
        setFeatured(rows[0] ?? null);
      } catch (err) {
        console.error("Failed to load vlogs:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const featuredVid = youtubeId(videoUrlOf(featured));
  const isPlaying = featured && activeId === featured.id && featuredVid;

  return (
    <section
      ref={sectionRef}
      className="relative py-28 px-8 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0b0416 0%, #170a26 50%, #0b0416 100%)", perspective: "1600px" }}
    >
      {/* Ambient depth glows */}
      <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] rounded-full blur-[130px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(200,162,208,0.14), transparent 70%)" }} />
      <div className="absolute bottom-0 -right-32 w-[460px] h-[460px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.12), transparent 70%)" }} />
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }} />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14"
        >
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-black tracking-[0.24em] uppercase mb-3"
              style={{ color: "rgba(212,175,55,0.7)" }}>
              <Youtube size={15} /> Heartbeat Vlog
            </span>
            <h2 className="font-headline text-4xl md:text-6xl text-white font-light leading-tight">
              Watch the <span className="italic" style={{ color: "#C8A2D0" }}>Latest</span>
            </h2>
          </div>
          <Link href="/media" className="text-white/60 hover:text-white transition-colors font-semibold flex items-center gap-2 group whitespace-nowrap">
            Full Media Archive
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 aspect-video rounded-3xl bg-white/[0.04] animate-pulse" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />)}
            </div>
          </div>
        ) : vlogs.length === 0 ? (
          /* Graceful fallback when the Media library has no videos yet */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-12 md:p-16 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-600/15 border border-red-500/25 flex items-center justify-center text-red-400">
              <Youtube size={30} />
            </span>
            <h3 className="font-headline text-2xl md:text-3xl text-white mb-3">New messages are on the way</h3>
            <p className="text-white/50 max-w-md mx-auto mb-8">
              Catch every teaching, worship moment, and testimony live on our YouTube channel.
            </p>
            <a
              href="https://youtube.com/@HBG_tv"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #C8A2D0, #9d6fb0)", boxShadow: "0 8px 24px rgba(200,162,208,0.3)" }}
            >
              <Youtube size={18} /> Watch on YouTube
            </a>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Featured 3D player ── */}
            <motion.div
              initial={{ opacity: 0, rotateY: 8, y: 30 }}
              whileInView={{ opacity: 1, rotateY: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-2 group relative rounded-3xl overflow-hidden"
              style={{
                transformStyle: "preserve-3d",
                boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(200,162,208,0.14)",
              }}
            >
              <div className="relative aspect-video bg-black">
                {isPlaying ? (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${featuredVid}?autoplay=1&rel=0`}
                    title={featured!.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <img
                      src={featured ? thumbFor(featured) : ""}
                      alt={featured?.title || "Featured message"}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0416] via-transparent to-transparent" />
                    <button
                      onClick={() => featured && featuredVid && setActiveId(featured.id)}
                      disabled={!featuredVid}
                      className="absolute inset-0 flex items-center justify-center"
                      aria-label="Play video"
                    >
                      <span className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-[0_0_40px_rgba(200,162,208,0.4)] group-hover:scale-110 group-hover:bg-sky group-hover:shadow-[0_0_60px_rgba(200,162,208,0.6)] transition-all duration-300">
                        <Play size={34} fill="currentColor" className="ml-1" />
                      </span>
                    </button>
                    <div className="absolute bottom-6 left-6 right-6">
                      {featured?.category && (
                        <span className="inline-block px-3 py-1 mb-3 rounded-full text-[10px] font-bold uppercase tracking-widest"
                          style={{ background: "rgba(212,175,55,0.15)", color: "#e8c860", border: "1px solid rgba(212,175,55,0.3)" }}>
                          {featured.category}
                        </span>
                      )}
                      <h3 className="font-headline text-2xl md:text-3xl text-white leading-tight line-clamp-2">{featured?.title}</h3>
                      <p className="text-white/60 text-sm mt-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">person</span>
                        {featured?.preacher}
                        {featured?.duration && <span className="opacity-50">· {featured.duration}</span>}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* ── Playlist ── */}
            <div className="space-y-3">
              {vlogs.slice(0, 4).map((v, i) => {
                const isActive = featured?.id === v.id;
                return (
                  <motion.button
                    key={v.id}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => { setFeatured(v); setActiveId(null); }}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl text-left transition-all group"
                    style={{
                      background: isActive ? "rgba(200,162,208,0.12)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? "rgba(200,162,208,0.35)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="relative w-28 h-16 rounded-xl overflow-hidden shrink-0">
                      <img src={thumbFor(v)} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={18} className="text-white" fill="currentColor" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold line-clamp-2 leading-snug group-hover:text-sky transition-colors">{v.title}</p>
                      <p className="text-white/40 text-xs mt-1">{v.preacher}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }} />
    </section>
  );
}
