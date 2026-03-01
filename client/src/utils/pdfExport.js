import { jsPDF } from 'jspdf'

/* ── Layout constants ── */
const M = 18 // margin
const PW = 210 // page width
const PH = 297 // page height
const CW = PW - M * 2 // content width
const LH = 5.5 // line height
const FOOTER_Y = 286

/* ── Brand colours ── */
const C = {
  headerBg: [15, 23, 42],       // slate-900
  accent: [37, 99, 235],        // blue-600
  accentLight: [219, 234, 254], // blue-100
  text: [30, 41, 59],           // slate-800
  textMuted: [100, 116, 139],   // slate-500
  textLight: [148, 163, 184],   // slate-400
  border: [226, 232, 240],      // slate-200
  tableBg: [248, 250, 252],     // slate-50
  white: [255, 255, 255],
  red: [220, 38, 38],
  green: [22, 163, 74],
  amber: [217, 119, 6],
}

/**
 * Strip characters outside the Latin range that jsPDF's built-in helvetica
 * font cannot render (e.g. Devanagari, Tamil, Telugu).
 */
function safeText(val) {
  if (val == null) return ''
  const s = typeof val === 'string' ? val : String(val)
  // Replace non-Latin-extended characters with their closest ASCII
  // or simply strip them so no black-square garbage appears.
  return s.replace(/[^\u0000-\u00FF]/g, (ch) => {
    // Very small Devanagari common words transliteration could go here,
    // but for now indicate stripped text with a fallback marker.
    return ''
  }).trim() || s.replace(/[^\u0000-\u00FF]/g, '?')
}

/**
 * Format currency — uses "Rs." instead of ₹ for PDF font compatibility
 */
function rs(n) {
  if (n == null || isNaN(n)) return 'Rs. 0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 10000000) return `${sign}Rs. ${(abs / 10000000).toFixed(2)} Cr`
  if (abs >= 100000) return `${sign}Rs. ${(abs / 100000).toFixed(2)} L`
  if (abs >= 1000) return `${sign}Rs. ${(abs / 1000).toFixed(1)} K`
  return `${sign}Rs. ${abs.toLocaleString('en-IN')}`
}

/* ═══════════════════════════════════════════════════════════
   Helper: page break check
   ═══════════════════════════════════════════════════════════ */
function checkPage(doc, y, needed = 14) {
  if (y + needed > FOOTER_Y - 8) {
    doc.addPage()
    return M + 4
  }
  return y
}

/* ═══════════════════════════════════════════════════════════
   Helper: create branded doc with header
   ═══════════════════════════════════════════════════════════ */
function createDoc(title, subtitle, meta) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // -- Full width header band
  doc.setFillColor(...C.headerBg)
  doc.rect(0, 0, PW, 34, 'F')

  // Accent stripe under header
  doc.setFillColor(...C.accent)
  doc.rect(0, 34, PW, 1.5, 'F')

  // Title
  doc.setTextColor(...C.white)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, M, 15)

  // Subtitle
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle || '', M, 23)

  // Meta info on right side of header
  if (meta) {
    doc.setFontSize(8)
    doc.text(meta, PW - M, 15, { align: 'right' })
  }

  // Branding tag
  doc.setFontSize(7)
  doc.setTextColor(160, 180, 210)
  doc.text('PanchayatGPT  |  IntegratedGov AI', PW - M, 30, { align: 'right' })

  doc.setTextColor(...C.text)
  return { doc, y: 43 }
}

/* ═══════════════════════════════════════════════════════════
   Helper: section heading with coloured accent bar
   ═══════════════════════════════════════════════════════════ */
function heading(doc, y, text) {
  y = checkPage(doc, y, 18)
  // Accent bar
  doc.setFillColor(...C.accent)
  doc.rect(M, y - 3.5, 2.5, 5, 'F')
  // Text
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.text)
  doc.text(text, M + 6, y)
  y += 3
  // Underline
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(M, y, M + CW, y)
  y += 5
  return y
}

/* ═══════════════════════════════════════════════════════════
   Helper: body text (wrapped)
   ═══════════════════════════════════════════════════════════ */
