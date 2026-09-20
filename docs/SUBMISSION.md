# 공모전 제출 준비 체크리스트

마감: **2026-09-28** · 부문: 관광데이터 활용 공모전 ②-2 웹·앱  
문서 갱신: **2026-09-17**

## 공개 URL

| 항목 | URL | 상태 |
|------|-----|------|
| GitHub | https://github.com/shinynanasand-sketch/travel-care-ai | 준비됨 |
| Vercel | https://travel-care-ai.vercel.app | 준비됨 |

## 현재 연동 상태 (2026-09-17)

| 항목 | 상태 |
|------|------|
| TourAPI / 공공데이터 (실키) | Vercel `USE_MOCK_DATA=false` + `PUBLIC_DATA_API_KEY` |
| Gemini | Vercel `GEMINI_API_KEY` (gemini-2.5-flash) |
| Kakao Map | JS 키 + 도메인 등록 |
| travelStyle + 사진 필터 + Gemini 명소 선정 | 구현 완료 |
| 결과 UI (썸네일·대안 장소) | 구현 완료 |
| 코스 API maxDuration | 60초 (vercel.json + route export) |
| 의료 진단 배너 | 기본 숨김 (`NEXT_PUBLIC_SHOW_MEDICAL_DIAGNOSTICS=true` 시만 표시) |
| 법정동 필터 (lDong*) | 광역시 맵 + areaBased/searchKeyword grace 병행 |
| Firebase FCM | 배포·Admin/Client env 설정됨 (`/api/notify` `configured:true`, SW 200). 실기기 토큰으로 푸시 검증 권장 |
| Supabase DB | placeholder(선택) |

## TourAPI 활용 내역 (제출 복붙용)

아래 문구를 참가신청·활용 내역란에 그대로/편집해 사용한다.

```
Travel Care AI는 한국관광공사 KorService2·무장애·웰니스 API를 활용해
만성질환자·비건 여행객용 맞춤 일정을 생성합니다.

1) areaBasedList2 — 지역(법정동 lDongRegnCd/lDongSignguCd 우선, legacy areaCode grace) 관광지
2) locationBasedList2 — GPS·반경 기반 음식점·명소(지역코드 장애 시 보험 풀)
3) searchKeyword2 — 비건/채식 키워드 검색 (3단계 파이프라인 1단계)
4) detailIntro2 — 음식점 대표·취급 메뉴 → Gemini 건강·비건 분석
5) KorWithService2 detailWithTour2 — 무장애(휠체어·엘리베이터 등) → 일정 안전등급 보강
6) WellnessTursmService locationBasedList — 사용자 취향('힐링') 및 해당 지역 내 데이터 존재 여부에 따른 조건부 웰니스 스팟 유연 배정 (데이터 부재 시 일반 명소로 자동 대체)
7) 관광기상(/api/weather) — 현재는 참고용 고정값(stub). 실연동 전 폭염 분기는 비활성

부가: travelStyle(힐링·액티비티 등) 반영 Gemini 명소 선정,
firstimage 있는 고화질 장소 우선 필터, 결과 화면 썸네일·대안 장소 제안,
하루 오전·오후 2명소 + 식사 클러스터, 시 전체 시 일자별 권역 묶기,
결과 화면에서 하루 재생성·장소 교체(/api/course/edit).
웰니스·비건 등 API 응답이 비었거나 필터 후 후보가 없을 때
샘플·가짜 데이터로 일정을 채우지 않고, areaBased/locationBased 등
실제 TourAPI 명소·일반 식당 풀로 Fallback 우회(대안 식당은 isVeganGuaranteed=false로 표시).
비건: searchKeyword2 + 광역 스코어링 + detailIntro2/Gemini + 블랙리스트 사전 필터.
```

해시태그(기능 설명):  
`#기저질환케어 #안심맛집 #비건식당검색 #식후산책코스`

## 실연동 리허설 (자동)

```bash
npm run dev
npm run test:rehearsal    # 키 검증 + E2E API
npm run test:demo-preflight  # 촬영 전 점검
```

- [x] `USE_MOCK_DATA=false` 실연동 E2E PASS (Vercel, 9/9, 2026-08-28)
- [ ] SUBMISSION 대본대로 브라우저 수동 1회 통과

## 데모 영상 (5분) 촬영 대본

권장 지역: **광주 전체** 또는 **서울 전체** (시 전체 → 일자 클러스터 시연).  
권장 프로필: **당뇨만** (비건 제외 시 코스 생성 빠름).

| 분 | 화면 | 말할 포인트 |
|----|------|-------------|
| 0:00–0:40 | `/` | 만성질환+비건 여행 불안 → TourAPI 맞춤 코스 |
| 0:40–1:20 | `/profile` | 당뇨 2형 저장 (시연 시 비건 제외 권장) |
| 1:20–2:40 | `/plan` | 서울/광주 전체 · 2박3일 · **여행 취향** 선택 → 생성 (로딩 안내 확인) |
| 2:40–3:40 | `/plan/result` | **썸네일**, Day당 명소·식당, **「이런 곳은 어떠세요?」**, 비건 신호등, 일정 편집 |
| 3:40–4:20 | `/travel` | 혈당 58 → 경고·주변 약국 |
| 4:20–5:00 | `/travel/nearby` | 지도·병원/약국 카드 |

### 촬영 전 체크리스트

- [x] 의료 [개발] 배너 기본 숨김
- [x] 결과 화면 썸네일·대안 장소 UI
- [x] 코스 생성 로딩 단계 메시지
- [ ] `npm run test:demo-preflight` PASS
- [ ] 영상 파일 확보 (mp4 등)
- [ ] 자막/해상도 확인

## Phase 10 제출물

- [ ] 참가신청서 (포털 양식 — 위 활용 내역·URL 붙여넣기)
- [x] TourAPI 활용 내역 초안 (본 문서 섹션)
- [x] 해시태그 문구 확정
- [x] 기능설명서 복붙 초안 ([FUNCTIONAL_DESCRIPTION.md](./FUNCTIONAL_DESCRIPTION.md) · 지정과제 5번 · 팀 나의성)
- [x] Vercel URL + GitHub URL
- [ ] 데모 영상 5분 (위 대본으로 촬영)
- [ ] 기능설명서 PPT 양식에 문구·이미지 반영 후 제출
- [ ] https://api.visitkorea.or.kr 제출 완료

## FCM 상태 (2026-09-17)

- 프로덕션에 `/api/notify`, `/firebase-messaging-sw.js`, `/firebase-sw-config.js` 배포됨
- Vercel Production에 Admin(`FIREBASE_*`)·Client(`NEXT_PUBLIC_FIREBASE_*`·VAPID) env 반영
- API 스모크: 잘못된 토큰 → `configured:true` + `messaging/invalid-argument` (SDK 연동 확인)
- 남은 검증: 브라우저 `/travel`에서 알림 허용 → 혈당 70 미만 → 실제 푸시 수신
- GitHub↔Vercel 자동 배포는 GitHub App 미설치로 끊김 → 당분간 `npx vercel deploy --prod --scope nanasands-projects` 또는 [Vercel GitHub App](https://github.com/apps/vercel) 설치 후 `vercel git connect`
