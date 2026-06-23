import {
  ArrowDown,
  ArrowUpRight,
  Award,
  BriefcaseBusiness,
  Calendar,
  Code2,
  ExternalLink,
  FileText,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  MapPin,
  Phone,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import * as React from "react";
import type { PublishedPortfolio } from "@/lib/portfolioPublishing";
import { cn, normalizeExternalUrl } from "@/lib/utils";

type PublicPortfolioProps = {
  portfolio: PublishedPortfolio;
};

const themeDetails = {
  corporate: { label: "Executive", eyebrow: "Selected work & experience" },
  saas: { label: "Digital craft", eyebrow: "Ideas, systems & shipped products" },
  glass: { label: "Building in public", eyebrow: "Designing tomorrow's interfaces" },
  cyber: { label: "System online", eyebrow: "Engineering beyond the expected" },
  terminal: { label: "~/portfolio", eyebrow: "$ whoami --verbose" },
  creative: { label: "Independent maker", eyebrow: "Curious work, thoughtfully made" },
} as const;

const skillCategoryLabels: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Data",
  languages: "Languages",
  tools: "Tools & workflow",
};

const reveal = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

const githubMetricStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const githubMetricItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const LANGUAGE_WEIGHTS = [40, 25, 18, 10, 7];

const LANGUAGE_SEGMENT_COLORS = [
  "var(--pf-accent)",
  "var(--pf-accent-2)",
  "color-mix(in srgb, var(--pf-accent) 70%, var(--pf-text))",
  "color-mix(in srgb, var(--pf-accent-2) 70%, var(--pf-text))",
  "color-mix(in srgb, var(--pf-muted) 80%, var(--pf-accent))",
] as const;

type LanguageDistribution = {
  name: string;
  percent: number;
  color: string;
};

function formatGithubMetric(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
  }).format(value);
}

function getLanguageDistribution(languages: string[]): LanguageDistribution[] {
  const topLanguages = languages.slice(0, 5);
  if (topLanguages.length === 0) return [];

  const weights = LANGUAGE_WEIGHTS.slice(0, topLanguages.length);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  return topLanguages.map((name, index) => ({
    name,
    percent: Math.round((weights[index] / totalWeight) * 100),
    color: LANGUAGE_SEGMENT_COLORS[index % LANGUAGE_SEGMENT_COLORS.length],
  }));
}



function getName(portfolio: PublishedPortfolio): string {
  return (
    portfolio.personal.name ||
    `${portfolio.personal.firstName || ""} ${portfolio.personal.lastName || ""}`.trim() ||
    "Portfolio"
  );
}

function getGithubUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return `https://github.com/${value.replace(/^github\.com\//, "").replace(/^@/, "")}`;
}

