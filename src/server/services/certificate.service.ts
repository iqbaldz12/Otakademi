import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { readUpload } from "@/server/services/upload.service";

/**
 * Certificate generator.
 *
 * Takes a blank template (high-res PNG/JPG, or a PDF whose first page is the
 * design) and overlays dynamic text — participant name, optional event date,
 * optional certificate number — producing a final PDF as a Buffer.
 *
 * All overlay positions are stored as fractions (0..1) of the page size, so the
 * same layout works whatever the template's resolution. x is the horizontal
 * centre of each line (text is centre-aligned).
 */

export type CertLayout = {
  nameX: number;
  nameY: number;
  nameSize: number;
  nameColor: string;
  dateShow: boolean;
  dateX: number;
  dateY: number;
  dateSize: number;
  numberShow: boolean;
  numberX: number;
  numberY: number;
  numberSize: number;
};

export type CertData = {
  name: string;
  dateText?: string;
  certificateNumber?: string;
};

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0.1, 0.17, 0.3); // navy fallback
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Draws one centre-aligned line at a fractional (x, y) position. */
function drawCentered(
  page: PDFPage,
  font: PDFFont,
  text: string,
  fx: number,
  fy: number,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  const { width, height } = page.getSize();
  const fontSize = Math.max(6, size * height);
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  page.drawText(text, {
    x: width * fx - textWidth / 2,
    // PDF origin is bottom-left; our fractions are top-down, so invert y.
    y: height * (1 - fy) - fontSize / 2,
    size: fontSize,
    font,
    color,
    rotate: degrees(0),
  });
}

/**
 * Builds the final certificate PDF.
 *
 * Returns null when the template is missing or unreadable, so callers can fail
 * gracefully rather than throwing.
 */
export async function generateCertificatePdf(
  templatePath: string,
  layout: CertLayout,
  data: CertData,
): Promise<Buffer | null> {
  const bytes = await readUpload(templatePath);
  if (!bytes) return null;

  const isPdf = templatePath.toLowerCase().endsWith(".pdf");
  const doc = await PDFDocument.create();
  let page: PDFPage;

  if (isPdf) {
    // Embed the first page of the source PDF as the background.
    const src = await PDFDocument.load(bytes);
    const [embedded] = await doc.embedPdf(src, [0]);
    page = doc.addPage([embedded.width, embedded.height]);
    page.drawPage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  } else {
    const img = templatePath.toLowerCase().endsWith(".png")
      ? await doc.embedPng(bytes)
      : await doc.embedJpg(bytes);
    page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Name (always).
  drawCentered(
    page,
    fontBold,
    data.name,
    layout.nameX,
    layout.nameY,
    layout.nameSize,
    hexToRgb(layout.nameColor),
  );

  // Optional date.
  if (layout.dateShow && data.dateText) {
    drawCentered(
      page,
      font,
      data.dateText,
      layout.dateX,
      layout.dateY,
      layout.dateSize,
      hexToRgb(layout.nameColor),
    );
  }

  // Optional certificate number.
  if (layout.numberShow && data.certificateNumber) {
    drawCentered(
      page,
      font,
      `No. ${data.certificateNumber}`,
      layout.numberX,
      layout.numberY,
      layout.numberSize,
      hexToRgb(layout.nameColor),
    );
  }

  const out = await doc.save();
  return Buffer.from(out);
}
