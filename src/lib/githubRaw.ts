import { EnvError } from "./errors";

import { requireEnv } from "./require";



const REPO = requireEnv(import.meta.env.VITE_GITHUB_REPO, "VITE_GITHUB_REPO");

const BRANCH = requireEnv(import.meta.env.VITE_GITHUB_BRANCH, "VITE_GITHUB_BRANCH");



export function tickerToSlug(ticker: string): string {

  return ticker.replace(/:/g, "-");

}



export function rawUrl(relativePath: string): string {

  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${relativePath}`;

}



export function quoteDataPath(ticker: string, timeframe: string): string {

  return `data/${tickerToSlug(ticker)}/${timeframe}.json`;

}



export function statusDataPath(ticker: string, timeframe: string): string {

  return `data/.meta/${tickerToSlug(ticker)}/${timeframe}.status.json`;

}



export function indexDataPath(): string {

  return "data/index.json";

}



export function githubRepo(): string {

  return REPO;

}



export function githubPagesUrl(): string {

  const [owner, repo] = REPO.split("/");

  if (!owner || !repo) {

    throw new EnvError("VITE_GITHUB_REPO must be owner/repo");

  }

  return `https://${owner}.github.io/${repo}/`;

}

