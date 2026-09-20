# 테스트 시나리오 가이드

> 실API(`USE_MOCK_DATA=false`) 스모크 시 TourAPI·지역코드는 [SUBMISSION.md](./SUBMISSION.md)·[DEPLOY.md](./DEPLOY.md)를 함께 확인한다.

## 시나리오 A — 당뇨 환자 코스 생성

1. `/profile` → 당뇨(2형) + 인슐린 투여 선택 → 저장
2. `/plan` → 서울, 2박 3일 선택 → "안전 코스 생성하기"
3. `/plan/result` → 건강 신호등 확인, 의료시설 목록 확인

## 시나리오 B — 저혈당·주변 시설 안내

1. `/travel` → 혈당 **58** 입력 → **기록** 버튼 클릭
2. 빨간 경고 배너 + **「주변 약국 보기」** 버튼 확인 (119가 아님)
3. 「주변 약국 보기」 클릭 → `/travel/nearby` → 약국 목록 1건 이상 표시
4. 「건강 기록」 클릭 → `/travel/health` → `혈당: 58 — DANGER` 목록 + 차트 확인

### 혈당별 기대 결과

| 입력값 | 경고 배너 | 버튼 |
|--------|----------|------|
| 58 | 빨간색 | 주변 약국 보기 |
| 50 | 빨간색 | 119 연락 |
| 200 | 노란색 | 주변 약국 보기 |
| 120 | 없음 | — |

## 시나리오 C — 비건+당뇨 복합 코스

1. `/profile` → 당뇨 + 비건 동시 선택
2. `/plan` → 부산 선택 → 코스 생성
3. `/plan/result` → 비건 필터 ON → 비건 신호등 확인

## 실행

```powershell
cd travel-care-ai
npx next dev
```

http://localhost:3000

> mock 모드: `.env.local`에서 `USE_MOCK_DATA="true"` (기본). 실연동 검증 시 `false` + `PUBLIC_DATA_API_KEY` 필요.

## 시나리오 진행 상태 (2026-08-05)

| 시나리오 | 상태 | 비고 |
|----------|------|------|
| A 당뇨 코스 | mock API 스모크 PASS | `POST /api/course/generate` → days=3, medicalFacilities≥1, safetyScore 반환 |
| B 저혈당·주변 시설 | mock API 스모크 PASS | `bloodSugar=58` → DANGER, fcmMode=mock, 인근 시설 반환. 실 FCM·UI 배너는 Firebase/브라우저 확인 필요 |
| C 비건+당뇨 | mock API 스모크 PASS | 부산+VEGAN → hasVeganOptions=true. 실 API·비건 필터 UI는 `USE_MOCK_DATA=false` + 키 필요 |

> 브라우저 UI 클릭 플로우(`/profile`→`/plan`→`/plan/result`)는 수동 확인 권장. 위 PASS는 서버 API 기준입니다.

## 공모전 제출 체크리스트 (Phase 10)

- [ ] Vercel 배포 URL
- [ ] GitHub 저장소 URL
- [ ] 데모 영상 (5분)
- [ ] TourAPI 활용 7종 내역 (searchKeyword2 비건 포함)
  - KorService2: areaBasedList2, locationBasedList2, searchKeyword2, detailIntro2, detailWithTour2
  - KorWithService2: detailWithTour2 (무장애)
  - WellnessTursmService: locationBasedList (웰니스)
- [ ] api.visitkorea.or.kr 제출
