'use client'

import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import type { CrewData, ListeOverrides, InfoSection, InfoSectionType, CrewRowOverride } from '../lib/types'

// ── Palette ───────────────────────────────────────────────────────────────────
const DARK   = '#2D2B48'
const CARD   = '#f4f4f6'
const BORDER = '#e0e0e0'
const MUTED  = '#666666'

// ── Section config ────────────────────────────────────────────────────────────
export const SECTION_CONFIG: Record<InfoSectionType, { label: string; multi: boolean }> = {
  agence:               { label: 'AGENCE',               multi: true  },
  client:               { label: 'CLIENT',               multi: true  },
  production_executive: { label: 'PRODUCTION EXECUTIVE', multi: true  },
  production_delegue:   { label: 'PRODUCTION DÉLÉGUÉE',  multi: true  },
  realisateur:          { label: 'RÉALISATEUR',          multi: false },
  agent_realisateur:    { label: 'AGENT RÉALISATEUR',    multi: true  },
  agent_chef_operateur: { label: 'AGENT CHEF OPÉRATEUR', multi: true  },
}

// ── Formatting helpers ────────────────────────────────────────────────────────
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

// ── Inline editable cell ──────────────────────────────────────────────────────
function EditableCell({
  value, onSave, style, placeholder = '—',
}: {
  value: string; onSave: (v: string) => void
  style?: CSSProperties; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(value)
  const [hover,   setHover]   = useState(false)

  useEffect(() => { setDraft(value) }, [value])

  const commit = (v: string) => { onSave(v); setEditing(false) }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={e => {
          if (e.key === 'Enter')  commit(draft)
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        style={{
          ...style,
          border: 'none', outline: `1.5px solid ${DARK}`, outlineOffset: '-1px',
          borderRadius: 2, background: 'rgba(45,43,72,0.06)',
          width: '100%', padding: '2px 4px', boxSizing: 'border-box',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      />
    )
  }
  return (
    <span
      onClick={() => setEditing(true)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Cliquer pour modifier"
      style={{
        ...style, cursor: 'text', display: 'block', padding: '2px 3px',
        borderRadius: 2, minHeight: '1.2em',
        background: hover ? 'rgba(45,43,72,0.05)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {value || <span style={{ color: '#ccc', fontStyle: 'italic' }}>{placeholder}</span>}
    </span>
  )
}

// ── Cell style factory ────────────────────────────────────────────────────────
function tdStyle(opts?: {
  italic?: boolean; bold?: boolean; muted?: boolean; small?: boolean; bl?: boolean
}): CSSProperties {
  return {
    padding: '4px 8px', fontStyle: opts?.italic ? 'italic' : 'normal',
    fontWeight: opts?.bold ? 'bold' : 'normal', color: opts?.muted ? MUTED : '#111',
    fontSize: opts?.small ? '10px' : '11px',
    borderLeft: opts?.bl ? `0.4px solid ${BORDER}` : undefined,
    verticalAlign: 'middle',
  }
}

// ── InfoCell — editable td ────────────────────────────────────────────────────
function InfoCell({ value, onSave, opts }: {
  value: string; onSave: (v: string) => void
  opts?: Parameters<typeof tdStyle>[0]
}) {
  return (
    <div style={{ ...tdStyle(opts), padding: 0 }}>
      <EditableCell value={value} onSave={onSave} style={{ ...tdStyle(opts), padding: '4px 8px', display: 'block' }} />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CrewPreview({
  data, overrides = {}, onOverride,
}: {
  data: CrewData; overrides?: ListeOverrides
  onOverride?: (patch: Partial<ListeOverrides>) => void
}) {
  const first  = Object.values(data)[0]?.[0]
  const proj   = first?.contract?.project
  const prod   = first?.contract?.production_name ?? '—'
  const name   = proj?.name ?? '—'
  const period = proj?.start_date
    ? `${formatDate(proj.start_date)} \u2192 ${formatDate(proj.end_date ?? '')}`
    : '—'
  const siret  = proj?.pseudo_siret
  const pe     = proj?.pole_emploi_object_number

  const effectiveProd = overrides.productionName ?? prod
  const effectiveFilm = overrides.filmName        ?? name

  const footerParts = [
    effectiveFilm,
    `Production\u00a0: ${effectiveProd}`,
    pe    && `N°\u00a0objet\u00a0: ${pe}`,
    siret && `SIRET\u00a0: ${siret}`,
  ].filter(Boolean).join(' \u00b7 ')

  // ── Section row helpers ───────────────────────────────────────────────────
  const patchSection = (si: number, patch: Partial<InfoSection>) => {
    const newSections = [...(overrides.sections ?? [])]
    newSections[si] = { ...newSections[si], ...patch }
    onOverride?.({ sections: newSections })
  }

  const patchCell = (si: number, ri: number, col: 'col0' | 'col1' | 'col2' | 'col3', val: string) => {
    const section = overrides.sections?.[si]
    if (!section) return
    const newRows = [...section.rows]
    newRows[ri] = { ...newRows[ri], [col]: val }
    patchSection(si, { rows: newRows })
  }

  const addRow = (si: number) => {
    const section = overrides.sections?.[si]
    if (!section) return
    patchSection(si, { rows: [...section.rows, {}] })
  }

  const removeRow = (si: number, ri: number) => {
    const section = overrides.sections?.[si]
    if (!section) return
    const newRows = section.rows.filter((_, i) => i !== ri)
    patchSection(si, { rows: newRows.length > 0 ? newRows : [{}] })
  }

  const activeSections = overrides.sections ?? []

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px', color: '#111', lineHeight: 1.4 }}>

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <div style={{ flex: 1, background: CARD, borderRadius: 4, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.04em' }}>CREW LIST</span>
        </div>
        <div style={{ flex: 1, background: CARD, borderRadius: 4, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {([
            { lbl: 'PRODUCTION',     val: effectiveProd, save: (v: string) => onOverride?.({ productionName: v }) },
            { lbl: 'FILM',           val: effectiveFilm, save: (v: string) => onOverride?.({ filmName: v }) },
            { lbl: 'DATES TOURNAGE', val: period, readOnly: true },
            ...(overrides.studioDecor !== undefined
              ? [{ lbl: 'STUDIO / DÉCOR', val: overrides.studioDecor, save: (v: string) => onOverride?.({ studioDecor: v }) }]
              : []),
          ] as { lbl: string; val: string; save?: (v: string) => void; readOnly?: boolean }[])
            .map(({ lbl, val, save, readOnly }) => (
              <div key={lbl}>
                <div style={{ fontSize: '8px', color: MUTED, fontWeight: 'bold', marginBottom: '1px' }}>{lbl}</div>
                {readOnly
                  ? <div style={{ fontSize: '10px' }}>{val}</div>
                  : <EditableCell value={val} onSave={save!} style={{ fontSize: '10px' }} />}
              </div>
            ))}
          {overrides.studioDecor === undefined && (
            <button
              onClick={() => onOverride?.({ studioDecor: '' })}
              style={{ marginTop: '2px', fontSize: '9px', color: MUTED, background: 'none', border: `1px dashed ${BORDER}`, borderRadius: 3, padding: '2px 6px', cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              + Studio / Décor
            </button>
          )}
        </div>
      </div>

      {/* ── INFO BLOCK ───────────────────────────────────────────────────────── */}
      {(activeSections.length > 0 || true) && (
        <div style={{ border: `0.4px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden', marginBottom: '8px' }}>

          {/* Dynamic sections */}
          {activeSections.map((section, si) => {
            const cfg = SECTION_CONFIG[section.type]
            return (
              <div key={`${section.type}-${si}`}>
                <div style={{ background: DARK, color: '#fff', padding: '4px 8px', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase' }}>
                  {cfg.label}
                </div>
                {section.rows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', alignItems: 'stretch', background: ri % 2 === 1 ? CARD : '#fff' }}>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 2fr 1.3fr 2fr' }}>
                      <InfoCell value={row.col0 ?? ''} onSave={v => patchCell(si, ri, 'col0', v)} opts={{ italic: true, muted: true }} />
                      <InfoCell value={row.col1 ?? ''} onSave={v => patchCell(si, ri, 'col1', v)} opts={{ bold: true, bl: true }} />
                      <InfoCell value={row.col2 ?? ''} onSave={v => patchCell(si, ri, 'col2', v)} opts={{ muted: true, bl: true }} />
                      <InfoCell value={row.col3 ?? ''} onSave={v => patchCell(si, ri, 'col3', v)} opts={{ muted: true, small: true, bl: true }} />
                    </div>
                    {cfg.multi && section.rows.length > 1 && (
                      <button
                        onClick={() => removeRow(si, ri)}
                        title="Supprimer cette ligne"
                        style={{ padding: '0 6px', background: 'none', border: 'none', borderLeft: `0.4px solid ${BORDER}`, color: '#ccc', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {cfg.multi && (
                  <button
                    onClick={() => addRow(si)}
                    style={{ display: 'block', width: '100%', padding: '3px 8px', background: 'none', border: 'none', borderTop: `0.4px solid ${BORDER}`, color: MUTED, fontSize: '9px', cursor: 'pointer', textAlign: 'left' }}
                  >
                    + Ligne
                  </button>
                )}
              </div>
            )
          })}

          {/* Fixed PRODUCTION section */}
          <div>
            <div style={{ background: DARK, color: '#fff', padding: '4px 8px', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase' }}>
              PRODUCTION
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.3fr 2fr' }}>
              <div style={tdStyle({ italic: true, muted: true })}>{effectiveProd}</div>
              <div style={tdStyle({ bold: true, bl: true })}></div>
              <div style={tdStyle({ muted: true, bl: true })}></div>
              <div style={tdStyle({ muted: true, small: true, bl: true })}></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.3fr 2fr', background: CARD }}>
              <div style={tdStyle({ italic: true, muted: true })}>Producteur</div>
              <InfoCell value={overrides.producteurRow?.col1 ?? ''} onSave={v => onOverride?.({ producteurRow: { ...overrides.producteurRow, col1: v } })} opts={{ bold: true, bl: true }} />
              <InfoCell value={overrides.producteurRow?.col2 ?? ''} onSave={v => onOverride?.({ producteurRow: { ...overrides.producteurRow, col2: v } })} opts={{ muted: true, bl: true }} />
              <InfoCell value={overrides.producteurRow?.col3 ?? ''} onSave={v => onOverride?.({ producteurRow: { ...overrides.producteurRow, col3: v } })} opts={{ muted: true, small: true, bl: true }} />
            </div>
          </div>
        </div>
      )}

      {/* ── LISTE TECHNIQUE ──────────────────────────────────────────────────── */}
      <div style={{ background: DARK, color: '#fff', borderRadius: 4, padding: '6px 0', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '8px' }}>
        LISTE TECHNIQUE
      </div>

      {/* ── DEPARTMENT CARDS ─────────────────────────────────────────────────── */}
      {Object.entries(data).map(([dept, jobs]) => (
        <div key={dept} style={{ border: `0.4px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden', marginBottom: '6px' }}>
          <div style={{ background: DARK, color: '#fff', padding: '5px 8px', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}>
            {dept}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {jobs.map((job, idx) => {
                const inter  = job.project_intermittent?.intermittent
                const rowKey = `${dept}::${idx}`
                const ov: CrewRowOverride = overrides.crewRows?.[rowKey] ?? {}

                const defaultLabel = job.label
                const defaultName  = inter ? `${inter.firstname} ${inter.lastname}` : job.project_intermittent?.name ?? '—'
                const defaultPhone = inter?.mobile_number ? formatPhone(inter.mobile_number) : '—'
                const defaultEmail = job.project_intermittent?.email ?? inter?.email ?? '—'

                const patchCrew = (patch: Partial<CrewRowOverride>) =>
                  onOverride?.({ crewRows: { ...overrides.crewRows, [rowKey]: { ...ov, ...patch } } })

                return (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? CARD : '#fff' }}>
                    <td style={{ ...tdStyle({ italic: true, muted: true }), width: '26%', padding: 0 }}>
                      <EditableCell value={ov.label ?? defaultLabel} onSave={v => patchCrew({ label: v })} style={{ ...tdStyle({ italic: true, muted: true }), padding: '4px 8px', display: 'block' }} />
                    </td>
                    <td style={{ ...tdStyle({ bold: true, bl: true }), width: '27%', padding: 0 }}>
                      <EditableCell value={ov.name ?? defaultName} onSave={v => patchCrew({ name: v })} style={{ ...tdStyle({ bold: true }), padding: '4px 8px', display: 'block' }} />
                    </td>
                    <td style={{ ...tdStyle({ muted: true, bl: true }), width: '18%', padding: 0 }}>
                      <EditableCell value={ov.phone ?? defaultPhone} onSave={v => patchCrew({ phone: v })} style={{ ...tdStyle({ muted: true }), padding: '4px 8px', display: 'block', whiteSpace: 'nowrap' }} />
                    </td>
                    <td style={{ ...tdStyle({ muted: true, small: true, bl: true }), width: '29%', padding: 0 }}>
                      <EditableCell value={ov.email ?? defaultEmail} onSave={v => patchCrew({ email: v })} style={{ ...tdStyle({ muted: true, small: true }), padding: '4px 8px', display: 'block' }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `0.4px solid ${BORDER}`, paddingTop: '6px', color: MUTED, fontSize: '10px', marginTop: '4px' }}>
        {footerParts}
      </div>
    </div>
  )
}
