import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Clean excessive blockquote markers from LLM output.
 * If more than 40% of non-empty lines start with `> `, strip ALL leading `> ` markers
 * except lines that look like genuine short quotes (single `> ` before quoted text).
 * Also strips nested `> > ` markers.
 */
function cleanExcessiveBlockquotes(text) {
  if (!text) return text
  const lines = text.split('\n')
  const nonEmpty = lines.filter(l => l.trim().length > 0)
  if (nonEmpty.length === 0) return text

  const quoteLines = nonEmpty.filter(l => /^>\s/.test(l.trim()))
  const ratio = quoteLines.length / nonEmpty.length

  // If more than 40% of lines are blockquoted, it's excessive — strip them
  if (ratio > 0.4) {
    return lines.map(line => {
      // Strip all leading `> ` prefixes (including nested `> > `)
      let cleaned = line
      while (/^>\s?/.test(cleaned.trim())) {
        cleaned = cleaned.trim().replace(/^>\s?/, '')
      }
      return cleaned
    }).join('\n')
  }
  return text
}

/**
 * MarkdownRenderer — renders LLM markdown responses with legal-document styling.
 * Supports headings, bold, lists, tables, code blocks, blockquotes, links.
 * Designed for both LegalChat bubbles and LegalDesk chat panel.
 */
export default function MarkdownRenderer({ content, className = '' }) {
  if (!content) return null

  const cleanedContent = cleanExcessiveBlockquotes(content)

  return (
    <div className={`markdown-legal text-foreground ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{

          // ── Headings ──────────────────────────────────────────────────────
          h1: ({ children }) => (
            <h1 className="text-[14px] font-bold mt-4 mb-2 pb-1.5 border-b border-border text-foreground tracking-tight first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[13px] font-bold mt-3.5 mb-1.5 text-foreground flex items-center gap-2 first:mt-0">
              <span className="w-[3px] h-[14px] bg-primary rounded-full shrink-0" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[12.5px] font-semibold mt-2.5 mb-1 text-foreground/90 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[11px] font-semibold mt-2 mb-1 uppercase tracking-widest text-muted-foreground first:mt-0">
              {children}
            </h4>
          ),

          // ── Paragraphs ────────────────────────────────────────────────────
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 text-[13px] leading-[1.75] text-foreground/90">
              {children}
            </p>
          ),

          // ── Inline text ───────────────────────────────────────────────────
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/75 not-italic">{children}</em>
          ),

          // ── Lists ─────────────────────────────────────────────────────────
          ul: ({ children }) => (
            <ul className="my-2 space-y-1.5 text-[13px] pl-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1.5 text-[13px] pl-0 counter-reset-list">
              {children}
            </ol>
          ),
          li: ({ children, ordered, index }) => (
            <li className="flex gap-2.5 leading-[1.7] text-foreground/90 items-start">
              {/* Custom bullet / number */}
              <span className="shrink-0 mt-[3px]">
                {ordered
                  ? <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {typeof index === 'number' ? index + 1 : '•'}
                    </span>
                  : <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/50 mt-[6px]" />
                }
              </span>
              <span className="flex-1 min-w-0">{children}</span>
            </li>
          ),

          // ── Blockquote (legal citations / excerpts) ───────────────────────
          blockquote: ({ children }) => (
            <blockquote className="my-3 relative pl-4 pr-3.5 py-2.5 rounded-r-lg bg-amber-50/60 dark:bg-amber-900/10 border-l-[3px] border-amber-400 dark:border-amber-600 text-[12.5px] text-foreground/80">
              <span className="absolute top-2 left-3.5 text-amber-400/40 dark:text-amber-600/40 text-[28px] leading-none font-serif select-none">"</span>
              <div className="relative z-10 pl-2.5 italic leading-relaxed">
                {children}
              </div>
            </blockquote>
          ),

          // ── Code ──────────────────────────────────────────────────────────
          code: ({ inline, children }) =>
            inline ? (
              <code className="bg-secondary border border-border/60 px-1.5 py-0.5 rounded-md text-[11.5px] font-mono text-primary font-medium">
                {children}
              </code>
            ) : (
              <code className="text-[11.5px] font-mono leading-relaxed text-foreground/85">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="my-2.5 bg-secondary border border-border/60 rounded-xl p-3.5 overflow-x-auto text-[11.5px] font-mono leading-relaxed">
              {children}
            </pre>
          ),

          // ── Tables ────────────────────────────────────────────────────────
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full text-[12px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-secondary/80">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2 font-semibold text-foreground/80 text-left text-[10.5px] uppercase tracking-wider border-b border-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-[12px] text-foreground/80 border-b border-border/40 leading-relaxed">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-secondary/40 transition-colors even:bg-secondary/20">
              {children}
            </tr>
          ),

          // ── Links ─────────────────────────────────────────────────────────
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium underline underline-offset-2 decoration-primary/30 hover:decoration-primary transition-colors break-words"
            >
              {children}
            </a>
          ),

          // ── Horizontal rule ───────────────────────────────────────────────
          hr: () => (
            <hr className="my-4 border-none h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          ),
        }}
      >
        {cleanedContent}
      </ReactMarkdown>
    </div>
  )
}