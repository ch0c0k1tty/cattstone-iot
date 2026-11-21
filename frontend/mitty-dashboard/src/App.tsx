
import { useEffect, useState } from "react";
import {
  Cpu,
  Workflow,
  Moon,
  Sun,
  Wifi,
  LayoutDashboard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { Parts } from "@/pages/Parts";

type Page = "dashboard" | "automations" | "parts";

const pages = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "automations", label: "Automations", icon: Workflow },
  { id: "parts", label: "Parts", icon: Cpu },
] as const;

function getPage(): Page {
  const hash = window.location.hash.slice(1);

  return pages.some((page) => page.id === hash)
    ? (hash as Page)
    : "dashboard";
}

function ThemeToggle() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("mitty-theme") === "dark"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("mitty-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      aria-pressed={dark}
      onClick={() => setDark(!dark)}
    >
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>(getPage);

  useEffect(() => {
    const update = () => setPage(getPage());

    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex min-h-16 flex-wrap items-center gap-4 px-4 md:px-6">

          <span className="text-2xl font-bold tracking-tight text-primary">
            mitty
          </span>

          <Separator
            orientation="vertical"
            className="hidden h-6 sm:block"
          />

          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {pages.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={page === id ? "secondary" : "ghost"}
                onClick={() => {
                  window.location.hash = id;
                  setPage(id);
                }}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="gap-2">
              <Wifi className="size-3" />
              <span className="hidden sm:inline">Demo Mode</span>
            </Badge>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl p-4 md:p-6">
        {page === "dashboard" && (
          <Placeholder
            title="Dashboard"
            description="Monitor your space, builds, and sensor readings."
          />
        )}

        {page === "automations" && (
          <Placeholder
            title="Automations"
            description="Create and manage automated actions for your builds."
          />
        )}

        {page === "parts" && <Parts />}
      </main>
    </div>
  );
}

function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground">{description}</p>

      <div className="mt-6 flex min-h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-sm text-muted-foreground">
          Coming soon
        </p>
      </div>
    </div>
  );
}
