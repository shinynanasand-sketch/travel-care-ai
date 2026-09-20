'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode, MouseEvent } from 'react';
import { useUserProfileStore } from '@/store/userProfileStore';
import { useUserProfileHydrated } from '@/hooks/useUserProfileHydrated';
import { hasHealthOrDietConditions } from '@/lib/profile/healthConditions';
import { cn } from '@/lib/utils/cn';

type ProfileGateLinkProps = {
  href?: string;
  className?: string;
  children: ReactNode;
  /** 프로필 없을 때 이동할 경로 (기본 /profile?next={href}) */
  profileHref?: string;
};

/**
 * 질환·식이 조건이 하나라도 없으면 보호된 경로 대신 프로필 등록으로 안내한다.
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
  const ready = hasHealthOrDietConditions(healthProfile?.conditions);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!hydrated) return;
    if (ready) return;
    e.preventDefault();
    router.push(resolvedProfileHref);
  };

  return (
    <Link href={href} onClick={handleClick} className={cn(className)}>
      {children}
    </Link>
  );
}
