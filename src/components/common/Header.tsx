'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-xl">🩺</span>
        <div>
          <p className="text-sm font-bold text-emerald-700">여행 속 주치의</p>
          <p className="text-xs text-gray-500">Travel Care AI</p>
        </div>
      </Link>
    </header>
  );
}
