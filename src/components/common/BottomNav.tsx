'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { ProfileGateLink } from '@/components/common/ProfileGateLink';
import { useTravelPlanStore } from '@/store/travelPlanStore';
import { useUserProfileHydrated } from '@/hooks/useUserProfileHydrated';

export function BottomNav() {
  const pathname = usePathname();
  const hydrated = useUserProfileHydrated();
  const course = useTravelPlanStore((s) => s.course);
  const planHref =
    hydrated && course ? '/plan/result' : '/plan';

  const navItems = [
    { href: '/', label: '홈', icon: '🏠', gate: false as const },
    { href: planHref, label: '코스', icon: '🗺️', gate: true as const, match: '/plan' },
    { href: '/travel', label: '여행중', icon: '📍', gate: true as const, match: '/travel' },
    { href: '/profile', label: '프로필', icon: '👤', gate: false as const, match: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const matchBase = item.match ?? item.href;
          const active =
            pathname === matchBase ||
            pathname.startsWith(matchBase + '/') ||
            (matchBase === '/profile' && pathname.startsWith('/guardian'));
          const className = cn(
            'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 text-xs',
            active ? 'text-emerald-600 font-semibold' : 'text-gray-500'
          );
          const content = (
            <>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </>
          );

          if (item.gate) {
            return (
              <ProfileGateLink
                key={item.label}
                href={item.href}
                profileHref={`/profile?next=${item.href}`}
                className={className}
              >
                {content}
              </ProfileGateLink>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
