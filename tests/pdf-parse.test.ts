import { afterAll, describe, expect, it } from "vitest";

import { parsePdf } from "@/lib/pdf/parse";

const originalDomMatrix = globalThis.DOMMatrix;
const originalPath2D = globalThis.Path2D;

function validTextPdf(): ArrayBuffer {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Length 48 >>\nstream\nBT /F1 12 Tf 72 720 Td (Syllabus test page) Tj ET\nendstream\nendobj\n",
  ];
  const offsets: number[] = [];
  let pdf = "%PDF-1.4\n";

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Uint8Array.from(Buffer.from(pdf, "ascii")).buffer;
}

afterAll(() => {
  Object.assign(globalThis, {
    DOMMatrix: originalDomMatrix,
    Path2D: originalPath2D,
  });
});

describe("parsePdf", () => {
  it("initializes the Node PDF runtime and extracts text", async () => {
    Reflect.deleteProperty(globalThis, "DOMMatrix");
    Reflect.deleteProperty(globalThis, "Path2D");

    const parsed = await parsePdf(validTextPdf());

    expect(globalThis.DOMMatrix).toBeDefined();
    expect(globalThis.Path2D).toBeDefined();
    expect(parsed.pageCount).toBe(1);
    expect(parsed.pages[0]?.text).toContain("Syllabus test page");
    expect(parsed.usefulCharacterCount).toBeGreaterThan(0);
  });
});
