/** detailIntro2 직후 Gemini 전 사전 제외 — 상호·treatmenu 키워드 매칭 */
export const RESTAURANT_MENU_BLACKLIST = [
  '고기',
  '갈비',
  '삼겹살',
  '한우',
  '돈까스',
  '치킨',
  '횟집',
  '해물',
  '곱창',
  '막창',
  '국밥',
] as const;

export function isRestaurantBlacklisted(
  title: string,
  treatmenu?: string
): boolean {
  const blob = `${title} ${treatmenu ?? ''}`;
  return RESTAURANT_MENU_BLACKLIST.some((keyword) => blob.includes(keyword));
}
