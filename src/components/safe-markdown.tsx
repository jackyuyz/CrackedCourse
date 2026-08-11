import { Fragment, type ReactNode } from "react";

import { cn } from "@/lib/utils";

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function inlineMarkdown(value: string): ReactNode[] {
  const parts = value.split(/(\[[^\]]+\]\([^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="bg-muted rounded px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    const link = /^\[([^\]]+)\]\(([^\s)]+)\)$/.exec(part);
    if (link) {
      const href = safeHref(link[2]);
      return href ? <a key={index} href={href} target="_blank" rel="noreferrer" className="text-ocean underline underline-offset-2 hover:text-navy">{link[1]}</a> : <Fragment key={index}>{link[1]}</Fragment>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function SafeMarkdown({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(<pre key={`code-${index}`} className="bg-navy overflow-x-auto rounded-lg p-3 text-xs text-white"><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const Heading = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      blocks.push(<Heading key={`heading-${index}`} className={cn("text-navy font-extrabold", heading[1].length === 1 ? "mt-6 text-xl" : "mt-5 text-base")}>{inlineMarkdown(heading[2])}</Heading>);
      index += 1;
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={`quote-${index}`} className="border-ocean/50 text-muted-foreground border-l-2 pl-3 italic">{inlineMarkdown(line.slice(2))}</blockquote>);
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`} className="list-disc space-y-1 pl-5">{items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(<ol key={`ordered-list-${index}`} className="list-decimal space-y-1 pl-5">{items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item)}</li>)}</ol>);
      continue;
    }
    if (line.startsWith("|") && line.includes("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      const rows = tableLines
        .filter((row, rowIndex) => rowIndex !== 1 || !/^\|?\s*:?-{3,}/.test(row))
        .map((row) => row.split("|").slice(1, -1).map((cell) => cell.trim()));
      const [headings, ...body] = rows;
      if (headings?.length) {
        blocks.push(<div key={`table-${index}`} className="overflow-x-auto"><table className="border-border min-w-full border-collapse text-left text-xs"><thead className="bg-muted"><tr>{headings.map((heading, cellIndex) => <th key={cellIndex} className="border-border border px-2 py-1.5 font-bold">{inlineMarkdown(heading)}</th>)}</tr></thead><tbody>{body.map((row, rowIndex) => <tr key={rowIndex}>{headings.map((_, cellIndex) => <td key={cellIndex} className="border-border border px-2 py-1.5 align-top">{inlineMarkdown(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody></table></div>);
      }
      continue;
    }
    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s+|^```|^> |^[-*]\s+|^\d+\.\s+|^\|/.test(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`} className="leading-7">{inlineMarkdown(paragraph.join(" "))}</p>);
  }

  return <div className={cn("space-y-3 text-sm", className)}>{blocks}</div>;
}
