/** HTML autorisé pour le message de la journée (extensible vers un RTE complet). */
const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "A", "P", "BR", "UL", "OL", "LI", "H2", "H3"])

export function normalizeRichHtml(html: string): string {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/<div>/gi, "<p>")
    .replace(/<\/div>/gi, "</p>")
    .replace(/&nbsp;/gi, " ")
    .trim()
}

export function richHtmlToPlainText(html: string): string {
  if (!html.trim()) return ""
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  }
  const el = document.createElement("div")
  el.innerHTML = html
  return (el.textContent ?? "").replace(/\s+/g, " ").trim()
}

export function sanitizeRichHtml(html: string): string {
  if (!html.trim()) return ""
  if (typeof document === "undefined") return html

  const doc = new DOMParser().parseFromString(html, "text/html")
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? ""
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ""
    const el = node as HTMLElement
    const tag = el.tagName.toUpperCase()
    if (!ALLOWED_TAGS.has(tag)) {
      return Array.from(el.childNodes).map(walk).join("")
    }
    if (tag === "BR") return "<br>"
    if (tag === "A") {
      const href = el.getAttribute("href")?.trim() ?? ""
      if (!/^https?:\/\//i.test(href)) {
        return Array.from(el.childNodes).map(walk).join("")
      }
      const inner = Array.from(el.childNodes).map(walk).join("")
      return `<a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer" class="text-sky-700 underline">${inner}</a>`
    }
    const inner = Array.from(el.childNodes).map(walk).join("")
    if (tag === "P" || tag === "LI") return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`
    return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`
  }

  return Array.from(doc.body.childNodes)
    .map(walk)
    .join("")
    .trim()
}

export function markdownToRichHtml(text: string): string {
  if (!text.trim()) return ""
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const chunks: string[] = []
  let list: string[] = []
  const flushList = () => {
    if (list.length) {
      chunks.push(`<ul>${list.map(item => `<li>${item}</li>`).join("")}</ul>`)
      list = []
    }
  }
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      continue
    }
    const inline = escape(trimmed)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-700 underline">$1</a>')
    if (trimmed.startsWith("## ")) {
      flushList()
      chunks.push(`<h3>${inline.replace(/^##\s+/, "")}</h3>`)
    } else if (/^[-*]\s+/.test(trimmed)) {
      list.push(inline.replace(/^[-*]\s+/, ""))
    } else {
      flushList()
      chunks.push(`<p>${inline}</p>`)
    }
  }
  flushList()
  return sanitizeRichHtml(chunks.join(""))
}

export function renderReglementContent(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return ""
  if (/<(p|h2|h3|ul|ol|li|strong|em|a|br)\b/i.test(trimmed)) {
    return sanitizeRichHtml(trimmed)
  }
  return markdownToRichHtml(trimmed)
}

export function isRichHtmlEmpty(html: string): boolean {
  return richHtmlToPlainText(html).length === 0
}

/** Texte brut (ex. réponse IA) → paragraphe HTML sûr pour l’éditeur. */
export function plainTextToRichHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  const withBreaks = escaped.replace(/\r\n/g, "\n").replace(/\n/g, "<br>")
  return sanitizeRichHtml(`<p>${withBreaks}</p>`)
}
