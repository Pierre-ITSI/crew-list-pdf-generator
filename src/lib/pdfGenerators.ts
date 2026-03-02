import type { CrewData, ProjectJob } from './types'

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  try {
    // Handle plain date strings like "2025-10-06"
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-')
      return `${d}/${m}/${y}`
    }
    // Handle ISO datetime strings — display in Paris timezone
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
  }) + ' €'
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

const NAVY: [number, number, number] = [30, 58, 95]
const BLUE: [number, number, number] = [74, 144, 217]
const LIGHT_BLUE: [number, number, number] = [240, 247, 255]
const GREEN: [number, number, number] = [34, 139, 87]
const LIGHT_GREEN: [number, number, number] = [240, 252, 246]
const WHITE: [number, number, number] = [255, 255, 255]
const DARK: [number, number, number] = [30, 30, 30]

// ─── Liste Technique ────────────────────────────────────────────────────────

export async function generateListeTechnique(data: CrewData): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const projectInfo = getProjectInfo(data)
  const totalPersons = Object.values(data).reduce((s, j) => s + j.length, 0)
  const totalDepts = Object.keys(data).length

  // ── Page header (drawn on first page only via initial draw)
  const drawPageHeader = () => {
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, pageW, 44, 'F')

    doc.setTextColor(...WHITE)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('LISTE TECHNIQUE', 14, 16)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(projectInfo?.name ?? '', 14, 26)

    doc.setFontSize(8)
    const period =
      projectInfo
        ? `${formatDate(projectInfo.startDate)} \u2192 ${formatDate(projectInfo.endDate)}`
        : ''
    doc.text(
      `Production\u00a0: ${projectInfo?.productionName}   \u2022   P\u00e9riode\u00a0: ${period}   \u2022   ${totalPersons} techniciens   \u2022   ${totalDepts} d\u00e9partements`,
      14,
      35,
    )
    doc.text(
      `G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString('fr-FR')}`,
      pageW - 14,
      35,
      { align: 'right' },
    )
  }

  drawPageHeader()

  // ── Page footer
  const drawPageFooter = (pageNum: number) => {
    doc.setFillColor(...NAVY)
    doc.rect(0, pageH - 9, pageW, 9, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(7)
    doc.text(
      `${projectInfo?.name ?? ''} \u2014 Liste Technique \u2014 ITSI-APP`,
      14,
      pageH - 3,
    )
    doc.text(`Page ${pageNum}`, pageW - 14, pageH - 3, { align: 'right' })
  }

  drawPageFooter(1)

  let yPos = 53
  let globalCounter = 0
  let currentPage = 1

  for (const [deptName, jobs] of Object.entries(data)) {
    // ── Department header bar
    const deptBarH = 9
    if (yPos + deptBarH + 20 > pageH - 12) {
      doc.addPage()
      currentPage++
      yPos = 10
      drawPageFooter(currentPage)
    }

    doc.setFillColor(...BLUE)
    doc.rect(0, yPos, pageW, deptBarH, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(deptName, 14, yPos + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(
      `${jobs.length} technicien${jobs.length > 1 ? 's' : ''}`,
      pageW - 14,
      yPos + 6,
      { align: 'right' },
    )

    yPos += deptBarH + 1

    // ── Table rows
    const tableBody = jobs.map((job) => {
      globalCounter++
      const inter = job.project_intermittent?.intermittent
      const name = inter
        ? `${inter.firstname} ${inter.lastname}`
        : job.project_intermittent?.name ?? ''
      const phone = inter?.mobile_number ? formatPhone(inter.mobile_number) : ''
      const email = job.project_intermittent?.email ?? ''
      const contractRef = job.contract?.puid ?? ''
      const category = job.contract?.job_professional_category_translated ?? ''

      return [
        globalCounter.toString(),
        job.label,
        name,
        phone,
        email,
        category,
        contractRef,
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [
        ['#', 'Poste', 'Nom Prénom', 'Téléphone', 'Email', 'Catégorie', 'Réf. Contrat'],
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        textColor: DARK,
      },
      alternateRowStyles: { fillColor: LIGHT_BLUE },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 52 },
        2: { cellWidth: 36 },
        3: { cellWidth: 24 },
        4: { cellWidth: 40 },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14, bottom: 12 },
      didDrawPage: (hookData) => {
        const pg = hookData.pageNumber ?? doc.getCurrentPageInfo().pageNumber
        if (pg > currentPage) {
          currentPage = pg
          drawPageFooter(currentPage)
        }
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  doc.save(`liste-technique-${projectInfo?.slug ?? 'projet'}.pdf`)
}

// ─── Feuille de Service ─────────────────────────────────────────────────────

export async function generateFeuilleDeService(data: CrewData): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const projectInfo = getProjectInfo(data)
  const totalPersons = Object.values(data).reduce((s, j) => s + j.length, 0)

  // ── Page header
  const drawPageHeader = () => {
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, pageW, 40, 'F')

    doc.setTextColor(...WHITE)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('FEUILLE DE SERVICE', 14, 15)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(projectInfo?.name ?? '', 14, 25)

    doc.setFontSize(8)
    const period =
      projectInfo
        ? `${formatDate(projectInfo.startDate)} \u2192 ${formatDate(projectInfo.endDate)}`
        : ''
    doc.text(
      `Production\u00a0: ${projectInfo?.productionName}   \u2022   P\u00e9riode\u00a0: ${period}   \u2022   ${totalPersons} techniciens`,
      14,
      33,
    )
    doc.text(
      `G\u00e9n\u00e9r\u00e9 le ${new Date().toLocaleDateString('fr-FR')}`,
      pageW - 14,
      33,
      { align: 'right' },
    )
  }

  drawPageHeader()

  // ── Page footer
  const drawPageFooter = (pageNum: number) => {
    doc.setFillColor(...NAVY)
    doc.rect(0, pageH - 9, pageW, 9, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(7)
    doc.text(
      `${projectInfo?.name ?? ''} \u2014 Feuille de Service \u2014 ITSI-APP`,
      14,
      pageH - 3,
    )
    doc.text(`Page ${pageNum}`, pageW - 14, pageH - 3, { align: 'right' })
  }

  drawPageFooter(1)

  let yPos = 48
  let currentPage = 1

  for (const [deptName, jobs] of Object.entries(data)) {
    const deptBarH = 9
    if (yPos + deptBarH + 20 > pageH - 12) {
      doc.addPage()
      currentPage++
      yPos = 10
      drawPageFooter(currentPage)
    }

    // ── Department header bar
    doc.setFillColor(...GREEN)
    doc.rect(0, yPos, pageW, deptBarH, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(deptName, 14, yPos + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(
      `${jobs.length} technicien${jobs.length > 1 ? 's' : ''}`,
      pageW - 14,
      yPos + 6,
      { align: 'right' },
    )

    yPos += deptBarH + 1

    // ── Table rows
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
        .map(([k, v]) => `${k}: ${v.quantity / 60}h`)
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
        extraLines || '—',
        contract?.puid ?? '',
        contract?.status_translated ?? '',
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [
        [
          'Nom Prénom',
          'Poste',
          'Catégorie',
          'Période contrat',
          'Type',
          'H/sem',
          'Taux horaire',
          'Salaire hebdo',
          'Total heures',
          'Coût total',
          'Heures supp.',
          'Réf. Contrat',
          'Statut',
        ],
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: NAVY,
        textColor: WHITE,
        fontSize: 7,
        fontStyle: 'bold',
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        textColor: DARK,
      },
      alternateRowStyles: { fillColor: LIGHT_GREEN },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 32 },
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
      margin: { left: 10, right: 10, bottom: 12 },
      didDrawPage: (hookData) => {
        const pg = hookData.pageNumber ?? doc.getCurrentPageInfo().pageNumber
        if (pg > currentPage) {
          currentPage = pg
          drawPageFooter(currentPage)
        }
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  doc.save(`feuille-de-service-${projectInfo?.slug ?? 'projet'}.pdf`)
}
