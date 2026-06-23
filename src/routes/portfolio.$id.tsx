import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicPortfolio } from "@/components/portfolio/PublicPortfolio";
import { getPublishedPortfolioAsync, type PublishedPortfolio } from "@/lib/portfolioPublishing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portfolio/$id")({
  head: () => ({
    meta: [
      { title: "Public Portfolio - PortfolioForge" },
      {
        name: "description",
        content: "View a published PortfolioForge developer portfolio.",
      },
    ],
  }),
  component: PublicPortfolioRoute,
});

function PublicPortfolioRoute() {
  const { id } = Route.useParams();
  const [portfolio, setPortfolio] = React.useState<PublishedPortfolio | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    getPublishedPortfolioAsync(id)
      .then((storedPortfolio) => {
        if (isMounted) setPortfolio(storedPortfolio);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Loading portfolio...</p>
      </main>
    );
  }

  if (!portfolio) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Portfolio not found
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This portfolio link is invalid, expired, or was created in another browser.
          </p>
          <Button asChild className="mt-6 bg-gradient-brand text-white shadow-glow">
            <Link to="/builder">Build a Portfolio</Link>
          </Button>
        </div>
      </main>
    );
  }

  return <PublicPortfolio portfolio={portfolio} />;
}
