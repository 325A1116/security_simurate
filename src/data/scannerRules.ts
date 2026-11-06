import { VulnCheckItem } from '../types/security';

export const VULNERABILITY_RULES: VulnCheckItem[] = [
  {
    id: 'rule-csp',
    name: 'Content-Security-Policy (CSP) の設定とインライン実行制限',
    category: 'HTTPヘッダー',
    severity: 'CRITICAL',
    description: 'XSS（クロスサイトスクリプティング）やデータ挿入攻撃を防ぐため、ブラウザが読み込み可能なJavaScript、CSS、画像のソースドメインを厳格に制限するヘッダー。',
    risk: '未設定または unsafe-inline / unsafe-eval を無制限に許可している場合、悪意のあるサードパーティスクリプトが実行されセッションや個人情報が窃取されます。',
    remediationSnippet: `// Nginx 設定例
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-rAnd0m'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none';" always;`
  },
  {
    id: 'rule-hsts',
    name: 'Strict-Transport-Security (HSTS) の有効化とプリロード登録',
    category: 'SSL/TLS',
    severity: 'HIGH',
    description: 'ブラウザに対して以降の通信をすべて強制的にHTTPSで行うよう指示し、SSL Stripping（HTTPダウングレード攻撃）や公衆Wi-Fiでの盗聴を防ぎます。',
    risk: '未設定の場合、ユーザーが初回接続時またはDNSキャッシュ汚染時に平文HTTPへ誘導され、通信内容を中間者に盗聴・改ざんされます。',
    remediationSnippet: `// Express.js (Helmet) または Nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`
  },
  {
    id: 'rule-x-frame-options',
    name: 'X-Frame-Options (クリックジャッキング対策)',
    category: 'HTTPヘッダー',
    severity: 'HIGH',
    description: '他サイトの <iframe> 内部に自サイトを埋め込まれることを防ぎ、透明なフレームを重ねて意図しないクリックを誘発する「クリックジャッキング」を防御します。',
    risk: '攻撃者の罠サイトに埋め込まれ、ユーザーが気づかないうちに退会処理や送金、設定変更ボタンをクリックさせられます。',
    remediationSnippet: `// 応答ヘッダー
X-Frame-Options: DENY
// または CSP frame-ancestors 'none';`
  },
  {
    id: 'rule-x-content-type',
    name: 'X-Content-Type-Options: nosniff (MIMEスニッフィング抑止)',
    category: 'HTTPヘッダー',
    severity: 'MEDIUM',
    description: 'ブラウザがContent-Typeを無視してファイルの中身からMIMEタイプを推測実行するのを禁止し、画像やテキストを偽装した悪意あるスクリプトの実行を阻止します。',
    risk: '画像アップロード機能等で実行可能スクリプト（XSS）が埋め込まれたファイルを画像として保存・直接配信した際に、ブラウザが勝手にHTML/JSとして解釈実行します。',
    remediationSnippet: `add_header X-Content-Type-Options "nosniff" always;`
  },
  {
    id: 'rule-cookie-flags',
    name: 'Cookie セキュリティ属性 (Secure, HttpOnly, SameSite)',
    category: '認証・セッション',
    severity: 'CRITICAL',
    description: 'セッションCookieに Secure (HTTPS限定)、HttpOnly (JavaScriptからの読み取り禁止)、SameSite=Lax/Strict (CSRF防御) を付与します。',
    risk: 'HttpOnlyが欠落していると、万一XSSが発生した際に document.cookie からセッションIDを瞬時に強奪されます。SameSiteが未設定だとクロスサイトリクエストフォージェリを受けます。',
    remediationSnippet: `// Set-Cookie ヘッダー
Set-Cookie: sessionId=xyz123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`
  },
  {
    id: 'rule-referrer-policy',
    name: 'Referrer-Policy によるURL機密パラメーター流出防止',
    category: 'HTTPヘッダー',
    severity: 'MEDIUM',
    description: 'リンク遷移時に送信されるRefererヘッダーに、認証トークンや個人を識別するURLパラメーターが含まれて外部送信されるのを防ぎます。',
    risk: 'パスワード再設定URLやクエリパラメーター内のセッション情報が外部解析ツールや外部CDNに流出します。',
    remediationSnippet: `Referrer-Policy: strict-origin-when-cross-origin`
  },
  {
    id: 'rule-permissions-policy',
    name: 'Permissions-Policy (ブラウザ機能・センサーAPI制限)',
    category: 'HTTPヘッダー',
    severity: 'LOW',
    description: 'カメラ、マイク、位置情報、支払要求APIなどの高権限ブラウザ機能をページ内およびiframe内で明示的に制限・遮断します。',
    risk: '埋め込まれたサードパーティ広告やトラッカー、悪意あるiframeによって位置情報やマイクが不正に起動・盗聴されるリスク。',
    remediationSnippet: `add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;`
  },
  {
    id: 'rule-server-banner',
    name: 'Server / X-Powered-By 応答ヘッダーのバージョン情報漏洩',
    category: 'HTTPヘッダー',
    severity: 'LOW',
    description: 'Webサーバー（nginx/1.18.0, Apache/2.4.41等）やバックエンド（PHP/7.4, Express, ASP.NET）の詳細バージョン情報を秘匿化します。',
    risk: '攻撃者に既知のCVE脆弱性（バージョン固有のエクスプロイト）をピンポイントで検索・悪用される手掛かりを与えます。',
    remediationSnippet: `// Nginx: server_tokens off;
// Express.js: app.disable('x-powered-by');`
  },
  {
    id: 'rule-cors-wildcard',
    name: 'CORS (Cross-Origin Resource Sharing) のワイルドカード設定不備',
    category: 'API・アクセス制御',
    severity: 'HIGH',
    description: 'Access-Control-Allow-Origin: * と Access-Control-Allow-Credentials: true の組み合わせ、または受信した Origin ヘッダーを無検証でそのままオウム返しする設定の排除。',
    risk: '認証が必要なAPIのレスポンス（個人情報や顧客データ）を、悪意ある外部ドメインからJavaScriptで盗み出すことが可能になります。',
    remediationSnippet: `// 信頼できるオリジンのみを厳格なホワイトリストで検証
const allowedOrigins = ['https://app.example.com'];
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}`
  },
  {
    id: 'rule-corp',
    name: 'Cross-Origin-Resource-Policy (CORP) による投機的実行攻撃対策',
    category: 'HTTPヘッダー',
    severity: 'MEDIUM',
    description: 'Spectre等の投機的実行CPU脆弱性を悪用したクロスオリジンリソース窃取を防ぐため、same-origin または same-site に制限します。',
    risk: '悪意あるサイトがimg/scriptタグ等で自サイトの機密PDFやJSONを読み込み、メモリのサイドチャネルからデータを吸い出します。',
    remediationSnippet: `add_header Cross-Origin-Resource-Policy "same-origin" always;`
  },
  {
    id: 'rule-coop-coep',
    name: 'Cross-Origin-Opener-Policy (COOP) によるウィンドウ分離',
    category: 'HTTPヘッダー',
    severity: 'LOW',
    description: 'window.opener を通じたタブ間のクロスオリジン参照を遮断し、フィッシングやXS-Leaksを防御します。',
    risk: '別タブで開かれた攻撃サイトから window.opener.location を書き換えられ、偽のログイン画面にすり替えられます。',
    remediationSnippet: `add_header Cross-Origin-Opener-Policy "same-origin" always;`
  },
  {
    id: 'rule-cloud-open-ports',
    name: 'クラウド管理ポート (SSH:22 / RDP:3389) のインターネット全公開 (0.0.0.0/0)',
    category: 'クラウド設定',
    severity: 'CRITICAL',
    description: 'AWSセキュリティグループやファイアウォールで、LinuxのSSHポート(22)やWindowsのリモートデスクトップ(3389)が全世界(0.0.0.0/0)に開放されていないかを監査。',
    risk: '毎分数千回発生するブルートフォース攻撃や、未知のゼロデイ脆弱性により、サーバーOSが直接侵入・ランサムウェア感染を受けます。',
    remediationSnippet: `// 対策: セキュリティグループで社内VPN固定IPまたはAWS Systems Manager (SSM Session Manager) のみ許可`
  },
  {
    id: 'rule-imdsv2',
    name: 'EC2 インスタンスメタデータサービス (IMDSv2) の強制',
    category: 'クラウド設定',
    severity: 'HIGH',
    description: '古いIMDSv1を無効化し、HTTPトークンセッションを要求するIMDSv2のみを許可する設定。',
    risk: 'WebアプリケーションにSSRF（Server-Side Request Forgery）が存在した場合、169.254.169.254からIAM一時キーを盗まれ、AWSアカウント全体が侵害されます。',
    remediationSnippet: `// AWS CLI での強制設定
aws ec2 modify-instance-metadata-options \\
  --instance-id i-1234567890abcdef0 \\
  --http-tokens required \\
  --http-endpoint enabled`
  },
  {
    id: 'rule-s3-public-access',
    name: 'S3 / Cloud Storage バケットのパブリックアクセスブロック',
    category: 'クラウド設定',
    severity: 'CRITICAL',
    description: 'クラウドオブジェクトストレージのバケットがパブリック読み取り/書き込み可能になっていないかを監査。',
    risk: '顧客個人情報、データベースダンプ、システムログなどの機密データが全世界に無認証でダウンロード公開されます。',
    remediationSnippet: `aws s3api put-public-access-block --bucket my-bucket \\
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"`
  },
  {
    id: 'rule-jwt-algorithm-none',
    name: 'JWT (JSON Web Token) の署名検証と "alg": "none" 脆弱性排除',
    category: '認証・セッション',
    severity: 'CRITICAL',
    description: 'JWTのヘッダーで alg: none や弱い対称鍵(HS256)と非対称鍵(RS256)の取り違えを許容せず、厳格に署名を検証します。',
    risk: '署名のない偽造トークンで管理者権限（role: admin）へ権限昇格され、全機能が乗っ取られます。',
    remediationSnippet: `// バックエンド検証コード例 (jsonwebtoken)
jwt.verify(token, publicKey, { algorithms: ['RS256'] });`
  },
  {
    id: 'rule-cache-control-sensitive',
    name: 'Cache-Control: no-store (個人情報・機密API応答のブラウザキャッシュ禁止)',
    category: '認証・セッション',
    severity: 'MEDIUM',
    description: '個人情報や認証済みAPIのレスポンスに Cache-Control: no-store, no-cache を付与し、共有PC等のディスクキャッシュに残るのを防ぎます。',
    risk: 'ネットカフェや共用端末で「戻る」ボタンを押した際、前の利用者の個人情報や口座明細がそのまま表示されます。',
    remediationSnippet: `add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;`
  }
];

