import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ministry Programs',
  description: 'Join our upcoming events, including the Salvation Challenge, CLT devotionals, and spiritual training sessions.',
};

export default function ProgramsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
