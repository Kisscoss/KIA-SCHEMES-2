import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type GeneratedScheme } from "@/types/scheme";

export const generatePDF = (scheme: GeneratedScheme) => {
  const { formData, rows } = scheme;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Validate AoI placement: ensure the LAST row of each topic group is marked
  // as Activity of Integration (AoI). Topics are detected by stripping any
  // existing " - Activity of Integration (AoI)" suffix from the topic field.
  const stripAoI = (t: string) =>
    t.replace(/\s*-\s*Activity of Integration \(AoI\)\s*$/i, "").trim();

  const lastIndexByTopic = new Map<string, number>();
  rows.forEach((r, i) => {
    const base = stripAoI(r.topic || "");
    if (base) lastIndexByTopic.set(base, i);
  });

  const aoiRowIndices = new Set<number>();
  lastIndexByTopic.forEach((idx, base) => {
    const row = rows[idx];
    const already = /Activity of Integration \(AoI\)/i.test(row.topic);
    if (!already) {
      row.topic = `${base} - Activity of Integration (AoI)`;
    }
    aoiRowIndices.add(idx);
  });

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SCHEME OF WORK", pageWidth / 2, 15, { align: "center" });

  // Meta info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const meta = [
    `School: ${formData.school || "_______________"}`,
    `Subject: ${formData.subject}`,
    `Class: ${formData.class}`,
    `Term: ${formData.term}`,
    `Year: ${formData.year}`,
    `Weeks: ${formData.numberOfWeeks}`,
  ];
  doc.text(meta.join("     |     "), pageWidth / 2, 22, { align: "center" });

  // Table
  const headers = [
    "Week",
    "Period",
    "Topic",
    "Competency",
    "Learning Outcomes",
    "Resources",
    "Methodology",
    "References",
    "Remarks",
  ];

  const body = rows.map((r) => [
    String(r.week),
    r.period,
    r.topic,
    r.competency,
    r.learningOutcomes,
    r.resources,
    r.methodology,
    r.references,
    r.remarks,
  ]);

  autoTable(doc, {
    head: [headers],
    body,
    startY: 28,
    showHead: "everyPage",
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineWidth: 0.2,
      lineColor: [100, 100, 100],
      font: "helvetica",
    },
    headStyles: {
      fillColor: [30, 80, 55],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 240],
    },
    columnStyles: {
      0: { cellWidth: 13, halign: "center" },
      1: { cellWidth: 16, halign: "center" },
      2: { cellWidth: 32 },
      3: { cellWidth: 35 },
      4: { cellWidth: 48 },
      5: { cellWidth: 35 },
      6: { cellWidth: 35 },
      7: { cellWidth: 40 },
      8: { cellWidth: 23 },
    },
    margin: { left: 10, right: 10, bottom: 15 },
    didParseCell: (data) => {
      if (data.section === "body" && aoiRowIndices.has(data.row.index)) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [255, 244, 214];
      }
    },
  });

  // Add page numbers after table is fully generated
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
  }


  doc.save(
    `Scheme_${formData.subject}_${formData.class}_${formData.term}.pdf`
  );
};
