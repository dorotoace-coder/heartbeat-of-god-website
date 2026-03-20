import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connect with Us',
  description: 'Have a prayer request or testimony? Reach out to Heartbeat of God Ministry today.',
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
