"use client";

import { useEffect, useState, useRef } from "react";

interface FlipDigitProps {
  value: string;
  label: string;
  accentColor?: string;
}

function FlipDigit({ value, label, accentColor = "#d4af37" }: FlipDigitProps) {
  const prevRef = useRef(value);
  const [flipping, setFlipping] = useState(false);
  const [prev, setPrev] = useState(value);
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      setPrev(prevRef.current);
      setFlipping(true);
      const t = setTimeout(() => {
        setCurrent(value);
        setFlipping(false);
        prevRef.current = value;
      }, 300);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative"
        style={{
          width: "80px",
          height: "96px",
          perspective: "400px",
        }}
      >
        {/* Back (next value, revealed during flip) */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl font-black"
          style={{
            background: "linear-gradient(160deg, #1a0828 0%, #0d0320 100%)",
            border: `1.5px solid ${accentColor}30`,
            fontSize: "52px",
            color: "#fff",
            boxShadow: `0 0 0 1px ${accentColor}20, inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}
        >
          {value}
        </div>

        {/* Front top half */}
        <div
          className="absolute left-0 right-0 top-0 flex items-end justify-center overflow-hidden rounded-t-2xl"
          style={{
            height: "50%",
            background: "linear-gradient(160deg, #22083a 0%, #130520 100%)",
            border: `1.5px solid ${accentColor}30`,
            borderBottom: `0.5px solid rgba(0,0,0,0.6)`,
            fontSize: "52px",
            fontWeight: 900,
            color: "#fff",
            paddingBottom: "2px",
            transformOrigin: "bottom center",
            animation: flipping ? "flipTopHalf 0.3s ease-in forwards" : "none",
          }}
        >
          {flipping ? prev : current}
        </div>

        {/* Front bottom half */}
        <div
          className="absolute left-0 right-0 bottom-0 flex items-start justify-center overflow-hidden rounded-b-2xl"
          style={{
            height: "50%",
            background: "linear-gradient(160deg, #130520 0%, #0d0318 100%)",
            border: `1.5px solid ${accentColor}30`,
            borderTop: "none",
            fontSize: "52px",
            fontWeight: 900,
            color: "rgba(255,255,255,0.85)",
            paddingTop: "2px",
            transformOrigin: "top center",
            animation: flipping ? "flipBottomHalf 0.3s ease-out 0.3s forwards" : "none",
          }}
        >
          {current}
        </div>

        {/* Center line shadow */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: "50%",
            height: "2px",
            background: "rgba(0,0,0,0.8)",
            transform: "translateY(-50%)",
            zIndex: 10,
          }}
        />

        {/* Accent glow */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 16px ${accentColor}15`,
          }}
        />
      </div>

      <span
        className="text-[10px] font-black uppercase tracking-[0.2em]"
        style={{ color: `${accentColor}80` }}
      >
        {label}
      </span>

      <style>{`
        @keyframes flipTopHalf {
          from { transform: rotateX(0deg); }
          to   { transform: rotateX(-90deg); }
        }
        @keyframes flipBottomHalf {
          from { transform: rotateX(90deg); }
          to   { transform: rotateX(0deg); }
        }
      `}</style>
    </div>
  );
}

interface FlipClockProps {
  targetDate: Date;
  accentColor?: string;
  showSeconds?: boolean;
}

export default function FlipClock({ targetDate, accentColor = "#d4af37", showSeconds = false }: FlipClockProps) {
  const [time, setTime] = useState({ days: "00", hours: "00", mins: "00", secs: "00" });

  useEffect(() => {
    const compute = () => {
      const diff = Math.max(0, targetDate.getTime() - Date.now());
      const days  = String(Math.floor(diff / 86400000)).padStart(2, "0");
      const hours = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0");
      const mins  = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const secs  = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setTime({ days, hours, mins, secs });
    };

    compute();
    const interval = setInterval(compute, showSeconds ? 1000 : 60000);
    return () => clearInterval(interval);
  }, [targetDate, showSeconds]);

  return (
    <div className="flex items-end gap-3 justify-center">
      <FlipDigit value={time.days}  label="Days"  accentColor={accentColor} />
      <span className="text-5xl font-black mb-8 opacity-20" style={{ color: accentColor }}>:</span>
      <FlipDigit value={time.hours} label="Hours" accentColor={accentColor} />
      <span className="text-5xl font-black mb-8 opacity-20" style={{ color: accentColor }}>:</span>
      <FlipDigit value={time.mins}  label="Min"   accentColor={accentColor} />
      {showSeconds && (
        <>
          <span className="text-5xl font-black mb-8 opacity-20" style={{ color: accentColor }}>:</span>
          <FlipDigit value={time.secs} label="Sec" accentColor={accentColor} />
        </>
      )}
    </div>
  );
}