function body(doc, y, text, { indent = 0, fontSize = 9, bold = false, color = C.text } = {}) {
  if (!text) return y
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setTextColor(...color)
  const lines = doc.splitTextToSize(String(text), CW - indent)
  for (const line of lines) {
    y = checkPage(doc, y)
    doc.text(line, M + indent, y)
    y += LH
  }
  return y
}

/* ═══════════════════════════════════════════════════════════
   Helper: key-value row (label + value side by side)
   ═══════════════════════════════════════════════════════════ */
function kv(doc, y, label, value, { labelWidth = 45 } = {}) {
  if (value == null || value === '') return y
  y = checkPage(doc, y, 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.textMuted)
  doc.text(label, M + 2, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.text)
  const valLines = doc.splitTextToSize(String(value), CW - labelWidth - 4)
  doc.text(valLines, M + labelWidth, y)
  y += Math.max(valLines.length, 1) * LH + 1
  return y
}

/* ═══════════════════════════════════════════════════════════
   Helper: numbered list
   ═══════════════════════════════════════════════════════════ */
function numberedList(doc, y, items) {
  items.forEach((item, i) => {
    y = checkPage(doc, y, 8)
    // Normalise: item may be a string or an object {item, decision, task, ...}
    const rawStr = typeof item === 'string'
      ? item
      : (item.decision || item.item || item.task || item.topic || JSON.stringify(item))
    const text = safeText(rawStr)
    // Number badge
    doc.setFillColor(...C.accentLight)
    doc.roundedRect(M + 1, y - 3.3, 6, 4.5, 1, 1, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.accent)
    doc.text(String(i + 1), M + 4, y, { align: 'center' })
    // Text
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.text)
    const lines = doc.splitTextToSize(text, CW - 14)
    for (const line of lines) {
      y = checkPage(doc, y)
      doc.text(line, M + 10, y)
      y += LH
    }
    y += 1.5
  })
  return y
}

/* ═══════════════════════════════════════════════════════════
   Helper: bullet list
   ═══════════════════════════════════════════════════════════ */
function bulletList(doc, y, items, { color = C.accent } = {}) {
  items.forEach((item) => {
    y = checkPage(doc, y, 7)
    doc.setFillColor(...color)
    doc.circle(M + 3.5, y - 1.2, 1, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.text)
    const lines = doc.splitTextToSize(String(item), CW - 10)
    for (const line of lines) {
      y = checkPage(doc, y)
      doc.text(line, M + 8, y)
      y += LH
    }
    y += 1
  })
  return y
}

/* ═══════════════════════════════════════════════════════════
   Helper: stat box (inline card)
   ═══════════════════════════════════════════════════════════ */
function statBoxes(doc, y, stats) {
  y = checkPage(doc, y, 24)
  const boxW = (CW - (stats.length - 1) * 4) / stats.length
  stats.forEach((stat, i) => {
    const x = M + i * (boxW + 4)
    // Box bg
    doc.setFillColor(...C.tableBg)
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, boxW, 18, 2, 2, 'FD')
    // Label
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.textMuted)
    doc.text(stat.label, x + boxW / 2, y + 6, { align: 'center' })
    // Value
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(stat.color || C.text))
    doc.text(String(stat.value), x + boxW / 2, y + 14, { align: 'center' })
  })
  return y + 24
}

/* ═══════════════════════════════════════════════════════════
   Helper: data table
   ═══════════════════════════════════════════════════════════ */
