import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Générateur de Documents — ITSI-APP',
  description: 'Générez vos listes techniques et feuilles de service à partir de vos données de projet',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  )
}
