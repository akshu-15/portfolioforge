import { createFileRoute } from "@tanstack/react-router";
import Landing from "@/components/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PortfolioForge — Build Recruiter-Ready Developer Portfolios in Minutes" },
      { name: "description", content: "Upload your resume and let AI generate a stunning, recruiter-ready developer portfolio website in minutes. 50+ themes, GitHub integration, recruiter readiness score." },
      { property: "og:title", content: "PortfolioForge — Recruiter-Ready Developer Portfolios" },
      { property: "og:description", content: "Turn your resume into a stunning developer portfolio in minutes. AI-powered, recruiter-tested, free to start." },
    ],
  }),
  component: Landing,
});