function dataTable(doc, y, { headers, rows, colWidths, alignRight = [] }) {
  y = checkPage(doc, y, 14)
  const totalW = colWidths.reduce((s, w) => s + w, 0)

  // Header row
  doc.setFillColor(...C.headerBg)
  doc.rect(M, y - 4, totalW, 7, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.white)
  let cx = M
  headers.forEach((h, i) => {
    if (alignRight.includes(i)) {
      doc.text(h, cx + colWidths[i] - 2, y, { align: 'right' })
    } else {
      doc.text(h, cx + 3, y)
    }
    cx += colWidths[i]
  })
  y += 6

  // Data rows
  rows.forEach((row, ri) => {
    y = checkPage(doc, y, 8)
    // Alternating row bg
    if (ri % 2 === 0) {
      doc.setFillColor(...C.tableBg)
      doc.rect(M, y - 3.5, totalW, 6.5, 'F')
    }
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    cx = M
    row.forEach((cell, ci) => {
      doc.setTextColor(...(cell.color || C.text))
      doc.setFont('helvetica', cell.bold ? 'bold' : 'normal')
      if (alignRight.includes(ci)) {
        doc.text(String(cell.text ?? cell), cx + colWidths[ci] - 2, y, { align: 'right' })
      } else {
        const cellText = String(cell.text ?? cell)
        const truncated = doc.splitTextToSize(cellText, colWidths[ci] - 4)[0] || cellText
        doc.text(truncated, cx + 3, y)
      }
      cx += colWidths[ci]
    })
    // Row border
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.15)
    doc.line(M, y + 3, M + totalW, y + 3)
    y += 6.5
  })

  return y + 2
}

/* ═══════════════════════════════════════════════════════════
   Helper: footer on all pages
   ═══════════════════════════════════════════════════════════ */
function addFooters(doc) {
  const pages = doc.getNumberOfPages()
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    // Divider line
    doc.setDrawColor(...C.border)
    doc.setLineWidth(0.3)
    doc.line(M, FOOTER_Y - 3, PW - M, FOOTER_Y - 3)
    // Footer text
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.textLight)
    doc.text(`Generated: ${date}`, M, FOOTER_Y)
    doc.text('PanchayatGPT  --  IntegratedGov AI', PW / 2, FOOTER_Y, { align: 'center' })
    doc.text(`Page ${i} / ${pages}`, PW - M, FOOTER_Y, { align: 'right' })
  }
}

/* ═══════════════════════════════════════════════════════════
   Helper: highlight box (for notes / warnings)
   ═══════════════════════════════════════════════════════════ */
function highlightBox(doc, y, text, { bg = C.accentLight, borderColor = C.accent, icon = '' } = {}) {
  if (!text) return y
  const lines = doc.splitTextToSize(String(text), CW - 14)
  const boxH = lines.length * LH + 6
  y = checkPage(doc, y, boxH + 4)
  // Background
  doc.setFillColor(...bg)
  doc.roundedRect(M, y - 2, CW, boxH, 2, 2, 'F')
  // Left accent bar
  doc.setFillColor(...borderColor)
  doc.rect(M, y - 2, 2.5, boxH, 'F')
  // Text
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.text)
  let ty = y + 3
  for (const line of lines) {
    doc.text(line, M + 7, ty)
    ty += LH
  }
  return y + boxH + 4
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC: Export scheme search results as PDF
   ═══════════════════════════════════════════════════════════════ */
export function exportSchemesPdf(schemes, query) {
  const { doc, y: startY } = createDoc(
    'Scheme Recommendations',
    `Search Query: ${query || 'N/A'}`,
    `${schemes.length} scheme${schemes.length !== 1 ? 's' : ''} found`,
  )
  let y = startY

  schemes.forEach((scheme, idx) => {
    y = heading(doc, y, `${idx + 1}.  ${scheme.name}`)

    // Relevance badge
    if (scheme.relevance) {
      const badgeColor = scheme.relevance === 'high' ? C.green : scheme.relevance === 'medium' ? C.amber : C.textMuted
      doc.setFillColor(...badgeColor)
      doc.roundedRect(M + 2, y - 3.5, 18, 4.5, 1.2, 1.2, 'F')
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.white)
      doc.text(scheme.relevance.toUpperCase(), M + 11, y, { align: 'center' })
      y += 4
    }

    if (scheme.description) {
      y = body(doc, y, scheme.description, { indent: 2, color: C.textMuted })
      y += 2
    }

    if (scheme.benefit) y = kv(doc, y, 'Benefit:', scheme.benefit)
    if (scheme.eligibility) y = kv(doc, y, 'Eligibility:', scheme.eligibility)
    if (scheme.funding_source) y = kv(doc, y, 'Funding Source:', scheme.funding_source)

    if (scheme.required_docs?.length) {
      y = checkPage(doc, y, 10)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.textMuted)
      doc.text('Required Documents:', M + 2, y)
      y += LH + 1
      y = bulletList(doc, y, scheme.required_docs)
    }

    if (scheme.next_steps) {
      y = highlightBox(doc, y, 'Next Steps: ' + scheme.next_steps)
    }

    y += 3
    // Separator between schemes
    if (idx < schemes.length - 1) {
      doc.setDrawColor(...C.border)
      doc.setLineWidth(0.2)
      const dashLen = 2
      for (let dx = M; dx < M + CW; dx += dashLen * 2) {
        doc.line(dx, y, Math.min(dx + dashLen, M + CW), y)
      }
      y += 6
    }
  })

  addFooters(doc)
  doc.save('scheme-recommendations.pdf')
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC: Export budget allocation as PDF
   ═══════════════════════════════════════════════════════════════ */
