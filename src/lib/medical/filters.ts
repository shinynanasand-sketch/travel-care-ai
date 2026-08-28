/**
 * Drop facilities that are not useful for human chronic-care / emergency context.
 * Kakao HP8 mixes animal hospitals, dental, etc.
 */
const EXCLUDE_NAME =
  /동물병원|동물의료|수의|펫병원|pet\s?clinic|veterinary|치과|치의|치과의원|치과병원|조산원|산후조리/i;

/** HIRA clCd: 41 치과병원, 51 치과의원, 61 조산원 */
const EXCLUDE_CL_CD = new Set(['41', '51', '61']);

export function isExcludedMedicalName(name: string): boolean {
  return EXCLUDE_NAME.test(name ?? '');
}

export function isExcludedHiraClCd(clCd?: string | null): boolean {
  if (!clCd) return false;
  return EXCLUDE_CL_CD.has(String(clCd).trim());
}

export function filterHumanMedicalFacilities<
  T extends { name: string; clCd?: string },
>(list: T[]): T[] {
  return list.filter(
    (f) => !isExcludedMedicalName(f.name) && !isExcludedHiraClCd(f.clCd)
  );
}
