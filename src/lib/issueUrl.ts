import { githubRepo } from "./githubRaw";

export function buildFetchIssueUrl(ticker: string, _timeframe = "1d"): string {
  const [owner, repo] = githubRepo().split("/");
  const params = new URLSearchParams({
    template: "fetch-quote.yml",
    title: `[FETCH] ${ticker}`,
    labels: "fetch-quote",
  });
  return `https://github.com/${owner}/${repo}/issues/new?${params.toString()}`;
}

export function buildMegaIssueCommentUrl(issueNumber: number): string {
  const [owner, repo] = githubRepo().split("/");
  return `https://github.com/${owner}/${repo}/issues/${issueNumber}`;
}

export function megaIssueFetchComment(ticker: string, timeframe = "1d"): string {
  return `/fetch ${ticker} ${timeframe}`;
}