export function exportBudgetPdf({ items, totalAllocated, totalSpent, utilisation, year, panchayatId, suggestions }) {
  const { doc, y: startY } = createDoc(
    `Budget Report  --  FY ${year}`,
    `Panchayat ID: ${panchayatId}`,
    new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  )
  let y = startY

  // ── Summary stat boxes ──
  y = statBoxes(doc, y, [
    { label: 'TOTAL ALLOCATED', value: rs(totalAllocated), color: C.accent },
    { label: 'TOTAL SPENT', value: rs(totalSpent), color: C.text },
    { label: 'UTILISATION', value: `${utilisation}%`, color: utilisation > 90 ? C.red : utilisation > 70 ? C.amber : C.green },
  ])
  y += 4

  // ── Category table ──
  y = heading(doc, y, 'Category Breakdown')

  const colWidths = [62, 34, 34, 40]
  const tableRows = items.map((item) => {
    const rem = item.allocated - item.spent
    return [
      item.category,
      { text: rs(item.allocated), bold: true },
      rs(item.spent),
      { text: rs(rem), color: rem < 0 ? C.red : C.green, bold: true },
    ]
  })

  // Totals row
  tableRows.push([
    { text: 'TOTAL', bold: true },
    { text: rs(totalAllocated), bold: true },
    { text: rs(totalSpent), bold: true },
    { text: rs(totalAllocated - totalSpent), bold: true, color: (totalAllocated - totalSpent) < 0 ? C.red : C.green },
  ])

  y = dataTable(doc, y, {
    headers: ['Category', 'Allocated', 'Spent', 'Remaining'],
    rows: tableRows,
    colWidths,
    alignRight: [1, 2, 3],
  })

  // ── Utilisation bar ──
  y = checkPage(doc, y, 12)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.textMuted)
  doc.text('UTILISATION', M + 2, y)
  y += 3
  // Track
  doc.setFillColor(...C.border)
  doc.roundedRect(M + 2, y, CW - 4, 4, 2, 2, 'F')
  // Fill
  const barColor = utilisation > 90 ? C.red : utilisation > 70 ? C.amber : C.green
  const fillW = Math.max(0, Math.min(utilisation, 100)) / 100 * (CW - 4)
  if (fillW > 0) {
    doc.setFillColor(...barColor)
    doc.roundedRect(M + 2, y, fillW, 4, 2, 2, 'F')
  }
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...barColor)
  doc.text(`${utilisation}%`, M + CW, y + 3, { align: 'right' })
  y += 10

  // ── AI Recommendation ──
  if (suggestions?.reasoning) {
    y = heading(doc, y, 'AI Recommendation')
    y = highlightBox(doc, y, suggestions.reasoning)
  }

  if (suggestions?.priority_areas?.length) {
    y = checkPage(doc, y, 12)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.textMuted)
    doc.text('Priority Areas:', M + 2, y)
    y += LH + 1
    y = bulletList(doc, y, suggestions.priority_areas, { color: C.amber })
  }

  if (suggestions?.risk_flags?.length) {
    y = checkPage(doc, y, 12)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.red)
    doc.text('Risk Flags:', M + 2, y)
    y += LH + 1
    y = bulletList(doc, y, suggestions.risk_flags, { color: C.red })
  }

  addFooters(doc)
  doc.save(`budget-FY${year}.pdf`)
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC: Export meeting minutes as PDF
   ═══════════════════════════════════════════════════════════════ */
