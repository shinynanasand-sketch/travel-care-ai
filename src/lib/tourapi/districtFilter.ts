/**
 * TourAPI 결과에서 선택한 시·군·구 이름에 맞는 주소만 남긴다.
 * locationBased 반경 검색이 인접 구를 섞을 때 후필터로 사용.
 */
export function filterItemsBySigunguName<T extends { addr1?: string }>(
  items: T[],
  sigunguName: string | undefined | null
): T[] {
  const name = sigunguName?.trim();
  if (!name) return items;

  return items.filter((item) => {
    const addr = item.addr1?.trim() ?? '';
    if (!addr) return false;
    return addr.includes(name);
  });
}
