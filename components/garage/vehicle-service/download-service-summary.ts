import type { VehicleServiceEntry } from "@/lib/vehicle-records";

import { formatServiceDate, formatServiceMoney } from "./service-model";

export async function downloadServiceSummary(
  vehicleName: string,
  registration: string,
  records: VehicleServiceEntry[],
) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 790;
  const draw = (text: string, size = 10, isBold = false) => {
    if (y < 55) {
      page = pdf.addPage([595, 842]);
      y = 790;
    }
    page.drawText(text.slice(0, 90), {
      x: 48,
      y,
      size,
      font: isBold ? bold : font,
      color: rgb(0.13, 0.21, 0.16),
    });
    y -= size + 8;
  };

  draw("DiaryDock Service History", 18, true);
  draw(`${vehicleName}${registration ? ` · ${registration}` : ""}`, 12, true);
  draw(`Generated ${new Intl.DateTimeFormat("en-GB").format(new Date())}`, 9);
  y -= 10;
  [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((entry) => {
      draw(`${formatServiceDate(entry.date)} · ${entry.title}`, 11, true);
      draw(
        [
          entry.provider,
          entry.mileage !== null
            ? `${entry.mileage.toLocaleString("en-GB")} miles`
            : "",
          entry.cost !== null ? formatServiceMoney(entry.cost) : "",
        ]
          .filter(Boolean)
          .join(" · "),
        9,
      );
      (entry.workItems ?? []).forEach((item) => draw(`• ${item}`, 9));
      if (entry.notes) draw(entry.notes, 9);
      y -= 8;
    });
  if (!records.length) draw("No service records have been added.", 10);

  const bytes = await pdf.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${vehicleName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-service-history.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
