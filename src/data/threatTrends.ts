import { ThreatTrendItem } from '../types/security';

export const THREAT_TRENDS: ThreatTrendItem[] = [
  {
    id: 'ai-spearphishing-deepfakes',
    category: 'AI・ソーシャルエンジニアリング',
    title: '生成AI悪用・音声ディープフェイク型CEO詐欺 / スピアフィッシング',
    summary: '攻撃者が標的組織のSNSや公開カンファレンス動画からCEOや役員の音声・文体をリアルタイム学習し、自然な日本語で偽の緊急指示を電話やTeamsで行う新世代攻撃。',
    severity: '極めて高い (Critical)',
    timelineTrend: '2025〜2026年にかけて急激に増加中',
    attackVector: [
      'わずか3秒の音声サンプルから高精度クローン音声を合成（Voice Cloning）',
      'LLMを用いた誤字脱字のない自然なビジネス日本語文面の自動生成',
      '「極秘M&A」や「サプライチェーン緊急送金」を口実にしたリアルタイム通話'
    ],
    realWorldImpact: '香港の多国籍企業でディープフェイクビデオ会議により約3,800万ドル（約39億円）が不正送金された事件や、日本国内企業でも取引先を装った精密なAIメールが多数確認。',
    defensiveMeasures: {
      immediate: '「送金や重要変更の指示は、メールやチャットだけでなく事前に合意した固定電話・対面合言葉によるコールバック確認を義務付ける」。',
      architectural: '電子署名（S/MIME）によるメール改ざん検知、及び内部統制における送金手続きの「承認プロセス複数人化（Maker-Checker方式）」の厳格化。'
    },
    relevantMitre: 'T1566.002 (Spearphishing Link), T1656 (Impersonation)'
  },
  {
    id: 'aitm-mfa-bypass',
    category: 'アイデンティティ・認証',
    title: 'AiTM (Adversary-in-the-Middle) によるMFA突破 & セッションハイジャック',
    summary: 'ユーザーと正規認証サーバーの間にリバースプロキシ（Evilginx2等）を挟み込み、入力されたパスワードとSMS/ワンタイムパスワード(TOTP)を正規サーバーに転送して発行された「セッションCookie」を丸ごと盗み出す攻撃。',
    severity: '極めて高い (Critical)',
    timelineTrend: '従来のMFA導入企業の80%以上が直面する現代最大の認証脅威',
    attackVector: [
      '本物そっくりのURL（例: `login.microsoftonline.com-auth-verify.xyz`）へ誘導',
      'ユーザーが入力したログインID・パスワード・TOTPをリアルタイムで中継',
      '認証完了後に発行されるセッションCookie (ESTSAUTH等) を強奪し、MFAなしでログイン'
    ],
    realWorldImpact: 'MFAを導入しているにもかかわらず、Exchange OnlineやGoogle Workspaceが乗っ取られ、役員になりすました不正送金や社内機密閲覧が発生。',
    defensiveMeasures: {
      immediate: '疑わしいログインがあった場合はパスワード変更だけでなく「全アクティブセッション・リフレッシュトークンの強制失効」を必ず実行。',
      architectural: 'フィッシング耐性のある認証（FIDO2 / パスキー / YubiKey等）またはデバイス証明書と連携した条件付きアクセスポリシーの全面適用。'
    },
    relevantMitre: 'T1557 (Adversary-in-the-Middle), T1539 (Steal Web Session Cookie)'
  },
  {
    id: 'infostealers-darkweb',
    category: 'マルウェア・ランサムウェア',
    title: 'Infostealer (情報窃取型マルウェア) とダークウェブ認証情報市場',
    summary: '検索エンジンの偽広告（Malvertising）や海賊版ソフトを通じて感染し、ブラウザに保存されたID・パスワード・暗号資産ウォレット・セッションCookieを数秒で吸い上げるマルウェア（Lumma, RedLine, Vidar等）。',
    severity: '高 (High)',
    timelineTrend: '個人PCからVPN接続するリモートワーク環境を標的に定着',
    attackVector: [
      'GoogleやBing検索の最上部スポンサー枠に正規ソフト（Notion, Zoom, Slack等）を装った偽サイトを出稿',
      'ダウンロードしたインストーラーを実行した瞬間、ブラウザのSQLiteデータベースからCookie・パスワードを一括窃取',
      'ダークウェブのマーケットプレイス（Genesis, Russian Market等）へ即時アップロードされ、ランサムウェア初期侵入者（IAB）へ転売'
    ],
    realWorldImpact: '社員の私用PC（BYOD）感染からVPN接続情報がダークウェブに流出し、社内ネットワーク全体への侵入足がかりとされる事例が続出。',
    defensiveMeasures: {
      immediate: '全社員に「ブラウザへのパスワード保存機能」の禁止を周知し、専用のエンタープライズパスワードマネージャーの利用を徹底。',
      architectural: '外部アタックサーフェス管理(EASM)およびダークウェブ監視による自社ドメイン認証情報の流出早期検知。端末へのEDR導入とブラウザ広告ブロック。'
    },
    relevantMitre: 'T1555 (Credentials from Password Stores), T1189 (Drive-by Compromise)'
  },
  {
    id: 'ransomware-triple-extortion',
    category: 'マルウェア・ランサムウェア',
    title: '二重・三重脅迫型ランサムウェア & データ暴露サイト (DLS)',
    summary: '単なるファイル暗号化だけでなく、「機密データを盗み出して暴露サイトに晒す」「要求に応じない場合はDDoS攻撃でサービス停止」「顧客や取引先へ直接脅迫連絡する」という三重の脅迫手口。',
    severity: '極めて高い (Critical)',
    timelineTrend: '身代金拒否企業への圧力として一般化',
    attackVector: [
      '脆弱なVPN機器やRDP経由、または窃取アカウントを用いた初期侵入',
      '数日〜数週間の潜伏期間中にActive Directoryを制圧し、大容量データを外向きクラウドストレージへ持ち出し',
      'オフラインバックアップを含めて暗号化し、ダークウェブ上のリークサイト（DLS）でカウントダウンを開始'
    ],
    realWorldImpact: '国内病院での診療停止、自動車サプライチェーンでの工場操業一時停止、個人情報漏洩による株価急落と損害賠償。',
    defensiveMeasures: {
      immediate: '「身代金は絶対に支払わない」経営原則の確認、及び「エアギャップ（物理隔離）またはイミュータブル（不変）バックアップ」の確保。',
      architectural: 'マイクロセグメンテーション（横展開防止）、特権アクセス管理(PAM)、定期的なランサムウェア復旧演習（机上演習・実機演習）。'
    },
    relevantMitre: 'T1486 (Data Encrypted for Impact), T1567 (Exfiltration Over Web Service)'
  },
  {
    id: 'supply-chain-cicd',
    category: 'クラウド・サプライチェーン',
    title: 'ソフトウェアサプライチェーン侵害 & CI/CDパイプライン毒入れ',
    summary: 'オープンソースソフトウェア（OSS）の依存パッケージ（npm, PyPI, GitHub Actions）や、開発パイプラインのCI/CD環境を改ざんし、下流の全利用組織へバックドアを自動配布する攻撃。',
    severity: '高 (High)',
    timelineTrend: 'XZ Utils事件以降、オープンソース維持管理者のソーシャルエンジニアリングが激化',
    attackVector: [
      'タイポスクワッティング（1文字違いの偽パッケージ名公開）や休眠リポジトリの乗っ取り',
      'CI/CDワークフロー（GitHub Actions等）の設定不備を突いたSecrets（APIキー）の抽出',
      '正規のビルドプロセス中に難読化された悪意のあるペイロードを自動混入'
    ],
    realWorldImpact: '1つの基幹ライブラリ改ざんにより世界数万組織のサーバーが侵害対象となり、自社開発が安全でも外部コード経由で情報流出。',
    defensiveMeasures: {
      immediate: '依存関係のロックファイル（package-lock.json等）のハッシュ値検証と、DependabotやSnyk等による既知脆弱性の自動監視。',
      architectural: 'SBOM（ソフトウェア部品表）の作成と管理、CI/CDパイプラインの実行権限最小化、シークレットの短命OIDCトークン化。'
    },
    relevantMitre: 'T1195.001 (Compromise Software Dependencies), T1195.002 (Compromise Supply Chain)'
  },
  {
    id: 'cloud-iam-misconfig',
    category: 'クラウド・サプライチェーン',
    title: 'クラウドアイデンティティ侵害 & IAM権限昇格 / IMDSv2未設定',
    summary: 'AWS/GCP/Azure等のクラウド環境において、過剰な権限を持つIAMロールや、メタデータサービス(IMDSv1)の脆弱性を悪用したSSRF攻撃によるインスタンスクレデンシャルの不正取得。',
    severity: '高 (High)',
    timelineTrend: 'クラウドシフトに伴いオンプレミスVPN侵害と並ぶ主要侵入経路に',
    attackVector: [
      'WebアプリケーションのSSRF（Server-Side Request Forgery）から 169.254.169.254 へアクセスしてIAM一時キーを窃取',
      'パブリックアクセスが誤って許可されたS3/Cloud Storageバケットの探索とデータダウンロード',
      'AdministratorAccessが付与された長期アクセスキー（AKIA...）のGitHub公開漏洩'
    ],
    realWorldImpact: '金融機関やSaaSベンダーで数千万人分の顧客個人情報やクレジット情報が一度に流出する重大インシデントに発展。',
    defensiveMeasures: {
      immediate: 'EC2メタデータサービスを「IMDSv2（セッショントークン必須）」に強制移行し、S3のパブリックアクセスブロックを全社有効化。',
      architectural: 'CSPM（クラウドセキュリティポスチャ管理）による設定不備のリアルタイム検知、IAMの最小権限原則(Least Privilege)と権限境界(Permission Boundary)。'
    },
    relevantMitre: 'T1552.005 (Cloud Instance Metadata API), T1078.004 (Cloud Accounts)'
  },
  {
    id: 'japan-ppc-regulations',
    category: '法規制・コンプライアンス',
    title: '個人情報保護法改正・インシデント報告義務（原則72時間）の厳格化',
    summary: '日本国内の個人情報保護法において、要配慮個人情報や一定規模以上の漏洩（またはそのおそれ）が発生した場合、個人情報保護委員会への「速報」および本人通知が法律上義務付けられています。',
    severity: '高 (High)',
    timelineTrend: '違反時の課徴金引き上げや公表措置により、企業の法務・ガバナンス責任が重大化',
    attackVector: [
      'サイバー攻撃だけでなく、従業員の持ち出しPC紛失、メール誤送信、S3設定不備等も対象',
      '「おそれ」が生じた時点で速報が必要であり、「調査が終わってから報告する」という対応は法令違反となるリスク'
    ],
    realWorldImpact: '報告遅延や隠蔽に対して行政指導・改善命令が下され、企業名が公表されて社会的信用と取引関係に壊滅的打撃。',
    defensiveMeasures: {
      immediate: 'インシデント発覚時のエスカレーション規程に「発覚後速やかに（概ね3〜5日以内・実務上72時間以内）委員会への速報」を組み込む。',
      architectural: '漏洩対象の早期特定のため、ログの長期保管（SIEM等で1年以上）と個人データ格納箇所の暗号化・アクセスマッピング。'
    },
    relevantMitre: 'Governance & Compliance Compliance Frameworks (NIST CSF 2.0 / PPC Guidelines)'
  }
];
