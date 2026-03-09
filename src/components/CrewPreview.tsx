'use client'

import type { CSSProperties } from 'react'
import type { CrewData } from '../lib/types'

// ── Palette (mirrors pdfGenerators.ts) ───────────────────────────────────────
const DARK   = '#2D2B48'
const CARD   = '#f4f4f6'
const BORDER = '#e0e0e0'
const MUTED  = '#666666'

// ── Local formatting helpers ──────────────────────────────────────────────────
function formatDate(d: string): string {
  if (!d) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  }
  try {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris',
    })
  } catch { return d }
}

function formatPhone(p: string): string {
  if (!p) return ''
  const c = p.replace(/\D/g, '')
  return c.length === 10
    ? c.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
    : p
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CrewPreview({ data }: { data: CrewData }) {
  const first  = Object.values(data)[0]?.[0]
  const proj   = first?.contract?.project
  const prod   = first?.contract?.production_name ?? '—'
  const name   = proj?.name ?? '—'
  const period = proj?.start_date
    ? `${formatDate(proj.start_date)} \u2192 ${formatDate(proj.end_date ?? '')}`
    : '—'
  const siret  = proj?.pseudo_siret
  const pe     = proj?.pole_emploi_object_number

  const footerParts = [
    name,
    `Production\u00a0: ${prod}`,
    pe    && `N°\u00a0objet\u00a0: ${pe}`,
    siret && `SIRET\u00a0: ${siret}`,
  ].filter(Boolean).join(' \u00b7 ')

  // Shared cell style factory
  const td = (opts?: {
    italic?: boolean; bold?: boolean; muted?: boolean
    small?: boolean;  bl?: boolean
  }): CSSProperties => ({
    padding:     '4px 8px',
    fontStyle:   opts?.italic ? 'italic'  : 'normal',
    fontWeight:  opts?.bold   ? 'bold'    : 'normal',
    color:       opts?.muted  ? MUTED     : '#111',
    fontSize:    opts?.small  ? '10px'    : '11px',
    borderLeft:  opts?.bl     ? `0.4px solid ${BORDER}` : undefined,
    verticalAlign: 'middle',
  })

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px', color: '#111', lineHeight: 1.4 }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        {/* CREW LIST card */}
        <div style={{ flex: 1, background: CARD, borderRadius: 4, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.04em' }}>CREW LIST</span>
        </div>
        {/* Meta card */}
        <div style={{ flex: 1, background: CARD, borderRadius: 4, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {([['PRODUCTION', prod], ['FILM', name], ['DATES TOURNAGE', period]] as const).map(([lbl, val]) => (
            <div key={lbl}>
              <div style={{ fontSize: '8px', color: MUTED, fontWeight: 'bold', marginBottom: '1px' }}>{lbl}</div>
              <div style={{ fontSize: '10px' }}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── INFO BLOCK ─────────────────────────────────────────────────────── */}
      <div style={{ border: `0.4px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden', marginBottom: '8px' }}>
        {([
          { lbl: 'CLIENT',     rows: [['—', '—', '—', '—']]                               },
          { lbl: 'AGENCE',     rows: [['—', '—', '—', '—']]                               },
          { lbl: 'PRODUCTION', rows: [[prod, '', '', ''], ['Producteur', '—', '—', '—']]  },
        ] as const).map(({ lbl, rows }) => (
          <div key={lbl}>
            <div style={{ background: DARK, color: '#fff', padding: '4px 8px', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase' }}>
              {lbl}
            </div>
            {rows.map((cells, ri) => (
              <div key={ri} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.3fr 2fr', background: ri % 2 === 1 ? CARD : '#fff' }}>
                <div style={td({ italic: true, muted: true })}>{cells[0]}</div>
                <div style={td({ bold: true, bl: true })}>{cells[1]}</div>
                <div style={td({ muted: true, bl: true })}>{cells[2]}</div>
                <div style={td({ muted: true, small: true, bl: true })}>{cells[3]}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── LISTE TECHNIQUE title ───────────────────────────────────────────── */}
      <div style={{ background: DARK, color: '#fff', borderRadius: 4, padding: '6px 0', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '8px' }}>
        LISTE TECHNIQUE
      </div>

      {/* ── DEPARTMENT CARDS ───────────────────────────────────────────────── */}
      {Object.entries(data).map(([dept, jobs]) => (
        <div key={dept} style={{ border: `0.4px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden', marginBottom: '6px' }}>
          <div style={{ background: DARK, color: '#fff', padding: '5px 8px', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}>
            {dept}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {jobs.map((job, idx) => {
                const inter = job.project_intermittent?.intermittent
                const n  = inter
                  ? `${inter.firstname} ${inter.lastname}`
                  : job.project_intermittent?.name ?? '—'
                const ph = inter?.mobile_number ? formatPhone(inter.mobile_number) : '—'
                const em = job.project_intermittent?.email ?? inter?.email ?? '—'
                return (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? CARD : '#fff' }}>
                    <td style={{ ...td({ italic: true, muted: true }), width: '26%' }}>{job.label}</td>
                    <td style={{ ...td({ bold: true, bl: true }), width: '27%' }}>{n}</td>
                    <td style={{ ...td({ muted: true, bl: true }), width: '18%', whiteSpace: 'nowrap' }}>{ph}</td>
                    <td style={{ ...td({ muted: true, small: true, bl: true }), width: '29%' }}>{em}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `0.4px solid ${BORDER}`, paddingTop: '6px', color: MUTED, fontSize: '10px', marginTop: '4px' }}>
        {footerParts}
      </div>
    </div>
  )
}
