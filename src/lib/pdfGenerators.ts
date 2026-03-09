import type { CrewData, ProjectJob, ListeOverrides } from './types'

// ─── Palette — Liste Technique ────────────────────────────────────────────────
const C_DARK:   [number, number, number] = [45,  43,  72 ]  // #2D2B48
const C_CARD:   [number, number, number] = [244, 244, 246]  // #f4f4f6
const C_BORDER: [number, number, number] = [224, 224, 224]  // #e0e0e0
const C_WHITE:  [number, number, number] = [255, 255, 255]
const C_TEXT:   [number, number, number] = [17,  17,  17 ]
const C_MUTED:  [number, number, number] = [102, 102, 102]

// ─── Palette — Feuille de Service (conservée) ────────────────────────────────
const C_DARK_FDS:  [number, number, number] = [41, 40, 61]    // #29283d
const C_MUTED_FDS: [number, number, number] = [105, 103, 134] // #696786
const C_LIGHT_FDS: [number, number, number] = [233, 232, 234] // #e9e8ea

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-')
      return `${d}/${m}/${y}`
    }
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Paris',
    })
  } catch {
    return dateStr
  }
}

const formatPhone = (phone: string): string => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }
  return phone
}

const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null) return ''
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' \u20ac'
}

const getProjectInfo = (data: CrewData) => {
  const firstJob: ProjectJob | undefined = Object.values(data)[0]?.[0]
  if (!firstJob) return null

  const project =
    firstJob.contract?.project ?? firstJob.project_intermittent?.project

  return {
    name:             project?.name ?? 'Projet',
    startDate:        project?.start_date ?? '',
    endDate:          project?.end_date ?? '',
    productionName:   firstJob.contract?.production_name ?? 'Production',
    slug:             project?.slug ?? 'projet',
    siret:            project?.pseudo_siret ?? null,
    poleEmploiNumber: project?.pole_emploi_object_number ?? null,
  }
}

// ─── Liste Technique ─────────────────────────────────────────────────────────

