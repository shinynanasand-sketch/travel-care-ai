import { geminiFlash, isGeminiAvailable } from './client';
import { getCached, setCache } from '@/lib/cache/redis';
import { buildCacheKey, CACHE_TTL } from '@/lib/cache/keys';
import type { ConditionType, VeganLevel } from '@/types/health.types';
import type { MenuAnalysis } from '@/types/course.types';

export interface MenuAnalysisInput {
  firstmenu: string;
  treatmenu: string;
  conditions: ConditionType[];
}

/** Animal products / meat cues in menu text */
const NON_VEGAN_KEYWORDS = [
  '고기',
  '돼지',
  '소고기',
  '한우',
  '닭',
  '오리',
  '양고기',
  '해산물',
  '해물',
  '생선',
  '회',
  '초밥',
  '치즈',
  '우유',
  '달걀',
  '계란',
  '버터',
  '크림',
  '스테이크',
  '티본',
  '갈비',
  '삼겹',
  '족발',
  '보쌈',
  '곱창',
  '막창',
  '치킨',
  '돈까스',
  '돈가스',
  '햄버거',
  '버거',
  '베이컨',
  '햄',
  '소시지',
  '육회',
  '샤브',
  '고기국물',
];

const VEGAN_KEYWORDS = [
  '채소',
  '두부',
  '버섯',
  '샐러드',
  '비건',
  '채식',
  '곡물',
  '나물',
  '사찰',
  '베지',
  'vegan',
];

/** Strong plant-based signals in name (not weak words like 가든/그린) */
const STRONG_VEGAN_NAME = [
  '비건',
  '채식',
  '사찰',
  '베지',
  'vegan',
  '샐러디',
  '두부요리',
];

const MEAT_HEAVY = [
  '장어',
  '족발',
  '곱창',
  '막창',
  '삼겹',
  '갈비',
  '치킨',
  '닭',
  '오리',
  '횟집',
  '초밥',
  '해물',
  '해산물',
  '조개',
  '생선',
  '고기',
  '불고기',
  '설렁탕',
  '곰탕',
  '추어',
  '보쌈',
  '스테이크',
  '돈까스',
  '돈가스',
  '햄버거',
  '양꼬치',
  '육회',
  '고깃집',
  '정육',
];

function findKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k.toLowerCase()));
}

function hasStrongVeganName(title: string): boolean {
  const t = title.toLowerCase();
  return STRONG_VEGAN_NAME.some((k) => t.includes(k.toLowerCase()));
}

/**
 * Never allow FULL_VEGAN when menu/name clearly has animal products.
 * Meat + veg cues → PARTIAL at best.
 */
export function sanitizeVeganAnalysis(
  menuOrTitle: string,
  analysis: MenuAnalysis
): MenuAnalysis {
  const foundNonVegan = findKeywords(menuOrTitle, NON_VEGAN_KEYWORDS);
  const foundVegan = findKeywords(menuOrTitle, VEGAN_KEYWORDS);
  const mergedNon = Array.from(
    new Set([...(analysis.nonVeganIngredients ?? []), ...foundNonVegan])
  );

  if (mergedNon.length === 0) {
    return { ...analysis, nonVeganIngredients: analysis.nonVeganIngredients ?? [] };
  }

  // Meat present → cannot be fully vegan
  if (analysis.veganFriendly === true || foundVegan.length > 0) {
    return {
      ...analysis,
      veganFriendly: foundVegan.length > 0 ? 'PARTIAL' : false,
      nonVeganIngredients: mergedNon,
      veganItems:
        foundVegan.length > 0
          ? foundVegan
          : analysis.veganItems?.length
            ? analysis.veganItems
            : ['확인 필요'],
      recommendation:
        foundVegan.length > 0
          ? '동물성 메뉴와 함께 일부 채소·비건 옵션이 있을 수 있습니다. 방문 전 확인해 주세요.'
          : '동물성 메뉴 비중이 커 비건 여행에는 권장하지 않습니다.',
    };
  }

  return {
    ...analysis,
    veganFriendly: false,
    nonVeganIngredients: mergedNon,
  };
}

