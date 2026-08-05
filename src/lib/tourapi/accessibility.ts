// 인증키: PUBLIC_DATA_API_KEY (getCommonParams 경유)
// 무장애 접근성 정보는 barrierFree.ts(KorWithService2/detailWithTour2)로 일원화됨.
// 기존 import 경로 호환을 위한 재-export.
export {
  getAccessibilityInfo,
  computeAccessibilityLevel,
} from './barrierFree';
