/**
 * TourAPI 법정동 코드 (lDong*) — docs/11-tourapi-code-migration.md
 * lDongRegnCd: 시도 / lDongSignguCd: 시군구 5자리
 */

/** TourAPI areaCode → 법정동 시도 */
export const LDONG_REGN_BY_AREA: Record<string, string> = {
  '1': '11', // 서울
  '2': '28', // 인천
  '3': '30', // 대전
  '4': '27', // 대구
  '5': '29', // 광주
  '6': '26', // 부산
  '7': '31', // 울산
  '8': '36', // 세종
  '31': '41', // 경기
  '32': '42', // 강원
  '33': '43', // 충북
  '34': '44', // 충남
  '35': '47', // 경북
  '36': '48', // 경남
  '37': '45', // 전북
  '38': '46', // 전남
  '39': '50', // 제주
};

/** `${areaCode}:${sigunguCode}` → lDongSignguCd (데모·광역시 위주) */
export const LDONG_SIGNGU_BY_AREA_SIGUNGU: Record<string, string> = {
  // 서울
  '1:1': '11680',
  '1:2': '11740',
  '1:3': '11305',
  '1:4': '11500',
  '1:5': '11620',
  '1:6': '11215',
  '1:7': '11530',
  '1:8': '11545',
  '1:9': '11350',
  '1:10': '11320',
  '1:11': '11230',
  '1:12': '11590',
  '1:13': '11440',
  '1:14': '11410',
  '1:15': '11650',
  '1:16': '11200',
  '1:17': '11290',
  '1:18': '11710',
  '1:19': '11470',
  '1:20': '11560',
  '1:21': '11170',
  '1:22': '11380',
  '1:23': '11110',
  '1:24': '11140',
  '1:25': '11260',
  // 인천
  '2:1': '28110',
  '2:2': '28140',
  '2:3': '28177',
  '2:4': '28185',
  '2:5': '28200',
  '2:6': '28237',
  '2:7': '28245',
  '2:8': '28260',
  '2:9': '28710',
  '2:10': '28720',
  // 대전
  '3:1': '30110',
  '3:2': '30140',
  '3:3': '30170',
  '3:4': '30200',
  '3:5': '30230',
  // 대구
  '4:1': '27110',
  '4:2': '27140',
  '4:3': '27170',
  '4:4': '27200',
  '4:5': '27230',
  '4:6': '27260',
  '4:7': '27290',
  '4:8': '27710',
  // 광주
  '5:1': '29110',
  '5:2': '29140',
  '5:3': '29155',
  '5:4': '29170',
  '5:5': '29200',
  // 부산
  '6:1': '26110',
  '6:2': '26140',
  '6:3': '26170',
  '6:4': '26200',
  '6:5': '26230',
  '6:6': '26260',
  '6:7': '26290',
  '6:8': '26320',
  '6:9': '26350',
  '6:10': '26380',
  '6:11': '26410',
  '6:12': '26440',
  '6:13': '26470',
  '6:14': '26500',
  '6:15': '26530',
  '6:16': '26710',
  // 울산
  '7:1': '31110',
  '7:2': '31140',
  '7:3': '31170',
  '7:4': '31200',
  '7:5': '31710',
  // 세종
  '8:1': '36110',
};

export function getLDongRegnCd(areaCode: string): string | undefined {
  return LDONG_REGN_BY_AREA[areaCode];
}

export function getLDongSignguCd(
  areaCode: string,
  sigunguCode?: string | null
): string | undefined {
  if (!sigunguCode) return undefined;
  return LDONG_SIGNGU_BY_AREA_SIGUNGU[`${areaCode}:${sigunguCode}`];
}

/** Params for areaBasedList2 / searchKeyword2 — lDong first, legacy grace. */
export function tourAreaFilterParams(
  areaCode: string,
  sigunguCode?: string | null
): Record<string, string> {
  const params: Record<string, string> = {};
  const regn = getLDongRegnCd(areaCode);
  const signgu = getLDongSignguCd(areaCode, sigunguCode);
  if (regn) params.lDongRegnCd = regn;
  if (signgu) params.lDongSignguCd = signgu;
  // Grace: still send legacy while APIs accept them
  params.areaCode = areaCode;
  if (sigunguCode) params.sigunguCode = sigunguCode;
  return params;
}

/** Prefer new classification field, fall back to cat3. */
export function categoryLabel(item: {
  cat3?: string;
  lclsSystm3?: string;
  lclsSystm2?: string;
}): string {
  return item.lclsSystm3 || item.lclsSystm2 || item.cat3 || '';
}
