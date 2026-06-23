import * as React from "react";
import { useWizard, type ThemeName } from "@/components/wizard/WizardContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Copy, ExternalLink, Lightbulb } from "lucide-react";
import {
  getPortfolioUrl,
  savePublishedPortfolioAsync,
  validatePortfolioData,
} from "@/lib/portfolioPublishing";
import { cn } from "@/lib/utils";

const THEMES: { name: string; vibe: ThemeName; tag: string; colors: string[] }[] = [
  {
    name: "Corporate Professional",
    vibe: "corporate",
    tag: "Classic",
    colors: ["#1e293b", "#334155", "#3b82f6"],
  },
  { name: "Modern SaaS", vibe: "saas", tag: "Popular", colors: ["#0f172a", "#6366f1", "#06b6d4"] },
  {
    name: "Glassmorphism Pro",
    vibe: "glass",
    tag: "Premium",
    colors: ["#0b1120", "#a78bfa", "#22d3ee"],
  },
  {
    name: "Cyberpunk Developer",
    vibe: "cyber",
    tag: "Bold",
    colors: ["#0a0a0a", "#ec4899", "#22d3ee"],
  },
  {
    name: "Developer Terminal",
    vibe: "terminal",
    tag: "Minimal",
    colors: ["#000000", "#10b981", "#a3e635"],
  },
  {
    name: "Creative Designer",
    vibe: "creative",
    tag: "Artistic",
    colors: ["#fef3c7", "#f97316", "#7c3aed"],
  },
];

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getRoleBasedResumeTips(role: string): string[] {
  const normalizedRole = role.toLowerCase();

  if (normalizedRole.includes("frontend") || normalizedRole.includes("front-end")) {
    return [
      "Add frontend performance wins, such as Core Web Vitals, load-time, or accessibility improvements",
      "Mention UI systems, responsive layouts, state management, and testing tools used in recent projects",
      "Add links to deployed frontend projects with short notes on your exact contribution",
    ];
  }

  if (normalizedRole.includes("backend") || normalizedRole.includes("back-end")) {
    return [
      "Add backend impact metrics, such as API latency, uptime, throughput, or database query improvements",
      "Mention authentication, caching, queues, database design, and deployment experience where relevant",
      "Describe one project with architecture details, tradeoffs, and production reliability work",
    ];
  }

  if (normalizedRole.includes("full stack") || normalizedRole.includes("full-stack")) {
    return [
      "Show one full-stack project from UI to API to database, including deployment details",
      "Add measurable outcomes across both frontend and backend work, such as speed, reliability, or user impact",
      "Mention the complete stack, ownership scope, integrations, and testing approach for key projects",
    ];
  }

  if (
    normalizedRole.includes("data") ||
    normalizedRole.includes("machine learning") ||
    normalizedRole.includes("ai")
  ) {
    return [
      "Add model, data pipeline, evaluation, or dashboard metrics that prove your technical impact",
      "Mention datasets, tools, deployment approach, and business outcome for AI or data projects",
      "Include links to notebooks, demos, repositories, or case studies where recruiters can verify the work",
    ];
  }

  if (
    normalizedRole.includes("designer") ||
    normalizedRole.includes("ui") ||
    normalizedRole.includes("ux")
  ) {
    return [
      "Add case-study style project notes that explain the problem, design decisions, and final outcome",
      "Mention design systems, accessibility, prototyping, user research, and handoff tools where relevant",
      "Include before-and-after results or usability improvements for your strongest design work",
    ];
  }

  if (normalizedRole.includes("devops") || normalizedRole.includes("cloud")) {
    return [
      "Add cloud, CI/CD, monitoring, infrastructure, and reliability work with measurable outcomes",
      "Mention tools like Docker, Kubernetes, Terraform, GitHub Actions, AWS, Azure, or GCP where used",
      "Describe one deployment or incident improvement with clear ownership and impact",
    ];
  }

  return [
    "Tailor the resume summary to the selected role with two or three role-specific keywords",
    "Rewrite project bullets to show action, technology used, and measurable outcome",
    "Add stronger proof of impact, such as users served, time saved, revenue affected, or performance improved",
  ];
}

