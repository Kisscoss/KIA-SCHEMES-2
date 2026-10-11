import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { generateScheme, saveScheme } from "@/lib/api";
import { buildLocalScheme, isValidScheme, normalizeScheme } from "@/lib/localScheme";
import {
  type SchemeFormData,
  type Topic,
  SUBJECTS,
  TERMS,
  CLASSES,
} from "@/types/scheme";

const createEmptyTopic = (): Topic => ({
  id: crypto.randomUUID(),
  name: "",
  numberOfPeriods: 4,
  competencies: [""],
});

const SchemeForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SchemeFormData>({
    school: "",
    subject: "",
    term: "",
    class: "",
    year: new Date().getFullYear().toString(),
    numberOfWeeks: 12,
    singlePeriodsPerWeek: 3,
    doublePeriodsPerWeek: 1,
    topics: [createEmptyTopic()],
  });

  const updateField = <K extends keyof SchemeFormData>(
    key: K,
    value: SchemeFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const addTopic = () => {
    updateField("topics", [...formData.topics, createEmptyTopic()]);
  };

  const removeTopic = (id: string) => {
    if (formData.topics.length === 1) return;
    updateField("topics", formData.topics.filter((t) => t.id !== id));
  };

  const updateTopicName = (id: string, name: string) => {
    updateField(
      "topics",
      formData.topics.map((t) => (t.id === id ? { ...t, name } : t))
    );
  };

  const addCompetency = (topicId: string) => {
    updateField(
      "topics",
      formData.topics.map((t) =>
        t.id === topicId ? { ...t, competencies: [...t.competencies, ""] } : t
      )
    );
  };

  const updateCompetency = (
    topicId: string,
    index: number,
    value: string
  ) => {
    updateField(
      "topics",
      formData.topics.map((t) =>
        t.id === topicId
          ? {
              ...t,
              competencies: t.competencies.map((c, i) =>
                i === index ? value : c
              ),
            }
          : t
      )
    );
  };

  const removeCompetency = (topicId: string, index: number) => {
    updateField(
      "topics",
      formData.topics.map((t) =>
        t.id === topicId
          ? {
              ...t,
              competencies: t.competencies.filter((_, i) => i !== index),
            }
          : t
      )
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.subject || !formData.term || !formData.class) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const hasEmptyTopics = formData.topics.some((t) => !t.name.trim());
    if (hasEmptyTopics) {
      toast.error("Please enter a name for each topic.");
      return;
    }

    setLoading(true);
    const persistAndGo = (scheme: unknown, notice?: string) => {
      if (!isValidScheme(scheme)) {
        toast.error("AI returned invalid data. Please try again.");
        return;
      }
      const normalized = normalizeScheme(scheme);
      try {
        sessionStorage.setItem("generatedScheme", JSON.stringify(normalized));
      } catch (storageError) {
        console.warn("Could not persist scheme to sessionStorage", storageError);
      }
      if (notice) toast.message(notice);
      navigate("/preview", { state: { scheme: normalized } });
      // Save to Neon in the background (preview works even if this fails).
      saveScheme(normalized).catch((saveError) => {
        console.warn("Could not save scheme to Neon", saveError);
      });
    };

    try {
      const data = await generateScheme(formData);
      persistAndGo(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate scheme.";
      if (message.includes("Rate limit") || message.includes("Rate limited")) {
        toast.error("AI is temporarily busy. Please wait 30 seconds and try again.");
      } else if (message.includes("credits")) {
        toast.error("AI credits exhausted. Please add credits in server settings.");
      } else if (message.includes("Failed to fetch") || message.includes("fetch")) {
        persistAndGo(
          buildLocalScheme(formData),
          "AI service unreachable — generated an offline preview."
        );
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="hero-gradient px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-primary-foreground">
            Create Scheme of Work
          </h1>
          <p className="mt-2 font-body text-primary-foreground/70">
            Fill in the details below and AI will generate the rest.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="space-y-8">
          {/* School & Basic Info */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-5 font-display text-xl font-semibold text-foreground">
              Basic Information
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="school">School Name</Label>
                <Input
                  id="school"
                  placeholder="e.g. Kampala International Academy"
                  value={formData.school}
                  onChange={(e) => updateField("school", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Subject *</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(v) => updateField("subject", v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Class *</Label>
                <Select
                  value={formData.class}
                  onValueChange={(v) => updateField("class", v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term *</Label>
                <Select
                  value={formData.term}
                  onValueChange={(v) => updateField("term", v)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  value={formData.year}
                  onChange={(e) => updateField("year", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          {/* Period Info */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-5 font-display text-xl font-semibold text-foreground">
              Period Details
            </h2>
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <Label htmlFor="weeks">Weeks in Term</Label>
                <Input
                  id="weeks"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.numberOfWeeks}
                  onChange={(e) =>
                    updateField("numberOfWeeks", parseInt(e.target.value) || 1)
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="single">Single Periods/Week</Label>
                <Input
                  id="single"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.singlePeriodsPerWeek}
                  onChange={(e) =>
                    updateField(
                      "singlePeriodsPerWeek",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="double">Double Periods/Week</Label>
                <Input
                  id="double"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.doublePeriodsPerWeek}
                  onChange={(e) =>
                    updateField(
                      "doublePeriodsPerWeek",
                      parseInt(e.target.value) || 0
                    )
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          {/* Topics */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Topics & Competencies
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={addTopic}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Topic
              </Button>
            </div>

            <div className="space-y-6">
              {formData.topics.map((topic, tIdx) => (
                <div
                  key={topic.id}
                  className="rounded-lg border border-border bg-background p-5"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-body text-xs font-bold text-primary-foreground">
                      {tIdx + 1}
                    </span>
                    <Input
                      placeholder="Topic name"
                      value={topic.name}
                      onChange={(e) =>
                        updateTopicName(topic.id, e.target.value)
                      }
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">Periods:</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={topic.numberOfPeriods}
                        onChange={(e) =>
                          updateField(
                            "topics",
                            formData.topics.map((t) =>
                              t.id === topic.id
                                ? { ...t, numberOfPeriods: parseInt(e.target.value) || 1 }
                                : t
                            )
                          )
                        }
                        className="w-20"
                      />
                    </div>
                    {formData.topics.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTopic(topic.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="ml-10 space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Competencies
                    </Label>
                    {topic.competencies.map((comp, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-2">
                        <Input
                          placeholder={`Competency ${cIdx + 1}`}
                          value={comp}
                          onChange={(e) =>
                            updateCompetency(
                              topic.id,
                              cIdx,
                              e.target.value
                            )
                          }
                          className="flex-1"
                        />
                        {topic.competencies.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              removeCompetency(topic.id, cIdx)
                            }
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addCompetency(topic.id)}
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add Competency
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Submit */}
          <div className="flex justify-end gap-3 pb-10">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="gold-gradient border-0 px-8 font-semibold text-accent-foreground hover:scale-105"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Scheme"
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SchemeForm;
