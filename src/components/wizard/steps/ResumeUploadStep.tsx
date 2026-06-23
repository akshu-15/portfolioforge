import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Wand2,
  X,
  Brain,
  Zap,
  Target,
  BarChart3,
  User,
  Code,
  Briefcase,
  GraduationCap,
  Trophy,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
import {
  useWizard,
  type Certification,
  type SkillsData,
  type ThemeName,
} from "@/components/wizard/WizardContext";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
type ParseStage = {
  label: string;
  done: boolean;
  active: boolean;
};

type AiErrorKind = "missing-key" | "busy" | "invalid-response" | "generic";

type UserFacingAiError = {
  title: string;
  message: string;
};

type GroqUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: GroqUsage;
};

class AiRequestError extends Error {
  kind: AiErrorKind;

  constructor(kind: AiErrorKind) {
    super(kind);
    this.name = "AiRequestError";
    this.kind = kind;
  }
}

type ParsedResume = {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    bio: string;
    role: string;
    tagline: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    cgpa: string;
    description: string;
  }>;
  skills: Array<{ name: string; proficiency: string; category: string }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    link: string;
    githubLink: string;
  }>;
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    location: string;
    description: string;
  }>;
  achievements: {
    certifications: Certification[];
    awards: string[];
    hackathons: string[];
  };
  profileScore: number;
  recruiterScore: number;
  aiSuggestions: string[];
  strengths: string[];
  improvements: string[];
};

type GroqResumeJson = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  skills?: unknown[];
  education?: unknown[];
  experience?: unknown[];
  projects?: unknown[];
  website?: string;
  portfolio?: string;
  certifications?: unknown[];
  achievements?: {
    certifications?: unknown[];
    awards?: unknown[];
    hackathons?: unknown[];
  };
  github?: string;
  linkedin?: string;
};

// ──────────────────────────────────────────
// Constants
// ──────────────────────────────────────────
const PARSE_STAGES = [
  "Reading document structure...",
  "Extracting personal information...",
  "Detecting skills and technologies...",
  "Analyzing projects and experience...",
  "Computing profile scores...",
  "Generating AI enhancements...",
];

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const RESUME_PARSER_SYSTEM_PROMPT = `Extract the resume into this exact JSON structure:
{
  name: string; email: string; phone: string; location: string; bio: string;
  skills: {name: string; proficiency: string; category: string}[];
  education: {institution: string; degree: string; fieldOfStudy: string; startYear: string; endYear: string; cgpa: string; description: string}[];
  experience: {company: string; position: string; startDate: string; endDate: string; location: string; description: string}[];
  projects: {name: string; description: string; technologies: string[]; link: string; githubLink: string}[];
  certifications: {name: string; issuer: string}[];
  achievements: {certifications: {name: string; issuer: string}[]; awards: string[]; hackathons: string[]};
  github: string; linkedin: string;
}
Use empty strings or arrays when data is absent. Write bio as a 2-3 sentence professional summary. Output valid JSON only.`;

const AI_BUSY_ERROR: UserFacingAiError = {
  title: "AI Service Temporarily Busy",
  message:
    "PortfolioForge is experiencing high usage right now.\n\nResume generation is temporarily unavailable.\n\nPlease try again later.",
};

const AI_KEY_ERROR: UserFacingAiError = {
  title: "AI Service Not Configured",
  message:
    "Resume generation is unavailable because the AI service configuration is missing. Please contact the site administrator.",
};

const AI_RESPONSE_ERROR: UserFacingAiError = {
  title: "Resume Parsing Unavailable",
  message: "PortfolioForge could not read the AI response. Please try again.",
};

const AI_PARSE_GENERIC_ERROR: UserFacingAiError = {
  title: "Parsing Failed",
  message: "Failed to parse resume. Please try again.",
};

