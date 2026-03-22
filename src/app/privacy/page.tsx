export default function PrivacyPage() {
  return (
    <div className="h-full overflow-y-auto bg-[#0f0f1a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-2">プライバシーポリシー</h1>
        <p className="text-white/40 text-xs mb-8">最終更新日：2026年3月22日</p>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">1. 事業者情報</h2>
          <div className="text-white/70 text-sm leading-relaxed">
            <p>本プライバシーポリシーは、oshilink.app（以下「当サービス」）が提供する推し相関図作成・共有サービスにおける個人情報の取り扱いについて定めるものです。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">2. 収集する情報</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>当サービスでは、以下の情報を収集する場合があります。</p>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="text-white/90">メールアドレス</span>：アカウント登録・ログイン認証に使用</li>
              <li><span className="text-white/90">アップロード画像</span>：テンプレートのキャラクター画像として利用</li>
              <li><span className="text-white/90">アクセスログ</span>：IPアドレス、ブラウザ情報、アクセス日時等</li>
              <li><span className="text-white/90">サービス利用データ</span>：作成した相関図・テンプレートの内容</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">3. 利用目的</h2>
          <div className="text-white/70 text-sm leading-relaxed">
            <p className="mb-2">収集した情報は以下の目的で利用します。</p>
            <ul className="list-disc list-inside space-y-1">
              <li>サービスの提供・運営・改善</li>
              <li>ユーザーの本人確認・認証</li>
              <li>不正利用の検知・防止</li>
              <li>お問い合わせへの対応</li>
              <li>サービスに関する重要な通知の送信</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">4. 第三者への提供</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>当サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。</p>
            <ul className="list-disc list-inside space-y-1">
              <li>法令に基づく開示が必要な場合</li>
              <li>ユーザーの同意がある場合</li>
            </ul>
            <p className="mt-3">当サービスは以下の外部サービスを利用しており、これらのサービスに対してサービス運営に必要な範囲でデータを委託しています。</p>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="text-white/90">Supabase</span>（米国）：データベース・認証・ファイルストレージの提供</li>
              <li><span className="text-white/90">Cloudflare</span>（米国）：ボット対策（Turnstile）・セキュリティの提供</li>
              <li><span className="text-white/90">Vercel</span>（米国）：サービスのホスティング</li>
            </ul>
            <p>広告目的での第三者への個人情報提供は行いません。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">5. アップロード画像の管理</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>ユーザーがアップロードした画像はSupabase Storageに保存されます。</p>
            <p>相関図の公開・非公開はユーザー自身が設定できます。公開設定にした相関図は誰でも閲覧可能です。非公開設定の場合は作成者本人のみ閲覧可能です。</p>
            <p>アップロードされた画像のメタデータ（撮影日時、GPS位置情報等）を当サービス側で収集・利用することはありません。ただし、アップロードされたファイルにメタデータが含まれる場合、当該ファイルそのものは保存されます。公開設定の場合、第三者がそのメタデータにアクセスできる可能性があるため、アップロード前にメタデータを削除することを推奨します。</p>
            <p>アカウントを削除した場合、関連するデータの削除を希望する場合はお問い合わせください。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">6. Cookieおよびアクセス解析</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>当サービスは、ログイン状態の維持等を目的としてCookieを使用します。</p>
            <p>現時点では広告目的のトラッキングや外部アクセス解析ツールの導入は行っていません。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">7. 個人情報の開示・訂正・削除</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>ユーザーは自身の個人情報の開示・訂正・利用停止・削除を請求できます。</p>
            <p>ご希望の場合は、下記のお問い合わせ先までご連絡ください。法令に従い適切に対応します。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">8. セキュリティ</h2>
          <div className="text-white/70 text-sm leading-relaxed">
            <p>当サービスは個人情報の漏えい・滅失・毀損を防ぐため、適切なセキュリティ対策を講じます。ただし、完全なセキュリティを保証するものではありません。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">9. プライバシーポリシーの変更</h2>
          <div className="text-white/70 text-sm leading-relaxed">
            <p>当サービスは必要に応じて本ポリシーを変更できます。重要な変更がある場合はサービス上でお知らせします。変更後の継続利用をもって同意したものとみなします。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">10. お問い合わせ</h2>
          <div className="text-white/70 text-sm leading-relaxed">
            <p>個人情報の取り扱いに関するお問い合わせは、当サービスのお問い合わせフォームよりご連絡ください。</p>
          </div>
        </section>

        <p className="text-white/30 text-xs mt-10">制定日：2026年3月22日</p>
      </div>
    </div>
  )
}
