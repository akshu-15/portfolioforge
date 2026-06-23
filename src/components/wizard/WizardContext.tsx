import * as React from "react";

export type WizardStep =
  | "personal"
  | "education"
  | "skills"
  | "experience"
  | "projects"
  | "achievements"
  | "resume"
  | "theme";

export type PersonalInfo = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  website: string;
  github: string;
  linkedin: string;
  twitter: string;
  profilePhoto: string; // base64 representation
  role: string;
  tagline: string;
};

export type Education = {
  school: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  graduationYear: string;
  cgpa: string;
  description: string;
};

export type Skill = {
  name: string;
  proficiency: string; // Beginner, Intermediate, Advanced, Expert
  category?: string; // frontend, backend, database, languages, tools
};

export type SkillsData = {
  frontend: string[];
  backend: string[];
  database: string[];
  languages: string[];
  tools: string[];
};

export type Project = {
  name: string;
  description: string;
  technologies: string[];
  link: string;
  githubLink: string;
  image?: string; // base64 representation
};

export type Experience = {
  company: string;
  position: string;
  role: string;
  startDate: string;
  endDate: string;
  duration: string;
  location: string;
  description: string;
};

export type Certification = {
  name: string;
  issuer: string;
  link: string;
  fileName?: string;
  fileData?: string;
};

export type AchievementsInfo = {
  certifications: Certification[];
  awards: string[];
  hackathons: string[];
  codingProfiles: {
    github: string;
    leetcode: string;
    codeforces: string;
    hackerrank: string;
  };
  resumeFile?: {
    name: string;
    size: string;
    type: string;
    fileData?: string;
  };
};

export type ThemeName = "corporate" | "saas" | "glass" | "cyber" | "terminal" | "creative";

export type GitHubAnalytics = {
  score: number;
  followers: number;
  following: number;
  repos: number;
  stars: number;
  forks: number;
  topLanguages: string[];
  topRepo: string;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  createdAt: string;
  totalRepositories: number;
  topRepositories: string[];
};

export type GitHubAnalyticsStatus = "idle" | "loading" | "success" | "error";

export type WizardState = {
  step: WizardStep;
  personal: PersonalInfo;
  education: Education[];
  skills: Skill[];
  categorizedSkills: SkillsData;
  projects: Project[];
  experience: Experience[];
  achievements: AchievementsInfo;
  theme: ThemeName;
  resumeParsed: boolean;
  profileScore: number;
  recruiterScore: number;
  aiSuggestions: string[];
  githubAnalytics: GitHubAnalytics | null;
  githubAnalyticsStatus: GitHubAnalyticsStatus;
  githubAnalyticsError: string;
  githubAnalyticsUsername: string;
};

const initialState: WizardState = {
  step: "resume",
  personal: {
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    website: "",
    github: "",
    linkedin: "",
    twitter: "",
    profilePhoto: "",
    role: "",
    tagline: "",
  },
  education: [],
  skills: [],
  categorizedSkills: {
    frontend: [],
    backend: [],
    database: [],
    languages: [],
    tools: [],
  },
  projects: [],
  experience: [],
  achievements: {
    certifications: [],
    awards: [],
    hackathons: [],
    codingProfiles: {
      github: "",
      leetcode: "",
      codeforces: "",
      hackerrank: "",
    },
  },
  theme: "saas",
  resumeParsed: false,
  profileScore: 0,
  recruiterScore: 0,
  aiSuggestions: [],
  githubAnalytics: null,
  githubAnalyticsStatus: "idle",
  githubAnalyticsError: "",
  githubAnalyticsUsername: "",
};

export type WizardContextType = {
  state: WizardState;
  dispatch: React.Dispatch<React.SetStateAction<WizardState>>;
};

export const WizardContext = React.createContext<WizardContextType | null>(null);

export const WizardProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = React.useState<WizardState>(initialState);

  return <WizardContext.Provider value={{ state, dispatch }}>{children}</WizardContext.Provider>;
};

export const useWizard = () => {
  const context = React.useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
};