const aiUsageTotals = {
  requests: 0,
  rateLimitEvents: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

function normalizeResumeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function approximateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

function beginAiRequest(kind: "resume-parse" | "batch-enhance", input: string): number {
  aiUsageTotals.requests += 1;
  const approximateInputTokens = approximateTokens(input);
  console.info("[PortfolioForge AI] request", {
    kind,
    request: aiUsageTotals.requests,
    approximateInputTokens,
  });
  return approximateInputTokens;
}

function logAiUsage(
  kind: "resume-parse" | "batch-enhance",
  usage: GroqUsage | undefined,
  approximateInputTokens: number,
) {
  const promptTokens = usage?.prompt_tokens ?? approximateInputTokens;
  const completionTokens = usage?.completion_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
  aiUsageTotals.promptTokens += promptTokens;
  aiUsageTotals.completionTokens += completionTokens;
  aiUsageTotals.totalTokens += totalTokens;

  console.info("[PortfolioForge AI] usage", {
    kind,
    promptTokens,
    completionTokens,
    totalTokens,
    approximate: !usage,
    session: { ...aiUsageTotals },
  });
}

function getProviderErrorText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";
  const details = error as { message?: unknown; code?: unknown; type?: unknown };
  return [details.message, details.code, details.type]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function isTemporaryProviderFailure(status: number, payload: unknown): boolean {
  if (status === 429 || status >= 500) return true;
  return /rate.?limit|quota|usage.?limit|too many requests|capacity|overloaded|temporar|tokens per/i.test(
    getProviderErrorText(payload),
  );
}

async function throwProviderError(response: Response, kind: "resume-parse" | "batch-enhance") {
  const payload = await response.json().catch(() => null);

  if (response.status === 401) {
    console.warn("[PortfolioForge AI] invalid or missing API key", {
      kind,
      status: response.status,
    });
    throw new AiRequestError("missing-key");
  }

  const isTemporary = isTemporaryProviderFailure(response.status, payload);

  if (isTemporary) {
    aiUsageTotals.rateLimitEvents += 1;
    console.warn("[PortfolioForge AI] temporary provider failure", {
      kind,
      status: response.status,
      rateLimitEvents: aiUsageTotals.rateLimitEvents,
    });
    throw new AiRequestError("busy");
  }

  console.warn("[PortfolioForge AI] provider request failed", { kind, status: response.status });
  throw new AiRequestError("generic");
}

function toUserFacingAiError(error: unknown, fallback: UserFacingAiError): UserFacingAiError {
  if (!(error instanceof AiRequestError)) return fallback;
  if (error.kind === "missing-key") return AI_KEY_ERROR;
  if (error.kind === "busy") return AI_BUSY_ERROR;
  if (error.kind === "invalid-response") return AI_RESPONSE_ERROR;
  return fallback;
}

// ──────────────────────────────────────────
// Circular Score Ring (SVG)
// ──────────────────────────────────────────
const ScoreRing: React.FC<{
  score: number;
  label: string;
  color: string;
  size?: number;
}> = ({ score, label, color, size = 100 }) => {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={8}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-foreground leading-none">{score}</span>
          <span className="text-[9px] text-muted-foreground font-mono">/100</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground text-center">{label}</span>
    </div>
  );
};

