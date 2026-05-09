function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Lightweight Markdown renderer for trusted AI text blocks.
 * Supports headings, bold, italic, inline code and lists.
 */
export function simpleMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const html: string[] = []
  let inUl = false

  const closeListIfOpen = () => {
    if (inUl) {
      html.push('</ul>')
      inUl = false
    }
  }

  const inlineFormat = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
  }

  for (const raw of lines) {
    const safe = escapeHtml(raw.trim())

    if (safe === '') {
      closeListIfOpen()
      html.push('<br />')
      continue
    }

    const h2 = safe.match(/^##\s+(.+)$/)
    if (h2) {
      closeListIfOpen()
      html.push(`<h2>${inlineFormat(h2[1])}</h2>`)
      continue
    }

    const h3 = safe.match(/^###\s+(.+)$/)
    if (h3) {
      closeListIfOpen()
      html.push(`<h3>${inlineFormat(h3[1])}</h3>`)
      continue
    }

    const listItem = safe.match(/^[-*]\s+(.+)$/)
    if (listItem) {
      if (!inUl) {
        html.push('<ul>')
        inUl = true
      }
      html.push(`<li>${inlineFormat(listItem[1])}</li>`)
      continue
    }

    closeListIfOpen()
    html.push(`<p>${inlineFormat(safe)}</p>`)
  }

  closeListIfOpen()
  return html.join('\n')
}
