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
  /** 프로필 없을 때 이동할 경로 (기본 /profile?next={href}) */
  profileHref?: string;
};

/**
 * 건강 프로필이 없으면 보호된 경로 대신 프로필 등록으로 안내한다.
 * persist 재수화 전에는 원래 href로 두고, 대상 페이지 가드가 최종 안전망.
 */
export function ProfileGateLink({
  href = '/plan',
  className,
  children,
  profileHref,
}: ProfileGateLinkProps) {
  const router = useRouter();
  const hydrated = useUserProfileHydrated();
  const healthProfile = useUserProfileStore((s) => s.healthProfile);
  const resolvedProfileHref = profileHref ?? `/profile?next=${href}`;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!hydrated) return;
    if (healthProfile) return;
    e.preventDefault();
    router.push(resolvedProfileHref);
  };

  return (
    <Link href={href} onClick={handleClick} className={cn(className)}>
      {children}
    </Link>
  );
}
