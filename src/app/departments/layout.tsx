import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ministry Departments',
  description: 'Discover your place of service in the Kingdom. Apply to join our Pastoral, Media, Prayer, or Outreach teams.',
};

export default function DepartmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
