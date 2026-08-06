import "server-only";

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
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
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
