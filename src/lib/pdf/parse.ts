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

export async function parsePdf(buffer: ArrayBuffer): Promise<ParsedPdf> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  const document = await loadingTask.promise;

  try {
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
