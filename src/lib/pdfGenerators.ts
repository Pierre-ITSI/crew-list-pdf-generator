import type { CrewData, ProjectJob } from './types'

// ─── Palette ─────────────────────────────────────────────────────────────────
const C_DARK:  [number, number, number] = [41, 40, 61]    // #29283d
const C_MUTED: [number, number, number] = [105, 103, 134] // #696786
const C_LIGHT: [number, number, number] = [233, 232, 234] // #e9e8ea
const C_WHITE: [number, number, number] = [255, 255, 255] // #ffffff

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
  const firstDept = Object.values(data)[0]
  const firstJob: ProjectJob | undefined = firstDept?.[0]
  if (!firstJob) return null

  const project =
    firstJob.contract?.project ?? firstJob.project_intermittent?.project

  return {
    name: project?.name ?? 'Projet',
    startDate: project?.start_date ?? '',
    endDate: project?.end_date ?? '',
    productionName: firstJob.contract?.production_name ?? 'Production',
    slug: project?.slug ?? 'projet',
  }
}

// ─── Liste Technique ─────────────────────────────────────────────────────────

export async function generateListeTechnique(data: CrewData): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()   // 210
  const pageH = doc.internal.pageSize.getHeight()  // 297

  const projectInfo = getProjectInfo(data)
  const totalPersons = Object.values(data).reduce((s, j) => s + j.length, 0)
  const totalDepts = Object.keys(data).length
  const period = projectInfo
    ? `${formatDate(projectInfo.startDate)} \u2192 ${formatDate(projectInfo.endDate)}`
    : ''

  const headerH = 52
  const separatorH = 10

  // ── Page header (first page only — called manually)
  const drawPageHeader = () => {
    // Light-gray background block
    doc.setFillColor(...C_LIGHT)
    doc.rect(0, 0, pageW, headerH, 'F')

    // Left — CREW LIST title + project name
    doc.setTextColor(...C_DARK)
    doc.setFontSize(26)
    doc.setFont('helvetica', 'bold')
    doc.text('CREW LIST', 14, 22)

    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C_MUTED)
    doc.text(projectInfo?.name ?? '', 14, 32)

    doc.setFontSize(7.5)
    doc.text(`G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString('fr-FR')}`, 14, 41)

    // Right — production info block
    const rx = 116
    const infoRows = [
      { label: 'Production', value: projectInfo?.productionName ?? '' },
      { label: 'P\u00e9riode', value: period },
      { label: 'Techniciens', value: `${totalPersons}` },
      { label: 'D\u00e9partements', value: `${totalDepts}` },
    ]
    infoRows.forEach((row, i) => {
      const y = 13 + i * 10
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...C_MUTED)
      doc.text(row.label.toUpperCase(), rx, y)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C_DARK)
      doc.text(row.value, rx, y + 4)
    })

    // Dark separator bar
    doc.setFillColor(...C_DARK)
    doc.rect(0, headerH, pageW, separatorH, 'F')
    doc.setTextColor(...C_WHITE)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.text('LISTE TECHNIQUE', 14, headerH + 6.8)
  }

  drawPageHeader()

  // ── Page footer
  const drawPageFooter = (pageNum: number) => {
    doc.setDrawColor(...C_LIGHT)
    doc.setLineWidth(0.3)
    doc.line(14, pageH - 11, pageW - 14, pageH - 11)
    doc.setTextColor(...C_MUTED)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`${projectInfo?.name ?? ''} \u2014 Liste Technique`, 14, pageH - 6)
    doc.text(`Page ${pageNum}`, pageW - 14, pageH - 6, { align: 'right' })
  }

  drawPageFooter(1)

  let yPos = headerH + separatorH + 5
  let globalCounter = 0
  let currentPage = 1

  for (const [deptName, jobs] of Object.entries(data)) {
    const deptBarH = 8
    if (yPos + deptBarH + 22 > pageH - 14) {
      doc.addPage()
      currentPage++
      yPos = 10
      drawPageFooter(currentPage)
    }

    // Department header bar
    doc.setFillColor(...C_DARK)
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

    // Table rows
    const tableBody = jobs.map((job) => {
      globalCounter++
      const inter = job.project_intermittent?.intermittent
      const name = inter
        ? `${inter.firstname} ${inter.lastname}`
        : job.project_intermittent?.name ?? ''
      const phone = inter?.mobile_number ? formatPhone(inter.mobile_number) : ''
      const email = job.project_intermittent?.email ?? ''

      return [globalCounter.toString(), job.label.toUpperCase(), name, phone, email]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'POSTE', 'NOM PR\u00c9NOM', 'T\u00c9L\u00c9PHONE', 'EMAIL']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: C_LIGHT,
        textColor: C_MUTED,
        fontSize: 7,
        fontStyle: 'bold',
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineColor: C_LIGHT,
        lineWidth: 0.25,
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        textColor: C_DARK,
        fillColor: C_WHITE,
        lineColor: C_LIGHT,
        lineWidth: 0.25,
      },
      alternateRowStyles: { fillColor: C_WHITE },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center', textColor: C_MUTED },
        1: { cellWidth: 55, textColor: C_MUTED },
        2: { cellWidth: 42 },
        3: { cellWidth: 28 },
        4: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14, bottom: 14 },
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

  doc.save(`liste-technique-${projectInfo?.slug ?? 'projet'}.pdf`)
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
    doc.setFillColor(...C_LIGHT)
    doc.rect(0, 0, pageW, headerH, 'F')

    doc.setTextColor(...C_DARK)
    doc.setFontSize(26)
    doc.setFont('helvetica', 'bold')
    doc.text('CREW LIST', 14, 18)

    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C_MUTED)
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
      doc.setTextColor(...C_MUTED)
      doc.text(row.label.toUpperCase(), rx, y)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C_DARK)
      doc.text(row.value, rx, y + 4)
    })

    doc.setFillColor(...C_DARK)
    doc.rect(0, headerH, pageW, separatorH, 'F')
    doc.setTextColor(...C_WHITE)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.text('FEUILLE DE SERVICE', 14, headerH + 6.8)
  }

  drawPageHeader()

  const drawPageFooter = (pageNum: number) => {
    doc.setDrawColor(...C_LIGHT)
    doc.setLineWidth(0.3)
    doc.line(10, pageH - 11, pageW - 10, pageH - 11)
    doc.setTextColor(...C_MUTED)
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

    doc.setFillColor(...C_DARK)
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
        fillColor: C_LIGHT,
        textColor: C_MUTED,
        fontSize: 6.5,
        fontStyle: 'bold',
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        lineColor: C_LIGHT,
        lineWidth: 0.25,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        textColor: C_DARK,
        fillColor: C_WHITE,
        lineColor: C_LIGHT,
        lineWidth: 0.25,
      },
      alternateRowStyles: { fillColor: C_WHITE },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 38, textColor: C_MUTED },
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
