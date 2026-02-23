import { BookOpen, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="hero-gradient relative flex flex-1 items-center justify-center px-6 py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-5 py-2.5 backdrop-blur-sm">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="font-body text-sm font-medium tracking-wide text-primary-foreground">
              Curriculum Planning Made Simple
            </span>
          </div>

          <h1 className="mb-6 font-display text-5xl font-bold leading-tight tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
            KIA Schemes
          </h1>

          <p className="mx-auto mb-10 max-w-xl font-body text-lg leading-relaxed text-primary-foreground/80 md:text-xl">
            Generate professional Schemes of Work in minutes. Powered by AI to auto-complete learning outcomes, resources, and methodologies.
          </p>

          <Button
            size="lg"
            onClick={() => navigate("/create")}
            className="gold-gradient border-0 px-8 py-6 font-body text-base font-semibold text-accent-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Create Scheme of Work
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-foreground">
            How It Works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Fill the Form",
                desc: "Enter your subject, term, class, topics, and competencies.",
              },
              {
                step: "02",
                title: "AI Generates",
                desc: "AI auto-completes learning outcomes, resources, and methodologies.",
              },
              {
                step: "03",
                title: "Download PDF",
                desc: "Preview and download your scheme in the official format.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="group rounded-xl border border-border bg-background p-8 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft"
              >
                <span className="mb-4 inline-block font-display text-4xl font-bold text-accent">
                  {item.step}
                </span>
                <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="font-body text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted px-6 py-6">
        <p className="text-center font-body text-sm text-muted-foreground">
          © {new Date().getFullYear()} KIA Schemes. Built for educators.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
