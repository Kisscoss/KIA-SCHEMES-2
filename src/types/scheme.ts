export interface Topic {
  id: string;
  name: string;
  competencies: string[];
}

export interface SchemeFormData {
  school: string;
  subject: string;
  term: string;
  class: string;
  year: string;
  numberOfWeeks: number;
  singlePeriodsPerWeek: number;
  doublePeriodsPerWeek: number;
  topics: Topic[];
}

export interface SchemeRow {
  week: number;
  period: string;
  topic: string;
  competency: string;
  learningOutcomes: string;
  resources: string;
  methodology: string;
  references: string;
  remarks: string;
}

export interface GeneratedScheme {
  formData: SchemeFormData;
  rows: SchemeRow[];
}

export const SUBJECTS = [
  "Mathematics", "English", "Chemistry", "Biology", "Physics",
  "Geography", "History & Political Education", "Kiswahili",
  "Entrepreneurship", "Economics", "Computer Studies",
  "Christian Religious Education", "Islamic Religious Education",
  "Physical Education", "Arabic", "Local Language",
  "Art & Design", "Literature in English", "General Paper"
] as const;

export const TERMS = ["Term 1", "Term 2", "Term 3"] as const;

export const CLASSES = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;