export async function generateListeTechnique(data: CrewData, overrides?: ListeOverrides): Promise<void> {
  const { default: jsPDF } = await import('jspdf')

  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW   = 210
  const PH   = 297
  const ML   = 10   // margin left
  const MR   = 10   // margin right
  const MB   = 14   // margin bottom
  const IW   = PW - ML - MR   // 190 mm usable width
  const R    = 1.5             // border-radius ≈ 4 px
  const GAP  = 2.5             // vertical gap between cards

  // Column layout — mirrors HTML template
  // Fonction | Nom | Mobile | Email
  const CW = [50, 50, 34, 52] as const   // widths, sum = 186 mm (+ 2 mm pad each side)
  const CX = [
    ML + 2,
    ML + 2 + CW[0],
    ML + 2 + CW[0] + CW[1],
    ML + 2 + CW[0] + CW[1] + CW[2],
  ] as const

  const DEPT_H = 7    // department dark header height
  const LBL_H  = 5.5  // info-block label height (CLIENT / AGENCE / PRODUCTION)
  const ROW_H  = 6    // content row height

  const pi     = getProjectInfo(data)
  const period = pi
    ? `${formatDate(pi.startDate)} \u2192 ${formatDate(pi.endDate)}`
    : ''

  // Effective values — overrides take precedence over JSON data
  const effectiveProd = overrides?.productionName ?? pi?.productionName ?? '\u2014'
  const effectiveFilm = overrides?.filmName        ?? pi?.name           ?? '\u2014'

  let y    = ML
  let page = 1

  // ── Drawing helpers ────────────────────────────────────────────────────────

  /** Rounded card border (stroke only, drawn last = on top) */
  const cardBorder = (x: number, yy: number, w: number, h: number) => {
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, yy, w, h, R, R, 'S')
  }

  /**
   * Dark section band: rounded top corners, square bottom
   * (so it connects flush with the rows below it inside the same card).
   */
  const sectionBand = (x: number, yy: number, w: number, h: number, label: string, roundTop: boolean) => {
    doc.setFillColor(...C_DARK)
    if (roundTop) {
      doc.roundedRect(x, yy, w, h, R, R, 'F')  // all corners rounded
      doc.rect(x, yy + h - R, w, R + 0.5, 'F') // square off bottom corners
    } else {
      doc.rect(x, yy, w, h, 'F')
    }
    doc.setTextColor(...C_WHITE)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(label, x + 3, yy + h * 0.68)
  }

  /** One content row — no horizontal borders, with optional alternating bg */
  const contentRow = (
    yy: number,
    cells: [string, string, string, string],
    alt: boolean,
  ) => {
    if (alt) {
      doc.setFillColor(...C_CARD)
      doc.rect(ML, yy, IW, ROW_H, 'F')
    }
    // Vertical column separators
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.25)
    ;[CX[1], CX[2], CX[3]].forEach(sx => doc.line(sx, yy, sx, yy + ROW_H))
    // Text
    const cfgs = [
      { size: 7.5, style: 'italic' as const,  color: C_MUTED },
      { size: 8,   style: 'bold'   as const,  color: C_TEXT  },
      { size: 7.5, style: 'normal' as const,  color: C_MUTED },
      { size: 7,   style: 'normal' as const,  color: C_MUTED },
    ]
    cells.forEach((txt, i) => {
      doc.setFontSize(cfgs[i].size)
      doc.setFont('helvetica', cfgs[i].style)
      doc.setTextColor(...cfgs[i].color)
      if (txt) doc.text(txt, CX[i] + 1.5, yy + ROW_H * 0.67, { maxWidth: CW[i] - 3 })
    })
  }

  /** Footer */
  const drawFooter = (num: number) => {
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.3)
    doc.line(ML, PH - 11, PW - MR, PH - 11)
    doc.setTextColor(...C_MUTED)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    const parts = [
      pi?.name,
      pi?.productionName ? `Production\u00a0: ${pi.productionName}` : '',
      pi?.poleEmploiNumber ? `N\u00b0 objet\u00a0: ${pi.poleEmploiNumber}` : '',
      pi?.siret ? `SIRET\u00a0: ${pi.siret}` : '',
    ].filter(Boolean).join(' \u00b7 ')
    doc.text(parts, ML, PH - 6)
    doc.text(`Page ${num}`, PW - MR, PH - 6, { align: 'right' })
  }

  /** Check available space, add a new page if needed */
  const ensureSpace = (needed: number) => {
    if (y + needed > PH - MB - 2) {
      doc.addPage()
      page++
      y = ML
      drawFooter(page)
    }
  }

  // ── HEADER — 2 cards side by side ────────────────────────────────────────
  const metaRows = [
    { lbl: 'PRODUCTION',     val: effectiveProd         },
    { lbl: 'FILM',           val: effectiveFilm         },
    { lbl: 'DATES TOURNAGE', val: period || '\u2014'    },
    ...(overrides?.studioDecor
      ? [{ lbl: 'STUDIO / D\u00c9COR', val: overrides.studioDecor }]
      : []
    ),
  ]
  const CARD_H     = metaRows.length <= 3 ? 26 : 32
  const rowStartY  = metaRows.length <= 3 ?  5 :  4
  const rowSpacing = metaRows.length <= 3 ?  7 :  6.5
  const CARD_W     = (IW - GAP) / 2  // ≈ 93.75 mm

  // Left card — CREW LIST
  doc.setFillColor(...C_CARD)
  doc.roundedRect(ML, y, CARD_W, CARD_H, R, R, 'F')
  doc.setTextColor(...C_TEXT)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('CREW LIST', ML + CARD_W / 2, y + CARD_H / 2 + 4, { align: 'center' })

  // Right card — project meta
  const cardRx = ML + CARD_W + GAP
  doc.setFillColor(...C_CARD)
  doc.roundedRect(cardRx, y, CARD_W, CARD_H, R, R, 'F')
  metaRows.forEach(({ lbl, val }, i) => {
    const my = y + rowStartY + i * rowSpacing
    doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_MUTED)
    doc.text(lbl, cardRx + 3, my)
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_TEXT)
    doc.text(val, cardRx + 3, my + 3.5)
  })

  y += CARD_H + GAP

  // ── INFO BLOCK — CLIENT / AGENCE / PRODUCTION ─────────────────────────────
  type InfoItem =
    | { type: 'lbl'; text: string; roundTop: boolean }
    | { type: 'row'; cells: [string, string, string, string] }

  const SECTION_LABELS: Record<string, string> = {
    agence:               'AGENCE',
    client:               'CLIENT',
    production_executive: 'PRODUCTION EXECUTIVE',
    production_delegue:   'PRODUCTION D\u00c9L\u00c9GU\u00c9E',
    realisateur:          'R\u00c9ALISATEUR',
    agent_realisateur:    'AGENT R\u00c9ALISATEUR',
    agent_chef_operateur: 'AGENT CHEF OP\u00c9RATEUR',
  }

  const o = overrides
  const dash = '\u2014'
  const activeSections = o?.sections ?? []

  const infoItems: InfoItem[] = []

  // Dynamic sections
  activeSections.forEach((section, si) => {
    infoItems.push({ type: 'lbl', text: SECTION_LABELS[section.type] ?? section.type.toUpperCase(), roundTop: si === 0 })
    section.rows.forEach(row => {
      infoItems.push({ type: 'row', cells: [row.col0 || dash, row.col1 || dash, row.col2 || dash, row.col3 || dash] })
    })
  })

  // Fixed PRODUCTION section
  infoItems.push({ type: 'lbl', text: 'PRODUCTION', roundTop: activeSections.length === 0 })
  infoItems.push({ type: 'row', cells: [effectiveProd, '', '', ''] })
  infoItems.push({ type: 'row', cells: ['Producteur', o?.producteurRow?.col1 || dash, o?.producteurRow?.col2 || dash, o?.producteurRow?.col3 || dash] })

  const infoH = infoItems.reduce(
    (acc, item) => acc + (item.type === 'lbl' ? LBL_H : ROW_H),
    0,
  )

  // White card background
  doc.setFillColor(...C_WHITE)
  doc.roundedRect(ML, y, IW, infoH, R, R, 'F')

  const infoStart = y
  let rowIdx = 0
  for (const item of infoItems) {
    if (item.type === 'lbl') {
      sectionBand(ML, y, IW, LBL_H, item.text, item.roundTop)
      y += LBL_H
      rowIdx = 0
    } else {
      contentRow(y, item.cells, rowIdx % 2 === 1)
      y += ROW_H
      rowIdx++
    }
  }
  cardBorder(ML, infoStart, IW, infoH)

  y += GAP

  // ── LISTE TECHNIQUE — centred title bar ───────────────────────────────────
  const LT_H = 8
  doc.setFillColor(...C_DARK)
  doc.roundedRect(ML, y, IW, LT_H, R, R, 'F')
  doc.setTextColor(...C_WHITE)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.text('LISTE TECHNIQUE', PW / 2, y + 5.2, { align: 'center' })
  y += LT_H + GAP

  drawFooter(1)

  // ── DEPARTMENT CARDS ──────────────────────────────────────────────────────
  for (const [deptName, jobs] of Object.entries(data)) {
    const cardH = DEPT_H + jobs.length * ROW_H
    ensureSpace(cardH + GAP)

    const cardY = y

    // White card background
    doc.setFillColor(...C_WHITE)
    doc.roundedRect(ML, cardY, IW, cardH, R, R, 'F')

    // Department section header (rounded top, square bottom)
    sectionBand(ML, y, IW, DEPT_H, deptName.toUpperCase(), true)
    y += DEPT_H

    // Content rows — no horizontal borders, alternating bg
    jobs.forEach((job, idx) => {
      const inter  = job.project_intermittent?.intermittent
      const rowKey = `${deptName}::${idx}`
      const ov     = overrides?.crewRows?.[rowKey] ?? {}

      const name  = ov.name  ?? (inter ? `${inter.firstname} ${inter.lastname}` : job.project_intermittent?.name ?? '\u2014')
      const phone = ov.phone ?? (inter?.mobile_number ? formatPhone(inter.mobile_number) : '\u2014')
      const email = ov.email ?? (job.project_intermittent?.email ?? inter?.email ?? '\u2014')
      const label = ov.label ?? job.label

      contentRow(y, [label, name, phone, email], idx % 2 === 1)
      y += ROW_H
    })

    // Card border drawn last (on top of content)
    cardBorder(ML, cardY, IW, cardH)

    y += GAP
  }

  doc.save(`liste-technique-${pi?.slug ?? 'projet'}.pdf`)
}

