# 배포 가이드 (GitHub + Vercel)

자격 증명·계정은 사용자가 직접 준비해야 합니다. 이 문서는 준비 순서만 정리합니다.

## 사전 체크리스트

| 항목 | env / 설정 | 비고 |
|------|------------|------|
| GitHub 저장소 | — | https://github.com/shinynanasand-sketch/travel-care-ai (앱이 저장소 루트) |
| Vercel 프로젝트 | — | Framework: Next.js, **Root Directory: `.`** |
| Gemini | `GEMINI_API_KEY` | aistudio.google.com |
| TourAPI/공공데이터 | `PUBLIC_DATA_API_KEY` | Decoding 키 권장. HIRA는 `hospInfoServicev2`·`pharmacyInfoService` 각각 활용신청 |
| Kakao Map | `NEXT_PUBLIC_KAKAO_MAP_KEY` | 도메인에 Vercel URL 등록 필수 |
| Kakao REST | `KAKAO_REST_API_KEY` | **권장** — HIRA 실패·빈결과 시 병원(HP8)·약국(PM9) 폴백 |
| 의료 진단 UI | `NEXT_PUBLIC_SHOW_MEDICAL_DIAGNOSTICS` | 개발 중 `true` → HIRA 실패 배너 표시 |
| Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 없으면 캐시 스킵 |
| DB (선택) | `DATABASE_URL`, `DIRECT_URL` | Supabase Postgres. mock-only 배포 시 placeholder URL이면 충분 |
| FCM (선택) | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | 보호자 실알림 |
| Mock | `USE_MOCK_DATA` | Production은 `"false"` + `PUBLIC_DATA_API_KEY` / `GEMINI_API_KEY` (실연동) |

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

### Kakao Web 도메인 (필수 — 미등록 시 지도 401)

브라우저에서 스크립트를 불러올 때 Referer가 없으면 SDK는 200이지만,  
`localhost` / `travel-care-ai.vercel.app` Referer면 **도메인 미등록 시 401** → 지도 로드 실패.

**반드시 `.env.local`의 JavaScript 키가 속한 그 앱**에서 등록:

1. https://developers.kakao.com → **내 애플리케이션** → **앱 키**에서 `NEXT_PUBLIC_KAKAO_MAP_KEY`와 **같은 JavaScript 키**인지 확인  
2. **JavaScript 키 → JavaScript SDK 도메인**에 추가·저장 (일반 「웹 도메인」과 별개):
   - `http://localhost:3000`
   - `https://travel-care-ai.vercel.app`
3. 다른 카카오 앱·웹 도메인(링크용)만 등록되어 있으면 지도는 계속 401

등록 후 1~2분 기다린 뒤 강력 새로고침. 키 값이 바뀌면 Vercel env 갱신 후 재배포 필요.

### Kakao JavaScript 키 (로컬 → Vercel)

`.env.local`의 `NEXT_PUBLIC_KAKAO_MAP_KEY`(및 선택 `KAKAO_REST_API_KEY`)는 Git에 올리지 않습니다.  
배포 지도가 동작하려면 **같은 값을 Vercel Environment Variables에 복사한 뒤 재배포**해야 합니다 (`NEXT_PUBLIC_*`는 빌드 시 주입).

```powershell
cd C:\Users\gicon\Desktop\Tour\travel-care-ai
# 값을 stdin으로 넣거나 대시보드에서 등록
npx vercel env add NEXT_PUBLIC_KAKAO_MAP_KEY production
npx vercel --prod
```

### Kakao Web 도메인

카카오 개발자 콘솔 → 앱 → 플랫폼 → Web 사이트 도메인:

- `http://localhost:3000`
- `https://travel-care-ai.vercel.app` (또는 현재 Production URL)

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
