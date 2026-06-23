import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWizard, type Certification } from "@/components/wizard/WizardContext";
import {
  Plus,
  X,
  Upload,
  Award,
  Trophy,
  Code2,
  FileText,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const achievementsSchema = z.object({
  github: z
    .string()
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    })
    .optional()
    .or(z.literal("")),
  leetcode: z
    .string()
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    })
    .optional()
    .or(z.literal("")),
  codeforces: z
    .string()
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    })
    .optional()
    .or(z.literal("")),
  hackerrank: z
    .string()
    .refine((val) => !val || val.startsWith("http://") || val.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    })
    .optional()
    .or(z.literal("")),
});

type AchievementsFormValues = z.infer<typeof achievementsSchema>;

export const AchievementsStep = () => {
  const { state, dispatch } = useWizard();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Local list states initialized from global context with safety checks
  const [certs, setCerts] = React.useState<Certification[]>(
    state.achievements?.certifications || [],
  );
  const [awards, setAwards] = React.useState<string[]>(state.achievements?.awards || []);
  const [hacks, setHacks] = React.useState<string[]>(state.achievements?.hackathons || []);

  // Tag input temp states
  const [certInput, setCertInput] = React.useState("");
  const [awardInput, setAwardInput] = React.useState("");
  const [hackInput, setHackInput] = React.useState("");

  // Resume upload states
  const [uploadState, setUploadState] = React.useState<"idle" | "uploading" | "done">(
    state.achievements?.resumeFile ? "done" : "idle",
  );
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadedFile, setUploadedFile] = React.useState<
    { name: string; size: string; type: string } | undefined
  >(state.achievements?.resumeFile);

  const form = useForm<AchievementsFormValues>({
    resolver: zodResolver(achievementsSchema),
    defaultValues: {
      github: state.achievements?.codingProfiles?.github || state.personal.github || "",
      leetcode: state.achievements?.codingProfiles?.leetcode || "",
      codeforces: state.achievements?.codingProfiles?.codeforces || "",
      hackerrank: state.achievements?.codingProfiles?.hackerrank || "",
    },
    mode: "onChange",
  });

  const { handleSubmit, control, watch } = form;

  // Sync coding profiles to global state on input change
  const watchedFields = watch();
  React.useEffect(() => {
    dispatch((prev) => ({
      ...prev,
      achievements: {
        ...(prev.achievements || {
          certifications: [],
          awards: [],
          hackathons: [],
          codingProfiles: { github: "", leetcode: "", codeforces: "", hackerrank: "" },
        }),
        codingProfiles: {
          github: watchedFields.github || "",
          leetcode: watchedFields.leetcode || "",
          codeforces: watchedFields.codeforces || "",
          hackerrank: watchedFields.hackerrank || "",
        },
      },
    }));
  }, [watchedFields, dispatch]);

  // Sync lists to global context when they change
  React.useEffect(() => {
    dispatch((prev) => ({
      ...prev,
      achievements: {
        ...(prev.achievements || {
          certifications: [],
          awards: [],
          hackathons: [],
          codingProfiles: { github: "", leetcode: "", codeforces: "", hackerrank: "" },
        }),
        certifications: certs,
        awards: awards,
        hackathons: hacks,
      },
    }));
  }, [certs, awards, hacks, dispatch]);

  const handleAddCert = () => {
    const trimmed = certInput.trim();
    if (trimmed && !certs.some((cert) => cert.name.toLowerCase() === trimmed.toLowerCase())) {
      setCerts((prev) => [...prev, { name: trimmed, issuer: "", link: "" }]);
      setCertInput("");
    }
  };

  const handleAddAward = () => {
    const trimmed = awardInput.trim();
    if (trimmed && !awards.includes(trimmed)) {
      setAwards((prev) => [...prev, trimmed]);
      setAwardInput("");
    }
  };

  const handleAddHack = () => {
    const trimmed = hackInput.trim();
    if (trimmed && !hacks.includes(trimmed)) {
      setHacks((prev) => [...prev, trimmed]);
      setHackInput("");
    }
  };

  // Mock upload logic with progress tracking
  const processUpload = (file: File) => {
    const isDoc =
      file.name.endsWith(".pdf") ||
      file.name.endsWith(".docx") ||
      file.type === "application/pdf" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isDoc) {
      alert("Invalid format! Please upload a PDF or DOCX file.");
      return;
    }

    setUploadState("uploading");
    setUploadProgress(0);

    const sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      const newFile = {
        name: file.name,
        size: sizeStr,
        type: file.name.endsWith(".pdf") ? "PDF" : "DOCX",
        fileData: base64Data,
      };

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploadState("done");
            setUploadedFile(newFile);
            dispatch((statePrev) => ({
              ...statePrev,
              achievements: {
                ...(statePrev.achievements || {
                  certifications: [],
                  awards: [],
                  hackathons: [],
                  codingProfiles: { github: "", leetcode: "", codeforces: "", hackerrank: "" },
                }),
                resumeFile: newFile,
              },
            }));
            return 100;
          }
          return prev + 10;
        });
      }, 150);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUpload(file);
    }
  };

  const removeResume = () => {
    setUploadState("idle");
    setUploadedFile(undefined);
    setUploadProgress(0);
    dispatch((prev) => {
      if (!prev.achievements) return prev;
      const updatedAchievements = { ...prev.achievements };
      delete updatedAchievements.resumeFile;
      return {
        ...prev,
        achievements: updatedAchievements,
      };
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = () => {
    dispatch((prev) => ({
      ...prev,
      step: "resume",
    }));
  };

  const goToPrevious = () => {
    dispatch((prev) => ({
      ...prev,
      step: "projects",
    }));
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <Trophy className="h-5 w-5 text-[var(--cyan-accent)]" />
          <h3 className="text-lg font-bold text-foreground">Achievements & Resume</h3>
        </div>

        {/* Drag & Drop Resume Upload */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Resume Upload</label>
          {uploadState === "idle" && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 hover:border-[var(--cyan-accent)]/40 rounded-2xl p-8 flex flex-col items-center justify-center gap-2.5 transition-colors cursor-pointer text-center bg-white/5"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">
                Drag & drop your resume here, or{" "}
                <span className="text-[var(--cyan-accent)] hover:underline">browse</span>
              </p>
              <p className="text-xs text-muted-foreground">Supports PDF and DOCX (Max 5MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {uploadState === "uploading" && (
            <div className="border border-white/10 rounded-2xl p-6 bg-white/5 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 text-[var(--cyan-accent)] animate-spin" />
              <div className="w-full max-w-xs space-y-1.5 text-center">
                <p className="text-xs font-semibold text-foreground">
                  Uploading and analyzing resume...
                </p>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-brand h-full transition-all duration-150 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {uploadProgress}%
                </span>
              </div>
            </div>
          )}

          {uploadState === "done" && uploadedFile && (
            <div className="border border-white/10 rounded-2xl p-4 bg-white/5 flex items-center justify-between gap-3 animate-scale-up">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-[var(--cyan-accent)]/10 text-[var(--cyan-accent)] flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{uploadedFile.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {uploadedFile.size} · {uploadedFile.type} Formatted
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> Ready
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeResume}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Certifications Dynamic Inputs */}
        <div className="rounded-2xl border border-white/5 p-3.5 sm:p-4.5 bg-white/[0.02] space-y-3">
          <div className="flex items-center gap-1.5">
            <Award className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-bold text-foreground">Certifications</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. AWS Certified Solutions Architect"
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCert())}
              className="glass h-9 text-xs"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddCert}
              className="h-9 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-xs shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          {certs.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1.5">
              {certs.map((c) => (
                <div
                  key={c.name}
                  className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
                >
                  <span>{c.name}</span>
                  <button
                    type="button"
                    onClick={() => setCerts((prev) => prev.filter((x) => x.name !== c.name))}
                    className="text-purple-400 hover:text-purple-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Awards Dynamic Inputs */}
        <div className="rounded-2xl border border-white/5 p-3.5 sm:p-4.5 bg-white/[0.02] space-y-3">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold text-foreground">Awards & Honors</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Dean's List for Academic Excellence"
              value={awardInput}
              onChange={(e) => setAwardInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAward())}
              className="glass h-9 text-xs"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddAward}
              className="h-9 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-xs shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          {awards.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1.5">
              {awards.map((a) => (
                <div
                  key={a}
                  className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
                >
                  <span>{a}</span>
                  <button
                    type="button"
                    onClick={() => setAwards((prev) => prev.filter((x) => x !== a))}
                    className="text-amber-400 hover:text-amber-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hackathons Dynamic Inputs */}
        <div className="rounded-2xl border border-white/5 p-3.5 sm:p-4.5 bg-white/[0.02] space-y-3">
          <div className="flex items-center gap-1.5">
            <Code2 className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-foreground">Hackathons</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Smart India Hackathon 2024 Winner"
              value={hackInput}
              onChange={(e) => setHackInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddHack())}
              className="glass h-9 text-xs"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddHack}
              className="h-9 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-xs shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          {hacks.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1.5">
              {hacks.map((h) => (
                <div
                  key={h}
                  className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
                >
                  <span>{h}</span>
                  <button
                    type="button"
                    onClick={() => setHacks((prev) => prev.filter((x) => x !== h))}
                    className="text-emerald-400 hover:text-emerald-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coding Profiles Links */}
        <div className="rounded-2xl border border-white/5 p-3.5 sm:p-4.5 bg-white/[0.02] space-y-4">
          <div className="flex items-center gap-1.5">
            <Code2 className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-bold text-foreground">Coding Profiles</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="github"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub Profile URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/username"
                      className="glass text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="leetcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LeetCode Profile URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://leetcode.com/username"
                      className="glass text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="codeforces"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codeforces Profile URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://codeforces.com/profile/username"
                      className="glass text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="hackerrank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HackerRank Profile URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://hackerrank.com/username"
                      className="glass text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={goToPrevious}
            className="w-full sm:w-auto glass"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button type="submit" size="lg" className="w-full sm:w-auto bg-gradient-brand text-white shadow-glow">
            Save & Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
};
