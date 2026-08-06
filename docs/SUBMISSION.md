# 공모전 제출 준비 체크리스트

마감: **2026-09-28** · 부문: 관광데이터 활용 공모전 ②-2 웹·앱

## 공개 URL

| 항목 | URL |
|------|-----|
| GitHub | https://github.com/shinynanasand-sketch/travel-care-ai |
| Vercel | https://travel-care-ai.vercel.app |

## 현재 연동 상태 (2026-08-06)

| 항목 | 상태 |
|------|------|
| TourAPI / 공공데이터 (실키) | Vercel `USE_MOCK_DATA=false` + `PUBLIC_DATA_API_KEY` |
| Gemini | Vercel `GEMINI_API_KEY` 등록 |
| Kakao Map | JS 키 + JavaScript SDK 도메인 등록 |
| Firebase FCM | **미설정** — `.env`에 서비스 계정 없음. 보호자 실푸시는 보류 |
| Supabase DB | placeholder만 (영속화 선택 과제) |

## TourAPI 활용 7종 (제출 문서용)

1. KorService2 `areaBasedList2`
2. KorService2 `locationBasedList2`
3. KorService2 `searchKeyword2` (비건/채식)
4. KorService2 `detailIntro2`
5. KorWithService2 `detailWithTour2` (무장애)
6. WellnessTursmService `locationBasedList`
7. 관광기상 (`/api/weather`)

비건: searchKeyword2 + 광역 스코어링 + detailIntro2/Gemini 3단계 파이프라인.

## 데모 영상 (5분) 촬영 순서

1. `/` 랜딩 — 만성질환자+비건 소개
2. `/profile` — 당뇨(+비건) 선택 저장
3. `/plan` → 코스 생성 → `/plan/result` 신호등
4. `/travel` — 혈당 58 입력 → 경고 배너
5. `/travel/nearby` — 지도 + 병원/약국 카드(이름·주소·전화)
6. (가능 시) 보호자 알림 — FCM 키 준비 후

## Phase 10 제출물

- [ ] 참가신청서
- [ ] TourAPI 활용 내역 (위 7종 + 비건 파이프라인)
- [ ] 기능 설명 해시태그: `#기저질환케어 #안심맛집 #비건식당검색 #식후산책코스`
- [ ] Vercel URL + GitHub URL
- [ ] 데모 영상 5분
- [ ] https://api.visitkorea.or.kr 제출

## FCM 블로커 (선택 단계)

Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 JSON 후 Vercel에:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (개행은 `\\n`)

준비되면 `/guardian`에 토큰 입력 후 저혈당 시나리오로 검증.