export interface DiagnosticPreset {
  id: string;
  name: string;
  systemType: string;
  description: string;
  sampleHeaders: Record<string, string>;
  cloudConfig: {
    sshOpenToWorld: boolean;
    imdsv2Enforced: boolean;
    s3PublicBlock: boolean;
    corsWildcard: boolean;
  };
}

export const DIAGNOSTIC_PRESETS: DiagnosticPreset[] = [
  {
    id: 'preset-insecure-ecommerce',
    name: '対策不足のECサイト (危険度: 高)',
    systemType: 'BtoC オンラインストア / WordPress + Nginx',
    description: 'セキュリティヘッダーが一切設定されておらず、CookieにHttpOnlyがなく、SSHポートが全開放されている典型的な被害予備軍の構成。',
    sampleHeaders: {
      'Server': 'nginx/1.18.0 (Ubuntu)',
      'X-Powered-By': 'PHP/7.4.3',
      'Set-Cookie': 'session_token=abc987654321; Path=/',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/html; charset=UTF-8'
    },
    cloudConfig: {
      sshOpenToWorld: true,
      imdsv2Enforced: false,
      s3PublicBlock: false,
      corsWildcard: true
    }
  },
  {
    id: 'preset-standard-saas',
    name: '一般的なSaaS Webアプリ (要改善)',
    systemType: 'React SPA + Node.js API Gateway',
    description: 'HTTPSやHSTSは設定されているが、CSPが未設定でインラインスクリプト脆弱性があり、Cookie SameSiteが不十分な構成。',
    sampleHeaders: {
      'Strict-Transport-Security': 'max-age=31536000',
      'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': 'authId=user_8831a; Secure; Path=/',
      'Referrer-Policy': 'no-referrer-when-downgrade',
      'Server': 'cloudflare'
    },
    cloudConfig: {
      sshOpenToWorld: false,
      imdsv2Enforced: false,
      s3PublicBlock: true,
      corsWildcard: false
    }
  },
  {
    id: 'preset-hardened-fintech',
    name: '堅牢化された金融機関グレード (安全)',
    systemType: 'FinTech 決済API基盤 / Zero Trust',
    description: '厳格なCSP、HSTSプリロード、HttpOnly+Secure+SameSite=Strict Cookie、IMDSv2強制、完全閉域ポートが整備された優良構成。',
    sampleHeaders: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-e4b7a1'; frame-ancestors 'none'; object-src 'none';",
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Set-Cookie': 'fin_session=secure_token_9921; Secure; HttpOnly; SameSite=Strict; Path=/'
    },
    cloudConfig: {
      sshOpenToWorld: false,
      imdsv2Enforced: true,
      s3PublicBlock: true,
      corsWildcard: false
    }
  }
];
