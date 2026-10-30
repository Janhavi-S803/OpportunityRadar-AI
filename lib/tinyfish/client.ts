// TinyFish base client - server-side only, never import in browser code
import { TinyFishError } from './types';

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

export function getTinyFishApiKey(): string {
  if (!TINYFISH_API_KEY) {
    throw new Error('TINYFISH_API_KEY is not configured. Add it to your .env.local file.');
  }
  return TINYFISH_API_KEY;
}

export function isTinyFishConfigured(): boolean {
  return Boolean(process.env.TINYFISH_API_KEY);
}

export function getBaseHeaders(): Record<string, string> {
  return {
    'X-API-Key': getTinyFishApiKey(),
    'Content-Type': 'application/json',
  };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const error = err as TinyFishError;
      lastError = err as Error;
      if (!error.retryable || attempt === maxAttempts) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`[TinyFish] Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw lastError;
}

export function handleApiError(status: number, body: string): TinyFishError {
  const retryable = status === 429 || status >= 500;
  return {
    code: `HTTP_${status}`,
    message: `TinyFish API error ${status}: ${body.slice(0, 200)}`,
    status,
    retryable,
  };
}
