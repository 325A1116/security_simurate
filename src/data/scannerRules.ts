import { VulnCheckItem } from '../types/security';

export const VULNERABILITY_RULES: VulnCheckItem[] = [
  {
    id: 'rule-csp',
    name: 'Content-Security-Policy (CSP) の設定とインライン実行制限',
    category: 'HTTPヘッダー',
    severity: 'CRITICAL',
    description: 'XSS（クロスサイトスクリプティング）やデータ挿入攻撃を防ぐため、ブラウザが読み込み可能なJavaScript、CSS、画像のソースドメインを厳格に制限するヘッダー。',
    risk: '未設定または `unsafe-inline` `unsafe-eval` を無制限に許可している場合、悪意のあるサードパーティスクリプトが実行されセッションや個人情報が窃取されます。',
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
    description: '他サイトの `<iframe>` 内部に自サイトを埋め込まれることを防ぎ、透明なフレームを重ねて意図しないクリックを誘発する「クリックジャッキング」を防御します。',
    risk: '攻撃者の罠サイトに埋め込まれ、ユーザーが気づかないうちに退会処理や送金、設定変更ボタンをクリックさせられます。',
    remediationSnippet: `// 応答ヘッダー
X-Frame-Options: DENY
// または CSP frame-ancestors 'none';`
  },
  {
    id: 'rule-cookie-flags',
    name: 'Cookie セキュリティ属性 (Secure, HttpOnly, SameSite)',
    category: '認証・セッション',
    severity: 'CRITICAL',
    description: 'セッションCookieに `Secure` (HTTPS限定)、`HttpOnly` (JavaScriptからの読み取り禁止)、`SameSite=Lax/Strict` (CSRF防御) を付与します。',
    risk: 'HttpOnlyが欠落していると、万一XSSが発生した際に `document.cookie` からセッションIDを瞬時に強奪されます。SameSiteが未設定だとクロスサイトリクエストフォージェリを受けます。',
    remediationSnippet: `// Set-Cookie ヘッダー
Set-Cookie: sessionId=xyz123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`
  },
  {
    id: 'rule-cors-wildcard',
    name: 'CORS (Cross-Origin Resource Sharing) のワイルドカード設定不備',
    category: 'API・アクセス制御',
    severity: 'HIGH',
    description: '`Access-Control-Allow-Origin: *` と `Access-Control-Allow-Credentials: true` の組み合わせ、または受信した `Origin` ヘッダーを無検証でそのままオウム返しする設定の排除。',
    risk: '認証が必要なAPIのレスポンス（個人情報や顧客データ）を、悪意ある外部ドメインからJavaScriptで盗み出すことが可能になります。',
    remediationSnippet: `// 信頼できるオリジンのみを厳格なホワイトリストで検証
const allowedOrigins = ['https://app.example.com'];
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}`
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
    id: 'rule-referrer-policy',
    name: 'Referrer-Policy によるURL機密パラメーター流出防止',
    category: 'HTTPヘッダー',
    severity: 'MEDIUM',
    description: 'リンク遷移時に送信されるRefererヘッダーに、認証トークンや個人を識別するURLパラメーターが含まれて外部送信されるのを防ぎます。',
    risk: 'パスワード再設定URLやクエリパラメーター内のセッション情報が外部解析ツールや外部CDNに流出します。',
    remediationSnippet: `Referrer-Policy: strict-origin-when-cross-origin`
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
      'Server': 'nginx/1.18.0',
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
      'Referrer-Policy': 'no-referrer-when-downgrade'
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
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; frame-ancestors 'none'; object-src 'none';",
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
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
