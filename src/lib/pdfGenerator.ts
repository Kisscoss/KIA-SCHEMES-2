import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { type GeneratedScheme } from "@/types/scheme";

export const generatePDF = (scheme: GeneratedScheme) => {
  const { formData, rows } = scheme;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();

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
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 28 },
      3: { cellWidth: 30 },
      4: { cellWidth: 40 },
      5: { cellWidth: 30 },
      6: { cellWidth: 30 },
      7: { cellWidth: 35 },
      8: { cellWidth: 18 },
    },
    margin: { left: 10, right: 10, bottom: 15 },
    didDrawPage: (data) => {
      // Page number on every page
      const pageNumber = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Page ${pageNumber}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    },
  });

  // Update page numbers with total count
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    // White-out the old text and rewrite with total
    doc.setFillColor(255, 255, 255);
    doc.rect(pageWidth / 2 - 30, doc.internal.pageSize.getHeight() - 12, 60, 8, "F");
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(
    `Scheme_${formData.subject}_${formData.class}_${formData.term}.pdf`
  );
};
