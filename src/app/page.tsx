'use client'

import { useState, useCallback, useRef } from 'react'
import { generateListeTechnique, generateFeuilleDeService } from '../lib/pdfGenerators'
import type { CrewData } from '../lib/types'

type DocType = 'liste_technique' | 'feuille_de_service'

const DOC_TYPES: { id: DocType; label: string; desc: string; emoji: string; color: string }[] = [
  {
    id: 'liste_technique',
    label: 'Liste Technique',
    desc: 'Équipe par département — Nom, poste, téléphone, email',
    emoji: '👥',
    color: 'blue',
  },
  {
    id: 'feuille_de_service',
    label: 'Feuille de Service',
    desc: 'Détail des engagements — Période, heures, rémunération',
    emoji: '📋',
    color: 'green',
  },
]

export default function Home() {
  const [crewData, setCrewData] = useState<CrewData | null>(null)
  const [docType, setDocType] = useState<DocType>('liste_technique')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Veuillez déposer un fichier JSON (.json)')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as CrewData
        setCrewData(parsed)
        setFileName(file.name)
        setError('')
      } catch {
        setError('Impossible de lire le fichier JSON. Vérifiez le format.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleGenerate = async () => {
    if (!crewData || isGenerating) return
    setIsGenerating(true)
    setError('')
    try {
      if (docType === 'liste_technique') {
        await generateListeTechnique(crewData)
      } else {
        await generateFeuilleDeService(crewData)
      }
    } catch (err) {
      console.error(err)
      setError('Erreur lors de la génération du PDF. Vérifiez la console.')
    } finally {
      setIsGenerating(false)
    }
  }

  const totalPersons = crewData
    ? Object.values(crewData).reduce((s, j) => s + j.length, 0)
    : 0
  const totalDepts = crewData ? Object.keys(crewData).length : 0
  const projectName =
    crewData
      ? (Object.values(crewData)[0]?.[0]?.contract?.project?.name ?? '')
      : ''

  const selectedDocType = DOC_TYPES.find((d) => d.id === docType)!

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 bg-white rounded-2xl px-5 py-2.5 shadow-sm border border-slate-100 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1E3A5F' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-wide" style={{ color: '#1E3A5F' }}>
              ITSI-APP
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Générateur de Documents</h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Importez votre JSON de projet pour générer un PDF professionnel
          </p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Drop zone */}
          <div className="p-6">
            <div
              className={[
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer select-none transition-all duration-200',
                isDragging
                  ? 'border-blue-400 bg-blue-50 scale-[1.01]'
                  : crewData
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50',
              ].join(' ')}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={onFileChange}
              />

              {crewData ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">{fileName}</p>
                    {projectName && (
                      <p className="text-xs text-slate-500 mt-0.5">Projet : {projectName}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="bg-slate-100 text-slate-600 text-xs font-medium rounded-full px-3 py-1">
                      👥 {totalPersons} techniciens
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-xs font-medium rounded-full px-3 py-1">
                      🏢 {totalDepts} départements
                    </span>
                  </div>
                  <p className="text-xs text-blue-500">Cliquer pour changer de fichier</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">
                      {isDragging ? 'Relâchez ici !' : 'Glissez votre fichier JSON'}
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5">ou cliquez pour parcourir</p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Document type selector — shown only when data is loaded */}
          {crewData && (
            <div className="px-6 pb-6 border-t border-slate-50 pt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Type de document
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {DOC_TYPES.map(({ id, label, desc, emoji, color }) => {
                  const isSelected = docType === id
                  const borderColor =
                    isSelected
                      ? color === 'blue'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                  return (
                    <button
                      key={id}
                      onClick={() => setDocType(id)}
                      className={[
                        'p-4 rounded-2xl border-2 text-left transition-all duration-150',
                        borderColor,
                      ].join(' ')}
                    >
                      <div className="text-2xl mb-2">{emoji}</div>
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{label}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">{desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={[
                  'w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2',
                  isGenerating
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'text-white shadow-sm hover:shadow-md active:scale-[0.98]',
                ].join(' ')}
                style={
                  isGenerating
                    ? {}
                    : { backgroundColor: '#1E3A5F' }
                }
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Génération en cours…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Télécharger — {selectedDocType.label}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-5">
          Traitement 100 % local — aucune donnée envoyée vers un serveur
        </p>
      </div>
    </main>
  )
}
