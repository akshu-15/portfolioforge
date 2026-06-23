import * as React from "react";
import { useWizard, type WizardStep } from "./WizardContext";
import { User, GraduationCap, Code2, FolderGit2, Briefcase, Palette, Check, Trophy, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS: { id: WizardStep; label: string; icon: React.ComponentType<any> }[] = [
  { id: "resume", label: "Upload Resume", icon: FileText },
  { id: "personal", label: "Personal", icon: User },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "skills", label: "Skills", icon: Code2 },
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "projects", label: "Projects", icon: FolderGit2 },
  { id: "theme", label: "Theme", icon: Palette },
];

export const WizardStepper = () => {
  const { state } = useWizard();
  const currentStepIndex = STEPS.findIndex((s) => s.id === state.step);
  const currentStep = currentStepIndex >= 0
    ? STEPS[currentStepIndex]
    : { id: state.step, label: "Achievements", icon: Trophy };

  const progress = currentStepIndex > 0 ? (currentStepIndex / STEPS.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
            {currentStep.label} Info
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step {currentStepIndex + 1} of {STEPS.length} — {STEPS[currentStepIndex].label} details
          </p>
        </div>
        <div className="text-xs font-mono text-[var(--cyan-accent)] bg-[var(--cyan-accent)]/10 border border-[var(--cyan-accent)]/20 px-2 py-0.5 rounded-full">
          {Math.round(progress)}% Complete
        </div>
      </div>

      {/* Modern Horizontal Stepper */}
      <div className="relative flex items-center justify-between w-full select-none py-2 overflow-x-auto no-scrollbar scroll-smooth">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />

        {/* Active Progress Bar */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-gradient-brand -translate-y-1/2 z-0 transition-all duration-500 ease-out"
          style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;

          return (
            <div
              key={s.id}
              className="relative flex flex-col items-center z-10 text-center flex-1 min-w-[48px] sm:min-w-[64px]"
            >
              <div
                className={cn(
                  "h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center transition-all duration-300 border",
                  isCompleted
                    ? "bg-gradient-brand text-white border-transparent shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                    : isActive
                    ? "bg-background border-[var(--cyan-accent)] text-[var(--cyan-accent)] shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-2 ring-[var(--cyan-accent)]/20 scale-105"
                    : "bg-surface border-white/5 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 stroke-[3px]" />
                ) : (
                  <Icon className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold mt-2 hidden sm:block tracking-wide uppercase transition-colors",
                  isActive ? "text-foreground font-bold" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-brand h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};
