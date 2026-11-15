import { evaluateQuote } from "./evaluateQuote";

self.onmessage = (event: MessageEvent<Parameters<typeof evaluateQuote>>) => {
  try {
    self.postMessage({ result: evaluateQuote(...event.data) });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
