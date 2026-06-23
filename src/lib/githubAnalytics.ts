import type { GitHubAnalytics } from "@/components/wizard/WizardContext";

type GitHubUserResponse = {
  login: string;
  name: string | null;
  avatar_url: string;
  followers: number;
  following: number;
  public_repos: number;
  bio: string | null;
  created_at: string;
};

type GitHubRepoResponse = {
  name: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  pushed_at: string | null;
  fork: boolean;
};

const GITHUB_ANALYTICS_TIMEOUT_MS = 12000;

export function extractGitHubUsername(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) return "";

  const withoutProtocol = cleaned
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^github\.com\//i, "");
  const username = withoutProtocol.split(/[/?#]/)[0]?.trim() || "";

  return /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username) ? username : "";
}

async function fetchJsonWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), GITHUB_ANALYTICS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error("Unable to fetch GitHub analytics");
    }

    return (await response.json()) as T;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function calculateGitHubScore(params: {
  repos: GitHubRepoResponse[];
  stars: number;
  topLanguages: string[];
}): number {
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 180);

  const hasRecentActivity = params.repos.some((repo) => {
    if (!repo.pushed_at) return false;
    return new Date(repo.pushed_at) >= recentCutoff;
  });
  const originalRepos = params.repos.filter((repo) => !repo.fork).length;
  const hasProjectDiversity = params.topLanguages.length >= 3 && originalRepos >= 5;

  return (
    20 +
    (params.repos.length > 10 ? 20 : 0) +
    (params.stars > 25 ? 15 : 0) +
    (params.topLanguages.length > 1 ? 15 : 0) +
    (hasRecentActivity ? 15 : 0) +
    (hasProjectDiversity ? 15 : 0)
  );
}

export async function fetchGitHubAnalytics(username: string): Promise<GitHubAnalytics> {
  const user = await fetchJsonWithTimeout<GitHubUserResponse>(
    `https://api.github.com/users/${username}`,
  );
  const repos = await fetchJsonWithTimeout<GitHubRepoResponse[]>(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
  );
  const stars = repos.reduce((total, repo) => total + repo.stargazers_count, 0);
  const forks = repos.reduce((total, repo) => total + repo.forks_count, 0);
  const languageCounts = repos.reduce<Record<string, number>>((counts, repo) => {
    if (!repo.language) return counts;
    counts[repo.language] = (counts[repo.language] || 0) + 1;
    return counts;
  }, {});
  const topLanguages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([language]) => language);
  const mostStarredRepo = repos.reduce<GitHubRepoResponse | null>((topRepo, repo) => {
    if (!topRepo || repo.stargazers_count > topRepo.stargazers_count) return repo;
    return topRepo;
  }, null);
  const topRepositories = repos
    .slice()
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((repo) => repo.name);

  return {
    score: calculateGitHubScore({ repos, stars, topLanguages }),
    followers: user.followers,
    following: user.following,
    repos: user.public_repos,
    stars,
    forks,
    topLanguages,
    topRepo: mostStarredRepo?.name || "No public repositories",
    username: user.login,
    name: user.name || user.login,
    avatar: user.avatar_url,
    bio: user.bio || "",
    createdAt: user.created_at,
    totalRepositories: repos.length,
    topRepositories,
  };
}