function getCodingProfileUrl(platform: string, value: string): string {
  if (value.startsWith("http")) return value;
  const handle = value.replace(/^@/, "").replace(/^\//, "");
  const origins: Record<string, string> = {
    github: "https://github.com/",
    leetcode: "https://leetcode.com/u/",
    codeforces: "https://codeforces.com/profile/",
    hackerrank: "https://www.hackerrank.com/profile/",
  };
  return `${origins[platform] || "https://"}${handle}`;
}

function getSkillGroups(portfolio: PublishedPortfolio): Array<[string, string[]]> {
  const categorized = Object.entries(portfolio.categorizedSkills)
    .filter(([, skills]) => skills.length > 0)
    .map(
      ([category, skills]) =>
        [skillCategoryLabels[category] || category, skills] as [string, string[]],
    );

  if (categorized.length > 0) return categorized;

  const grouped = new Map<string, string[]>();
  portfolio.skills.forEach((skill) => {
    const category =
      skillCategoryLabels[skill.category || ""] || skill.category || "Core expertise";
    grouped.set(category, [...(grouped.get(category) || []), skill.name]);
  });
  return Array.from(grouped.entries());
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const [metadata, data] = dataUrl.split(",");
  if (!metadata || !data) return null;

  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

function CertificationLink({
  certification,
}: {
  certification: PublishedPortfolio["achievements"]["certifications"][number];
}) {
  const [fileUrl, setFileUrl] = React.useState("");

  React.useEffect(() => {
    if (!certification.fileData) return;
    const blob = dataUrlToBlob(certification.fileData);
    if (!blob) {
      setFileUrl(certification.fileData);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setFileUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [certification.fileData]);

  const href = fileUrl || certification.fileData || certification.link;
  const resolvedHref = certification.fileData ? href : normalizeExternalUrl(href);
  const label = certification.issuer
    ? `${certification.name} · ${certification.issuer}`
    : certification.name;

  return href ? (
    <a className="portfolio-recognition-link" href={resolvedHref} target="_blank" rel="noreferrer">
      <span>{label}</span>
      <ArrowUpRight className="h-4 w-4" />
    </a>
  ) : (
    <span>{label}</span>
  );
}

function SectionHeading({
  index,
  eyebrow,
  title,
  intro,
}: {
  index: string;
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <motion.div
      className="portfolio-section-heading"
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65 }}
    >
      <div className="portfolio-section-kicker">
        <span>{index}</span>
        {eyebrow}
      </div>
      <h2>{title}</h2>
      {intro && <p>{intro}</p>}
    </motion.div>
  );
}

export function PublicPortfolio({ portfolio }: PublicPortfolioProps) {
  const name = getName(portfolio);
  const [resumeUrl, setResumeUrl] = React.useState("");

  React.useEffect(() => {
    const resumeFile = portfolio.achievements?.resumeFile;
    if (!resumeFile || !resumeFile.fileData) return;
    const blob = dataUrlToBlob(resumeFile.fileData);
    if (!blob) {
      setResumeUrl(resumeFile.fileData);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setResumeUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [portfolio.achievements?.resumeFile]);

  const githubUrl = getGithubUrl(portfolio.personal.github || portfolio.githubAnalyticsUsername);
  const skillGroups = getSkillGroups(portfolio);
  const theme = themeDetails[portfolio.theme];
  const intro = portfolio.personal.tagline || portfolio.personal.bio;
  const hasRecognition =
    portfolio.achievements.certifications.length > 0 ||
    portfolio.achievements.awards.length > 0 ||
    portfolio.achievements.hackathons.length > 0;
  const codingProfiles = Object.entries(portfolio.achievements.codingProfiles).filter(
    ([, value]) => value,
  );
  const resumeRequest = portfolio.personal.email
    ? `mailto:${portfolio.personal.email}?subject=${encodeURIComponent(`Resume request for ${name}`)}`
    : "#contact";
  const githubLanguages = portfolio.githubAnalytics
    ? getLanguageDistribution(portfolio.githubAnalytics.topLanguages)
    : [];


  return (
    <main className="portfolio-site" data-portfolio-theme={portfolio.theme}>
      <div className="portfolio-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <nav className="portfolio-nav" aria-label="Portfolio navigation">
        <a className="portfolio-monogram" href="#top" aria-label={`${name} home`}>
          {name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </a>
        <div className="portfolio-nav-links">
          <a href="#work">Work</a>
          <a href="#experience">Experience</a>
          <a href="#about">About</a>
        </div>
        <a className="portfolio-nav-cta" href="#contact">
          Let's talk <ArrowUpRight />
        </a>
      </nav>

      <header id="top" className="portfolio-hero">
        <motion.div
          className="portfolio-hero-copy"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="portfolio-availability">
            <span /> Available for new opportunities
          </div>
          <p className="portfolio-eyebrow">{theme.eyebrow}</p>
          <h1>{name}</h1>
          <p className="portfolio-role">{portfolio.personal.role}</p>
          <p className="portfolio-intro">{intro}</p>
          <div className="portfolio-hero-actions">
            <a className="portfolio-button portfolio-button-primary" href="#work">
              Explore my work <ArrowDown />
            </a>
            {portfolio.personal.phone && (
              <a
                className="portfolio-button portfolio-button-secondary"
                href={`tel:${portfolio.personal.phone}`}
              >
                <Phone /> {portfolio.personal.phone}
              </a>
            )}
          </div>
          <div className="portfolio-social-row">
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noreferrer">
                <Github /> GitHub
              </a>
            )}
            {portfolio.personal.linkedin && (
              <a
                href={normalizeExternalUrl(portfolio.personal.linkedin)}
                target="_blank"
                rel="noreferrer"
              >
                <Linkedin /> LinkedIn
              </a>
            )}
            {resumeUrl && (
              <a href={resumeUrl} target="_blank" rel="noreferrer">
                <FileText /> Resume
              </a>
            )}
          </div>
        </motion.div>

        <motion.div
          className="portfolio-hero-portrait"
          initial={{ opacity: 0, scale: 0.92, rotate: 2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
        >
          <div className="portfolio-portrait-frame">
            {portfolio.personal.profilePhoto ? (
              <img src={portfolio.personal.profilePhoto} alt={name} />
            ) : (
              <div className="portfolio-portrait-placeholder">{name[0]}</div>
            )}
          </div>
          <div className="portfolio-portrait-role">
            {theme.label}
          </div>
          <div className="portfolio-orbit-badge">
            <Sparkles /> Open to meaningful work
          </div>
          {portfolio.personal.location && (
            <div className="portfolio-portrait-location">
              <MapPin /> {portfolio.personal.location}
            </div>
          )}
        </motion.div>
      </header>

      <section id="about" className="portfolio-section portfolio-about">
        <SectionHeading index="01" eyebrow="A little context" title="About" />
        <motion.div
          className="portfolio-about-copy"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.1 }}
        >
          <p>{portfolio.personal.bio || intro}</p>
          <div className="portfolio-about-notes">
            {portfolio.personal.website && (
              <a
                href={normalizeExternalUrl(portfolio.personal.website)}
                target="_blank"
                rel="noreferrer"
              >
                <Globe /> Personal website <ArrowUpRight />
              </a>
            )}
          </div>
        </motion.div>
      </section>

      {portfolio.projects.length > 0 && (
        <section id="work" className="portfolio-section portfolio-work">
          <SectionHeading
            index="02"
            eyebrow="Selected work"
            title="Projects with purpose."
            intro="A selection of products, experiments, and technical challenges I have brought to life."
          />
          <div className="portfolio-projects">
            {portfolio.projects.map((project, index) => (
              <motion.article
                key={`${project.name}-${index}`}
                className={cn("portfolio-project", index === 0 && "portfolio-project-featured")}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-70px" }}
                transition={{ duration: 0.65, delay: Math.min(index * 0.08, 0.24) }}
              >
                <div className="portfolio-project-media">
                  {project.image ? (
                    <img src={project.image} alt={`${project.name} preview`} />
                  ) : (
                    <div className="portfolio-project-placeholder">
                      <Code2 />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                  )}
                  <div className="portfolio-project-media-glow" />
                </div>
                <div className="portfolio-project-content">
                  <span className="portfolio-project-number">
                    Project {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  <ul className="portfolio-project-stack" aria-label="Technologies">
                    {project.technologies.map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>
                  <div className="portfolio-project-actions">
                    {project.link && (
                      <a href={normalizeExternalUrl(project.link)} target="_blank" rel="noreferrer">
                        Live demo <ExternalLink />
                      </a>
                    )}
                    {project.githubLink && (
                      <a
                        href={normalizeExternalUrl(project.githubLink)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Github /> Source code
                      </a>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {portfolio.experience.length > 0 && (
        <section id="experience" className="portfolio-section portfolio-experience">
          <SectionHeading index="03" eyebrow="Career path" title="Experience" />
          <div className="portfolio-timeline">
            {portfolio.experience.map((experience, index) => (
              <motion.article
                key={`${experience.company}-${experience.position}-${index}`}
                className="portfolio-timeline-item"
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: Math.min(index * 0.08, 0.24) }}
              >
                <div className="portfolio-timeline-date">
                  {experience.startDate || experience.duration?.split(" - ")[0]}
                  <span>—</span>
                  {experience.endDate || experience.duration?.split(" - ")[1] || "Present"}
                </div>
                <div className="portfolio-timeline-marker">
                  <span />
                </div>
                <div className="portfolio-timeline-content">
                  <h3>{experience.position || experience.role}</h3>
                  <div className="portfolio-company">
                    {experience.company}
                    {experience.location && ` · ${experience.location}`}
                  </div>
                  <p>{experience.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      <section className="portfolio-section portfolio-capabilities">
        <SectionHeading index="04" eyebrow="How I build" title="Capabilities" />
        <div className="portfolio-capability-grid">
          {skillGroups.map(([category, skills], index) => (
            <motion.div
              className="portfolio-skill-group"
              key={category}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: Math.min(index * 0.08, 0.24) }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{category}</h3>
              <p>{skills.join(" · ")}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {portfolio.githubAnalytics && (
        <section className="portfolio-section portfolio-footprint">
          <SectionHeading
            index="05"
            eyebrow="Open source"
            title="Developer Footprint"
            intro="A living snapshot of the code, communities, and technologies behind my work."
          />
          <motion.div
            className="portfolio-footprint-layout"
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
          >
            <div className="portfolio-github-header">
              <div className="portfolio-github-avatar">
                {portfolio.githubAnalytics.avatar ? (
                  <img
                    src={portfolio.githubAnalytics.avatar}
                    alt={portfolio.githubAnalytics.name}
                  />
                ) : (
                  <Github />
                )}
              </div>
              <div className="portfolio-github-identity">
                <div className="portfolio-github-name-row">
                  <div className="portfolio-github-name">
                    {portfolio.githubAnalytics.name || portfolio.githubAnalytics.username}
                  </div>
                  {githubUrl && (
                    <a
                      className="portfolio-github-icon-button"
                      href={githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="View GitHub Profile"
                    >
                      <Github />
                    </a>
                  )}
                </div>
                {githubUrl && (
                  <a
                    className="portfolio-github-profile-link"
                    href={githubUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    github.com/{portfolio.githubAnalytics.username}
                  </a>
                )}
              </div>
              <div className="portfolio-github-badge">Connected</div>
            </div>

            <motion.div
              className="portfolio-github-metrics"
              variants={githubMetricStagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {[
                { label: "Repos", value: portfolio.githubAnalytics.repos },
                { label: "Stars", value: portfolio.githubAnalytics.stars },
                { label: "Forks", value: portfolio.githubAnalytics.forks },
              ].map((metric) => (
                <motion.div
                  className="portfolio-github-metric"
                  key={metric.label}
                  variants={githubMetricItem}
                >
                  <div className="portfolio-github-metric-value">
                    {formatGithubMetric(metric.value)}
                  </div>
                  <div className="portfolio-github-metric-label">{metric.label}</div>
                </motion.div>
              ))}
            </motion.div>

            {githubLanguages.length > 0 && (
              <div className="portfolio-github-languages">
                <div className="portfolio-github-section-label">Top languages</div>
                <div className="portfolio-github-lang-bar">
                  {githubLanguages.map((language, index) => (
                    <motion.div
                      className="portfolio-github-lang-segment"
                      key={language.name}
                      style={{ background: language.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${language.percent}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: index * 0.08, ease: "easeOut" }}
                    />
                  ))}
                </div>
                <div className="portfolio-github-lang-legend">
                  {githubLanguages.map((language) => (
                    <span className="portfolio-github-lang-item" key={language.name}>
                      <span
                        className="portfolio-github-lang-dot"
                        style={{ background: language.color }}
                      />
                      {language.name}{" "}
                      <span className="portfolio-github-lang-percent">{language.percent}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="portfolio-github-insights">
              <div className="portfolio-github-section-label">Developer insights</div>
              <div className="portfolio-github-insights-grid">
                {portfolio.githubAnalytics.score !== undefined && (
                  <div className="portfolio-github-insight-card">
                    <div className="portfolio-github-insight-icon">
                      <Trophy />
                    </div>
                    <div className="portfolio-github-insight-content">
                      <div className="portfolio-github-insight-value">
                        {portfolio.githubAnalytics.score}/100
                      </div>
                      <div className="portfolio-github-insight-label">Portfolio GitHub Score</div>
                    </div>
                  </div>
                )}

                {portfolio.githubAnalytics.followers !== undefined && (
                  <div className="portfolio-github-insight-card">
                    <div className="portfolio-github-insight-icon">
                      <Users />
                    </div>
                    <div className="portfolio-github-insight-content">
                      <div className="portfolio-github-insight-value">
                        {formatGithubMetric(portfolio.githubAnalytics.followers)}
                      </div>
                      <div className="portfolio-github-insight-label">
                        Followers
                        {portfolio.githubAnalytics.following !== undefined && (
                          <span className="portfolio-github-insight-sub">
                            {" "}
                            · {formatGithubMetric(portfolio.githubAnalytics.following)} following
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {portfolio.githubAnalytics.topRepo && portfolio.githubAnalytics.topRepo !== "No public repositories" && (
                  <div className="portfolio-github-insight-card">
                    <div className="portfolio-github-insight-icon">
                      <Star />
                    </div>
                    <div className="portfolio-github-insight-content">
                      <div className="portfolio-github-insight-value" title={portfolio.githubAnalytics.topRepo}>
                        {portfolio.githubAnalytics.topRepo}
                      </div>
                      <div className="portfolio-github-insight-label">Most Starred Project</div>
                    </div>
                  </div>
                )}

                {portfolio.githubAnalytics.createdAt && (
                  <div className="portfolio-github-insight-card">
                    <div className="portfolio-github-insight-icon">
                      <Calendar />
                    </div>
                    <div className="portfolio-github-insight-content">
                      <div className="portfolio-github-insight-value">
                        {new Date(portfolio.githubAnalytics.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="portfolio-github-insight-label">Member Since</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {portfolio.githubAnalytics.topRepositories && portfolio.githubAnalytics.topRepositories.length > 0 && (
              <div className="portfolio-github-repositories">
                <div className="portfolio-github-section-label">Top repositories</div>
                <ul className="portfolio-github-repos-list">
                  {portfolio.githubAnalytics.topRepositories.slice(0, 5).map((repo) => (
                    <li key={repo} className="portfolio-github-repo-item">
                      <span className="portfolio-github-repo-bullet">•</span>
                      <span className="portfolio-github-repo-name">{repo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </section>
      )}

      {(portfolio.education.length > 0 || hasRecognition || codingProfiles.length > 0) && (
        <section className="portfolio-section portfolio-background">
          <SectionHeading index="06" eyebrow="Beyond the work" title="Background & recognition" />
          <div className="portfolio-background-grid">
            {portfolio.education.length > 0 && (
              <motion.div
                className="portfolio-background-column"
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <div className="portfolio-column-title">
                  <GraduationCap /> Education
                </div>
                {portfolio.education.map((education, index) => (
                  <div
                    className="portfolio-education-item"
                    key={`${education.institution}-${education.degree}-${index}`}
                  >
                    <h3>{education.degree}</h3>
                    <p>{education.institution || education.school}</p>
                    <span>
                      {[education.fieldOfStudy, education.endYear || education.graduationYear]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {education.description && <small>{education.description}</small>}
                  </div>
                ))}
              </motion.div>
            )}

            {hasRecognition && (
              <motion.div
                className="portfolio-background-column"
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <div className="portfolio-column-title">
                  <Award /> Recognition
                </div>
                <div className="portfolio-recognition-list">
                  {portfolio.achievements.certifications.map((certification) => (
                    <div
                      className="portfolio-recognition-item"
                      key={`${certification.name}-${certification.issuer}`}
                    >
                      <FileText />
                      <CertificationLink certification={certification} />
                    </div>
                  ))}
                  {portfolio.achievements.awards.map((award) => (
                    <div className="portfolio-recognition-item" key={award}>
                      <Trophy />
                      <span>{award}</span>
                    </div>
                  ))}
                  {portfolio.achievements.hackathons.map((hackathon) => (
                    <div className="portfolio-recognition-item" key={hackathon}>
                      <Code2 />
                      <span>{hackathon}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {codingProfiles.length > 0 && (
            <div className="portfolio-coding-profiles">
              <span>Coding profiles</span>
              {codingProfiles.map(([platform, value]) => (
                <a
                  key={platform}
                  href={getCodingProfileUrl(platform, value)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {platform} <ArrowUpRight />
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      <section id="contact" className="portfolio-contact">
        <motion.div
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="portfolio-contact-kicker">
            <span /> Available for new opportunities
          </span>
          <h2>
            Have a project in mind?
            <br />
            <em>Let’s make it real.</em>
          </h2>
          <p>
            I'm always interested in thoughtful products, ambitious teams, and conversations about
            what we could build together.
          </p>
          {portfolio.personal.email && (
            <a className="portfolio-contact-email" href={`mailto:${portfolio.personal.email}`}>
              {portfolio.personal.email}
              <ArrowUpRight />
            </a>
          )}
        </motion.div>
      </section>

      <footer className="portfolio-footer">
        <span>
          © {new Date().getFullYear()} {name}
        </span>
        <span>Designed with intent. Built with care.</span>
        <a href="#top">
          Back to top <ArrowUpRight />
        </a>
      </footer>
    </main>
  );
}
