"use client";

import { useRef } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  intensity?: number; // default 12deg max tilt
  glowColor?: string; // rgba string
  onClick?: () => void;
}

export default function TiltCard({
  children,
  className = "",
  style = {},
  intensity = 10,
  glowColor = "rgba(200,162,208,0.12)",
  onClick,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = ((y - cy) / cy) * -intensity;
    const rotY = ((x - cx) / cx) * intensity;
    const glowX = (x / rect.width) * 100;
    const glowY = (y / rect.height) * 100;

    ref.current.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.025,1.025,1.025)`;
    ref.current.style.zIndex = "2";
    if (highlightRef.current) {
      highlightRef.current.style.background = `radial-gradient(circle at ${glowX}% ${glowY}%, ${glowColor} 0%, transparent 65%)`;
      highlightRef.current.style.opacity = "1";
    }
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)`;
    ref.current.style.zIndex = "";
    if (highlightRef.current) {
      highlightRef.current.style.opacity = "0";
    }
  };

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      style={{
        ...style,
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {/* Highlight overlay — follows cursor */}
      <div
        ref={highlightRef}
        className="absolute inset-0 rounded-[inherit] pointer-events-none z-10 transition-opacity duration-300"
        style={{ opacity: 0 }}
      />
      {children}
    </div>
  );
}
