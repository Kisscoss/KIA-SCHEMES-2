import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type GeneratedScheme } from "@/types/scheme";
import { generatePDF } from "@/lib/pdfGenerator";
import { normalizeScheme } from "@/lib/localScheme";

const SchemePreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scheme = useMemo<GeneratedScheme | undefined>(() => {
    const fromState = (location.state as { scheme?: GeneratedScheme } | null)?.scheme;
    if (fromState) {
      const normalized = normalizeScheme(fromState);
      try {
        sessionStorage.setItem("generatedScheme", JSON.stringify(normalized));
      } catch (storageError) {
        console.warn("Could not persist scheme to sessionStorage", storageError);
      }
      return normalized;
    }
    try {
      const stored = sessionStorage.getItem("generatedScheme");
      if (!stored) return undefined;
      const parsed = JSON.parse(stored) as GeneratedScheme;
      return normalizeScheme(parsed);
    } catch (parseError) {
      console.warn("Could not read scheme from sessionStorage", parseError);
      return undefined;
    }
  }, [location.state]);

  if (!scheme) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
            No Scheme Data
          </h2>
          <p className="mb-6 text-muted-foreground">
            Please create a scheme first.
          </p>
          <Button onClick={() => navigate("/create")}>Go to Form</Button>
        </div>
      </div>
    );
  }

  const handleDownload = () => {
    generatePDF(scheme);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="hero-gradient px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/create")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold text-primary-foreground">
                Scheme Preview
              </h1>
              <p className="font-body text-sm text-primary-foreground/70">
                {scheme.formData.subject} — {scheme.formData.class} — {scheme.formData.term}
              </p>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            className="gold-gradient border-0 font-semibold text-accent-foreground hover:scale-105"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Meta Info */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-5 shadow-card sm:grid-cols-4">
          {[
            ["School", scheme.formData.school || "—"],
            ["Subject", scheme.formData.subject],
            ["Class", scheme.formData.class],
            ["Term", `${scheme.formData.term}, ${scheme.formData.year}`],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 font-body font-semibold text-foreground">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border shadow-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                {[
                  "Week",
                  "Period",
                  "Topic",
                  "Competency",
                  "Learning Outcomes",
                  "Resources",
                  "Methodology",
                  "References",
                  "Remarks",
                ].map((h) => (
                  <th
                    key={h}
                    className="border border-primary-foreground/20 px-3 py-2.5 text-left font-body text-xs font-semibold uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheme.rows.map((row, i) => (
                <tr
                  key={i}
                  className={
                    i % 2 === 0 ? "bg-card" : "bg-muted/50"
                  }
                >
                  <td className="border border-border px-3 py-2 text-center font-semibold">
                    {row.week}
                  </td>
                  <td className="border border-border px-3 py-2 text-center">
                    {row.period}
                  </td>
                  <td className="border border-border px-3 py-2 font-medium">
                    {row.topic}
                  </td>
                  <td className="border border-border px-3 py-2">
                    {row.competency}
                  </td>
                  <td className="border border-border px-3 py-2">
                    {row.learningOutcomes}
                  </td>
                  <td className="border border-border px-3 py-2">
                    {row.resources}
                  </td>
                  <td className="border border-border px-3 py-2">
                    {row.methodology}
                  </td>
                  <td className="border border-border px-3 py-2">
                    {row.references}
                  </td>
                  <td className="border border-border px-3 py-2">
                    {row.remarks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default SchemePreview;
