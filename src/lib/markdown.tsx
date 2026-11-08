/**
 * Tiny, safe markdown renderer for devotionals. Supports paragraphs,
 * ## / ### headings, > blockquotes, - and 1. lists, **bold**, *italic* and
 * [links](https://…). Output is React elements only (never raw HTML), so
 * admin-entered text cannot inject markup.
 */
import type { ReactNode } from "react";

function inline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\((https:\/\/[^\s)]+|\/[^\s)]*)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[2]) nodes.push(<strong key={k}>{m[2]}</strong>);
    else if (m[3] || m[4]) nodes.push(<em key={k}>{m[3] || m[4]}</em>);
    else if (m[5] && m[6]) {
      const external = m[6].startsWith("https://");
      nodes.push(
        <a key={k} href={m[6]} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {m[5]}
        </a>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        const key = `b${bi}`;
        const lines = block.split("\n");
        const h = block.match(/^(#{1,3})\s+(.+)$/);
        if (h && lines.length === 1) {
          return h[1].length === 1 || h[1].length === 2 ? (
            <h2 key={key}>{inline(h[2], key)}</h2>
          ) : (
            <h3 key={key}>{inline(h[2], key)}</h3>
          );
        }
        if (lines.every((l) => /^>\s?/.test(l))) {
          return <blockquote key={key}>{inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "), key)}</blockquote>;
        }
        if (lines.every((l) => /^[-*]\s+/.test(l))) {
          return (
            <ul key={key}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^[-*]\s+/, ""), `${key}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+[.)]\s+/.test(l))) {
          return (
            <ol key={key}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\d+[.)]\s+/, ""), `${key}-${li}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={key}>
            {lines.map((l, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {inline(l, `${key}-${li}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
