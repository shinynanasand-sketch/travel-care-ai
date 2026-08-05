# 배포 가이드 (GitHub + Vercel)

자격 증명·계정은 사용자가 직접 준비해야 합니다. 이 문서는 준비 순서만 정리합니다.

## 사전 체크리스트

| 항목 | env / 설정 | 비고 |
|------|------------|------|
| GitHub 저장소 | — | https://github.com/shinynanasand-sketch/travel-care-ai (앱이 저장소 루트) |
| Vercel 프로젝트 | — | Framework: Next.js, **Root Directory: `.`** |
| Gemini | `GEMINI_API_KEY` | aistudio.google.com |
| TourAPI/공공데이터 | `PUBLIC_DATA_API_KEY` | Decoding 키 |
| Kakao Map | `NEXT_PUBLIC_KAKAO_MAP_KEY` | 도메인에 Vercel URL 등록 필수 |
| Kakao REST | `KAKAO_REST_API_KEY` | 선택 |
| Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 없으면 캐시 스킵 |
| DB (선택) | `DATABASE_URL`, `DIRECT_URL` | Supabase Postgres. mock-only 배포 시 placeholder URL이면 충분 |
| FCM (선택) | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | 보호자 실알림 |
| Mock | `USE_MOCK_DATA` | 1단계 배포는 `"true"`, 실연동 시 `"false"` |

## 1. GitHub

앱 전용 저장소에 이미 push된 상태:

- https://github.com/shinynanasand-sketch/travel-care-ai
- 로컬 경로: `travel-care-ai/` (이 폴더가 git 루트)
- `.env.local` 등 비밀값은 `.gitignore`로 제외

추가 push:

```powershell
cd C:\Users\gicon\Desktop\Tour\travel-care-ai
git add -A
git commit -m "your message"
git push -u origin main
```

## 2. Vercel (웹 Import)

1. https://vercel.com → Import Git Repository → `travel-care-ai`
2. **Root Directory** = `.` (앱이 저장소 루트)
3. Build Command: `prisma generate && next build` (`package.json` scripts.build와 동일)
4. Environment Variables: 최소 `USE_MOCK_DATA=true` + placeholder `DATABASE_URL`/`DIRECT_URL`
5. Deploy

### CLI (mock 1단계)

```powershell
cd C:\Users\gicon\Desktop\Tour\travel-care-ai
npx vercel login
npx vercel link
npx vercel env add USE_MOCK_DATA
npx vercel --prod
```

### Kakao JavaScript 키 도메인

배포 URL이 생기면 카카오 개발자 콘솔 → 앱 → 플랫폼 → Web:

- `https://<project>.vercel.app`
- 커스텀 도메인이 있으면 그 도메인도 추가

미등록 시 지도가 로컬에서만 되고 배포 환경에서 실패합니다.

## 3. 배포 후 스모크

1. `/` 랜딩 로드
2. `/profile` → 당뇨 저장
3. `/plan` → 코스 생성 (실키면 `USE_MOCK_DATA=false`)
4. `/travel` → 혈당 58 기록 → 경고 배너
5. (선택) Firebase 설정 후 보호자 FCM

## 4. 블로커 요약

- Vercel / Supabase / Firebase / Kakao / 공공데이터 키 → **사용자 계정·발급**
- FCM 실기기 토큰 → 브라우저/앱에서 발급 후 `/guardian`에 입력
- 데모 영상 · 공모전 제출 페이지 → 수동 작업

## 빠른 로컬 검증

```powershell
cd travel-care-ai
Copy-Item .env.example .env.local   # 최초 1회
# USE_MOCK_DATA=true 유지한 채
npx next dev
```

상세 시나리오: `docs/TESTING.md`
