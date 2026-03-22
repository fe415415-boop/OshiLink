export default function ContactPage() {
  return (
    <div className="h-full overflow-y-auto bg-[#0f0f1a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-2">お問い合わせ</h1>
        <p className="text-white/40 text-xs mb-10">Contact</p>

        <p className="text-white/70 text-sm leading-relaxed mb-10">
          推しリンクへのご意見・ご要望・不具合のご報告・その他ご質問など、お気軽にご連絡ください。
          いただいたご意見はサービス改善に活かしてまいります。
        </p>

        <div className="space-y-6">
          <div className="rounded-xl bg-white/5 border border-white/10 px-6 py-5 flex items-center gap-4">
            <span className="text-2xl shrink-0">✉️</span>
            <div>
              <p className="text-white/50 text-xs mb-1">メール</p>
              <a
                href="mailto:oshilink@gmail.com"
                className="text-violet-400 hover:text-violet-300 text-sm font-bold transition-colors"
              >
                oshilink@gmail.com
              </a>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 px-6 py-5 flex items-center gap-4">
            <span className="text-2xl shrink-0">𝕏</span>
            <div>
              <p className="text-white/50 text-xs mb-1">X (Twitter)</p>
              <a
                href="https://x.com/OshiLink"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 text-sm font-bold transition-colors"
              >
                @OshiLink
              </a>
            </div>
          </div>
        </div>

        <p className="text-white/40 text-xs mt-10 leading-relaxed">
          内容によってはご返信までにお時間をいただく場合があります。あらかじめご了承ください。
        </p>
      </div>
    </div>
  )
}
