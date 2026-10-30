// Google Gemini AI client - server-side only
import { GoogleGenerativeAI } from '@google/generative-ai';

let geminiClient: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return geminiClient;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateWithGemini(prompt: string, maxTokens = 2048): Promise<string> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.3,
    },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateJsonWithGemini<T>(prompt: string): Promise<T> {
  const jsonPrompt = `${prompt}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanations. Just the JSON object.`;

  const text = await generateWithGemini(jsonPrompt);
  
  // Extract JSON from response (handle cases where model wraps in markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Gemini did not return valid JSON');
  }
  
  return JSON.parse(jsonMatch[0]) as T;
}