function ruleBasedAnalysis(input: MenuAnalysisInput): MenuAnalysis {
  const isVegan = input.conditions.includes('VEGAN');
  const isDiabetes = input.conditions.some((c) => c.includes('DIABETES'));
  const menuText = `${input.firstmenu} ${input.treatmenu}`;

  const foundNonVegan = findKeywords(menuText, NON_VEGAN_KEYWORDS);
  const foundVegan = findKeywords(menuText, VEGAN_KEYWORDS);

  let veganFriendly: boolean | 'PARTIAL' = true;
  let veganLevel: VeganLevel = 'FULL_VEGAN';

  if (foundNonVegan.length > 0 && foundVegan.length > 0) {
    veganFriendly = 'PARTIAL';
    veganLevel = 'PARTIAL_VEGAN';
  } else if (foundNonVegan.length > 0) {
    veganFriendly = false;
    veganLevel = 'NOT_VEGAN';
  } else if (foundVegan.length === 0 && isVegan) {
    veganFriendly = 'PARTIAL';
    veganLevel = 'CHECK_NEEDED';
  }

  const sugarRisk =
    menuText.includes('디저트') || menuText.includes('케이크') ? 'HIGH' : 'LOW';

  return {
    overallRisk: isDiabetes && sugarRisk === 'HIGH' ? 'HIGH' : 'LOW',
    veganFriendly,
    veganItems: foundVegan.length > 0 ? foundVegan : ['확인 필요'],
    nonVeganIngredients: foundNonVegan,
    menuItems: [
      {
        name: input.firstmenu || '대표 메뉴',
        sodiumRisk: 'MEDIUM',
        sugarRisk: sugarRisk as 'LOW' | 'HIGH',
        diabetesFriendly: sugarRisk !== 'HIGH',
        veganOk: veganLevel === 'FULL_VEGAN' || veganLevel === 'PARTIAL_VEGAN',
      },
    ],
    recommendation: isVegan
      ? veganLevel === 'FULL_VEGAN'
        ? '비건 여행객에게 적합한 식당입니다.'
        : veganLevel === 'PARTIAL_VEGAN'
          ? '일부 비건 옵션이 있을 수 있습니다. 방문 전 확인해 주세요.'
          : '비건 옵션 확인이 필요합니다. 방문 전 전화 문의를 권장합니다.'
      : '건강 상태에 맞게 식사량을 조절하세요.',
    alternatives: ['샐러드', '두부 요리', '현미밥'],
    postMealAdvice: isDiabetes
      ? '식후 30분 가벼운 산책을 권장합니다.'
      : '충분한 수분 섭취를 권장합니다.',
  };
}

export function veganLevelFromAnalysis(analysis: MenuAnalysis): VeganLevel {
  if (analysis.veganFriendly === true) return 'FULL_VEGAN';
  if (analysis.veganFriendly === 'PARTIAL') {
    // PARTIAL from Gemini without vegan cues often means "check" — keep PARTIAL
    return 'PARTIAL_VEGAN';
  }
  if ((analysis.nonVeganIngredients?.length ?? 0) === 0) return 'CHECK_NEEDED';
  return 'NOT_VEGAN';
}

export interface VeganScoreItem {
  contentid: string;
  title: string;
  cat3?: string;
}

const VEGAN_SCORE_BATCH = 30;

/** Name hints that actually suggest plant-based (no 가든/그린 false friends) */
const VEGAN_HINT = [
  '비건',
  '채식',
  '샐러드',
  '두부',
  '사찰',
  '베지',
  'vegan',
  '나물',
  '현미',
  '샐러디',
];

function heuristicScore(item: VeganScoreItem): number {
  const t = `${item.title} ${item.cat3 ?? ''}`.toLowerCase();
  if (MEAT_HEAVY.some((k) => t.includes(k.toLowerCase()))) return 1;
  if (VEGAN_HINT.some((k) => t.includes(k.toLowerCase()))) return 8;
  return 4;
}

/** Clear meat specialist — strong vegan name can still pass through */
export function isObviousMeatOnly(item: VeganScoreItem): boolean {
  const t = `${item.title} ${item.cat3 ?? ''}`.toLowerCase();
  if (hasStrongVeganName(item.title)) return false;
  return MEAT_HEAVY.some((k) => t.includes(k.toLowerCase()));
}

async function scoreBatch(
  batch: VeganScoreItem[]
): Promise<Record<string, number>> {
  const list = batch
    .map((b) => `${b.contentid} | ${b.title} | ${b.cat3 ?? ''}`)
    .join('\n');
  const prompt = `다음 식당 목록의 "비건 가능성"을 0~10 정수로 평가하세요.
(10=완전비건 전문, 7~9=비건 옵션 풍부, 4~6=일부 가능, 0~3=사실상 불가)
주의: 상호에 '가든/그린'만 있다고 비건으로 보지 마세요. 스테이크·고깃집·치킨은 0~3.

식당 목록 (contentid | 상호 | 분류):
${list}

JSON 객체로만 응답 (다른 텍스트 없이). key=contentid, value=점수:
{"<contentid>": <0-10>}`;

  const result = await geminiFlash!.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, '').trim();
  return JSON.parse(text) as Record<string, number>;
}

