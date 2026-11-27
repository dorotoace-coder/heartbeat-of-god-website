import { Suspense } from 'react';
import StaffWorkspace from '@/components/admin/StaffWorkspace';
export const dynamic = 'force-dynamic';
export default function AdminPage() {
  return <Suspense fallback={<p>Opening your workspace…</p>}><StaffWorkspace marriagesEnabled={process.env.HBG_MARRIAGES_ENABLED==='true'} /></Suspense>;
}
