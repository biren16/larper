export interface RetryOptions {
  attempts: number;
  delayMs: number;
  sleep?: (delayMs: number) => Promise<void>;
}

const defaultSleep = (delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs));

export async function retry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  if (options.attempts < 1) throw new Error("Retry attempts must be at least one");
  let lastError: unknown;
  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < options.attempts - 1) {
        await (options.sleep ?? defaultSleep)(options.delayMs * 2 ** attempt);
      }
    }
  }
  throw lastError;
}
