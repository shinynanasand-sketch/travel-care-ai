import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/common/Header';
import { BottomNav } from '@/components/common/BottomNav';

const notoSans = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto',
});

export const metadata: Metadata = {
  title: '여행 속 주치의 | Travel Care AI',
  description: '만성질환자·비건을 위한 건강 맞춤형 여행 코스',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSans.variable} min-h-screen bg-gray-50 font-sans antialiased`}>
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-md flex-col">
            <Header />
            <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
