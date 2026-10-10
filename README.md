# Scheme Genie

Description: Build a web app (Called KIA Schemes) that generates Schemes of Work in the format provided (see attached PDF sample). Instead of uploading an Excel template, the app should display a questionnaire form that the teacher fills in. The AI then uses this form information to generate a complete scheme of work, filling in missing sections automatically. The final output should be downloadable as a PDF in the same structure as the example. 🔹 Core Features

Landing Page o App introduction. o Button: “Create Scheme of Work”.

Questionnaire Form o The form should collect:  Subject (Mathematics, English, Chemistry, Biology, Physics, Geography, History & Political Education, Kiswahili, Entrepreneurship, Economics, Computer Studies, Christian Religious Education, Islamic Religious Education, Physical Education, Arabic, Local Language, Art & Design, Literature in English, General Paper)  Term (Term 1, Term 2, Term 3)  Class (S1, S2, S3, S4, S5, S6)  Number of Weeks in Term  Number of Single Periods per Week  Number of Double Periods per Week  Topics (per term)  Competencies (per topic) o Form should allow multiple topics to be added dynamically (e.g., “Add Topic” button).

AI Auto-Completion o Once teacher submits the form:  AI generates:  Learning Outcomes  Teaching & Learning Resources  Methodology  References o Suggested methodologies include: Do Review Learn & Apply (DRLA), Target Questioning, Group Discussions, Think-Pair-Share, Modeling. o Suggested references include: NCDC Books, SMS Series, Vision Mathematics, Teacher’s Guides, Active Mathematics, MK Mathematics.

Scheme of Work Generator o Combine user-provided + AI-generated content. o Output arranged in same table format as sample PDF: Week | Period | Topic | Competency | Learning Outcomes | Resources | Methodology | References | Remarks

Output & Export o Preview generated scheme on-screen. o Download as PDF (keeping same look/structure as official scheme). 🔹 Tech Stack • Frontend: React.js (with Tailwind CSS for styling). • Backend: Node.js (Express) or Django (Python). • AI Integration: OpenAI API (for generating Resources, Methodology, References). • PDF Generation: PDFKit (Node.js) or ReportLab (Python). 🔹 User Flow

Teacher visits app → Clicks “Create Scheme of Work”.

Teacher fills in questionnaire form with subject details, term, class, topics, competencies, and outcomes.

Teacher submits form → AI generates Resources, Methodology, and References.

App displays preview of full Scheme of Work.

Teacher downloads scheme as PDF.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kia-schemes.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e4f6c0ba-f260-46e3-bd39-54bcb4945f2d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
