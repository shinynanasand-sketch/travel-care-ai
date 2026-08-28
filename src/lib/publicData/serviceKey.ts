/**
 * 공공데이터포털 serviceKey 전송 규칙
 * - TourAPI와 동일하게 env 값을 기준으로 사용
 * - Encoding 키(%2F 등)면 URL에 그대로 붙임 (재인코딩 금지)
 * - Decoding 키면 encodeURIComponent 한 번만
 */
export function getPublicDataApiKey(): string {
  return (process.env.PUBLIC_DATA_API_KEY ?? '').trim();
}

/** True if env looks like portal "Encoding" key. */
export function isPercentEncodedKey(key: string): boolean {
  return /%[0-9A-Fa-f]{2}/.test(key);
}

/**
 * Build query string with correct serviceKey encoding.
 * Do NOT pass the result through axios `params` (would encode again).
 */
export function buildPublicDataQuery(
  params: Record<string, string | number | undefined | null>
): string {
  const key = getPublicDataApiKey();
  const parts: string[] = [];

  if (key) {
    const keyPart = isPercentEncodedKey(key)
      ? key
      : encodeURIComponent(key);
    // Official samples use serviceKey (TourAPI) and ServiceKey (HIRA) interchangeably;
    // use a single serviceKey to match working TourAPI client.
    parts.push(`serviceKey=${keyPart}`);
  }

  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || k === 'serviceKey' || k === 'ServiceKey') {
      continue;
    }
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }

  return parts.join('&');
}

export function publicDataUrl(
  baseUrl: string,
  params: Record<string, string | number | undefined | null>
): string {
  const q = buildPublicDataQuery(params);
  return `${baseUrl}?${q}`;
}
