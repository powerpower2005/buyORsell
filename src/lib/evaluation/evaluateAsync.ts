import type { evaluateQuote, QuoteEvaluation } from "./evaluateQuote";

export function evaluateAsync(
  args: Parameters<typeof evaluateQuote>,
  signal?: AbortSignal,
): Promise<QuoteEvaluation> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./evaluationWorker.ts", import.meta.url),
      { type: "module" },
    );
    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Analysis cancelled", "AbortError"));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message));
    };
    worker.postMessage(args);
  });
}
