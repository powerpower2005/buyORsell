import { githubRepo } from "./githubRaw";

/**
 * GitHub Issue Form prefill: query keys must match field `id` in fetch-quote.yml.
 * @see https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query
 */
export function buildFetchIssueUrl(ticker: string, timeframe = "1d"): string {
  const [owner, repo] = githubRepo().split("/");
  const params = new URLSearchParams();
  params.set("template", "fetch-quote.yml");
  params.set("title", `[FETCH] ${ticker}`);
  params.set("ticker", ticker);
  params.set("timeframe", timeframe);
  return `https://github.com/${owner}/${repo}/issues/new?${params.toString()}`;
}

export function buildMegaIssueCommentUrl(issueNumber: number): string {
  const [owner, repo] = githubRepo().split("/");
  return `https://github.com/${owner}/${repo}/issues/${issueNumber}`;
}

export function megaIssueFetchComment(ticker: string, timeframe = "1d"): string {
  return `/fetch ${ticker} ${timeframe}`;
}