export async function quickVeganScore(
  items: VeganScoreItem[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const uncached: VeganScoreItem[] = [];

  for (const item of items) {
    const key = buildCacheKey('ai', 'veganScore', {
      contentid: item.contentid,
      v: 2,
    });
    const cached = await getCached<number>(key);
    if (typeof cached === 'number') result.set(item.contentid, cached);
    else uncached.push(item);
  }
  if (uncached.length === 0) return result;

  const persist = async (contentid: string, score: number) => {
    result.set(contentid, score);
    await setCache(
      buildCacheKey('ai', 'veganScore', { contentid, v: 2 }),
      score,
      CACHE_TTL.veganScore
    );
  };

  if (!isGeminiAvailable() || !geminiFlash) {
    for (const item of uncached)
      await persist(item.contentid, heuristicScore(item));
    return result;
  }

  for (let i = 0; i < uncached.length; i += VEGAN_SCORE_BATCH) {
    const batch = uncached.slice(i, i + VEGAN_SCORE_BATCH);
    let scores: Record<string, number> | null = null;
    try {
      scores = await scoreBatch(batch);
    } catch {
      scores = null;
    }
    for (const item of batch) {
      let score =
        typeof scores?.[item.contentid] === 'number' &&
        scores![item.contentid] >= 0 &&
        scores![item.contentid] <= 10
          ? scores![item.contentid]
          : heuristicScore(item);
      // Cap meat-heavy names even if Gemini is optimistic
      if (isObviousMeatOnly(item)) score = Math.min(score, 3);
      await persist(item.contentid, score);
    }
  }
  return result;
}

export async function analyzeMenuForHealth(
  input: MenuAnalysisInput
): Promise<MenuAnalysis> {
  const cacheKey = buildCacheKey('ai', 'menuAnalysis', { ...input, v: 2 });
  const cached = await getCached<MenuAnalysis>(cacheKey);
  if (cached) return cached;

  const menuBlob = `${input.firstmenu} ${input.treatmenu}`;

  if (!isGeminiAvailable() || !geminiFlash) {
    const result = sanitizeVeganAnalysis(menuBlob, ruleBasedAnalysis(input));
    await setCache(cacheKey, result, CACHE_TTL.aiAnalysis);
    return result;
  }

  const isVegan = input.conditions.includes('VEGAN');
  const isDiabetes = input.conditions.some((c) => c.includes('DIABETES'));

  const prompt = `당신은 식이 제한 전문 AI입니다. 참고용 분석만 제공하세요.

[사용자 조건]
${isDiabetes ? '- 당뇨: 당질·혈당지수 분석 필요' : ''}
${isVegan ? '- 비건: 동물성 성분 완전 제외 필요' : ''}

[분석 메뉴]
대표: ${input.firstmenu}
취급: ${input.treatmenu}

규칙:
- 스테이크·고기·치킨·해산물 등이 대표/취급에 있으면 veganFriendly는 true가 될 수 없음.
- 동물성+채소가 섞이면 veganFriendly는 "PARTIAL".
- 완전 비건 전문일 때만 veganFriendly true.

JSON으로만 응답:
{
  "overallRisk": "LOW|MEDIUM|HIGH",
  "veganFriendly": true,
  "veganItems": [],
  "nonVeganIngredients": [],
  "menuItems": [{"name":"","sodiumRisk":"LOW","sugarRisk":"LOW","diabetesFriendly":true,"veganOk":true}],
  "recommendation": "",
  "alternatives": [],
  "postMealAdvice": ""
}`;

  try {
    const result = await geminiFlash.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text) as MenuAnalysis;
    const sanitized = sanitizeVeganAnalysis(menuBlob, parsed);
    await setCache(cacheKey, sanitized, CACHE_TTL.aiAnalysis);
    return sanitized;
  } catch {
    const fallback = sanitizeVeganAnalysis(menuBlob, ruleBasedAnalysis(input));
    await setCache(cacheKey, fallback, CACHE_TTL.aiAnalysis);
    return fallback;
  }
}