export function exportMeetingMinutesPdf({ minutes, meetingDate, location, attendees, meetingType, transcript }) {
  const { doc, y: startY } = createDoc(
    `${meetingType} -- Meeting Minutes`,
    `Date: ${meetingDate}  |  Location: ${minutes.meeting_details?.location || location}`,
    `Attendees: ${minutes.meeting_details?.attendees || attendees}`,
  )
  let y = startY

  // ── Meeting details cards ──
  y = statBoxes(doc, y, [
    { label: 'DATE', value: minutes.meeting_details?.date || meetingDate },
    { label: 'LOCATION', value: minutes.meeting_details?.location || location },
    { label: 'ATTENDEES', value: String(minutes.meeting_details?.attendees || attendees) },
    { label: 'TYPE', value: minutes.meeting_details?.type || meetingType },
  ])
  y += 2

  // ── Agenda Items ──
  if (minutes.agenda_items?.length) {
    y = heading(doc, y, 'Agenda Items Discussed')
    y = numberedList(doc, y, minutes.agenda_items)
    y += 2
  }

  // ── Key Decisions ──
  if (minutes.key_decisions?.length) {
    y = heading(doc, y, 'Key Decisions')
    y = numberedList(doc, y, minutes.key_decisions)
    y += 2
  }

  // ── Action Items ──
  if (minutes.action_items?.length) {
    y = heading(doc, y, 'Action Items')

    const actionHeaders = ['#', 'Task', 'Assigned To', 'Deadline']
    const actionColWidths = [10, 80, 40, 40]
    const actionRows = minutes.action_items.map((a, i) => {
      const task = typeof a === 'string' ? a : (a.task || '')
      const assigned = typeof a === 'string' ? '-' : (a.assigned || '-')
      const deadline = typeof a === 'string' ? '-' : (a.deadline || '-')
      return [String(i + 1), task, assigned, deadline]
    })

    y = dataTable(doc, y, {
      headers: actionHeaders,
      rows: actionRows,
      colWidths: actionColWidths,
      alignRight: [],
    })
    y += 2
  }

  // ── Schemes Discussed ──
  if (minutes.schemes_discussed?.length) {
    y = heading(doc, y, 'Schemes Discussed')
    // Tag-style badges
    let tx = M + 2
    let ty = y
    minutes.schemes_discussed.forEach((s) => {
      const rawS = typeof s === 'string' ? s : (s.name || s.scheme || JSON.stringify(s))
      const label = safeText(rawS)
      const textW = doc.getStringUnitWidth(label) * 8 / doc.internal.scaleFactor + 6
      if (tx + textW > M + CW) { tx = M + 2; ty += 8 }
      ty = checkPage(doc, ty, 8)
      doc.setFillColor(...C.accentLight)
      doc.roundedRect(tx, ty - 3.5, textW, 5.5, 1.5, 1.5, 'F')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C.accent)
      doc.text(label, tx + 3, ty)
      tx += textW + 3
    })
    y = ty + 8
  }

  // ── Funds & Next Meeting ──
  if (minutes.funds_approved || minutes.next_meeting) {
    y = heading(doc, y, 'Other Details')
    if (minutes.funds_approved) {
      const fundsArr = Array.isArray(minutes.funds_approved)
        ? minutes.funds_approved
        : [minutes.funds_approved]
      fundsArr.forEach((f) => {
        const fStr = typeof f === 'string' ? f : [f.amount_inr, f.purpose, f.source].filter(Boolean).join(' — ')
        y = kv(doc, y, 'Funds Approved:', safeText(fStr))
      })
    }
    if (minutes.next_meeting) y = kv(doc, y, 'Next Meeting:', safeText(String(minutes.next_meeting)))
    y += 2
  }

  // ── Summary ──
  if (minutes.summary_hindi) {
    y = heading(doc, y, 'Summary')
    y = highlightBox(doc, y, safeText(minutes.summary_hindi))
  }

  // ── Original Transcript ──
  if (transcript) {
    y = heading(doc, y, 'Original Transcript')
    y = body(doc, y, safeText(transcript), { fontSize: 7.5, color: C.textMuted })
  }

  addFooters(doc)
  doc.save(`meeting-minutes-${meetingDate}.pdf`)
}
