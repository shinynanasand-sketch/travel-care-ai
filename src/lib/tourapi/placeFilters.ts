export function pickTourImageUrl(item: {
  firstimage?: string;
  firstimage2?: string;
}): string | undefined {
  for (const raw of [item.firstimage, item.firstimage2]) {
    const url = raw?.trim();
    if (url && /^https?:\/\//i.test(url)) return url;
  }
  return undefined;
}

/** TourAPI firstimage / firstimage2 URL이 유효한지 확인 */
export function hasTourPlaceImage(item: {
  firstimage?: string;
  firstimage2?: string;
}): boolean {
  const urls = [item.firstimage, item.firstimage2];
  return urls.some((raw) => {
    const url = raw?.trim();
    return Boolean(url && /^https?:\/\//i.test(url));
  });
}

/** 고화질 사진이 있는 장소만 유지. 전부 걸러지면 원본 풀 유지(목업·소량 데이터 보호). */
export function filterPlacesWithImages<T extends { firstimage?: string; firstimage2?: string }>(
  items: T[]
): T[] {
  const withImages = items.filter(hasTourPlaceImage);
  return withImages.length > 0 ? withImages : items;
}