// ──────────────────────────────────────────
// DOCX text extractor (no external deps)
// ──────────────────────────────────────────
function extractTextFromDocx(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const raw = decoder.decode(bytes);
  // Pull readable ASCII-ish runs
  const runs: string[] = [];
  let current = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c >= " " && c <= "~") {
      current += c;
    } else {
      if (current.length > 3) runs.push(current);
      current = "";
    }
  }
  if (current.length > 3) runs.push(current);
  return runs
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .slice(0, 12000);
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function hasUsefulDescription(value: string): boolean {
  return value.trim().split(/\s+/).length >= 8;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function analyzeResume(
  result: Omit<
    ParsedResume,
    "profileScore" | "recruiterScore" | "aiSuggestions" | "strengths" | "improvements"
  >,
  website: string,
): Pick<
  ParsedResume,
  "profileScore" | "recruiterScore" | "aiSuggestions" | "strengths" | "improvements"
> {
  const personal = result.personal;
  const skillsCount = result.skills.length;
  const projectCount = result.projects.length;
  const experienceCount = result.experience.length;
  const certificationCount = result.achievements.certifications.length;
  const skillCategories = uniqueNonEmpty(
    result.skills.map((skill) => skill.category.toLowerCase()),
  );
  const hasPersonalInfo = Boolean(
    personal.firstName || personal.lastName || personal.phone || personal.location || personal.bio,
  );
  const hasGitHub = Boolean(personal.github);
  const hasLinkedIn = Boolean(personal.linkedin);
  const hasWebsite = Boolean(website);
  const hasEducation = result.education.length > 0;
  const hasExperience = experienceCount > 0;
  const hasCertifications = certificationCount > 0;
  const hasDetailedExperience = result.experience.some((experience) =>
    hasUsefulDescription(experience.description),
  );
  const hasStrongProjectDescriptions = result.projects.some((project) =>
    hasUsefulDescription(project.description),
  );
  const projectTechCount = result.projects.filter(
    (project) => project.technologies.length > 0,
  ).length;

  let profileScore = 0;
  if (hasPersonalInfo) profileScore += 8;
  if (personal.email) profileScore += 6;
  if (personal.phone || personal.location) profileScore += 4;
  if (hasGitHub) profileScore += 7;
  if (hasLinkedIn) profileScore += 7;
  if (hasWebsite) profileScore += 4;
  if (hasEducation) profileScore += 8;
  profileScore += Math.min(18, skillsCount * 1.5);
  profileScore += Math.min(18, projectCount * 5);
  if (hasStrongProjectDescriptions) profileScore += 5;
  if (projectTechCount >= Math.min(projectCount, 2)) profileScore += 3;
  if (hasExperience) profileScore += 8;
  if (hasDetailedExperience) profileScore += 4;
  if (hasCertifications) profileScore += Math.min(6, certificationCount * 3);
  profileScore = clampScore(profileScore);

  let recruiterScore = 0;
  recruiterScore += Math.min(20, Math.round(profileScore * 0.2));
  recruiterScore +=
    projectCount >= 4
      ? 18
      : projectCount >= 3
        ? 16
        : projectCount === 2
          ? 11
          : projectCount === 1
            ? 6
            : 0;
  recruiterScore += hasStrongProjectDescriptions ? 8 : projectCount > 0 ? 3 : 0;
  recruiterScore +=
    skillCategories.length >= 4 && skillsCount > 10
      ? 16
      : skillCategories.length >= 3
        ? 13
        : skillCategories.length >= 2
          ? 9
          : skillsCount >= 1
            ? 5
            : 0;
  recruiterScore += hasExperience ? 10 : 0;
  recruiterScore += hasDetailedExperience ? 5 : 0;
  recruiterScore += hasCertifications ? Math.min(5, certificationCount * 2) : 0;
  recruiterScore += (hasGitHub ? 4 : 0) + (hasLinkedIn ? 4 : 0) + (hasWebsite ? 3 : 0);
  recruiterScore = clampScore(recruiterScore);

  const strengths: string[] = [];
  if (projectCount >= 3) strengths.push("Strong project portfolio");
  else if (projectCount > 0) strengths.push("Project experience is included");
  if (skillsCount > 10 || skillCategories.length >= 3) strengths.push("Diverse technical skills");
  else if (skillsCount >= 6) strengths.push("Solid technical skills section");
  if (hasExperience) strengths.push("Internship or job experience");
  if (hasGitHub && hasLinkedIn) strengths.push("Good professional presence");
  else if (hasGitHub) strengths.push("Strong GitHub profile");
  if (hasCertifications)
    strengths.push(certificationCount > 1 ? "Multiple certifications" : "Certification listed");
  if (hasEducation) strengths.push("Education details are present");
  if (strengths.length === 0)
    strengths.push("Resume has enough information to start building a portfolio");

  const improvements: string[] = [];
  if (projectCount === 0) improvements.push("Add more projects");
  else if (projectCount < 3) improvements.push("Add more projects");
  if (!hasGitHub) improvements.push("Add GitHub profile");
  if (!hasLinkedIn) improvements.push("Add LinkedIn profile");
  if (!hasCertifications) improvements.push("Add certifications");
  if (!hasExperience) improvements.push("Add internship experience");
  if (skillsCount < 6) improvements.push("Expand technical skills section");
  if (!hasStrongProjectDescriptions && projectCount > 0)
    improvements.push("Improve project descriptions");
  if (!hasWebsite) improvements.push("Add portfolio website");
  if (improvements.length === 0)
    improvements.push("Add more measurable details to strengthen the profile");

  const finalStrengths = uniqueNonEmpty(strengths);
  const finalImprovements = uniqueNonEmpty(improvements);

  return {
    profileScore,
    recruiterScore,
    aiSuggestions: finalImprovements.slice(0, 5),
    strengths: finalStrengths.slice(0, 5),
    improvements: finalImprovements.slice(0, 5),
  };
}

function normalizeGroqResume(data: GroqResumeJson): ParsedResume {
  const { firstName, lastName } = splitName(asString(data.name));
  const skills = toArray(data.skills)
    .map((skill) => {
      if (typeof skill === "string") {
        return { name: skill, proficiency: "Intermediate", category: "tools" };
      }

      const item = (skill || {}) as Record<string, unknown>;
      return {
        name: asString(item.name || item.skill),
        proficiency: asString(item.proficiency) || "Intermediate",
        category: asString(item.category) || "tools",
      };
    })
    .filter((skill) => skill.name);

  const education = toArray(data.education).map((entry) => {
    const item = (entry || {}) as Record<string, unknown>;
    return {
      institution: asString(item.institution || item.school || item.university),
      degree: asString(item.degree),
      fieldOfStudy: asString(item.fieldOfStudy || item.field || item.major),
      startYear: asString(item.startYear || item.startDate),
      endYear: asString(item.endYear || item.graduationYear || item.endDate),
      cgpa: asString(item.cgpa || item.gpa),
      description: asString(item.description),
    };
  });

  const experience = toArray(data.experience).map((entry) => {
    const item = (entry || {}) as Record<string, unknown>;
    return {
      company: asString(item.company || item.organization),
      position: asString(item.position || item.role || item.title),
      startDate: asString(item.startDate),
      endDate: asString(item.endDate),
      location: asString(item.location),
      description: asString(item.description || item.summary),
    };
  });

  const projects = toArray(data.projects).map((entry) => {
    const item = (entry || {}) as Record<string, unknown>;
    return {
      name: asString(item.name || item.title),
      description: asString(item.description || item.summary),
      technologies: toArray(item.technologies || item.techStack)
        .map(asString)
        .filter(Boolean),
      link: asString(
        item.link ||
          item.url ||
          item.demoLink ||
          item.demoUrl ||
          item.demoURL ||
          item.demo ||
          item.liveDemo ||
          item.liveDemoUrl ||
          item.liveUrl ||
          item.liveURL ||
          item.liveLink ||
          item.deployedUrl ||
          item.deployment ||
          item.website ||
          item.portfolio,
      ),
      githubLink: asString(
        item.githubLink ||
          item.githubUrl ||
          item.githubURL ||
          item.githubRepo ||
          item.repository ||
          item.repo ||
          item.github,
      ),
    };
  });

  const certifications = toArray(data.certifications || data.achievements?.certifications)
    .map((certification) => {
      if (typeof certification === "string") {
        return {
          name: certification,
          issuer: "",
          link: "",
        };
      }
      const item = (certification || {}) as Record<string, unknown>;
      return {
        name: asString(item.name || item.title || item.certification),
        issuer: asString(item.issuer || item.organization || item.provider || item.authority),
        link: "",
      };
    })
    .filter((certification) => certification.name);

  const normalized = {
    personal: {
      firstName,
      lastName,
      email: asString(data.email),
      phone: asString(data.phone),
      location: asString(data.location),
      linkedin: asString(data.linkedin),
      github: asString(data.github),
      bio: asString(data.bio),
      role: asString(experience[0]?.position),
      tagline: asString(experience[0]?.position) || "Portfolio Professional",
    },
    education,
    skills,
    projects,
    experience,
    achievements: {
      certifications,
      awards: toArray(data.achievements?.awards).map(asString).filter(Boolean),
      hackathons: toArray(data.achievements?.hackathons).map(asString).filter(Boolean),
    },
  };

  return {
    ...normalized,
    ...analyzeResume(normalized, asString(data.website || data.portfolio)),
  };
}

// ──────────────────────────────────────────
// Theme suggestion logic
// ──────────────────────────────────────────
function suggestTheme(role: string): { theme: string; label: string } {
  const r = role.toLowerCase();
  if (/frontend|ui|design/.test(r)) return { theme: "saas", label: "Modern SaaS Theme" };
  if (/ai|ml|data/.test(r)) return { theme: "glass", label: "Glassmorphism AI Theme" };
  if (/backend|devops|cloud/.test(r))
    return { theme: "terminal", label: "Developer Terminal Theme" };
  if (/full.?stack|software/.test(r)) return { theme: "cyber", label: "Cyberpunk Developer Theme" };
  return { theme: "corporate", label: "Corporate Professional Theme" };
}

// ──────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────
export const ResumeUploadStep: React.FC = () => {
  const { state, dispatch } = useWizard();

  // Upload state
  const [dragOver, setDragOver] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Parsing state
  const [isParsing, setIsParsing] = React.useState(false);
  const [parseStages, setParseStages] = React.useState<ParseStage[]>(
    PARSE_STAGES.map((label) => ({ label, done: false, active: false })),
  );
  const [parseProgress, setParseProgress] = React.useState(0);
  const [parseError, setParseError] = React.useState<UserFacingAiError | null>(null);
  const [shouldAutoParse, setShouldAutoParse] = React.useState(false);

  // Results state
  const [parsed, setParsed] = React.useState<ParsedResume | null>(null);
  const [dataCollapsed, setDataCollapsed] = React.useState(false);
  const [themeSuggestion, setThemeSuggestion] = React.useState<{
    theme: string;
    label: string;
  } | null>(null);

  // AI Enhancer state
  const [isBatchEnhancing, setIsBatchEnhancing] = React.useState(false);
  const [batchEnhancedDescriptions, setBatchEnhancedDescriptions] = React.useState<Record<number, string>>({});
  const [batchEnhanceError, setBatchEnhanceError] = React.useState<string | null>(null);

  // ── File validation ──
  const validateFile = (f: File): string | null => {
    const isPdf = f.type === "application/pdf" || f.name.endsWith(".pdf");
    const isDocx =
      f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      f.name.endsWith(".docx");
    if (!isPdf && !isDocx) return "Only PDF and DOCX files are supported.";
    if (f.size > 10 * 1024 * 1024) return "File must be under 10 MB.";
    return null;
  };

  const handleFileSelect = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setFileError(err);
      setFile(null);
      setShouldAutoParse(false);
      return;
    }
    setFileError(null);
    setFile(f);
    setParsed(null);
    setParseStages(PARSE_STAGES.map((label) => ({ label, done: false, active: false })));
    setParseProgress(0);
    setBatchEnhancedDescriptions({});
    setBatchEnhanceError(null);
    setShouldAutoParse(true);
  };

  // ── Drag & Drop handlers ──
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };
  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

  // ── Stage animation helper ──
  const animateStages = async () => {
    for (let i = 0; i < PARSE_STAGES.length; i++) {
      setParseStages((prev) => prev.map((s, idx) => ({ ...s, active: idx === i, done: idx < i })));
      setParseProgress(Math.round(((i + 1) / PARSE_STAGES.length) * 90));
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));
    }
  };

  // ── Main parse function ──
  const handleParse = async () => {
    if (!file) return;
    setIsParsing(true);
    setParseError(null);
    setParsed(null);
    setBatchEnhancedDescriptions({});
    setBatchEnhanceError(null);

    const stagePromise = animateStages();

    try {
      const resumeFileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      // Extract text from file (PDF or DOCX)
      let fileText = "";

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // Extract text from PDF using pdfjs
        const arrayBuffer = await file.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);

        // Use pdfjs to extract text
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
        let textContent = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContentFrag = await page.getTextContent();
          const pageText = textContentFrag.items
            .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
            .join(" ");
          textContent += pageText + "\n\n";
        }

        fileText = textContent.trim();
      } else {
        // DOCX: extract text
        const buffer = await file.arrayBuffer();
        fileText = extractTextFromDocx(buffer);
      }

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        throw new AiRequestError("missing-key");
      }
      const model = GROQ_MODEL;
      console.log("Provider: GROQ");
      console.log("Model:", model);

      const parseInput = `${RESUME_PARSER_SYSTEM_PROMPT}\n\nParse this resume:\n\n${fileText}`;
      const approximateInputTokens = beginAiRequest("resume-parse", parseInput);

      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: RESUME_PARSER_SYSTEM_PROMPT },
            { role: "user", content: `Parse this resume:\n\n${fileText}` },
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        await throwProviderError(response, "resume-parse");
      }

      const data = (await response.json()) as GroqResponse;
      logAiUsage("resume-parse", data.usage, approximateInputTokens);

      const rawText = data.choices?.[0]?.message?.content || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new AiRequestError("invalid-response");

      let groqJson: GroqResumeJson;
      try {
        groqJson = JSON.parse(jsonMatch[0]) as GroqResumeJson;
      } catch {
        throw new AiRequestError("invalid-response");
      }
      const result = normalizeGroqResume(groqJson);

      await stagePromise;

      // Mark all stages done
      setParseStages(PARSE_STAGES.map((label) => ({ label, done: true, active: false })));
      setParseProgress(100);

      // Auto-populate global state
      dispatch((prev) => {
        const parsedCertifications = result.achievements?.certifications || [];
        const existingCertifications = prev.achievements?.certifications || [];
        const mergedCertifications =
          parsedCertifications.length > 0
            ? [
                ...existingCertifications,
                ...parsedCertifications.filter((parsedCert) => {
                  const parsedKey = `${parsedCert.name}|${parsedCert.issuer}`.toLowerCase();
                  return !existingCertifications.some(
                    (existingCert) =>
                      `${existingCert.name}|${existingCert.issuer}`.toLowerCase() === parsedKey,
                  );
                }),
              ]
            : existingCertifications;

        return {
          ...prev,
          personal: {
            ...prev.personal,
            firstName: result.personal.firstName || prev.personal.firstName,
            lastName: result.personal.lastName || prev.personal.lastName,
            name: `${result.personal.firstName || prev.personal.firstName} ${result.personal.lastName || prev.personal.lastName}`.trim(),
            email: result.personal.email || prev.personal.email,
            phone: result.personal.phone || prev.personal.phone,
            location: result.personal.location || prev.personal.location,
            linkedin: result.personal.linkedin || prev.personal.linkedin,
            github: result.personal.github || prev.personal.github,
            bio: result.personal.bio || prev.personal.bio,
            role: result.personal.role || prev.personal.role,
            tagline: result.personal.tagline || prev.personal.tagline,
          },
          education:
            result.education?.length > 0
              ? result.education.map((e) => ({
                  school: e.institution,
                  institution: e.institution,
                  degree: e.degree,
                  fieldOfStudy: e.fieldOfStudy,
                  startYear: e.startYear,
                  endYear: e.endYear,
                  graduationYear: e.endYear,
                  cgpa: e.cgpa,
                  description: e.description,
                }))
              : prev.education,
          skills: result.skills?.length > 0 ? result.skills : prev.skills,
          categorizedSkills:
            result.skills?.length > 0
              ? (() => {
                  const cats: Record<string, string[]> = {
                    frontend: [],
                    backend: [],
                    database: [],
                    languages: [],
                    tools: [],
                  };
                  result.skills.forEach((s) => {
                    const cat = (s.category || "tools").toLowerCase();
                    if (cat in cats) cats[cat as keyof SkillsData].push(s.name);
                    else cats.tools.push(s.name);
                  });
                  return cats;
                })()
              : prev.categorizedSkills,
          projects:
            result.projects?.length > 0
              ? result.projects.map((p) => ({
                  name: p.name,
                  description: p.description,
                  technologies: p.technologies || [],
                  link: p.link || "",
                  githubLink: p.githubLink || "",
                  image: "",
                }))
              : prev.projects,
          experience:
            result.experience?.length > 0
              ? result.experience.map((e) => ({
                  company: e.company,
                  position: e.position,
                  role: e.position,
                  startDate: e.startDate,
                  endDate: e.endDate,
                  duration: `${e.startDate} - ${e.endDate}`,
                  location: e.location || "",
                  description: e.description,
                }))
              : prev.experience,
          achievements: {
            ...prev.achievements,
            resumeFile: file ? {
              name: file.name,
              size: formatSize(file.size),
              type: file.name.endsWith(".pdf") ? "PDF" : "DOCX",
              fileData: resumeFileData,
            } : prev.achievements?.resumeFile,
            certifications: mergedCertifications,
            awards:
              result.achievements?.awards?.length > 0
                ? result.achievements.awards
                : prev.achievements?.awards || [],
            hackathons:
              result.achievements?.hackathons?.length > 0
                ? result.achievements.hackathons
                : prev.achievements?.hackathons || [],
          },
          profileScore: result.profileScore ?? 0,
          recruiterScore: result.recruiterScore ?? 0,
          aiSuggestions: result.aiSuggestions || [],
          resumeParsed: true,
          step: "personal",
        };
      });

      setParsed(result);
      setThemeSuggestion(suggestTheme(result.personal?.role || ""));
    } catch (err: unknown) {
      await stagePromise.catch(() => {});
      setParseError(toUserFacingAiError(err, AI_PARSE_GENERIC_ERROR));
      setParseStages(PARSE_STAGES.map((label) => ({ label, done: false, active: false })));
      setParseProgress(0);
    } finally {
      setIsParsing(false);
    }
  };

  React.useEffect(() => {
    if (!file || !shouldAutoParse || isParsing || parsed) return;
    setShouldAutoParse(false);
    void handleParse();
  }, [file, shouldAutoParse, isParsing, parsed]);

  // ── Batch AI Enhancer ──
  const handleEnhanceAll = async () => {
    if (!parsed || parsed.projects.length === 0) return;
    
    setIsBatchEnhancing(true);
    setBatchEnhanceError(null);

    try {
      const projectsToEnhance = parsed.projects.map((p, i) => ({ idx: i, description: p.description }));
      const enhancePrompt = `Rewrite these project descriptions to sound more impressive and technical for a developer portfolio. Keep them 1-2 sentences each, use strong verbs/technologies. Return a JSON array of strings in the exact same order as the input.\n\nProjects:\n${JSON.stringify(projectsToEnhance)}`;

      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("VITE_GROQ_API_KEY missing");
      
      const response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that enhances resume content. Return ONLY a JSON array of strings.",
            },
            { role: "user", content: enhancePrompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON found.");
      const enhancedArray = JSON.parse(jsonMatch[0]);

      const newDescriptions: Record<number, string> = {};
      enhancedArray.forEach((desc: string, i: number) => {
        if (projectsToEnhance[i]) newDescriptions[projectsToEnhance[i].idx] = desc;
      });
      
      setBatchEnhancedDescriptions(newDescriptions);
    } catch (err: unknown) {
      setBatchEnhanceError(getErrorMessage(err, "Batch enhancement failed."));
    } finally {
      setIsBatchEnhancing(false);
    }
  };

  const handleApplyAllEnhanced = () => {
    dispatch((prev) => {
      const updatedProjects = [...prev.projects];
      Object.entries(batchEnhancedDescriptions).forEach(([idx, desc]) => {
        const i = parseInt(idx);
        if (updatedProjects[i]) updatedProjects[i] = { ...updatedProjects[i], description: desc };
      });
      return { ...prev, projects: updatedProjects };
    });
    if (parsed) {
      setParsed((p) => {
        if (!p) return p;
        const updated = [...p.projects];
        Object.entries(batchEnhancedDescriptions).forEach(([idx, desc]) => {
          const i = parseInt(idx);
          if (updated[i]) updated[i] = { ...updated[i], description: desc };
        });
        return { ...p, projects: updated };
      });
    }
    setBatchEnhancedDescriptions({});
  };

  // Navigation
  const goToPrevious = () => dispatch((prev) => ({ ...prev, step: "personal" }));
  const goToNext = () => dispatch((prev) => ({ ...prev, step: "personal" }));
  const applyTheme = (themeName: string) =>
    dispatch((prev) => ({ ...prev, theme: themeName as ThemeName, step: "theme" }));

  // Data summary chips
  const dataSummary = parsed
    ? [
        { icon: User, label: "Personal Info", count: 1 },
        { icon: Code, label: "Skills", count: parsed.skills?.length || 0 },
        { icon: Briefcase, label: "Projects", count: parsed.projects?.length || 0 },
        { icon: Briefcase, label: "Experience", count: parsed.experience?.length || 0 },
        { icon: GraduationCap, label: "Education", count: parsed.education?.length || 0 },
        {
          icon: Trophy,
          label: "Certifications",
          count: parsed.achievements?.certifications?.length || 0,
        },
      ]
    : [];

  const topProjects = (parsed?.projects || state.projects || []).slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Brain className="h-5 w-5 text-[var(--cyan-accent)]" />
        <h3 className="text-lg font-bold text-foreground">Resume AI Parser</h3>
        <span className="ml-auto text-[10px] font-mono bg-[var(--cyan-accent)]/10 text-[var(--cyan-accent)] border border-[var(--cyan-accent)]/20 px-2 py-0.5 rounded-full">
          AI-Powered Resume Analysis
        </span>
      </div>
      <p className="text-sm text-muted-foreground -mt-4">
        Upload your resume and let PortfolioForge build your portfolio automatically.
      </p>
      {state.resumeParsed && (
        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
          <span>Resume Uploaded ✓</span>
          <span>Resume Parsed ✓</span>
          <span>Review &amp; Edit Information</span>
        </div>
      )}

      {/* ── UPLOAD ZONE ── */}
      {!parsed && (
        <div className="space-y-4">
          {/* Drag & Drop */}
          <motion.div
            onClick={() => !isParsing && fileInputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            animate={{ borderColor: dragOver ? "var(--cyan-accent)" : "rgba(255,255,255,0.1)" }}
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-4 sm:p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer text-center overflow-hidden",
              dragOver ? "bg-[var(--cyan-accent)]/5" : "bg-white/[0.02] hover:bg-white/[0.04]",
              isParsing && "pointer-events-none opacity-60",
            )}
          >
            {/* glow on drag */}
            <AnimatePresence>
              {dragOver && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[var(--cyan-accent)]/5 pointer-events-none"
                />
              )}
            </AnimatePresence>

            {file ? (
              <>
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setFileError(null);
                    setShouldAutoParse(false);
                  }}
                  className="absolute top-3 right-3 h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Drag & drop your resume here, or{" "}
                    <span className="text-[var(--cyan-accent)]">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports PDF and DOCX (Max 10 MB)
                  </p>
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={onFileInputChange}
            />
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {fileError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3"
              >
                <XCircle className="h-4 w-4 shrink-0" />
                {fileError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Format badges */}
          <div className="flex items-center gap-2 justify-center">
            {["PDF Supported", "DOCX Supported"].map((label) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground bg-white/5 border border-white/10 px-3 py-1 rounded-full"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                {label}
              </span>
            ))}
          </div>

          {/* Parse button */}
          <Button
            type="button"
            size="lg"
            disabled={!file || isParsing}
            onClick={handleParse}
            className="w-full bg-gradient-brand text-white shadow-glow disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm"
          >
            {isParsing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Resume...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" /> Parse Resume with AI
              </>
            )}
          </Button>
          {/* ── PARSING STAGES ── */}
          <AnimatePresence>
            {isParsing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-strong rounded-2xl border border-white/10 p-5 space-y-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-[var(--cyan-accent)] animate-pulse" />
                  <span className="text-xs font-bold text-foreground">AI Processing Pipeline</span>
                </div>
                <div className="space-y-2.5">
                  {parseStages.map((stage, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="shrink-0 h-5 w-5 flex items-center justify-center">
                        {stage.done ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : stage.active ? (
                          <span className="h-2.5 w-2.5 rounded-full bg-[var(--cyan-accent)] animate-pulse" />
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs transition-colors",
                          stage.done
                            ? "text-emerald-400 line-through opacity-60"
                            : stage.active
                              ? "text-foreground font-semibold"
                              : "text-muted-foreground",
                        )}
                      >
                        {stage.label}
                      </span>
                    </motion.div>
                  ))}
                </div>
                {/* Progress bar */}
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mt-2">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--gradient-brand)" }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${parseProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="text-[10px] font-mono text-muted-foreground text-right">
                  {parseProgress}%
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Parse error */}
          <AnimatePresence>
            {parseError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-4"
              >
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">{parseError.title}</p>
                  <p className="opacity-80 whitespace-pre-line">{parseError.message}</p>
                  {parseError.title === AI_KEY_ERROR.title && (
                    <p className="mt-2 opacity-60">
                      Make sure your VITE_GROQ_API_KEY is set in your .env file.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── RESULTS DASHBOARD ── */}
      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Success banner */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-300">
                Resume parsed successfully! Your portfolio has been auto-populated.
              </span>
              <button
                type="button"
                onClick={() => {
                  setParsed(null);
                  setFile(null);
                  setParseStages(
                    PARSE_STAGES.map((l) => ({ label: l, done: false, active: false })),
                  );
                }}
                className="ml-auto text-[10px] text-emerald-400/70 hover:text-emerald-300 underline"
              >
                Re-upload
              </button>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Profile Score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="glass-strong rounded-2xl border border-white/10 p-5 flex flex-col items-center gap-3"
              >
                <ScoreRing
                  score={parsed.profileScore ?? 0}
                  label="Profile Score"
                  color="oklch(0.65 0.2 250)"
                  size={110}
                />
                <div className="text-center">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-1">
                    <motion.div
                      className="h-full rounded-full bg-gradient-brand"
                      initial={{ width: 0 }}
                      animate={{ width: `${parsed.profileScore}%` }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Recruiter Score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="glass-strong rounded-2xl border border-white/10 p-5 flex flex-col items-center gap-3"
              >
                <ScoreRing
                  score={parsed.recruiterScore ?? 0}
                  label="Recruiter Score"
                  color="var(--cyan-accent)"
                  size={110}
                />
                <div className="text-center">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-1">
                    <motion.div
                      className="h-full rounded-full bg-[var(--cyan-accent)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${parsed.recruiterScore}%` }}
                      transition={{ duration: 1.2, delay: 0.6 }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Strengths */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-strong rounded-2xl border border-emerald-500/20 p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-foreground">Strengths</span>
                </div>
                <ul className="space-y-1.5">
                  {(parsed.strengths || []).slice(0, 4).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      {s}
                    </li>
                  ))}
                  {(!parsed.strengths || parsed.strengths.length === 0) && (
                    <li className="text-xs text-muted-foreground/60 italic">
                      No strengths detected.
                    </li>
                  )}
                </ul>
              </motion.div>

              {/* Improvements */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-strong rounded-2xl border border-amber-500/20 p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-foreground">Improvements</span>
                </div>
                <ul className="space-y-1.5">
                  {(parsed.improvements || []).slice(0, 4).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      {s}
                    </li>
                  ))}
                  {(!parsed.improvements || parsed.improvements.length === 0) && (
                    <li className="text-xs text-muted-foreground/60 italic">
                      No improvements detected.
                    </li>
                  )}
                </ul>
              </motion.div>
            </div>

            {parsed.recruiterScore < 85 && (parsed.improvements || []).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="glass rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-foreground">
                    Score below 85: improve these resume areas
                  </span>
                </div>
                <ul className="space-y-2">
                  {(parsed.improvements || []).slice(0, 5).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* AI Suggestions */}
            {(parsed.aiSuggestions || []).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="glass rounded-2xl border border-[var(--cyan-accent)]/20 p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[var(--cyan-accent)]" />
                  <span className="text-sm font-bold text-foreground">AI Suggestions</span>
                </div>
                <ul className="space-y-2">
                  {parsed.aiSuggestions.map((sug, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-[var(--cyan-accent)]/70 shrink-0 mt-0.5" />
                      {sug}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* ── PARSED DATA PREVIEW ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass rounded-2xl border border-white/10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setDataCollapsed((c) => !c)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[var(--cyan-accent)]" />
                  <span className="text-sm font-bold text-foreground">Extracted Resume Data</span>
                </div>
                {dataCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <AnimatePresence>
                {!dataCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 flex flex-wrap gap-2">
                      {dataSummary.map(({ icon: Icon, label, count }) => (
                        <span
                          key={label}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {count > 1 ? `${count} ${label}` : label}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── AI CONTENT ENHANCER ── */}
            {topProjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="glass-strong rounded-2xl border border-white/10 p-5 space-y-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Wand2 className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-bold text-foreground">AI Content Enhancer</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Let AI improve your project descriptions and experience bullets.
                  </p>
                </div>

                <div className="space-y-4">
                  {topProjects.map((project, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{project.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          disabled={enhancingIdx === idx}
                          onClick={() => handleEnhance(idx, project.description)}
                          className="h-7 px-2.5 text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 shrink-0"
                        >
                          {enhancingIdx === idx ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Enhancing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 mr-1" /> ✨ Enhance with AI
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Original */}
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                        Original: {project.description || "No description"}
                      </p>

                      {/* Enhanced result */}
                      <AnimatePresence>
                        {enhancedDescriptions[idx] && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                          >
                            <p className="text-[11px] text-emerald-200 leading-relaxed">
                              {enhancedDescriptions[idx]}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleUseEnhanced(idx, enhancedDescriptions[idx])}
                              className="h-6 px-2.5 text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Use This
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Enhance error */}
                      {enhanceErrors[idx] && (
                        <p className="text-[10px] text-destructive">{enhanceErrors[idx]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── AUTO THEME SUGGESTION ── */}
            {themeSuggestion && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="glass rounded-2xl border border-purple-500/20 p-5 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-bold text-foreground">
                    ✨ Recommended Theme for Your Profile
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                    {themeSuggestion.label}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => applyTheme(themeSuggestion.theme)}
                    className="h-8 px-3 bg-gradient-brand text-white text-xs shadow-glow"
                  >
                    Apply Theme
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAVIGATION ── */}
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
          Review Personal Info
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
