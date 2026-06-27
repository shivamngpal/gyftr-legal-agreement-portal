import { stringify } from "csv-stringify";
import PDFDocument from "pdfkit";
import { AgreementFilters, AgreementService } from "./agreement.service";

export class ExportService {
  static async exportToCsv(filters: AgreementFilters): Promise<Buffer> {
    const agreements = await AgreementService.getAllAgreements(filters);

    return new Promise((resolve, reject) => {
      const columns = [
        "Client Name",
        "Type",
        "Status",
        "Start Date",
        "Legal SPOC",
        "Finance SPOC",
        "Business SPOC",
        "Compliance SPOC",
        "Legal Status",
        "Finance Status",
        "Business Status",
        "Compliance Status",
      ];

      const data = agreements.map((a) => {
        const drafts = a.drafts || [];
        const latestDraft = drafts[0];
        const reviews = latestDraft?.reviewStatuses || [];

        const getStatus = (team: string) => reviews.find((r) => r.team === team)?.status || "N/A";

        return [
          a.clientName,
          a.type,
          a.status,
          new Date(a.startDate).toLocaleDateString(),
          a.legalSpoc?.name || "Not Assigned",
          a.financeSpoc?.name || "Not Assigned",
          a.businessSpoc?.name || "Not Assigned",
          a.complianceSpoc?.name || "Not Assigned",
          getStatus("LEGAL"),
          getStatus("FINANCE"),
          getStatus("BUSINESS"),
          getStatus("COMPLIANCE"),
        ];
      });

      stringify([columns, ...data], (err, output) => {
        if (err) return reject(err);
        resolve(Buffer.from(output));
      });
    });
  }

  static async exportToPdf(filters: AgreementFilters): Promise<Buffer> {
    const agreements = await AgreementService.getAllAgreements(filters);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
      const buffers: Buffer[] = [];

      doc.on("data", (b) => buffers.push(b));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.fontSize(18).text("Agreements Export", { align: "center" });
      doc.moveDown();

      // Simple table rendering
      const tableTop = 100;
      let y = tableTop;

      const drawRow = (yPos: number, cols: string[]) => {
        doc.fontSize(8);
        doc.text(cols[0], 30, yPos, { width: 100 });
        doc.text(cols[1], 130, yPos, { width: 70 });
        doc.text(cols[2], 200, yPos, { width: 80 });
        doc.text(cols[3], 280, yPos, { width: 60 });
        doc.text(cols[4], 340, yPos, { width: 90 });
        doc.text(cols[5], 430, yPos, { width: 90 });
        doc.text(cols[6], 520, yPos, { width: 90 });
        doc.text(cols[7], 610, yPos, { width: 90 });
      };

      // Header
      doc.font("Helvetica-Bold");
      drawRow(y, [
        "Client",
        "Type",
        "Status",
        "Date",
        "Legal Status",
        "Finance Status",
        "Business Status",
        "Compliance Status",
      ]);
      doc.font("Helvetica");
      y += 15;
      doc.moveTo(30, y).lineTo(810, y).stroke();
      y += 10;

      // Rows
      agreements.forEach((a) => {
        if (y > 550) {
          doc.addPage();
          y = 50;
        }
        
        const latestDraft = a.drafts?.[0];
        const reviews = latestDraft?.reviewStatuses || [];
        const getStatus = (team: string) => reviews.find((r) => r.team === team)?.status || "N/A";

        drawRow(y, [
          a.clientName,
          a.type,
          a.status,
          new Date(a.startDate).toLocaleDateString(),
          getStatus("LEGAL"),
          getStatus("FINANCE"),
          getStatus("BUSINESS"),
          getStatus("COMPLIANCE"),
        ]);
        y += 20;
      });

      doc.end();
    });
  }
}
