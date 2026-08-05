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

function ruleBasedAnalysis(input: MenuAnalysisInput): MenuAnalysis {
  const isVegan = input.conditions.includes('VEGAN');
  const isDiabetes = input.conditions.some((c) => c.includes('DIABETES'));
  const menuText = `${input.firstmenu} ${input.treatmenu}`.toLowerCase();

  const nonVeganKeywords = ['고기', '돼지', '소고기', '닭', '해산물', '치즈', '우유', '달걀', '버터'];
  const veganKeywords = ['채소', '두부', '버섯', '샐러드', '비건', '채식', '곡물'];

  const foundNonVegan = nonVeganKeywords.filter((k) => menuText.includes(k));
  const foundVegan = veganKeywords.filter((k) => menuText.includes(k));

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

  const sugarRisk = menuText.includes('디저트') || menuText.includes('케이크') ? 'HIGH' : 'LOW';

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
        : '비건 옵션 확인이 필요합니다. 방문 전 전화 문의를 권장합니다.'
      : '건강 상태에 맞게 식사량을 조절하세요.',
    alternatives: ['샐러드', '두부 요리', '현미밥'],
    postMealAdvice: isDiabetes
      ? '식후 30분 가벼운 산책을 권장합니다.'
      : '충분한 수분 섭취를 권장합니다.',
  };
}

export function veganLevelFromAnalysis(
  analysis: MenuAnalysis
): VeganLevel {
  if (analysis.veganFriendly === true) return 'FULL_VEGAN';
  if (analysis.veganFriendly === 'PARTIAL') return 'PARTIAL_VEGAN';
  if (analysis.nonVeganIngredients.length === 0) return 'CHECK_NEEDED';
  return 'NOT_VEGAN';
}

// ── 비건 빠른 점수(Step 2) ──────────────────────────────
// 식당명/분류만으로 비건 가능성 0~10점을 배치로 산출.
// Gemini 1콜당 다수 식당을 묶어 호출량을 억제하고, contentId별로 장기 캐시.

export interface VeganScoreItem {
  contentid: string;
  title: string;
  cat3?: string;
}

const VEGAN_SCORE_BATCH = 30;

// 명백한 육류/해산물 전문 → 낮은 점수
const MEAT_HEAVY = [
  '장어', '족발', '곱창', '막창', '삼겹', '갈비', '치킨', '닭', '오리',
  '횟집', '초밥', '해물', '해산물', '조개', '생선', '고기', '불고기',
  '설렁탕', '곰탕', '추어', '보쌈', '스테이크', '돈까스', '햄버거', '양꼬치',
];
// 비건 친화 신호 → 높은 점수
const VEGAN_HINT = [
  '비건', '채식', '샐러드', '두부', '사찰', '베지', 'vegan',
  '그린', '나물', '현미', '샐러디', '가든',
];

function heuristicScore(item: VeganScoreItem): number {
  const t = `${item.title} ${item.cat3 ?? ''}`.toLowerCase();
  if (VEGAN_HINT.some((k) => t.includes(k.toLowerCase()))) return 8;
  if (MEAT_HEAVY.some((k) => t.includes(k.toLowerCase()))) return 1;
  return 4;
}

// 명백한 육류전문만 보수적으로 제외(과탈락 방지)
export function isObviousMeatOnly(item: VeganScoreItem): boolean {
  const t = `${item.title} ${item.cat3 ?? ''}`.toLowerCase();
  if (VEGAN_HINT.some((k) => t.includes(k.toLowerCase()))) return false;
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
    const key = buildCacheKey('ai', 'veganScore', { contentid: item.contentid });
    const cached = await getCached<number>(key);
    if (typeof cached === 'number') result.set(item.contentid, cached);
    else uncached.push(item);
  }
  if (uncached.length === 0) return result;

  const persist = async (contentid: string, score: number) => {
    result.set(contentid, score);
    await setCache(
      buildCacheKey('ai', 'veganScore', { contentid }),
      score,
      CACHE_TTL.veganScore
    );
  };

  if (!isGeminiAvailable() || !geminiFlash) {
    for (const item of uncached) await persist(item.contentid, heuristicScore(item));
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
      const raw = scores?.[item.contentid];
      const score =
        typeof raw === 'number' && raw >= 0 && raw <= 10
          ? raw
          : heuristicScore(item);
      await persist(item.contentid, score);
    }
  }
  return result;
}

export async function analyzeMenuForHealth(
  input: MenuAnalysisInput
): Promise<MenuAnalysis> {
  const cacheKey = buildCacheKey('ai', 'menuAnalysis', input);
  const cached = await getCached<MenuAnalysis>(cacheKey);
  if (cached) return cached;

  if (!isGeminiAvailable() || !geminiFlash) {
    const result = ruleBasedAnalysis(input);
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
    await setCache(cacheKey, parsed, CACHE_TTL.aiAnalysis);
    return parsed;
  } catch {
    const fallback = ruleBasedAnalysis(input);
    await setCache(cacheKey, fallback, CACHE_TTL.aiAnalysis);
    return fallback;
  }
}
