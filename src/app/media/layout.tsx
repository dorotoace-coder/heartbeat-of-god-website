import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Media Archive',
  description: 'Explore our digital library of sermons, teachings, and spiritual resources from Pastor Amos Unogwu.',
};

export default function MediaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
