import * as React from "react";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Code2,
  GitFork,
  Github,
  Loader2,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { useWizard } from "@/components/wizard/WizardContext";
import { fetchGitHubAnalytics, extractGitHubUsername } from "@/lib/githubAnalytics";
import { cn } from "@/lib/utils";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: value >= 1000 ? "compact" : "standard" }).format(
    value,
  );
}

function formatDate(value: string): string {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(value));
}

type MetricCardProps = {
  title: string;
  value: string;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
};

const MetricCard = ({ title, value, detail, icon: Icon, accent }: MetricCardProps) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
        {title}
      </span>
      <Icon className={cn("h-4 w-4 shrink-0 text-[var(--cyan-accent)]", accent)} />
    </div>
    <div className="mt-3 text-2xl font-extrabold tracking-tight text-foreground line-clamp-2 [overflow-wrap:anywhere]" title={value}>{value}</div>
    {detail && <p className="mt-1 text-[11px] leading-normal text-muted-foreground line-clamp-3 [overflow-wrap:anywhere]" title={detail}>{detail}</p>}
  </div>
);

export const GitHubAnalyticsDashboard = () => {
  const { state, dispatch } = useWizard();
  const inFlightUsernameRef = React.useRef("");
  const username = React.useMemo(() => {
    return extractGitHubUsername(
      state.personal.github || state.achievements.codingProfiles.github || "",
    );
  }, [state.achievements.codingProfiles.github, state.personal.github]);

  React.useEffect(() => {
    if (!username) {
      if (state.githubAnalyticsStatus !== "idle" || state.githubAnalyticsUsername) {
        dispatch((prev) => ({
          ...prev,
          githubAnalytics: null,
          githubAnalyticsStatus: "idle",
          githubAnalyticsError: "",
          githubAnalyticsUsername: "",
        }));
      }
      return;
    }

    if (state.githubAnalyticsUsername === username && state.githubAnalyticsStatus === "success") {
      return;
    }

    if (inFlightUsernameRef.current === username) {
      return;
    }

    let isCurrent = true;
    inFlightUsernameRef.current = username;
    dispatch((prev) => ({
      ...prev,
      githubAnalyticsStatus: "loading",
      githubAnalyticsError: "",
      githubAnalyticsUsername: username,
    }));

    void fetchGitHubAnalytics(username)
      .then((analytics) => {
        if (!isCurrent) return;
        inFlightUsernameRef.current = "";
        dispatch((prev) => ({
          ...prev,
          githubAnalytics: analytics,
          githubAnalyticsStatus: "success",
          githubAnalyticsError: "",
          githubAnalyticsUsername: username,
        }));
      })
      .catch(() => {
        if (!isCurrent) return;
        inFlightUsernameRef.current = "";
        dispatch((prev) => ({
          ...prev,
          githubAnalytics: null,
          githubAnalyticsStatus: "error",
          githubAnalyticsError: "Unable to fetch GitHub analytics",
          githubAnalyticsUsername: username,
        }));
      });

    return () => {
      isCurrent = false;
      if (inFlightUsernameRef.current === username) {
        inFlightUsernameRef.current = "";
      }
    };
  }, [dispatch, state.githubAnalyticsStatus, state.githubAnalyticsUsername, username]);

  const analytics = state.githubAnalytics;

  return (
    <section className="glass-strong rounded-3xl border border-white/10 p-5 sm:p-6 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.55)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5">
            {analytics?.avatar ? (
              <img
                src={analytics.avatar}
                alt={analytics.name}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <Github className="h-5 w-5 text-[var(--cyan-accent)]" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-foreground">
              GitHub Analytics
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {analytics ? `${analytics.name} (@${analytics.username})` : "Public GitHub stats"}
            </p>
          </div>
        </div>

        {analytics && (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 text-[var(--cyan-accent)]" />
            Joined {formatDate(analytics.createdAt)}
          </div>
        )}
      </div>

      {!username && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-muted-foreground">
          <Github className="h-4 w-4 shrink-0 text-[var(--cyan-accent)]" />
          Add GitHub profile to unlock analytics
        </div>
      )}

      {state.githubAnalyticsStatus === "loading" && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--cyan-accent)]" />
          Fetching GitHub Analytics...
        </div>
      )}

      {state.githubAnalyticsStatus === "error" && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Unable to fetch GitHub analytics
        </div>
      )}

      {analytics && state.githubAnalyticsStatus === "success" && (
        <>
          {analytics.bio && (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{analytics.bio}</p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Portfolio GitHub Score"
              value={`${analytics.score}/100`}
              detail="Profile, repositories, stars, languages, recency, and diversity"
              icon={Trophy}
              accent="text-amber-300"
            />
            <MetricCard
              title="Repositories"
              value={formatNumber(analytics.repos)}
              detail={`Top 5: ${analytics.topRepositories.join(", ") || "No public repositories"}`}
              icon={BookOpen}
            />
            <MetricCard
              title="Followers"
              value={formatNumber(analytics.followers)}
              detail={`${formatNumber(analytics.following)} following`}
              icon={Users}
              accent="text-emerald-300"
            />
            <MetricCard
              title="Stars Earned"
              value={formatNumber(analytics.stars)}
              detail={`${formatNumber(analytics.forks)} total forks`}
              icon={Star}
              accent="text-yellow-300"
            />
            <MetricCard
              title="Top Languages"
              value={analytics.topLanguages.slice(0, 3).join(", ") || "Not listed"}
              detail={
                analytics.topLanguages.length > 3
                  ? analytics.topLanguages.slice(3).join(", ")
                  : "Most used repository languages"
              }
              icon={Code2}
              accent="text-sky-300"
            />
            <MetricCard
              title="Most Starred Project"
              value={analytics.topRepo}
              detail={`${formatNumber(analytics.totalRepositories)} repositories scanned`}
              icon={GitFork}
              accent="text-purple-300"
            />
          </div>
        </>
      )}
    </section>
  );
};
