import "server-only";

import { reconstructPdfPageText } from "@/lib/pdf/text";

export interface ParsedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ParsedPdf {
  pageCount: number;
  pages: ParsedPdfPage[];
  usefulCharacterCount: number;
}

async function loadPdfJs() {
  try {
    const canvas = await import("@napi-rs/canvas");
    const runtimeGlobals = globalThis as unknown as {
      DOMMatrix?: typeof canvas.DOMMatrix;
      Path2D?: typeof canvas.Path2D;
    };

    runtimeGlobals.DOMMatrix ??= canvas.DOMMatrix;
    runtimeGlobals.Path2D ??= canvas.Path2D;

    return await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch (cause) {
    throw new Error("PDF_RUNTIME_UNAVAILABLE", { cause });
  }
}

export async function parsePdf(buffer: ArrayBuffer): Promise<ParsedPdf> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  try {
    const document = await loadingTask.promise;
    const pages: ParsedPdfPage[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = reconstructPdfPageText(
        content.items.flatMap((item) =>
          "str" in item
            ? [
                {
                  str: item.str,
                  transform: item.transform,
                  width: item.width,
                  height: item.height,
                },
              ]
            : [],
        ),
      );
      pages.push({ pageNumber, text });
      page.cleanup();
    }

    return {
      pageCount: document.numPages,
      pages,
      usefulCharacterCount: pages
        .map((page) => page.text.replace(/\s/g, "").length)
        .reduce((sum, count) => sum + count, 0),
    };
  } finally {
    await loadingTask.destroy();
  }
}
