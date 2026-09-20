import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileGateLink } from '@/components/common/ProfileGateLink';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white">
        <h1 className="text-2xl font-bold">여행 속 주치의</h1>
        <p className="mt-2 text-sm opacity-90">
          만성질환자·비건을 위한 건강 맞춤형 여행 코스
        </p>
        <p className="mt-4 text-xs opacity-75">
          AI 분석은 참고용이며 의료 진단·처방이 아닙니다.
        </p>
      </section>

      <div className="grid gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💉 만성질환자</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            당뇨·고혈압 맞춤 식당 추천, 의료시설 안전망, 혈당 모니터링
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🌱 비건·채식</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            비건 식당 검색, 4단계 비건 신호등, 메뉴 AI 분석
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/profile">
          <Button className="w-full" size="lg">
            1. 건강·식이 프로필 등록
          </Button>
        </Link>
        <ProfileGateLink href="/plan" className="block w-full">
          <Button variant="outline" className="w-full" size="lg">
            2. 여행 코스 만들기
          </Button>
        </ProfileGateLink>
        <Link href="/travel">
          <Button variant="outline" className="w-full" size="lg">
            3. 여행 중 건강 모니터링
          </Button>
        </Link>
      </div>
    </div>
  );
}
