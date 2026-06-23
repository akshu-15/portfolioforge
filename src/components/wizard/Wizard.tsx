import * as React from "react";
import { WizardStepper } from "./WizardStepper";
import { PersonalInfoStep } from "./steps/PersonalInfoStep";
import { EducationStep } from "./steps/EducationStep";
import { SkillsStep } from "./steps/SkillsStep";
import { ProjectsStep } from "./steps/ProjectsStep";
import { ExperienceStep } from "./steps/ExperienceStep";
import { AchievementsStep } from "./steps/AchievementsStep";
import { ResumeUploadStep } from "./steps/ResumeUploadStep";
import { ThemeStep } from "./steps/ThemeStep";
import { useWizard } from "./WizardContext";
import { CheckCircle2 } from "lucide-react";

export const Wizard = () => {
  const { state } = useWizard();

  const getStepComponent = () => {
    switch (state.step) {
      case "personal":
        return <PersonalInfoStep />;
      case "education":
        return <EducationStep />;
      case "skills":
        return <SkillsStep />;
      case "experience":
        return <ExperienceStep />;
      case "projects":
        return <ProjectsStep />;
      case "achievements":
        return <AchievementsStep />;
      case "resume":
        return <ResumeUploadStep />;
      case "theme":
        return <ThemeStep />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <WizardStepper />
      {state.resumeParsed && state.step !== "resume" && (
        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resume Uploaded
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Resume Parsed
          </span>
          <span>Review &amp; Edit Information</span>
        </div>
      )}
      <div className="border-t pt-6">{getStepComponent()}</div>
    </div>
  );
};
