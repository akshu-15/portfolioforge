import * as React from "react";
import {
  useWizard,
  type Certification,
  type Skill,
  type SkillsData,
} from "@/components/wizard/WizardContext";
import {
  Plus,
  X,
  Code2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Layout,
  Server,
  Database,
  Code,
  Wrench,
  Award,
  Upload,
  FileText,
  Pencil,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SkillCategory = keyof SkillsData;

const CATEGORIES: {
  id: SkillCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  suggestions: string[];
}[] = [
  {
    id: "frontend",
    label: "Frontend",
    icon: Layout,
    color: "text-blue-400 border-blue-500/20 bg-blue-500/5",
    suggestions: ["React", "Next.js", "Tailwind CSS", "HTML5/CSS3", "Vue", "Angular"],
  },
  {
    id: "backend",
    label: "Backend",
    icon: Server,
    color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5",
    suggestions: ["Node.js", "Express", "Python", "Django", "Go", "NestJS"],
  },
  {
    id: "database",
    label: "Database",
    icon: Database,
    color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    suggestions: ["PostgreSQL", "MongoDB", "MySQL", "Redis", "Supabase"],
  },
  {
    id: "languages",
    label: "Programming Languages",
    icon: Code,
    color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    suggestions: ["TypeScript", "JavaScript", "Python", "Golang", "Rust", "Java"],
  },
  {
    id: "tools",
    label: "Tools & DevOps",
    icon: Wrench,
    color: "text-purple-400 border-purple-500/20 bg-purple-500/5",
    suggestions: ["Git", "Docker", "AWS", "Kubernetes", "Vercel", "Linux"],
  },
];

export const SkillsStep = () => {
  const { state, dispatch } = useWizard();
  const certificateFileInputRef = React.useRef<HTMLInputElement>(null);
  const draftCertificateFileInputRef = React.useRef<HTMLInputElement>(null);
  const [inputValues, setInputValues] = React.useState<Record<SkillCategory, string>>({
    frontend: "",
    backend: "",
    database: "",
    languages: "",
    tools: "",
  });
  const [certName, setCertName] = React.useState("");
  const [certIssuer, setCertIssuer] = React.useState("");
  const [certFile, setCertFile] = React.useState<{ name: string; data: string } | null>(null);
  const [editingCertIdx, setEditingCertIdx] = React.useState<number | null>(null);
  const [certDraft, setCertDraft] = React.useState<Certification>({
    name: "",
    issuer: "",
    link: "",
  });

  // Safe getter for categorized skills
  const safeCategorizedSkills = React.useMemo(() => {
    return (
      state.categorizedSkills || {
        frontend: [],
        backend: [],
        database: [],
        languages: [],
        tools: [],
      }
    );
  }, [state.categorizedSkills]);

  const certifications = state.achievements?.certifications || [];

  const syncLegacySkills = (categorized: SkillsData) => {
    const flatList: Skill[] = [];
    CATEGORIES.forEach((cat) => {
      const skillsInCat = categorized[cat.id] || [];
      skillsInCat.forEach((name) => {
        flatList.push({
          name,
          proficiency: "Advanced",
          category: cat.id,
        });
      });
    });
    return flatList;
  };

  const handleAddSkill = (category: SkillCategory, skillName: string) => {
    const trimmed = skillName.trim();
    if (!trimmed) return;

    const currentList = safeCategorizedSkills[category] || [];
    if (currentList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    const updatedCategorized = {
      ...safeCategorizedSkills,
      [category]: [...currentList, trimmed],
    };

    dispatch((prev) => ({
      ...prev,
      categorizedSkills: updatedCategorized,
      skills: syncLegacySkills(updatedCategorized),
    }));

    setInputValues((prev) => ({
      ...prev,
      [category]: "",
    }));
  };

  const handleKeyDown = (category: SkillCategory, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkill(category, inputValues[category]);
    }
  };

  const handleRemoveSkill = (category: SkillCategory, skillName: string) => {
    const currentList = safeCategorizedSkills[category] || [];
    const updatedCategorized = {
      ...safeCategorizedSkills,
      [category]: currentList.filter((s) => s !== skillName),
    };

    dispatch((prev) => ({
      ...prev,
      categorizedSkills: updatedCategorized,
      skills: syncLegacySkills(updatedCategorized),
    }));
  };

  const handleCertificateFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isSupportedCertificate =
      file.type === "application/pdf" ||
      file.type.startsWith("image/") ||
      lowerName.endsWith(".pdf") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".webp");

    if (!isSupportedCertificate) {
      alert("Please upload a PDF or image certificate.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Certificate file should be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCertFile({ name: file.name, data: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleDraftCertificateFile = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isSupportedCertificate =
      file.type === "application/pdf" ||
      file.type.startsWith("image/") ||
      lowerName.endsWith(".pdf") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".webp");

    if (!isSupportedCertificate) {
      alert("Please upload a PDF or image certificate.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Certificate file should be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCertDraft((prev) => ({
        ...prev,
        fileName: file.name,
        fileData: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddCertification = () => {
    const name = certName.trim();
    const issuer = certIssuer.trim();

    if (!name) return;

    const newCertification: Certification = {
      name,
      issuer,
      link: "",
      fileName: certFile?.name,
      fileData: certFile?.data,
    };

    dispatch((prev) => ({
      ...prev,
      achievements: {
        ...prev.achievements,
        certifications: [...(prev.achievements?.certifications || []), newCertification],
      },
    }));

    setCertName("");
    setCertIssuer("");
    setCertFile(null);
    if (certificateFileInputRef.current) {
      certificateFileInputRef.current.value = "";
    }
  };

  const handleRemoveCertification = (idx: number) => {
    dispatch((prev) => ({
      ...prev,
      achievements: {
        ...prev.achievements,
        certifications: (prev.achievements?.certifications || []).filter(
          (_, certIdx) => certIdx !== idx,
        ),
      },
    }));
    if (editingCertIdx === idx) {
      setEditingCertIdx(null);
    }
  };

  const handleEditCertification = (idx: number) => {
    setEditingCertIdx(idx);
    setCertDraft(certifications[idx] || { name: "", issuer: "", link: "" });
  };

  const handleCancelCertificationEdit = () => {
    setEditingCertIdx(null);
    setCertDraft({ name: "", issuer: "", link: "" });
  };

  const handleSaveCertification = (idx: number) => {
    const name = certDraft.name.trim();
    const issuer = certDraft.issuer.trim();

    if (!name) return;

    dispatch((prev) => ({
      ...prev,
      achievements: {
        ...prev.achievements,
        certifications: (prev.achievements?.certifications || []).map((cert, certIdx) =>
          certIdx === idx
            ? {
                ...cert,
                name,
                issuer,
                link: "",
                fileName: certDraft.fileName,
                fileData: certDraft.fileData,
              }
            : cert,
        ),
      },
    }));

    handleCancelCertificationEdit();
  };

  const goToNext = () => {
    dispatch((prev) => ({
      ...prev,
      step: "experience",
    }));
  };

  const goToPrevious = () => {
    dispatch((prev) => ({
      ...prev,
      step: "education",
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Code2 className="h-5 w-5 text-[var(--cyan-accent)]" />
        <h3 className="text-lg font-bold text-foreground">Skills & Expertise</h3>
      </div>

      <div className="space-y-6">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const currentSkills = safeCategorizedSkills[cat.id] || [];

          return (
            <div
              key={cat.id}
              className={cn(
                "rounded-2xl border p-4 sm:p-5 space-y-4 transition-all duration-300",
                cat.color.split(" ")[1], // border color
              )}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg border", cat.color.split(" ")[1])}>
                    <Icon className={cn("h-4 w-4", cat.color.split(" ")[0])} />
                  </div>
                  <span className="font-bold text-sm text-foreground">{cat.label}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                  {currentSkills.length} Skills
                </span>
              </div>

              {/* Tag Input Field */}
              <div className="flex gap-2">
                <Input
                  placeholder={`Add a ${cat.label.toLowerCase()} skill (e.g. ${cat.suggestions[0]})...`}
                  value={inputValues[cat.id]}
                  onChange={(e) =>
                    setInputValues((prev) => ({ ...prev, [cat.id]: e.target.value }))
                  }
                  onKeyDown={(e) => handleKeyDown(cat.id, e)}
                  className="glass h-9 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddSkill(cat.id, inputValues[cat.id])}
                  className="h-9 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-xs shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {/* Suggestions */}
              <div className="flex items-center flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-amber-500/80 shrink-0" />
                <span className="mr-1">Suggestions:</span>
                {cat.suggestions.map((sug) => {
                  const isAdded = currentSkills.some((s) => s.toLowerCase() === sug.toLowerCase());
                  return (
                    <button
                      key={sug}
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddSkill(cat.id, sug)}
                      className={cn(
                        "px-1.5 py-0.5 rounded border transition-colors select-none",
                        isAdded
                          ? "opacity-35 cursor-not-allowed border-transparent bg-white/5"
                          : "border-white/5 bg-white/5 hover:bg-white/10 hover:text-foreground cursor-pointer",
                      )}
                    >
                      {sug}
                    </button>
                  );
                })}
              </div>

              {/* Tags Display */}
              {currentSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {currentSkills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className={cn(
                        "text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 select-none border transition-colors group",
                        cat.color.split(" ")[2], // bg color
                        cat.color.split(" ")[1], // border color
                      )}
                    >
                      <span className="text-foreground font-medium">{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(cat.id, skill)}
                        className="text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-md p-0.5 transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/60 italic">
                  No {cat.label.toLowerCase()} skills added yet.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-purple-500/20 p-1.5">
              <Award className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Certifications</h4>
              <p className="text-[11px] text-muted-foreground">
                Add courses, professional certificates, and certificate files.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
            {certifications.length} Certificates
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Certificate name (e.g. AWS Cloud Practitioner)"
            value={certName}
            onChange={(event) => setCertName(event.target.value)}
            className="glass h-9 text-xs"
          />
          <Input
            placeholder="Issuer (e.g. Amazon Web Services)"
            value={certIssuer}
            onChange={(event) => setCertIssuer(event.target.value)}
            className="glass h-9 text-xs"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => certificateFileInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-purple-500/40 hover:text-foreground"
          >
            {certFile ? (
              <>
                <FileText className="h-4 w-4 text-purple-400" />
                {certFile.name}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload certificate file
              </>
            )}
          </button>
          <input
            ref={certificateFileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleCertificateFile(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddCertification}
            className="h-11 bg-white/5 border border-white/10 hover:bg-white/10 text-xs shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Certification
          </Button>
        </div>

        {certifications.length > 0 ? (
          <div className="space-y-2 pt-1">
            {certifications.map((cert, idx) => (
              <div
                key={`${cert.name}-${idx}`}
                className="rounded-xl border border-purple-500/20 bg-black/10 p-3 flex items-start justify-between gap-3"
              >
                {editingCertIdx === idx ? (
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={certDraft.name}
                        onChange={(event) =>
                          setCertDraft((prev) => ({ ...prev, name: event.target.value }))
                        }
                        className="glass h-8 text-xs"
                        placeholder="Certificate name"
                      />
                      <Input
                        value={certDraft.issuer}
                        onChange={(event) =>
                          setCertDraft((prev) => ({ ...prev, issuer: event.target.value }))
                        }
                        className="glass h-8 text-xs"
                        placeholder="Issuer"
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => draftCertificateFileInputRef.current?.click()}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-purple-500/40 hover:text-foreground"
                      >
                        {certDraft.fileName || certDraft.fileData ? (
                          <>
                            <FileText className="h-4 w-4 text-purple-400" />
                            {certDraft.fileName || "Certificate PDF attached"}
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload certificate file
                          </>
                        )}
                      </button>
                      <input
                        ref={draftCertificateFileInputRef}
                        type="file"
                        accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleDraftCertificateFile(file);
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveCertification(idx)}
                        className="h-8 bg-white/5 border border-white/10 hover:bg-white/10 text-xs"
                      >
                        <Save className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelCertificationEdit}
                        className="h-8 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Award className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">
                        {cert.name}
                      </span>
                    </div>
                    {cert.issuer && (
                      <p className="text-[11px] text-muted-foreground truncate">{cert.issuer}</p>
                    )}
                    <div className="flex flex-wrap gap-3 pt-1">
                      {cert.fileData && (
                        <a
                          href={cert.fileData}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-purple-300 hover:underline"
                        >
                          <FileText className="h-3 w-3" /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex shrink-0 gap-1">
                  {editingCertIdx !== idx && (
                    <button
                      type="button"
                      onClick={() => handleEditCertification(idx)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveCertification(idx)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/60 italic">
            Certifications from your resume will appear here automatically, or you can add them
            manually.
          </p>
        )}
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
          onClick={goToNext}
          className="w-full sm:w-auto bg-gradient-brand text-white shadow-glow"
        >
          Save & Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
