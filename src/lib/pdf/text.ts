export interface PdfTextItemLike {
  str: string;
  transform: ArrayLike<number>;
  width: number;
  height: number;
}

interface PositionedItem extends PdfTextItemLike {
  x: number;
  y: number;
}

interface TextRow {
  y: number;
  height: number;
  items: PositionedItem[];
}

function rowTolerance(row: TextRow, item: PositionedItem) {
  return Math.max(1.5, Math.min(row.height, item.height) * 0.3);
}

function joinRow(items: PositionedItem[]) {
  let line = "";
  let previousEnd: number | null = null;

  for (const item of items.sort((left, right) => left.x - right.x)) {
    const value = item.str.replace(/\s+/g, " ");
    if (!value) continue;

    const gap = previousEnd == null ? 0 : item.x - previousEnd;
    if (
      line &&
      !/\s$/.test(line) &&
      !/^\s/.test(value) &&
      gap > Math.max(0.75, item.height * 0.08)
    ) {
      line += gap > Math.max(28, item.height * 2.5) ? " | " : " ";
    }

    line += value;
    previousEnd = Math.max(previousEnd ?? item.x, item.x + item.width);
  }

  return line
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?%)\]])/g, "$1")
    .replace(/([(\[])\s+/g, "$1")
    .trim();
}

/**
 * PDF.js returns text in content-stream order, which is not necessarily visual
 * reading order (headers and footers can arrive before the page title). Group
 * text by its rendered baseline, then sort top-to-bottom and left-to-right so
 * headings and table rows retain the structure used by syllabus extraction.
 */
export function reconstructPdfPageText(items: PdfTextItemLike[]) {
  const rows: TextRow[] = [];

  for (const item of items) {
    if (!item.str.trim()) continue;
    const positioned: PositionedItem = {
      ...item,
      x: Number(item.transform[4] ?? 0),
      y: Number(item.transform[5] ?? 0),
    };
    const row = rows.find(
      (candidate) =>
        Math.abs(candidate.y - positioned.y) <=
        rowTolerance(candidate, positioned),
    );

    if (row) {
      row.items.push(positioned);
      row.y =
        row.items.reduce((sum, rowItem) => sum + rowItem.y, 0) /
        row.items.length;
      row.height = Math.max(row.height, positioned.height);
    } else {
      rows.push({
        y: positioned.y,
        height: positioned.height,
        items: [positioned],
      });
    }
  }

  return rows
    .sort((left, right) => right.y - left.y)
    .map((row) => joinRow(row.items))
    .filter(Boolean)
    .join("\n");
}
