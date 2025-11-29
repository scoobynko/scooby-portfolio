import Link from "next/link";
import Image from "next/image";
import { AsciiPortrait } from "@/components/ascii-portrait";
import { ThemeToggle } from "@/components/theme-toggle";
import { TerminalEasterEgg } from "@/components/terminal-easter-egg";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with theme toggle */}
      <header className="fixed top-0 right-0 p-4 md:p-6 z-50">
        <ThemeToggle />
      </header>

      <main className="flex min-h-screen flex-col items-center justify-center px-6 md:px-12 lg:px-16 py-12 lg:py-0">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">

            {/* Text Content */}
            <div className="space-y-6 font-mono flex-1 order-2 lg:order-1">
              {/* Logo */}
              <Image
                src="/logo.svg"
                alt="JS Logo"
                width={20}
                height={33}
                className="dark:invert"
                priority
              />

              {/* Title with terminal Easter egg */}
              <TerminalEasterEgg />

              {/* Terminal content */}
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">
                    <span className="text-foreground/70">&gt;</span> whoami
                  </p>
                  <p className="text-foreground leading-relaxed">
                    Product Designer at{" "}
                    <Link
                      href="https://duvo.ai"
                      target="_blank"
                      className="text-foreground hover:underline"
                    >
                      duvo.ai
                    </Link>
                    . I bridge design and development, ship code when I can, and build AI workflows that make designers more valuable, not obsolete.
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">
                    <span className="text-foreground/70">&gt;</span> cat blog.md
                  </p>
                  <p className="text-foreground leading-relaxed">
                    I write about design, AI, and whatever's on my mind at{" "}
                    <Link
                      href="https://scoobynko.substack.com/"
                      target="_blank"
                      className="text-foreground underline decoration-foreground/40 underline-offset-2 hover:decoration-foreground transition-colors"
                    >
                      Hurry Up Slow
                    </Link>
                    {" "}— no hype, no panic, just practical thoughts.
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">
                    <span className="text-foreground/70">&gt;</span> ls connect/
                  </p>
                  <div className="flex gap-4">
                    <Link
                      href="https://www.linkedin.com/in/jakubsalmik/"
                      target="_blank"
                      className="text-foreground hover:underline"
                    >
                      linkedin
                    </Link>
                    <Link
                      href="https://github.com/scoobynko"
                      target="_blank"
                      className="text-foreground hover:underline"
                    >
                      github
                    </Link>
                    <Link
                      href="mailto:som@jakubsalmik.com"
                      className="text-foreground hover:underline"
                    >
                      email
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ASCII Portrait */}
            <div className="flex justify-center lg:justify-end lg:translate-x-24 shrink-0 order-1 lg:order-2">
              <div className="w-[280px] h-[400px] sm:w-[336px] sm:h-[480px] md:w-[420px] md:h-[600px] lg:w-auto lg:h-auto">
                <div className="origin-top-left scale-[0.35] sm:scale-[0.42] md:scale-[0.52] lg:scale-100">
                  <AsciiPortrait />
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
