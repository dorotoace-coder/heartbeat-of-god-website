import Image from "next/image";

export default function MinistryLogo({ className = "h-12 w-auto", preload = false }: { className?: string; preload?: boolean }) {
  return <Image src="/hbg-logo-premium.png" alt="Heartbeat of God" width={1200} height={633} className={className} preload={preload} />;
}
