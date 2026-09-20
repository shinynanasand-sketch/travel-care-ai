'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode, MouseEvent } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useUserProfileHydrated } from '@/hooks/useUserProfileHydrated';
import { cn } from '@/lib/utils/cn';

type ProfileGateLinkProps = {
  href?: string;
  className?: string;
  children: ReactNode;
  /** 프로필 없을 때 이동할 경로 (기본 /profile?next=/plan) */
  profileHref?: string;
};

/**
 * 건강 프로필이 없으면 코스(/plan) 대신 프로필 등록으로 안내한다.
 * persist 재수화 전에는 /plan으로 두고, /plan 페이지 가드가 최종 안전망.
 */
export function ProfileGateLink({
  href = '/plan',
  className,
  children,
  profileHref = '/profile?next=/plan',
}: ProfileGateLinkProps) {
  const router = useRouter();
  const hydrated = useUserProfileHydrated();
  const healthProfile = useUserProfileStore((s) => s.healthProfile);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!hydrated) return;
    if (healthProfile) return;
    e.preventDefault();
    router.push(profileHref);
  };

  return (
    <Link href={href} onClick={handleClick} className={cn(className)}>
      {children}
    </Link>
  );
}
