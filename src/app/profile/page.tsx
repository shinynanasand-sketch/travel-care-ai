'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DietSelector } from '@/components/health/DietSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserProfileStore } from '@/store/userProfileStore';
import {
  loadUserProfileFromStorage,
  saveUserProfileToStorage,
} from '@/lib/profile/localProfile';
import type { ConditionType, ActivityLevel } from '@/types/health.types';

export default function ProfilePage() {
  const router = useRouter();
  const { healthProfile, setHealthProfile, setName, name } = useUserProfileStore();
  const [conditions, setConditions] = useState<ConditionType[]>(
    healthProfile?.conditions ?? []
  );
  const [userName, setUserName] = useState(name);
  const [insulinUser, setInsulinUser] = useState(healthProfile?.insulinUser ?? false);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    healthProfile?.activityLevel ?? 'MEDIUM'
  );
  const [restrictions, setRestrictions] = useState(
    healthProfile?.restrictions.join(', ') ?? ''
  );

  // localStorage에 저장된 임시 프로필이 있으면 당뇨·비건 등 선택 상태 복원
  useEffect(() => {
    const saved = loadUserProfileFromStorage();
    if (!saved || healthProfile?.conditions.length) return;

    const restored: ConditionType[] = [];
    if (saved.condition === 'diabetes') restored.push('DIABETES_TYPE2');
    if (saved.condition === 'hypertension') restored.push('HYPERTENSION');
    if (saved.condition === 'heart_disease') restored.push('HEART_DISEASE');
    if (saved.diet === 'vegan') restored.push('VEGAN');
    if (saved.diet === 'vegetarian') restored.push('VEGETARIAN');
    if (saved.diet === 'pescatarian') restored.push('PESCATARIAN');
    if (saved.diet === 'halal') restored.push('HALAL');
    if (saved.diet === 'food_allergy') restored.push('FOOD_ALLERGY');
    if (restored.length > 0) setConditions(restored);
  }, [healthProfile?.conditions.length]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // DB 없이 localStorage에 { condition: 'diabetes', diet: 'vegan' } 형태로 임시 저장
    saveUserProfileToStorage(conditions);

    // /plan 코스 생성에 필요한 상세 프로필은 메모리(zustand)에만 동기화
    setName(userName);
    setHealthProfile({
      conditions,
      medications: [],
      activityLevel,
      insulinUser,
      restrictions: restrictions
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
    });

    router.push('/plan');
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <h1 className="text-xl font-bold">건강·식이 프로필</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="이름"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-base">
            <input
              type="checkbox"
              checked={insulinUser}
              onChange={(e) => setInsulinUser(e.target.checked)}
              className="h-5 w-5"
            />
            인슐린 투여 중
          </label>
          <div>
            <p className="mb-2 text-sm text-gray-600">활동 수준</p>
            <div className="flex gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as ActivityLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setActivityLevel(level)}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    activityLevel === level
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200'
                  }`}
                >
                  {level === 'LOW' ? '낮음' : level === 'MEDIUM' ? '보통' : '높음'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">질환·식이 유형</CardTitle>
        </CardHeader>
        <CardContent>
          <DietSelector selected={conditions} onChange={setConditions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">제한 음식 (알레르기 등)</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="견과류, 유제품 (쉼표로 구분)"
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
          />
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={conditions.length === 0}
      >
        시작하기
      </Button>
    </form>
  );
}
