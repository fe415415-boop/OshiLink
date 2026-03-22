import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-12 pb-8 text-center text-white/30 text-xs flex items-center justify-center gap-3">
      <span>© 2026 oshilink.app</span>
      <span>|</span>
      <Link href="/privacy" className="hover:text-white/60 transition-colors">プライバシーポリシー</Link>
      <span>|</span>
      <Link href="/terms" className="hover:text-white/60 transition-colors">利用規約</Link>
      <span>|</span>
      <Link href="/contact" className="hover:text-white/60 transition-colors">お問い合わせ</Link>
    </footer>
  )
}
