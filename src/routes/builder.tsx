import { createFileRoute, Link } from "@tanstack/react-router";
import { Wizard } from "@/components/wizard/Wizard";
import { WizardProvider } from "@/components/wizard/WizardContext";
import { LivePreview } from "@/components/wizard/LivePreview";
import { GitHubAnalyticsDashboard } from "@/components/wizard/GitHubAnalyticsDashboard";
import { Sparkles, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Portfolio Builder Wizard — PortfolioForge" },
      {
        name: "description",
        content: "Build your recruiter-ready portfolio step-by-step with real-time preview.",
      },
    ],
  }),
  component: WizardPage,
});

function WizardPage() {
  return (
    <WizardProvider>
      <div className="relative min-h-screen bg-background overflow-x-hidden flex flex-col">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-aurora)" }}
        />

        {/* Wizard Header */}
        <header className="sticky top-0 z-40 w-full py-4 border-b border-white/5 glass">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="group inline-flex items-center justify-center rounded-lg h-9 px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-white/5 hover:bg-white/5"
              >
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                Back to Home
              </Link>
              <div className="h-4 w-px bg-white/10 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2">
                <div className="relative grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-brand">
                  <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold tracking-tight text-sm">
                  PortfolioForge <span className="text-gradient-brand">Wizard</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Preview Trigger */}
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 glass text-xs font-semibold"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="h-[85vh] p-0 rounded-t-3xl border-t border-white/10 bg-background/95 backdrop-blur-xl"
                  >
                    <SheetHeader className="p-4 border-b border-white/5">
                      <SheetTitle className="text-sm font-semibold tracking-tight text-center">
                        Live Portfolio Preview
                      </SheetTitle>
                    </SheetHeader>
                    <div className="h-[calc(85vh-60px)] overflow-y-auto p-4">
                      <LivePreview isMobileSheet />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <div className="text-xs text-muted-foreground font-mono bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                v1.0.0-beta
              </div>
            </div>
          </div>
        </header>

        {/* Wizard Layout */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 flex gap-8">
          {/* Left Column: Form Stepper */}
          <div className="flex-1 lg:max-w-2xl xl:max-w-3xl flex flex-col">
            <div className="glass-strong rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] border border-white/10 flex-1 flex flex-col justify-between">
              <Wizard />
            </div>
            <div className="mt-6">
              <GitHubAnalyticsDashboard />
            </div>
          </div>

          {/* Right Column: Desktop Live Preview Panel */}
          <div className="hidden lg:block w-[400px] xl:w-[450px] shrink-0">
            <div className="sticky top-28">
              <div className="glass-strong rounded-3xl p-4 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)] border border-white/10">
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                    Live Preview
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cyan-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--cyan-accent)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--cyan-accent)] animate-pulse" />
                    Real-time
                  </span>
                </div>
                <LivePreview />
              </div>
            </div>
          </div>
        </main>
      </div>
    </WizardProvider>
  );
}
