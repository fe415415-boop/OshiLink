export default function TermsPage() {
  return (
    <div className="h-full overflow-y-auto bg-[#0f0f1a] text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-xl font-bold mb-2">利用規約</h1>
        <p className="text-white/40 text-xs mb-8">最終更新日：2026年3月22日</p>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第1条（総則）</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>本利用規約（以下「本規約」）は、oshilink.app（以下「当サービス」）が提供する推し相関図作成・共有サービスの利用条件を定めるものです。ユーザーは本規約に同意した上で当サービスをご利用ください。</p>
            <p>当サービスを利用した場合、本規約に同意したものとみなします。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第2条（アカウント登録）</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>一部の機能（相関図の保存・公開等）はアカウント登録が必要です。</p>
            <p>ユーザーは正確な情報を登録し、アカウントの管理責任を負うものとします。アカウントの不正利用による損害について、当サービスは責任を負いません。</p>
            <p>登録できるのは、本規約に同意できる個人に限ります。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第3条（ユーザー投稿コンテンツの権利）</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>ユーザーがアップロードした画像・テキスト等の投稿コンテンツ（以下「ユーザーコンテンツ」）の著作権は、当該ユーザーに帰属します。</p>
            <p>ユーザーは当サービスに対し、ユーザーコンテンツをサービスの提供・改善・宣伝・広報の目的で、国内外において無償・非独占的に利用（複製・公衆送信・表示・編集・翻訳を含む）する権利を許諾するものとします。</p>
            <p>この許諾はユーザーがコンテンツを削除した場合に終了しますが、技術的な理由により一定期間残存する場合があります。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第4条（禁止事項）</h2>
          <div className="text-white/70 text-sm leading-relaxed">
            <p className="mb-2">ユーザーは以下のコンテンツの投稿・行為を行ってはなりません。</p>
            <ul className="list-disc list-inside space-y-1">
              <li>違法なコンテンツ、または違法行為を助長するコンテンツ</li>
              <li>性的、暴力的、差別的なコンテンツ</li>
              <li>第三者の著作権・肖像権・プライバシー権・その他の権利を侵害するコンテンツ</li>
              <li>他人の個人情報（氏名・住所・電話番号等）を含むコンテンツ</li>
              <li>自身が著作権・使用権を有しない画像の無断アップロード</li>
              <li>当サービスのシステムへの不正アクセス・妨害行為</li>
              <li>その他、当サービスが不適切と判断する行為</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第5条（画像の公開設定と共有リンク）</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>ユーザーは作成した相関図の公開・非公開を自由に設定できます。</p>
            <p>公開設定にした相関図は、ログインの有無にかかわらず誰でも閲覧できます。非公開設定にした相関図は、作成者本人のみ閲覧できます。</p>
            <p>共有リンクを発行した場合、そのリンクを知る第三者も当該相関図を閲覧できます。共有リンクの管理はユーザーの責任において行ってください。</p>
            <p>他サービスへの転載やコンテンツのダウンロードに際しては、著作権法その他の関連法令を遵守してください。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第6条（知的財産・著作権）</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>ユーザーは、自身が著作権またはアップロードに必要な許諾を有するコンテンツのみをアップロードできます。他者の著作物を無断でアップロードすることは禁止します。</p>
            <p>当サービスのシステム・デザイン・ロゴ等に関する知的財産権は、当サービスまたは正当な権利者に帰属します。</p>
            <p>他ユーザーのコンテンツを無断で転載・複製・二次利用することは禁止します。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第7条（免責事項）</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>当サービスは、ユーザーが投稿したコンテンツの内容について責任を負いません。投稿コンテンツに起因するトラブル・損害はユーザーの自己責任とします。</p>
            <p>ユーザー間または第三者との紛争については、当サービスは介入せず、一切の責任を負いません。</p>
            <p>当サービスは、サービスの中断・変更・終了によって生じた損害について、法令上認められる範囲において責任を負いません。</p>
            <p>当サービスは現状有姿で提供されるものであり、特定の目的への適合性・正確性・継続性等について保証しません。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第8条（運営の権利）</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>当サービスは、本規約に違反するコンテンツを予告なく削除・非公開にする権利を有します。</p>
            <p>本規約に違反したユーザーのアカウントを、予告なく停止または削除する場合があります。</p>
            <p>これらの措置によってユーザーに損害が生じた場合であっても、当サービスは責任を負いません。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第9条（サービスの変更・終了）</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>当サービスは、ユーザーへの事前通知なくサービスの内容を変更し、または提供を終了することができます。</p>
            <p>サービス終了に際してのデータの取り扱いについては、終了時に別途告知します。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第10条（準拠法・管轄裁判所）</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-2">
            <p>本規約の解釈および適用は、日本法に準拠するものとします。</p>
            <p>本規約に関して生じた紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-base font-bold mb-3 text-white">第11条（規約の変更）</h2>
          <div className="text-white/70 text-sm leading-relaxed">
            <p>当サービスは必要に応じて本規約を変更できます。変更後の規約はサービス上に掲載した時点で効力を生じ、継続利用をもって同意したものとみなします。</p>
          </div>
        </section>

        <p className="text-white/30 text-xs mt-10">制定日：2026年3月22日</p>
      </div>
    </div>
  )
}
