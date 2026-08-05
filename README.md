# 여행 속 주치의 (Travel Care AI)

만성질환자·비건을 위한 건강 맞춤형 여행 코스 생성 플랫폼

## 시작하기

```bash
cd travel-care-ai
```

Windows PowerShell:
```powershell
Copy-Item .env.example .env.local
npx next dev
```

Mac/Linux:
```bash
cp .env.example .env.local
pnpm dev
```

> `pnpm dev`가 오류나면 `npx next dev`를 사용하세요.

http://localhost:3000 에서 확인

배포·환경변수·Kakao 도메인: [docs/DEPLOY.md](docs/DEPLOY.md)  
테스트 시나리오: [docs/TESTING.md](docs/TESTING.md)

## 주요 기능

- 질환+식이 프로필 등록 (당뇨, 고혈압, 비건 등)
- TourAPI 기반 안전 여행 코스 생성
- Gemini AI 메뉴 건강·비건 분석
- 건강/비건 신호등 4단계
- 실시간 혈당 모니터링 및 코스 재조정
- 주변 의료시설·비건 식당 지도

## API 키 발급

| 서비스 | URL |
|--------|-----|
| Gemini | https://aistudio.google.com |
| TourAPI | https://api.visitkorea.or.kr |
| 카카오 지도 | https://developers.kakao.com |
| 공공데이터포털 | https://www.data.go.kr |
| Upstash Redis | https://upstash.com |
| Supabase | https://supabase.com |

## 기술 스택

Next.js 14, TypeScript, Tailwind CSS, Prisma, Gemini 2.0 Flash, TourAPI, Kakao Maps

> AI 분석은 참고용이며 의료 진단·처방이 아닙니다.