export const ThemeStep = () => {
  const { state, dispatch } = useWizard();
  const [isFinished, setIsFinished] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationError, setGenerationError] = React.useState("");
  const [portfolioUrl, setPortfolioUrl] = React.useState("");
  const [copyStatus, setCopyStatus] = React.useState("");
  const resumeImprovementTips = React.useMemo(() => {
    return uniqueNonEmpty(getRoleBasedResumeTips(state.personal.role)).slice(0, 5);
  }, [state.personal.role]);

  const handleSelectTheme = (themeVibe: ThemeName) => {
    dispatch((prev) => ({
      ...prev,
      theme: themeVibe,
    }));
  };

  const goToPrevious = () => {
    dispatch((prev) => ({
      ...prev,
      step: "projects",
    }));
  };

  const handleGeneratePortfolio = async () => {
    setGenerationError("");
    setCopyStatus("");
    setIsGenerating(true);

    try {
      const validationErrors = validatePortfolioData(state);
      if (validationErrors.length > 0) {
        setGenerationError(`Invalid portfolio data: ${validationErrors.join(" ")}`);
        return;
      }

      const portfolio = await savePublishedPortfolioAsync(state);
      const url = getPortfolioUrl(portfolio.id);

      setPortfolioUrl(url);
      setIsFinished(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed generation";
      setGenerationError(
        message === "Failed save"
          ? "Failed save: portfolio was not stored. Try a smaller certificate file."
          : message === "Failed share save"
            ? "Failed save: the portfolio was stored in this browser, but the shareable link was not created. Try a smaller certificate file."
            : "Failed generation: please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!portfolioUrl) return;

    try {
      await navigator.clipboard.writeText(portfolioUrl);
      setCopyStatus("Link copied");
    } catch {
      setCopyStatus("Copy failed. Select the URL and copy it manually.");
    }
  };

  if (isFinished) {
    return (
      <div className="text-center py-10 space-y-6 animate-fade-in">
        {/* Animated Check Ring */}
        <div className="relative mx-auto h-20 w-20 rounded-full bg-gradient-brand flex items-center justify-center shadow-glow ring-glow scale-up">
          <Check className="h-10 w-10 text-white stroke-[3px]" />
          <div className="absolute inset-0 rounded-full bg-gradient-brand animate-ping opacity-25" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Portfolio Generated Successfully
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your developer portfolio is live in the{" "}
            <strong>{THEMES.find((t) => t.vibe === state.theme)?.name}</strong> theme.
          </p>
        </div>

        <div className="glass max-w-lg mx-auto p-5 rounded-2xl border border-white/10 text-left space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Portfolio URL
          </p>
          <p className="break-all rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs text-[var(--cyan-accent)]">
            {portfolioUrl}
          </p>
          {copyStatus && <p className="text-xs text-muted-foreground">{copyStatus}</p>}
        </div>

        {resumeImprovementTips.length > 0 && (
          <div className="glass max-w-sm mx-auto p-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 space-y-3 text-left">
            <div className="flex items-center gap-2 text-amber-300">
              <Lightbulb className="h-4 w-4 shrink-0" />
              <span className="text-sm font-bold">
                Resume improvements for {state.personal.role}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              These suggestions are based only on the role you selected:
            </p>
            <ul className="space-y-2">
              {resumeImprovementTips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-300 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {generationError && (
          <div className="max-w-md mx-auto rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {generationError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 max-w-xl mx-auto">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="w-full sm:w-auto glass gap-2 border-white/10 hover:bg-white/5"
          >
            <Copy className="h-4 w-4" /> Copy Link
          </Button>

          <Button
            onClick={() => window.open(portfolioUrl, "_blank", "noopener,noreferrer")}
            className="w-full sm:w-auto bg-gradient-brand text-white shadow-glow gap-2"
          >
            <ExternalLink className="h-4 w-4" /> Open Portfolio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-white/5">
        <h3 className="text-lg font-bold text-foreground">Theme Selection</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Select one of our premium themes. The live preview updates in real-time.
        </p>
      </div>

      {/* Themes Select Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {THEMES.map((theme) => {
          const isSelected = state.theme === theme.vibe;
          return (
            <button
              key={theme.vibe}
              type="button"
              onClick={() => handleSelectTheme(theme.vibe)}
              className={cn(
                "glass text-left rounded-2xl p-4 border transition-all duration-300 relative group overflow-hidden cursor-pointer",
                isSelected
                  ? "border-[var(--cyan-accent)] shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-[var(--cyan-accent)] bg-white/[0.04]"
                  : "border-white/5 hover:border-white/10 hover:bg-white/5",
              )}
            >
              {/* Selector indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[var(--cyan-accent)] text-background flex items-center justify-center z-10 animate-scale-up">
                  <Check className="h-3.5 w-3.5 stroke-[3px]" />
                </div>
              )}

              {/* Theme Mini Vibe Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1">
                  {theme.colors.map((c, i) => (
                    <span
                      key={i}
                      className="h-4.5 w-4.5 rounded-full border border-background shadow-sm"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{theme.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono rounded bg-white/5 border border-white/10 px-1.5 py-0.2 text-muted-foreground">
                      {theme.tag}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/5">
        <Button type="button" variant="outline" size="lg" onClick={goToPrevious} className="w-full sm:w-auto glass">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button
          type="button"
          size="lg"
          onClick={handleGeneratePortfolio}
          disabled={isGenerating}
          className="w-full sm:w-auto bg-gradient-brand text-white shadow-glow"
        >
          {isGenerating ? "Generating..." : "Generate Portfolio"}
          <Check className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {generationError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {generationError}
        </div>
      )}
    </div>
  );
};
