import { notFound } from 'next/navigation';
import MarriageWorkspace from '@/components/marriages/MarriageWorkspace';
export const metadata = { title: 'Heartbeat Marriages — local preview', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default function MarriagePreview() {
  // Never expose a synthetic role switcher or unauthenticated workspace in production.
  if (process.env.NODE_ENV !== 'development') notFound();
  return <MarriageWorkspace />;
}
