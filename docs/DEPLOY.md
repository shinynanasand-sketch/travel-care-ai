# 배포 가이드 (GitHub + Vercel)

자격 증명·계정은 사용자가 직접 준비해야 합니다. 이 문서는 준비 순서만 정리합니다.

## 사전 체크리스트

| 항목 | env / 설정 | 비고 |
|------|------------|------|
| GitHub 저장소 | — | `travel-care-ai`만 올리거나 모노레포 루트 지정 |
| Vercel 프로젝트 | — | Framework: Next.js, Root Directory: `travel-care-ai` |
| Gemini | `GEMINI_API_KEY` | aistudio.google.com |
| TourAPI/공공데이터 | `PUBLIC_DATA_API_KEY` | Decoding 키 |
| Kakao Map | `NEXT_PUBLIC_KAKAO_MAP_KEY` | 도메인에 Vercel URL 등록 필수 |
| Kakao REST | `KAKAO_REST_API_KEY` | 선택 |
| Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | 없으면 캐시 스킵 |
| DB (선택) | `DATABASE_URL`, `DIRECT_URL` | Supabase Postgres |
| FCM (선택) | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | 보호자 실알림 |
| Mock | `USE_MOCK_DATA` | 프로덕션은 `"false"` 권장 |

## 1. GitHub

```powershell
cd C:\Users\gicon\Desktop\Tour
# 또는 travel-care-ai만 별도 저장소로 운영
gh auth login
gh repo create travel-care-ai --private --source=. --remote=origin
git push -u origin HEAD
```

> 이 스크립트는 로그인·원격이 준비된 뒤에만 실행하세요. 에이전트는 대신 푸시하지 않습니다.

## 2. Vercel

1. https://vercel.com → Import Git Repository
2. **Root Directory** = `travel-care-ai` (모노레포인 경우)
3. Build Command: `prisma generate && next build` (`package.json` scripts.build와 동일)
4. Environment Variables: `.env.example`의 키를 Vercel에 등록
5. Deploy

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

- GitHub / Vercel / Supabase / Firebase / Kakao / 공공데이터 키 → **사용자 계정·발급**
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
