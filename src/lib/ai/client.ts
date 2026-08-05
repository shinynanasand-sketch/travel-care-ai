import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const geminiFlash = genAI?.getGenerativeModel({
  model: 'gemini-2.5-flash',
});

export function isGeminiAvailable(): boolean {
  return !!apiKey && !!geminiFlash;
}
