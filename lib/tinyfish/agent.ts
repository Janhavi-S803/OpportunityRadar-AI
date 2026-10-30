// TinyFish Web Agent API (SSE) - server-side only
import { getBaseHeaders, withRetry, handleApiError } from './client';
import type { TinyFishAgentRequest, TinyFishAgentResult, TinyFishAgentSSEEvent } from './types';

const AGENT_BASE_URL = 'https://agent.tinyfish.ai/v1/automation';

export async function runTinyFishAgent(
  request: TinyFishAgentRequest,
  onProgress?: (event: TinyFishAgentSSEEvent) => void
): Promise<TinyFishAgentResult> {
  console.log(`[TinyFish Agent] URL: ${request.url}, Goal: ${request.goal.slice(0, 100)}`);

  return withRetry(async () => {
    const response = await fetch(`${AGENT_BASE_URL}/run-sse`, {
      method: 'POST',
      headers: getBaseHeaders(),
      body: JSON.stringify({
        url: request.url,
        goal: request.goal,
      }),
      signal: AbortSignal.timeout(120000), // 2 min timeout for agent tasks
    });

    if (!response.ok) {
      const body = await response.text();
      const err = handleApiError(response.status, body);
      throw err;
    }

    return parseSSEStream(response, onProgress);
  });
}

async function parseSSEStream(
  response: Response,
  onProgress?: (event: TinyFishAgentSSEEvent) => void
): Promise<TinyFishAgentResult> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body for SSE stream');

  const decoder = new TextDecoder();
  let buffer = '';
  let runId = '';
  let finalResult: string | undefined;
  let errorMessage: string | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ':') continue; // SSE comment / keepalive

        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const event = JSON.parse(dataStr) as TinyFishAgentSSEEvent;
            
            if (event.run_id) runId = event.run_id;
            
            if (onProgress) onProgress(event);

            if (event.type === 'completed' || event.result) {
              finalResult = event.result || String(event.data || '');
            }
            if (event.type === 'error') {
              errorMessage = event.error || event.message || 'Agent task failed';
            }
          } catch {
            // Non-JSON SSE data, treat as raw result
            if (dataStr && !dataStr.startsWith('{')) {
              finalResult = dataStr;
            }
          }
        }
        
        if (trimmed.startsWith('id:')) {
          runId = trimmed.slice(3).trim();
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (errorMessage) {
    return { run_id: runId, status: 'failed', error: errorMessage };
  }

  console.log(`[TinyFish Agent] Run ${runId} completed. Result length: ${finalResult?.length || 0}`);
  return { run_id: runId, status: 'completed', result: finalResult };
}

// Synchronous run for simpler tasks
export async function runTinyFishAgentSync(
  request: TinyFishAgentRequest
): Promise<TinyFishAgentResult> {
  console.log(`[TinyFish Agent Sync] URL: ${request.url}`);

  const response = await fetch(`${AGENT_BASE_URL}/run`, {
    method: 'POST',
    headers: getBaseHeaders(),
    body: JSON.stringify({ url: request.url, goal: request.goal }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const body = await response.text();
    const err = handleApiError(response.status, body);
    throw err;
  }

  const data = await response.json() as Record<string, unknown>;
  return {
    run_id: String(data.run_id || data.id || ''),
    status: data.status === 'completed' ? 'completed' : 'failed',
    result: data.result ? String(data.result) : undefined,
    error: data.error ? String(data.error) : undefined,
  };
}