// ─── Feuille de Service ──────────────────────────────────────────────────────

export async function generateFeuilleDeService(data: CrewData): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()   // 297
  const pageH = doc.internal.pageSize.getHeight()  // 210

  const projectInfo = getProjectInfo(data)
  const totalPersons = Object.values(data).reduce((s, j) => s + j.length, 0)
  const totalDepts = Object.keys(data).length
  const period = projectInfo
    ? `${formatDate(projectInfo.startDate)} \u2192 ${formatDate(projectInfo.endDate)}`
    : ''

  const headerH = 42
  const separatorH = 10

  const drawPageHeader = () => {
    doc.setFillColor(...C_LIGHT_FDS)
    doc.rect(0, 0, pageW, headerH, 'F')

    doc.setTextColor(...C_DARK_FDS)
    doc.setFontSize(26)
    doc.setFont('helvetica', 'bold')
    doc.text('CREW LIST', 14, 18)

    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C_MUTED_FDS)
    doc.text(projectInfo?.name ?? '', 14, 27)

    doc.setFontSize(7.5)
    doc.text(`G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString('fr-FR')}`, 14, 35)

    const rx = 210
    const infoRows = [
      { label: 'Production', value: projectInfo?.productionName ?? '' },
      { label: 'P\u00e9riode', value: period },
      { label: 'Techniciens', value: `${totalPersons}` },
      { label: 'D\u00e9partements', value: `${totalDepts}` },
    ]
    infoRows.forEach((row, i) => {
      const y = 9 + i * 9
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C_MUTED_FDS)
      doc.text(row.label.toUpperCase(), rx, y)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C_DARK_FDS)
      doc.text(row.value, rx, y + 4)
    })

    doc.setFillColor(...C_DARK_FDS)
    doc.rect(0, headerH, pageW, separatorH, 'F')
    doc.setTextColor(...C_WHITE)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.text('FEUILLE DE SERVICE', 14, headerH + 6.8)
  }

  drawPageHeader()

  const drawPageFooter = (pageNum: number) => {
    doc.setDrawColor(...C_LIGHT_FDS)
    doc.setLineWidth(0.3)
    doc.line(10, pageH - 11, pageW - 10, pageH - 11)
    doc.setTextColor(...C_MUTED_FDS)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`${projectInfo?.name ?? ''} \u2014 Feuille de Service`, 10, pageH - 6)
    doc.text(`Page ${pageNum}`, pageW - 10, pageH - 6, { align: 'right' })
  }

  drawPageFooter(1)

  let yPos = headerH + separatorH + 5
  let currentPage = 1

  for (const [deptName, jobs] of Object.entries(data)) {
    const deptBarH = 8
    if (yPos + deptBarH + 22 > pageH - 14) {
      doc.addPage()
      currentPage++
      yPos = 10
      drawPageFooter(currentPage)
    }

    doc.setFillColor(...C_DARK_FDS)
    doc.rect(0, yPos, pageW, deptBarH, 'F')
    doc.setTextColor(...C_WHITE)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(deptName.toUpperCase(), 14, yPos + 5.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(
      `${jobs.length} technicien${jobs.length > 1 ? 's' : ''}`,
      pageW - 14,
      yPos + 5.5,
      { align: 'right' },
    )

    yPos += deptBarH

    const tableBody = jobs.map((job) => {
      const inter = job.project_intermittent?.intermittent
      const name = inter
        ? `${inter.firstname} ${inter.lastname}`
        : job.project_intermittent?.name ?? ''

      const contract = job.contract
      const startDate = contract?.starts_at ? formatDate(contract.starts_at) : ''
      const endDate = contract?.ends_at ? formatDate(contract.ends_at) : ''
      const periode = startDate && endDate ? `${startDate} \u2192 ${endDate}` : ''

      const rateFormatted = contract?.remuneration_rate
        ? `${contract.remuneration_rate.toFixed(2)} \u20ac/h`
        : ''

      const totalPrice = job.project_intermittent?.total_price
        ? formatCurrency(job.project_intermittent.total_price)
        : ''

      const extraSlices = contract?.remuneration_extra_slices ?? {}
      const extraLines = Object.entries(extraSlices)
        .filter(([, v]) => v.quantity > 0)
        .map(([k, v]) => `${k}\u00a0: ${v.quantity / 60}h`)
        .join(' | ')

      return [
        name,
        job.label,
        job.contract?.job_professional_category_translated ?? '',
        periode,
        contract?.remuneration_type_translated ?? '',
        contract?.remuneration_quantity ?? '',
        rateFormatted,
        contract?.remuneration_total ?? '',
        job.project_intermittent?.total_hours ?? '',
        totalPrice,
        extraLines || '\u2014',
        contract?.puid ?? '',
        contract?.status_translated ?? '',
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          'Nom Pr\u00e9nom',
          'Poste',
          'Cat\u00e9gorie',
          'P\u00e9riode contrat',
          'Type',
          'H/sem',
          'Taux horaire',
          'Salaire hebdo',
          'Total heures',
          'Co\u00fbt total',
          'Heures supp.',
          'R\u00e9f. Contrat',
          'Statut',
        ],
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: C_LIGHT_FDS,
        textColor: C_MUTED_FDS,
        fontSize: 6.5,
        fontStyle: 'bold',
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        lineColor: C_LIGHT_FDS,
        lineWidth: 0.25,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        textColor: C_DARK_FDS,
        fillColor: C_WHITE,
        lineColor: C_LIGHT_FDS,
        lineWidth: 0.25,
      },
      alternateRowStyles: { fillColor: C_WHITE },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 38, textColor: C_MUTED_FDS },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 28 },
        4: { cellWidth: 18 },
        5: { cellWidth: 11, halign: 'center' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 16, halign: 'center' },
        9: { cellWidth: 22, halign: 'right' },
        10: { cellWidth: 20 },
        11: { cellWidth: 25 },
        12: { cellWidth: 'auto', halign: 'center' },
      },
      margin: { left: 10, right: 10, bottom: 14 },
      didDrawPage: (hookData) => {
        const pg = hookData.pageNumber ?? doc.getCurrentPageInfo().pageNumber
        if (pg > currentPage) {
          currentPage = pg
          drawPageFooter(currentPage)
        }
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 6
  }

  doc.save(`feuille-de-service-${projectInfo?.slug ?? 'projet'}.pdf`)
}
