import type { Metadata, Viewport } from 'next'
import './globals.css'
import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/noto-sans-jp/700.css'
import '@fontsource/zen-maru-gothic/400.css'
import '@fontsource/zen-maru-gothic/700.css'
import '@fontsource/klee-one/400.css'
import '@fontsource/klee-one/600.css'
import '@fontsource/shippori-mincho/400.css'
import '@fontsource/shippori-mincho/700.css'
import AuthProvider from '@/components/auth/AuthProvider'
import Header from '@/components/common/Header'

export const metadata: Metadata = {
  title: '推しリンク | Oshi Link',
  description: '推しの関係性を相関図として可視化・シェアできるWebサービス',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="h-full bg-[#0f0f1a] flex flex-col">
        <AuthProvider>
          <Header />
          <div className="flex-1 min-h-0">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
