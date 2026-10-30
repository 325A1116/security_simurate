import { IncidentScenario } from '../types/security';

export const INCIDENT_SCENARIOS: IncidentScenario[] = [
  {
    id: 'scenario_ransomware',
    title: '二重脅迫ランサムウェア侵入 & 横展開インシデント',
    subtitle: 'EDR初動アラートからActive Directory制圧阻止、情報漏洩封じ込めまでの24時間',
    difficulty: '中級 (実務CSIRT)',
    category: 'Ransomware',
    estimatedTime: '15〜20分',
    initialNodeId: 'rw_01_alert',
    initialMetrics: {
      spread: 25,
      exfiltration: 15,
      downtime: 10,
      trust: 90,
    },
    briefing: {
      targetOrganization: '東証プライム上場 精密機器メーカー（社員3,200名）',
      discoveredAlert: '営業本部PC [WKSTN-SALES-042] にて、PowerShellによる異常な暗号化プロセスおよびCobalt Strikeビーコン通信を検知。',
      incidentOfficer: 'CSIRT初動対応チーム リーダー（インシデントコマンダー代行）',
      immediateObjective: 'ランサムウェアの基幹サーバー・ADドメインへの横展開阻止、機密データ流出防止、および法廷フォレンジック証拠の保全。',
    },
    imagePath: '/src/assets/images/scenario_ransomware_1793333674033.jpg',
    nodes: {
      rw_01_alert: {
        id: 'rw_01_alert',
        phase: 'Phase 1: 初動検知・トリアージ (T+00:00)',
        title: '不審な難読化PowerShellとC2通信の検知',
        description: '午前09時14分、SOCコンソールに重大度CRITICALのアラートが発報。営業部PCから不審な外部IPへのHTTPSビーコンと、lsass.exeプロセスへのインジェクション試行が記録されています。',
        severity: 'critical',
        situationSummary: '感染端末は社内VLANに接続されたまま。ファイルサーバーへのアクセスログが増加中。',
        telemetryLogs: [
          { timestamp: '09:14:02', source: 'CrowdStrike EDR', level: 'CRITICAL', message: 'Process Injection into lsass.exe detected on WKSTN-SALES-042 (PID: 4912)' },
          { timestamp: '09:14:15', source: 'Palo Alto FW', level: 'ALERT', message: 'Repeated beaconing to 194.38.20.14:443 (Known Cobalt Strike Team Server)' },
          { timestamp: '09:15:30', source: 'Windows Sysmon', level: 'WARN', message: 'powershell.exe -enc SQBFAFgA... executed with Elevated Privileges' }
        ],
        choices: [
          {
            id: 'c1_isolate_edr',
            label: 'EDR機能による該当端末のネットワーク論理隔離 (ホストアイソレーション)',
            actionType: 'containment',
            timeCostMinutes: 5,
            description: 'EDRエージェントから当該端末の全ネットワーク通信を切断。EDR管理コンソール経由のリモートシェル・メモリ採取のみを維持する。',
            tacticalRationale: '最善の初動。端末の電源を切らずに横展開通信のみを瞬時に遮断できるため、揮発性メモリ(RAM)の認証情報や暗号化キーを保全したまま被害拡大を阻止できる。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -5, downtime: 0, trust: 0 },
            logOutput: [
              '[EDR] Command dispatched: Host isolation successful for WKSTN-SALES-042.',
              '[EDR] Inbound/Outbound IP traffic dropped. Management channel retained.',
              '[SOC] C2 beaconing stopped from WKSTN-SALES-042.'
            ],
            nextNodeId: 'rw_02_lateral_investigation'
          },
          {
            id: 'c1_power_off',
            label: '端末担当者に電話し、直ちにPCの電源コンセントを抜くよう指示 (強制シャットダウン)',
            actionType: 'containment',
            timeCostMinutes: 12,
            description: '端末を強制終了させ、これ以上のファイル暗号化を物理的に停止させる。',
            tacticalRationale: '悪手。RAM内の揮発性データ（インジェクションされたマルウェアコード、未平文キー、ログイン中の特権クレデンシャル）が消失し、すでに別端末へ移行していた場合の追跡が極めて困難になる。',
            impact: { spread: 15, exfiltration: 10, downtime: 10, trust: -10 },
            logOutput: [
              '[HELP-DESK] User pulled power plug on WKSTN-SALES-042.',
              '[FORENSICS] Volatile memory (RAM) is lost permanently.',
              '[AD LOG] EventID 4624: Account DOMAIN\\sales_lead authenticated on FileServer-01 via Pass-the-Hash.'
            ],
            nextNodeId: 'rw_02_power_loss'
          },
          {
            id: 'c1_antivirus_scan',
            label: '端末には触れず、通常アンチウイルスのフルスキャンをリモート実行して様子見',
            actionType: 'investigation',
            timeCostMinutes: 45,
            description: 'スキャン完了を待ち、検知されたファイルを隔離する。',
            tacticalRationale: '致命的遅延。Cobalt Strikeや最新ランサムウェアはメモリ展開型(Fileless)のため通常スキャンでは検知されず、45分の間にAD全域へ管理者権限が奪取される。',
            impact: { spread: 45, exfiltration: 40, downtime: 30, trust: -30 },
            logOutput: [
              '[AV] Full scan started... 15% complete.',
              '[AD LOG] CRITICAL: Kerberoasting attack detected. Ticket Granting Service requested for krbtgt.',
              '[EDR ALERT] Mimikatz credential dumping detected on Domain Controller DC-01!'
            ],
            nextNodeId: 'rw_02_full_spread'
          }
        ]
      },

      rw_02_lateral_investigation: {
        id: 'rw_02_lateral_investigation',
        phase: 'Phase 2: 侵害範囲特定と特権アカウント防衛 (T+00:15)',
        title: '横展開の兆候検知とActive Directory防衛',
        description: 'WKSTN-SALES-042の隔離に成功。メモリダンプの保全を開始した直後、AD監査ログにて「当該端末のキャッシュクレデンシャル」を用いたファイルサーバー(FS-01)へのアクセス試行が記録されたことが判明しました。',
        severity: 'high',
        situationSummary: '攻撃者は端末隔離の直前に社内管理者ハッシュを窃取していた可能性あり。ADドメイン全体への波及を阻止できるかの正念場。',
        telemetryLogs: [
          { timestamp: '09:22:10', source: 'AD Security Log', level: 'ALERT', message: 'EventID 4672: Special privileges assigned to logon user: adm_tanaka' },
          { timestamp: '09:23:44', source: 'FileServer-01', level: 'WARN', message: 'SMB Session initiated from 192.168.10.42 prior to isolation' },
          { timestamp: '09:25:01', source: 'Storage SAN', level: 'INFO', message: 'Volume Shadow Copies (VSS) active. Snapshot interval: 4 hours' }
        ],
        choices: [
          {
            id: 'c2_ad_reset_airgap',
            label: '侵害された管理者アカウントの無効化・krbtgt二重リセットおよびバックアップ装置の物理切断',
            actionType: 'containment',
            timeCostMinutes: 20,
            description: '疑わしい特権アカウントを即時無効化。ゴールデンチケット攻撃を防ぐためkrbtgtパスワードを2回更新し、オフライン・イミュータブル（変更不可）バックアップを切り離す。',
            tacticalRationale: '教科書通りの最善策。krbtgtパスワードを2回変更することで既存のKerberosチケットを全無効化し、バックアップへの暗号化波及を完全に遮断できる。',
            isOptimal: true,
            impact: { spread: -15, exfiltration: -10, downtime: 15, trust: +5 },
            logOutput: [
              '[AD ADMIN] Account adm_tanaka disabled.',
              '[AD ADMIN] Krbtgt account password reset (Cycle 1 & Cycle 2 complete).',
              '[STORAGE] SAN immutable snapshots locked. Backup vault network interface detached.'
            ],
            nextNodeId: 'rw_03_exfil_defense'
          },
          {
            id: 'c2_password_only',
            label: 'adm_tanaka の通常パスワード変更のみ実施し、通常業務を継続',
            actionType: 'remediation',
            timeCostMinutes: 10,
            description: 'ユーザーにパスワード変更を依頼。バックアップシステムは夜間同期のため接続したままにする。',
            tacticalRationale: '重大な見落とし。攻撃者がすでにKerberos TGSチケットやゴールデンチケットを生成していた場合、パスワードを変更しても有効期限内は認証が通り続け、バックアップも標的になる。',
            impact: { spread: 25, exfiltration: 20, downtime: 10, trust: -15 },
            logOutput: [
              '[AD] Password for adm_tanaka changed by user.',
              '[AD AUDIT] Attacker reused valid Kerberos Ticket-Granting Ticket (TGT) to access Backup-NAS-01.',
              '[BACKUP] VSSadmin delete shadows /all command executed on Backup-NAS-01!'
            ],
            nextNodeId: 'rw_03_backup_compromised'
          }
        ]
      },

      rw_02_power_loss: {
        id: 'rw_02_power_loss',
        phase: 'Phase 2: 電源遮断後の被害波及 (T+00:30)',
        title: '証拠消失とファイルサーバーでの暗号化開始',
        description: '電源切断により端末は沈黙しましたが、攻撃者はすでにファイルサーバー FS-01 に侵入していました。FS-01 上で「.lockbit」拡張子のファイルが生成され始め、デスクトップに脅迫状が表示されました。',
        severity: 'critical',
        situationSummary: '端末のメモリデータがないため初期侵入経路の特定が難航。共有フォルダーの暗号化が急速に進行中。',
        telemetryLogs: [
          { timestamp: '09:41:00', source: 'FS-01 Filesystem', level: 'CRITICAL', message: 'Mass file rename detected: *.xlsx -> *.xlsx.lockbit' },
          { timestamp: '09:42:15', source: 'Desktop FS-01', level: 'CRITICAL', message: 'Ransom note dropped: HOW_TO_RECOVER_FILES.txt' },
          { timestamp: '09:44:30', source: 'Palo Alto FW', level: 'ALERT', message: 'Outbound SFTP transfer to 45.142.214.88 (Volume: 14.8 GB)' }
        ],
        choices: [
          {
            id: 'c2b_isolate_vlan_san',
            label: 'サーバーVLANを全社から緊急遮断し、SANストレージのボリュームをリードオンリーに固定',
            actionType: 'containment',
            timeCostMinutes: 10,
            description: 'これ以上の暗号化進行を食い止めるため、共有ストレージをハードウェアレベルで書き込み禁止にする。',
            tacticalRationale: '暗号化の物理的停止。一部データは失われるが、基幹データベースや他部署への延焼を食い止め、復旧の足がかりを作れる。',
            isOptimal: true,
            impact: { spread: -5, exfiltration: 15, downtime: 40, trust: -10 },
            logOutput: [
              '[NETWORK] Core Switch: VLAN 100 (Servers) isolated from user networks.',
              '[STORAGE] NetApp Volume snapshot read-only lock triggered.',
              '[FS-01] Encryption process errored: Access Denied (Read-only filesystem).'
            ],
            nextNodeId: 'rw_03_leak_extortion'
          },
          {
            id: 'c2b_call_ransom_number',
            label: '脅迫状に記載されたTorサイトにアクセスし、身代金額の交渉を開始する',
            actionType: 'communication',
            timeCostMinutes: 60,
            description: '犯人の要求金額と支払期日を確認し、復号キーの購入を試みる。',
            tacticalRationale: '危険極まりない。警察庁・JPCERT/CC・FBIの全指針で身代金支払いは強く非推奨。資金は犯罪組織を利するだけであり、復号キーが届かないか破損しているケースが半数以上。また二重恐喝は止まらない。',
            impact: { spread: 10, exfiltration: 40, downtime: 50, trust: -40 },
            logOutput: [
              '[THREAT INTEL] Contact established with "BlackByte/LockLeak" affiliate via Tor chat.',
              '[EXTORTIONIST] "Demand: $1.2M USD in Monero. We also possess 45GB of NDA engineering designs."',
              '[LEGAL RISK] Potential violation of anti-money laundering / sanction laws.'
            ],
            nextNodeId: 'rw_04_terminal_ransom_paid'
          }
        ]
      },

      rw_02_full_spread: {
        id: 'rw_02_full_spread',
        phase: 'Phase 2: 全面侵害とドメインコントローラー制圧 (T+01:00)',
        title: 'ドメイン全域へのランサムウェア一斉配信',
        description: 'フルスキャンを待つ間に、攻撃者はGPO（グループポリシー）を悪用して社内全PC・サーバーへ一斉に暗号化スクリプトを展開しました。全社で青い画面と警告音が鳴り響いています。',
        severity: 'critical',
        situationSummary: 'ドメインコントローラー含むサーバー80台、クライアント端末1,200台が暗号化。完全な事業停止。',
        telemetryLogs: [
          { timestamp: '10:14:00', source: 'Group Policy', level: 'CRITICAL', message: 'New GPO deployed: "SystemUpdate_Q4" containing malicious batch execution' },
          { timestamp: '10:18:22', source: 'SOC Monitoring', level: 'CRITICAL', message: '852 host heartbeats lost. Hard drive MBR/VSS corrupted.' }
        ],
        choices: [
          {
            id: 'c2c_disaster_recovery',
            label: '全社ネットワークの完全停止・BCP（事業継続計画）発動および外部フォレンジック専門機関の緊急招集',
            actionType: 'remediation',
            timeCostMinutes: 120,
            description: 'データセンターの物理回線を切断し、クリーンな環境でのゼロベース復旧計画へ切り替える。',
            tacticalRationale: '被害は甚大だが、これ以上の二重被害・外部への攻撃踏み台化を断ち切る唯一のプロフェッショナルな決断。',
            impact: { spread: 0, exfiltration: 30, downtime: 80, trust: -40 },
            logOutput: [
              '[EXECUTIVE] Crisis Management Committee assembled. BCP Level 3 declared.',
              '[EXTERNAL] Mandiant / Incident Response Firm deployed on-site.',
              '[NETWORK] Internet gateway physically pulled.'
            ],
            nextNodeId: 'rw_04_terminal_bcp_disaster'
          }
        ]
      },

      rw_03_exfil_defense: {
        id: 'rw_03_exfil_defense',
        phase: 'Phase 3: データ持ち出し防御と法的対応 (T+02:00)',
        title: '外向きC2トンネルの遮断と個人情報保護委員会報告',
        description: 'AD特権の失効とバックアップ隔離により暗号化の横展開は完全に停止。しかし、プロキシログから攻撃者が隔離直前の10分間に海外クラウドストレージへ約350MBの暗号化ZIPを送信していた痕跡が発見されました。',
        severity: 'medium',
        situationSummary: '暗号化被害は端末1台のみで封じ込め完了。焦点は「漏洩データの特定」と「法定義務の遵守」へ移行。',
        telemetryLogs: [
          { timestamp: '11:05:12', source: 'Web Proxy', level: 'WARN', message: 'POST to mega.nz (352 MB) from 192.168.10.42 before isolation' },
          { timestamp: '11:15:00', source: 'Forensics Tool', level: 'INFO', message: 'Memory analysis: Attacker compressed "C:\\Users\\sales\\Documents\\Q3_Clients.xlsx"' },
          { timestamp: '11:20:00', source: 'Compliance Alert', level: 'INFO', message: 'Personal Information Protection Act (PPC) 72-hour prompt report window running.' }
        ],
        choices: [
          {
            id: 'c3_ppc_reporting_forensics',
            label: 'フォレンジックによる漏洩範囲の確定、個人情報保護委員会への速報提出、および影響顧客への個別連絡準備',
            actionType: 'communication',
            timeCostMinutes: 90,
            description: '漏洩した顧客名簿（1,420件）を特定。個人情報保護法に基づき発覚後速やかに委員会へ報告し、透明性のある対応を実施する。',
            tacticalRationale: '完璧なコンプライアンス遵守。迅速な速報と顧客ケアにより、行政処分やレピュテーション失墜を最小限に防ぎ、企業の信頼回復を主導できる。',
            isOptimal: true,
            impact: { spread: -5, exfiltration: -5, downtime: 5, trust: +20 },
            logOutput: [
              '[LEGAL] Preliminary Report submitted to Personal Information Protection Commission (PPC).',
              '[PR] Internal stakeholder briefing completed. Customer hotline established.',
              '[FORENSICS] Memory dump validated: No other data exfiltrated.'
            ],
            nextNodeId: 'rw_04_terminal_contained_s'
          },
          {
            id: 'c3_coverup',
            label: '「暗号化が止まったので大事には至っていない」と判断し、役員会にも外部にも報告せず社内処理',
            actionType: 'communication',
            timeCostMinutes: 15,
            description: '漏洩規模が小さいため公表を見送り、社内処分のみで幕引きを図る。',
            tacticalRationale: '最悪の不祥事対応。後日ダークウェブにデータが投下された際、隠蔽が発覚して個人情報保護法違反（最大1億円の罰金や是正命令）および株価暴落・社会的制裁を招く。',
            impact: { spread: 10, exfiltration: 30, downtime: 0, trust: -60 },
            logOutput: [
              '[MANAGEMENT] Incident closed as "internal malfunction".',
              '[THREAT INTEL] +30 Days Later: 1,420 customer records leaked on BreachForums with corporate domain tag.',
              '[REGULATOR] Investigation opened by authorities regarding undisclosed data breach.'
            ],
            nextNodeId: 'rw_04_terminal_coverup_f'
          }
        ]
      },

      rw_03_backup_compromised: {
        id: 'rw_03_backup_compromised',
        phase: 'Phase 3: バックアップ喪失危機と復旧判断 (T+03:00)',
        title: 'オンラインバックアップの破壊と二重脅迫の本格化',
        description: 'TGSチケットを再利用され、接続されていたNASバックアップのシャドウコピーが消去されました。攻撃グループから「データ公開を止めたければ72時間以内に1億円を支払え」という警告文が届きました。幸い、前週のオフラインLTO磁気テープが金庫に保管されています。',
        severity: 'critical',
        situationSummary: 'オンラインデータは全滅。前週のテープバックアップから1週間のデータ欠損を許容して自力再構築するか、身代金を支払うかの選択。',
        telemetryLogs: [
          { timestamp: '12:00:10', source: 'NAS Monitor', level: 'CRITICAL', message: 'Storage pool formatted by compromised admin credentials' },
          { timestamp: '12:15:00', source: 'IT Ops', level: 'INFO', message: 'Physical LTO-8 tape vault verified: Data intact up to last Friday 23:59' }
        ],
        choices: [
          {
            id: 'c3b_restore_tape',
            label: '金庫のオフラインLTOテープからクリーンな予備機へゼロ復旧を実施（1週間の業務再入力）',
            actionType: 'remediation',
            timeCostMinutes: 180,
            description: '身代金は一切拒絶。警察（サイバー犯罪対策課）へ被害届を出し、テープバックアップから業務システムを再構築する。',
            tacticalRationale: '実務的な王道。1週間のデータ損失と復旧コストは発生するが、犯罪組織への資金提供を拒み、確実に健全な環境で業務再開できる。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 15, downtime: 30, trust: +10 },
            logOutput: [
              '[RECOVERY] Clean hardware initialized in isolated staging DMZ.',
              '[OPS] LTO tape restoration verified. 98.2% data consistency achieved.',
              '[POLICE] Damage report accepted by Prefectural Police Cyber Division.'
            ],
            nextNodeId: 'rw_04_terminal_tape_restored_b'
          }
        ]
      },

      rw_03_leak_extortion: {
        id: 'rw_03_leak_extortion',
        phase: 'Phase 3: データ漏洩阻止と事業継続 (T+04:00)',
        title: 'サーバー隔離完了と漏洩データ精査',
        description: 'サーバーVLANの遮断により暗号化の拡散は食い止めたものの、攻撃者が持ち出した14.8GBのデータの中身の特定が必要です。顧客情報、特許図面、財務情報が含まれている可能性があります。',
        severity: 'high',
        situationSummary: '暗号化停止。事業停止期間の短縮と、情報漏洩に対する顧客・監督官庁対応が最重要課題。',
        telemetryLogs: [
          { timestamp: '13:00:00', source: 'SOC Forensics', level: 'INFO', message: 'Exfiltration dump analyzed: Marketing presentations and 3,000 partner contact emails.' },
          { timestamp: '13:30:00', source: 'Crisis Team', level: 'WARN', message: 'Media inquiries incoming regarding system outage on corporate website.' }
        ],
        choices: [
          {
            id: 'c3c_transparent_pr',
            label: '公式アナウンスの即時発表（第一報）と、外部フォレンジック検証による復旧スケジュールの開示',
            actionType: 'communication',
            timeCostMinutes: 60,
            description: '「現在調査中であり特定システムを安全のため計画停止中」であることを公表し、憶測による風評被害を防ぐ。',
            tacticalRationale: '危機管理広報の鉄則。隠蔽や沈黙はパニックと不信を呼ぶ。事実と対策を透明に開示することで信頼を維持できる。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 0, downtime: 10, trust: +15 },
            logOutput: [
              '[PR] First Holding Statement published on corporate portal.',
              '[CALL CENTER] Customer briefing script distributed to account managers.',
              '[JPCERT] Technical incident indicator sharing submitted.'
            ],
            nextNodeId: 'rw_04_terminal_damage_contained_a'
          }
        ]
      },

      // TERMINAL OUTCOMES
      rw_04_terminal_contained_s: {
        id: 'rw_04_terminal_contained_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク勝利】完璧な初動封じ込めと法規範遵守',
        description: 'あなたの指揮により、ランサムウェアの横展開は端末1台のみで完全遮断され、Active Directoryの防衛に成功しました。RAM証拠保全により侵入経路（標的型メールの添付PDF）も特定され、個人情報保護法に基づく72時間以内報告も完了しました。',
        severity: 'contained',
        situationSummary: '組織的被害: 極小。業務停止: なし。法的リスク: 回避。',
        telemetryLogs: [
          { timestamp: '15:30:00', source: 'CSIRT Commander', level: 'INFO', message: 'Incident Status: CLOSED. All IoCs isolated.' },
          { timestamp: '15:35:00', source: 'Executive Board', level: 'INFO', message: 'Board Commendation issued to CSIRT triage team.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: '最高水準のインシデントハンドリング',
          summary: '「電源を切らず論理隔離」「krbtgtパスワード二重リセット」「オフラインバックアップ即時保護」「72時間以内PPC報告」という実務上最も重要な4大鉄則をすべて完遂しました。',
          financialEstimate: '被害損害額: 約150万円（端末再セットアップ・フォレンジック検証費のみ）/ 想定被害回避額: 約4.8億円',
          legalImpact: '個人情報保護法遵守により行政指導・課徴金リスクを完全回避。顧客離反ゼロ。',
          complianceStatus: 'NIST CSF 2.0 (Protect / Detect / Respond) 評価: Tier 4 (Adaptive)',
          recommendedPractices: [
            'EDRによるホスト論理隔離は電源オフより優先される（RAM保全の徹底）',
            'ドメイン特権漏洩の疑いがある場合、通常パスワード変更ではなく krbtgt の2回リセットが必須',
            '漏洩が判明した際は個人情報保護委員会への速報（3〜5日以内が実務目安・原則72時間）を遵守する'
          ]
        }
      },

      rw_04_terminal_damage_contained_a: {
        id: 'rw_04_terminal_damage_contained_a',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Aランク】被害限定と堅実な広報・復旧',
        description: '電源切断のミスや一部暗号化の発生はあったものの、ストレージのライトプロテクトと迅速な広報開示により大惨事を防ぎました。',
        severity: 'contained',
        situationSummary: '一部ファイルサーバー暗号化、データ漏洩軽微。業務停止2日。',
        telemetryLogs: [
          { timestamp: '16:00:00', source: 'CSIRT', level: 'INFO', message: 'Server VLAN cleaned and restored from read-only snapshots.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'A',
          title: '被害を最小限に抑制した危機対応',
          summary: '初動で揮発性メモリを失ったハンディキャップを、ネットワークVLAN隔離と透明性のある危機広報でカバーしました。',
          financialEstimate: '被害損害額: 約1,200万円（サーバー復旧・外部フォレンジック・業務遅延）',
          legalImpact: '顧客への早期説明により集団訴訟等の重大法的リスクを抑制。',
          complianceStatus: 'NIST CSF 評価: Tier 3 (Repeatable)',
          recommendedPractices: [
            '端末の強制電源断は最終手段とし、現場社員に「LANケーブルを抜くかWi-Fiを切る」手順を徹底教育する',
            'ストレージのイミュータブル（不変）スナップショット機能を平時から有効化しておく'
          ]
        }
      },

      rw_04_terminal_tape_restored_b: {
        id: 'rw_04_terminal_tape_restored_b',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Bランク】身代金拒否とオフライン復旧の完遂',
        description: 'オンラインデータは失われ1週間のデータ入力ロスが発生しましたが、オフライン磁気テープの存在により犯罪組織へ1円も支払わずにシステムを再建しました。',
        severity: 'medium',
        situationSummary: '業務復旧まで5日間を要したものの、組織の主権を維持。',
        telemetryLogs: [
          { timestamp: '17:00:00', source: 'IT Operations', level: 'INFO', message: 'Base core ERP running from validated LTO-8 tape set.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'B',
          title: '屈服せず自力再建を成し遂げた防衛戦',
          summary: '3-2-1バックアップルール（うち1つは物理的に隔離されたエアギャップ）が最後の砦として機能しました。',
          financialEstimate: '被害損害額: 約4,500万円（1週間の業務停滞・手動再入力コスト）',
          legalImpact: '警察との連携により刑事捜査協力、制裁法違反はなし。',
          complianceStatus: 'NIST CSF 評価: Tier 2 (Risk Informed)',
          recommendedPractices: [
            '「エアギャップ（物理隔離）バックアップ」の定期的なリストア訓練を四半期ごとに実施する',
            'TGSチケット窃取を封じるため、特権アクセス管理(PAM)と階層化管理モデル(Tiering)を導入する'
          ]
        }
      },

      rw_04_terminal_ransom_paid: {
        id: 'rw_04_terminal_ransom_paid',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Cランク・失敗】身代金支払いと二重被害',
        description: '身代金1億2,000万円を暗号資産で支払ったものの、受領された復号プログラムは不具合が多く半分以上のデータベースが復旧不能でした。さらに2週間後、別のアフィリエイトから「元データのコピーを暴露する」と追加要求が届きました。',
        severity: 'critical',
        situationSummary: '莫大な金銭喪失、二重脅迫の継続、反社会的勢力への資金供与疑惑。',
        telemetryLogs: [
          { timestamp: '18:00:00', source: 'Crypto Wallet', level: 'ALERT', message: 'Monero transaction confirmed to threat actor wallet.' },
          { timestamp: '18:30:00', source: 'Decryption Tool', level: 'CRITICAL', message: 'Decryption error on MSSQL databases: Key mismatch / file corrupted.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'C',
          title: '身代金支払いによる泥沼化',
          summary: 'ランサムウェア犯罪者に身代金を支払っても、データが元通りに戻る保証は一切ありません。反社会的勢力への利益供与として株主代表訴訟の対象にもなり得ます。',
          financialEstimate: '被害損害額: 約1億8,000万円（身代金 + 復旧不能損害 + システム刷新費）',
          legalImpact: 'マネーロンダリング・国際制裁規制への抵触懸念、株主代表訴訟リスク。',
          complianceStatus: 'NIST CSF 評価: Tier 1 (Partial)',
          recommendedPractices: [
            '「身代金は絶対に支払わない」ことを経営方針・BCP規程として事前に明文化しておく',
            '復旧は常に「検証済みのバックアップ」からのリストアを前提に設計する'
          ]
        }
      },

      rw_04_terminal_coverup_f: {
        id: 'rw_04_terminal_coverup_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク・最悪】情報隠蔽による社会的制裁と経営破綻危機',
        description: '社内だけで収めようとした事件は、攻撃者がダークウェブに顧客データを公開したことで白日の下に晒されました。隠蔽工作が報じられ、取引先からの契約解除が殺到、個人情報保護法違反による刑事告発と巨額の課徴金が課されました。',
        severity: 'critical',
        situationSummary: '組織的隠蔽が発覚。信用失墜、取締役全員引責辞任、株価70%下落。',
        telemetryLogs: [
          { timestamp: '09:00:00', source: 'National News', level: 'CRITICAL', message: 'Major precision equipment maker accused of covering up massive data breach.' },
          { timestamp: '09:30:00', source: 'Regulatory Authority', level: 'CRITICAL', message: 'Administrative order and investigation issued under Act on Protection of Personal Information.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: 'セキュリティインシデント隠蔽の末路',
          summary: '技術的な失敗以上に、「インシデントの不都合な事実を隠蔽した」組織ガバナンスの崩壊が致命傷となりました。現代のサイバーインシデントでは隠し通すことは不可能です。',
          financialEstimate: '被害損害額: 約12億円以上（損害賠償・課徴金・取引停止・株価下落）',
          legalImpact: '個人情報保護法違反による罰則・民事損害賠償請求・役員賠償責任。',
          complianceStatus: 'コンプライアンス破綻',
          recommendedPractices: [
            '「インシデントの迅速な報告と誠実な公表」こそが最大の法的防衛手段である',
            '内部通報・CSIRTのエスカレーションラインが経営陣の保身で止まらない独立体制を構築する'
          ]
        }
      },

      rw_04_terminal_bcp_disaster: {
        id: 'rw_04_terminal_bcp_disaster',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Cランク】初動遅延による全滅と長期復興戦',
        description: 'フルスキャンを待つという初動の45分間の遅延により、ドメインコントローラーが掌握されて全社停止に追い込まれました。BCP発動によりなんとか犯罪者への屈服は免れましたが、再建には3ヶ月を要します。',
        severity: 'critical',
        situationSummary: '全社端末・サーバー初期化。完全なゼロベース再構築。',
        telemetryLogs: [
          { timestamp: '19:00:00', source: 'CSIRT', level: 'WARN', message: 'Factory lines operating via manual pen & paper.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'C',
          title: '初動の判断停止が招いた組織全壊',
          summary: '「何をしていいかわからずスキャンを待つ」という初動の遅延が、数分で拡散する最新マルウェアに対して命取りとなりました。',
          financialEstimate: '被害損害額: 約3億5,000万円（生産ライン停止・再構築人件費）',
          legalImpact: 'サプライチェーン納期遅延による違約金発生。',
          complianceStatus: 'NIST CSF 評価: Tier 1 (Partial)',
          recommendedPractices: [
            '「疑わしきは直ちに隔離」の原則を自動化（SOARやEDR自動修復ルール）する',
            '管理者の手動判断を待たずに不審通信を自動遮断するゼロトラストポリシーを敷く'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_aitm_bec',
    title: 'AiTMフィッシング & セッションハイジャック (MFA突破型BEC詐欺)',
    subtitle: '多要素認証を突破された役員アカウントと不正送金1億5,000万円の阻止作戦',
    difficulty: '上級 (インシデントコマンダー)',
    category: 'BEC & Phishing',
    estimatedTime: '15分',
    initialNodeId: 'aitm_01_alert',
    initialMetrics: {
      spread: 10,
      exfiltration: 30,
      downtime: 5,
      trust: 95,
    },
    briefing: {
      targetOrganization: '総合商社（海外取引高 月間30億円）',
      discoveredAlert: 'CFO（最高財務責任者）のアカウントが、ナイジェリア・ラゴスのIPから認証成功。MFA要求を伴わずにExchange Onlineへアクセス。',
      incidentOfficer: '情報セキュリティ室長（CISO直属）',
      immediateObjective: 'リバースプロキシ型フィッシングによるセッション乗っ取りの無効化、不正なメール転送ルールの排除、および海外銀行送金の差し止め。',
    },
    imagePath: '/src/assets/images/soc_incident_command_1793333672915.jpg',
    nodes: {
      aitm_01_alert: {
        id: 'aitm_01_alert',
        phase: 'Phase 1: 不正サインイン検知とセッション特定 (T+00:00)',
        title: 'MFAを通過した不審な海外セッション',
        description: 'Microsoft Entra ID (旧Azure AD) のリスク検知で、CFOの普段と異なる国（ナイジェリア）からのサインインが報告されました。「MFA突破」ではなく、Evilginx2等のリバースプロキシによって「認証済みセッションCookie (ESTSAUTH)」を盗難された可能性が極めて高いです。',
        severity: 'critical',
        situationSummary: 'CFOは東京本社で会議中。現在も海外IPからWeb版Outlookへのアクセスが継続しています。',
        telemetryLogs: [
          { timestamp: '14:02:11', source: 'Entra ID Protection', level: 'CRITICAL', message: 'Impossible travel alert: cfo@trading-corp.jp logged in from Lagos, Nigeria (IP: 102.89.33.12)' },
          { timestamp: '14:02:30', source: 'Unified Audit Log', level: 'ALERT', message: 'Authentication Method: Session Cookie Replay (No MFA prompt triggered)' },
          { timestamp: '14:03:55', source: 'Exchange Online', level: 'WARN', message: 'MailItemsAccessed: Folder "Sent Items", "Invoices_2026"' }
        ],
        choices: [
          {
            id: 'c1_revoke_tokens_ca',
            label: 'Microsoft Graph APIによる「全アクティブセッションの即時無効化 (Revoke-AzureADUserAllRefreshToken)」とFIDO2パスキー限定の条件付きアクセスポリシー適用',
            actionType: 'containment',
            timeCostMinutes: 5,
            description: '盗まれたセッションCookieとリフレッシュトークンを即時失効させ、再認証を強制。中間者攻撃耐性のあるFIDO2/WebAuthn認証のみを許可する。',
            tacticalRationale: '完璧な技術対応。単なるパスワード変更では既存のセッションCookieを無効化できないため、トークン失効コマンドの実行が最重要。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -15, downtime: 0, trust: +5 },
            logOutput: [
              '[ENTRA ID] Revoke-MgUserSignSession executed for cfo@trading-corp.jp.',
              '[ENTRA ID] All active OAuth2 tokens invalidated across all devices.',
              '[SOC] Attacker session terminated: HTTP 401 Unauthorized.'
            ],
            nextNodeId: 'aitm_02_mailbox_audit'
          },
          {
            id: 'c1_password_reset_only',
            label: 'CFOに内線電話し、M365のパスワードを変更してもらう',
            actionType: 'remediation',
            timeCostMinutes: 20,
            description: 'パスワードを推測困難な長いものに変えさせる。',
            tacticalRationale: '致命的な勘違い。AiTM攻撃で盗まれたのは「セッションCookie」であるため、パスワードを変更してもCookieの有効期限（通常24時間〜数日）が切れるまで攻撃者はそのままメールボックスを操作し続けられる。',
            impact: { spread: 15, exfiltration: 25, downtime: 0, trust: -15 },
            logOutput: [
              '[HELP-DESK] CFO changed password.',
              '[M365 AUDIT] Attacker session remains ACTIVE via persistent ESTSAUTH cookie.',
              '[EXCHANGE] New-InboxRule: Rule "SystemForward" created silently by attacker.'
            ],
            nextNodeId: 'aitm_02_invoice_divert'
          }
        ]
      },

      aitm_02_mailbox_audit: {
        id: 'aitm_02_mailbox_audit',
        phase: 'Phase 2: 不正メール転送ルール・改ざんの徹底調査 (T+00:20)',
        title: '潜伏用インボックスルールの発見と財務連携',
        description: 'セッション失効に成功。直ちにExchange監査ログを検索したところ、攻撃者が侵入直後の1分間に「invoice」「bank」「transfer」を含む受信メールを「ごみ箱へ移動し、外部攻撃者アドレスへ転送する」隠しルールを作成していたことが判明しました。',
        severity: 'high',
        situationSummary: '攻撃者は来週予定されていた大型機械の購入代金（1億5,000万円）の請求書スレッドを盗み見ていました。',
        telemetryLogs: [
          { timestamp: '14:04:10', source: 'Exchange Audit', level: 'CRITICAL', message: 'New-InboxRule: Name=".", Condition="Subject contains \'Payment\'", Action="ForwardTo fake-audit@secure-cloud-mail.com, DeleteMessage"' },
          { timestamp: '14:22:00', source: 'Mailbox Trace', level: 'INFO', message: 'Target thread identified: "RE: Final Invoice - Project Alpha $1.5M USD"' }
        ],
        choices: [
          {
            id: 'c2_purge_rule_finance_freeze',
            label: '不正ルールの即時抹消、財務部への緊急警告発令（送金口座変更の全件電話確認義務付け）',
            actionType: 'containment',
            timeCostMinutes: 15,
            description: 'PowerShellで全社メールボックスの不審ルールを洗い出して削除。財務担当者に「メールのみによる口座変更要求の処理を全面凍結」させる。',
            tacticalRationale: 'BEC詐欺の急所。攻撃者の目的は「偽の口座変更メール」を送って1.5億円を着服すること。送金直前の人的二重確認（コールバック確認）で確実に防ぐ。',
            isOptimal: true,
            impact: { spread: -5, exfiltration: -10, downtime: 5, trust: +15 },
            logOutput: [
              '[EXCHANGE] Remove-InboxRule completed. All shadow rules removed.',
              '[FINANCE ALERT] CFO / Treasury: SWIFT transfer freeze enacted.',
              '[VENDOR CONTACT] Vendor CFO reached via known fixed landline: Confirmed no bank change was requested.'
            ],
            nextNodeId: 'aitm_03_terminal_saved_s'
          }
        ]
      },

      aitm_02_invoice_divert: {
        id: 'aitm_02_invoice_divert',
        phase: 'Phase 2: 偽請求書送付と送金実行の危機 (T+00:45)',
        title: 'CFOになりすました偽口座送金指示',
        description: 'セッションが生きたままだったため、攻撃者はCFO本人になりすまし、財務担当者へ「取引先が銀行口座を緊急変更したため、本日15時までに新口座（香港HSBC）へ1.5億円を振り込むように」と指示メールを送信しました。財務担当者が送金承認ボタンを押そうとしています。',
        severity: 'critical',
        situationSummary: '残り時間15分。銀行の当日送金締切が迫る。',
        telemetryLogs: [
          { timestamp: '14:45:10', source: 'Outlook Web', level: 'CRITICAL', message: 'Sent email: "URGENT: Remittance Account Update - Wire to Hong Kong account"' },
          { timestamp: '14:46:00', source: 'Treasury System', level: 'ALERT', message: 'Wire Transfer Batch #8812 Pending 2nd Approval ($1,500,000 USD)' }
        ],
        choices: [
          {
            id: 'c2b_physical_intercept',
            label: '財務部執務室へ直接駆け込み、送金承認操作を物理的に制止・メガバンクへ緊急送金保留連絡',
            actionType: 'containment',
            timeCostMinutes: 5,
            description: '電子通知ではなく対面で担当者を止め、銀行の外国為替デスクへ送金停止要請を行う。',
            tacticalRationale: '泥縄だが実務上極めて有効。サイバー攻撃が金銭詐取へ直結する瞬間は、物理的・人間的な介入が最後の防波堤となる。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 10, downtime: 10, trust: +5 },
            logOutput: [
              '[INCIDENT CHIEF] Intercepted wire transfer physically at Treasury terminal.',
              '[BANK FOREX] Mitsubishi UFJ / SMBC Desk: Remittance flagged as suspected fraud.',
              '[RESULT] $1.5M USD transaction cancelled successfully.'
            ],
            nextNodeId: 'aitm_03_terminal_narrow_escape_a'
          },
          {
            id: 'c2b_send_chat',
            label: '社内Teamsチャットで「詐欺メールの可能性がある」と財務担当者にメッセージを送る',
            actionType: 'communication',
            timeCostMinutes: 20,
            description: 'チャットで連絡し、気付いてもらうのを待つ。',
            tacticalRationale: '不十分。担当者はCFOからの緊急メールに焦っており、Teamsを見ていない可能性が高い。結果として送金ボタンが押され着金してしまう。',
            impact: { spread: 0, exfiltration: 40, downtime: 20, trust: -50 },
            logOutput: [
              '[TEAMS] Message sent... unread for 12 minutes.',
              '[BANK API] SWIFT MT103 wire transfer transmitted to offshore account.',
              '[DISASTER] Funds withdrawn within 8 minutes of arrival in Hong Kong.'
            ],
            nextNodeId: 'aitm_03_terminal_heist_f'
          }
        ]
      },

      aitm_03_terminal_saved_s: {
        id: 'aitm_03_terminal_saved_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】AiTMフィッシング完全封殺と不正送金阻止',
        description: 'セッションCookieの即時無効化、隠し転送ルールの粛清、そして財務プロセスの人的二重確認により、1億5,000万円の詐取を水際で完全阻止しました。またFIDO2パスキー認証の全社展開へと繋げました。',
        severity: 'contained',
        situationSummary: '金銭被害: ゼロ。機密流出: なし。BEC攻撃を完璧に撃退。',
        telemetryLogs: [
          { timestamp: '16:00:00', source: 'CISO Office', level: 'INFO', message: 'All Executive accounts migrated to FIDO2 Hardware Security Keys (YubiKey).' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: '次世代認証脅威への模範的対応',
          summary: '「セッションハイジャックにはトークン失効」「隠しインボックスルールの特定」「口座変更の別経路確認」というBEC対策の黄金原則を完遂しました。',
          financialEstimate: '被害損害額: 0円 / 詐欺着服阻止額: 1億5,000万円',
          legalImpact: '警察庁サイバー警察局へIoC提供。国際送金詐欺グループ摘発の証拠に貢献。',
          complianceStatus: 'ISO/IEC 27001 / Zero Trust 実装完了',
          recommendedPractices: [
            'SMSや認証アプリのワンタイムパスワード(TOTP)はAiTMリバースプロキシで突破されるため、FIDO2/パスキーを導入する',
            '口座変更依頼メールを受信した際は、メール記載の電話番号ではなく「既存の登録電話番号」へ必ず折り返し確認する',
            '定期的に全ユーザーの「メール転送ルール一覧 (Get-InboxRule)」を自動監査するスクリプトを運用する'
          ]
        }
      },

      aitm_03_terminal_narrow_escape_a: {
        id: 'aitm_03_terminal_narrow_escape_a',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Aランク】間一髪の送金阻止とセッション管理の教訓',
        description: 'パスワード変更だけではセッションが切れないという落とし穴に直面したものの、執務室への突入と銀行連携により1.5億円の流出を1分前に阻止しました。',
        severity: 'contained',
        situationSummary: '金銭被害はギリギリ回避。危機管理意識の向上。',
        telemetryLogs: [
          { timestamp: '16:15:00', source: 'Audit Team', level: 'INFO', message: 'Conditional Access Policy updated to force token lifetime limit (1 hour).' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'A',
          title: '現場の瞬発力で守り切った薄氷の勝利',
          summary: '技術的なトークン失効が遅れたものの、人的な緊急停止措置が功を奏しました。技術と人間の二重防壁の重要性を証明しました。',
          financialEstimate: '被害損害額: 0円（送金手数料キャンセル費用のみ）',
          legalImpact: '金融機関との信頼関係強化。',
          complianceStatus: '良好',
          recommendedPractices: [
            'アカウント侵害時は「パスワード変更」と「セッション・リフレッシュトークン失効」を必ずワンセットで実行する'
          ]
        }
      },

      aitm_03_terminal_heist_f: {
        id: 'aitm_03_terminal_heist_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク】1億5,000万円の資金流出と回収不能',
        description: 'チャット連絡の遅れにより送金が実行され、資金は香港のペーパーカンパニー口座を経由して即座に暗号資産へ資金洗浄されました。資金の回収可能性はほぼゼロです。',
        severity: 'critical',
        situationSummary: '巨額損失発生。CFOおよび担当役員の懲戒処分、監査役調査開始。',
        telemetryLogs: [
          { timestamp: '16:30:00', source: 'Interpol', level: 'CRITICAL', message: 'Funds dispersed across 40+ decentralized crypto mixers. Recovery untraceable.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: '古典的かつ現代的なBEC詐欺の完全被弾',
          summary: 'セッションCookieの仕組みを知らず、送金阻止の現場緊急性が欠如していたことが最悪の損害に直結しました。',
          financialEstimate: '金銭損失: 1億5,000万円（全額回収不能）',
          legalImpact: '取引先への債務不履行、特別損失計上、株主総会での経営責任追及。',
          complianceStatus: '内部統制上の「重大な不備」認定',
          recommendedPractices: [
            '高額送金には電子署名または対面/肉声によるクロスチェックを内部統制ルールに組み込む',
            'フィッシング耐性のある認証（FIDO2）への移行を最優先課題とする'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_cloud_supply_chain',
    title: 'サプライチェーン侵害 & クラウド秘密鍵漏洩',
    subtitle: '公開リポジトリへのAWS秘密鍵コミットと不正インスタンス増殖の封じ込め',
    difficulty: '初級 (基礎トリアージ)',
    category: 'Cloud & Supply Chain',
    estimatedTime: '12分',
    initialNodeId: 'cloud_01_alert',
    initialMetrics: {
      spread: 15,
      exfiltration: 20,
      downtime: 5,
      trust: 90,
    },
    briefing: {
      targetOrganization: 'BtoB SaaS スタートアップ企業（契約社数 800社）',
      discoveredAlert: '開発者が誤ってGitリポジトリへAWS IAM長期クレデンシャル（AdministratorAccess）をコミット。わずか45秒後にボットにより悪用開始。',
      incidentOfficer: 'DevSecOpsリードエンジニア',
      immediateObjective: '流出したクラウドクレデンシャルの瞬時無効化、不正リソースの駆逐、顧客DBスナップショットの流出防止。',
    },
    imagePath: '/src/assets/images/scenario_cloud_breach_1793333674112.jpg',
    nodes: {
      cloud_01_alert: {
        id: 'cloud_01_alert',
        phase: 'Phase 1: クラウド認証情報流出と悪用検知 (T+00:00)',
        title: 'GitHub公開リポジトリへのIAMアクセスキー誤コミット',
        description: '若手エンジニアがオープンソース公開用のコードに誤って `.env` の本番AWSアクセスキー（AKIA...）を含めてプッシュ。45秒後、CloudTrailに「オレゴン、サンパウロ、フランクフルト等の複数リージョンで巨大なGPUインスタンス（g5.12xlarge）が一斉起動された」という異常アラートが殺到しました。',
        severity: 'critical',
        situationSummary: 'マイニングボットが自動展開中。毎時数十万円のクラウド利用料が発生中。',
        telemetryLogs: [
          { timestamp: '16:01:45', source: 'GitHub Push', level: 'WARN', message: 'Public commit 4a8f9c pushed with AWS_ACCESS_KEY_ID="AKIA..."' },
          { timestamp: '16:02:30', source: 'AWS CloudTrail', level: 'CRITICAL', message: 'RunInstances initiated by AKIA... in us-west-2, sa-east-1, eu-central-1 (32x g5.12xlarge)' },
          { timestamp: '16:03:00', source: 'AWS GuardDuty', level: 'CRITICAL', message: 'CryptoCurrency:EC2/BitcoinTool.B!DNS detected' }
        ],
        choices: [
          {
            id: 'c1_deactivate_key_iam',
            label: 'AWSマネジメントコンソール/CLIから流出アクセスキーを即座に「Deactivate (無効化)」し、IAM権限境界を更新',
            actionType: 'containment',
            timeCostMinutes: 3,
            description: '削除ではなくまず無効化することで攻撃者の全APIコールを即時遮断しつつ、監査ログ追跡の基点を維持する。',
            tacticalRationale: 'クラウドセキュリティ初動の鉄則。git commitを取り消してもボットはすでにキーを保管しているため、AWS側でキーを無効化する以外に止める術はない。',
            isOptimal: true,
            impact: { spread: -15, exfiltration: -10, downtime: 0, trust: +5 },
            logOutput: [
              '[AWS IAM] aws iam update-access-key --access-key-id AKIA... --status Inactive',
              '[CLOUDTRAIL] Subsequent API calls from attacker returned: 403 InvalidClientTokenId.',
              '[SOC] Attacker API calls halted.'
            ],
            nextNodeId: 'cloud_02_terminate_resources'
          },
          {
            id: 'c1_git_revert_only',
            label: 'GitHub上で慌てて git commit --amend して該当ファイルを消して強制プッシュする',
            actionType: 'remediation',
            timeCostMinutes: 15,
            description: 'リポジトリから秘密鍵の記載を消去する。',
            tacticalRationale: '典型的な初歩的ミス。ボットはプッシュされた瞬間にキーを吸い上げて自らのサーバーに保存しているため、GitHubから消してもキー自体は有効なままであり、被害が拡大し続ける。',
            impact: { spread: 30, exfiltration: 25, downtime: 10, trust: -20 },
            logOutput: [
              '[GIT] Commit amended and pushed with --force.',
              '[CLOUDTRAIL] Attacker continues spawning EC2 instances.',
              '[AWS COST] Unbilled EC2 charges reached $12,400 in 20 minutes.'
            ],
            nextNodeId: 'cloud_02_cost_explosion'
          }
        ]
      },

      cloud_02_terminate_resources: {
        id: 'cloud_02_terminate_resources',
        phase: 'Phase 2: 不正リソースの駆逐とデータ侵害調査 (T+00:15)',
        title: '不正インスタンスの全リージョン一括終了とS3監査',
        description: 'アクセスキー無効化により攻撃者の新規APIコールを遮断。次に起動されたマイニング用EC2インスタンスの全破棄と、S3バケット内の顧客機密データにアクセスされたかどうかのCloudTrail監査を行います。',
        severity: 'high',
        situationSummary: '起動されたインスタンス群の終了スクリプト実行。S3バケットのGetObjectログを検証中。',
        telemetryLogs: [
          { timestamp: '16:08:00', source: 'AWS CLI Script', level: 'INFO', message: 'Terminating 32 unauthorized EC2 instances across 4 regions.' },
          { timestamp: '16:12:30', source: 'S3 Server Access Log', level: 'ALERT', message: 'ListBuckets executed by compromised key. S3 GetObject on "prod-customer-db-dump" attempted.' }
        ],
        choices: [
          {
            id: 'c2_s3_log_verify_rotate',
            label: 'CloudTrail EventHistoryでS3へのアクセス結果を照合、全IAMロールのローテーションと一時的認証情報(IAM Roles / OIDC)への移行',
            actionType: 'forensics',
            timeCostMinutes: 30,
            description: 'データが実際にダウンロードされたかバイト数を確認。長期アクセスキーを全廃し、GitHub Actions用にはOIDC短時間トークンを採用する。',
            tacticalRationale: '根本原因の恒久排除。静的な長期キー(AKIA)の使用をやめ、OpenID Connect(OIDC)による短命トークンに切り替えることで再発をゼロにできる。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -10, downtime: 5, trust: +15 },
            logOutput: [
              '[S3 AUDIT] Bucket Policy denied GetObject due to KMS customer managed key restriction!',
              '[FORENSICS] No customer data exfiltrated. KMS blocked unauthorized decryption.',
              '[DEVSECOPS] GitHub Actions AWS credentials migrated to OIDC assume-role-with-web-identity.'
            ],
            nextNodeId: 'cloud_03_terminal_secured_s'
          }
        ]
      },

      cloud_02_cost_explosion: {
        id: 'cloud_02_cost_explosion',
        phase: 'Phase 2: 請求額爆発とアカウント凍結の危機 (T+01:00)',
        title: '数千万円規模の不正請求と顧客データベースの窃取',
        description: 'Gitの修正だけで安心していたため、攻撃者はAWS Organizations内の別アカウントへも権限昇格を実行。さらにS3内のバックアップダンプファイルをまるごとダウンロードし、社用Slackに「漏洩を公開されたくなければビットコインを払え」と投稿してきました。',
        severity: 'critical',
        situationSummary: 'クラウド請求額3,000万円突破。顧客800社の全データ流出。',
        telemetryLogs: [
          { timestamp: '17:05:00', source: 'AWS Billing Alert', level: 'CRITICAL', message: 'Account credit limit exceeded: $210,000 USD' },
          { timestamp: '17:10:00', source: 'S3 Data Transfer', level: 'CRITICAL', message: 'Egress: 2.4 TB transferred to external IP' }
        ],
        choices: [
          {
            id: 'c2b_aws_support_compromise',
            label: 'AWSサポートへ緊急「Compromised Account」チケット起票・ルートアカウントによる全権限剥奪と警察相談',
            actionType: 'containment',
            timeCostMinutes: 60,
            description: 'AWS Trust & Safetyチームと連携し、不正請求の救済交渉とインフラの完全隔離を要請する。',
            tacticalRationale: '手遅れ寸前だが唯一の生存策。AWSは適切な初動と報告があれば不正マイニングの請求を一部免除してくれる場合がある。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 10, downtime: 40, trust: -30 },
            logOutput: [
              '[AWS SUPPORT] Case opened: Severity "Critical - System Down". AWS SecOps froze compromised IAM entities.',
              '[BILLING] Concession review initiated under AWS compromised account policy.'
            ],
            nextNodeId: 'cloud_03_terminal_recovery_c'
          }
        ]
      },

      cloud_03_terminal_secured_s: {
        id: 'cloud_03_terminal_secured_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】電光石火のクラウド封じ込めとDevSecOps刷新',
        description: 'キー無効化を3分で完了させたことで不正インスタンスの利用料は数千円で抑えられ、KMS暗号化ポリシーによって顧客データへのアクセスも防御されました。さらに長期キーを全廃してOIDCへ移行したことで、組織のセキュリティ体制が一段上に引き上げられました。',
        severity: 'contained',
        situationSummary: '金銭被害: わずか数千円（AWS免除対象）。顧客データ漏洩: ゼロ。',
        telemetryLogs: [
          { timestamp: '18:00:00', source: 'Security Architecture', level: 'INFO', message: 'Git pre-commit secret scanning hooks (gitleaks) mandated for all dev repositories.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: 'DevSecOps時代の模範的クラウド初動',
          summary: '「Git修正ではなくIAMキー無効化」「多層防御としてのKMS暗号化」「OIDCによる長期キーの廃止」という現代クラウドセキュリティの三種の神器を実践しました。',
          financialEstimate: '被害損害額: 約8,000円（EC2一時稼働費・AWSサポートにて全額免除認定）',
          legalImpact: 'データ流出なしがフォレンジックで証明され、法定義務違反なし。',
          complianceStatus: 'AWS Well-Architected Security Pillar 準拠',
          recommendedPractices: [
            'IAM長期アクセスキー(AKIA...)は原則使用禁止とし、IAMロールおよびOIDC連携に一本化する',
            'Gitクライアントに `gitleaks` や `trufflehog` を導入し、コミット前にシークレットを自動検知してブロックする',
            'S3バケットにはKMS CMK（カスタマー管理キー）による暗号化を施し、IAM管理者であっても復号を制限する多層防御を敷く'
          ]
        }
      },

      cloud_03_terminal_recovery_c: {
        id: 'cloud_03_terminal_recovery_c',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Cランク】初動の無理解が招いた巨額請求と情報漏洩',
        description: 'Gitの修正だけで解決したと誤認した結果、数千万円のクラウド請求とS3からの顧客全件データ流出を招きました。AWSサポートの救済で請求の一部は減免されたものの、全顧客への謝罪と賠償が発生しました。',
        severity: 'critical',
        situationSummary: '重大インシデント。顧客離脱、全社的信用失墜。',
        telemetryLogs: [
          { timestamp: '19:00:00', source: 'Executive Council', level: 'CRITICAL', message: 'Emergency shareholder meeting scheduled to report $200k financial write-off.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'C',
          title: 'Gitとクラウド認証の混同による悲劇',
          summary: '「公開されたキーは即時にクラウド側で無効化しなければならない」という初歩原則を怠ったことが致命傷となりました。',
          financialEstimate: '被害損害額: 約1億2,000万円（不正利用料残債 + 顧客損害賠償・お詫び金）',
          legalImpact: '個人情報保護法に基づく是正命令、全顧客への個別通知。',
          complianceStatus: '重大な統制不備',
          recommendedPractices: [
            '「コードから消してもクラウド上で生きている」ことを全開発者に肝に銘じさせる',
            'CloudTrailおよびGuardDutyのクリティカル通知を即時Slack/PagerDutyへエスカレーションする仕組みを義務付ける'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_vpn_zeroday',
    title: 'SSL-VPNゼロデイ脆弱性悪用 & 境界防御突破インシデント',
    subtitle: 'CVSS 9.8 境界ゲートウェイ突破からの内部ネットワークWebシェル潜伏と封じ込め',
    difficulty: '中級 (実務CSIRT)',
    category: 'Zero-Day & Perimeter',
    estimatedTime: '15分',
    initialNodeId: 'vpn_01_alert',
    initialMetrics: {
      spread: 20,
      exfiltration: 10,
      downtime: 15,
      trust: 90,
    },
    briefing: {
      targetOrganization: '地方自治体・基幹公共インフラ連携機構（職員1,800名）',
      discoveredAlert: '外部SSL-VPNゲートウェイ（VPN-GW-01）において、未認証の任意コード実行(RCE)脆弱性を突いた攻撃IPからのHTTP POST通信と、DMZ内リバースプロキシへの異常通信を検知。',
      incidentOfficer: 'SOCアナリスト兼インシデントハンドラー',
      immediateObjective: 'ゼロデイ侵害されたVPN機器の切り離し、内部Webシェルの特定と排除、Active Directoryへのピボット遮断。',
    },
    imagePath: '/src/assets/images/scenario_vpn_zeroday_1793335053211.jpg',
    nodes: {
      vpn_01_alert: {
        id: 'vpn_01_alert',
        phase: 'Phase 1: 境界突破アラートと初期トリアージ (T+00:00)',
        title: 'SSL-VPNゲートウェイにおける未認証RCEの検知',
        description: 'JPCERT/CCおよびベンダーから緊急セキュリティ勧告が出ているSSL-VPN機器（CVSS 9.8）に対し、中国/東欧系IPから難読化されたBase64ペイロードを含むPOSTリクエストが着信。機器背後のDMZサーバー `/var/www/html/tunnel.jsp` にWebシェルが作成された形跡があります。',
        severity: 'critical',
        situationSummary: '攻撃者はすでにVPN機器を通過し、DMZ内のLinuxリバースプロキシでコマンドを実行可能な状態。',
        telemetryLogs: [
          { timestamp: '23:14:02', source: 'Palo Alto Perimeter FW', level: 'CRITICAL', message: 'Exploit attempt: CVE-2025-XXXX (Auth Bypass RCE) against VPN-GW-01 from 185.87.201.44' },
          { timestamp: '23:14:30', source: 'DMZ Web Server', level: 'ALERT', message: 'New file created: /var/www/html/themes/tunnel.jsp (SHA256: e3b0c442... Godzilla WebShell)' },
          { timestamp: '23:15:10', source: 'Linux Auditd', level: 'WARN', message: 'tomcat spawned bash -c "whoami; ip route; cat /etc/passwd"' }
        ],
        choices: [
          {
            id: 'c1_vpn_isolate_pcap',
            label: '上流ルーターでの該当VPN-GWへのインバウンド遮断、DMZサーバーのメモリダンプ採取およびWebシェル隔離',
            actionType: 'containment',
            timeCostMinutes: 10,
            description: '上流BGP/スイッチで当該VPN機器宛の通信を緊急ドロップ。内部DMZサーバーは電源を落とさずメモリを採取した上でWebシェルプロセスをkillする。',
            tacticalRationale: '最善の対応。外部からの攻撃通信パイプラインを即座に断ち切り、同時にWebシェルの通信セッションとメモリ展開されたペイロードを完全保全できる。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -5, downtime: 15, trust: +5 },
            logOutput: [
              '[BORDER ROUTER] BGP Flowspec rule injected: Drop all traffic to VPN-GW-01 public IP.',
              '[SOC] External attacker session timed out (TCP RST sent).',
              '[DMZ-01] Volatile memory dumped to forensic USB. Process PID 8812 (tunnel.jsp) killed.'
            ],
            nextNodeId: 'vpn_02_lateral_sweep'
          },
          {
            id: 'c1_vpn_reboot_only',
            label: 'VPN機器の電源スイッチを再投入（リブート）して様子を見る',
            actionType: 'containment',
            timeCostMinutes: 5,
            description: '機器を再起動し、一時的な不具合か確認する。',
            tacticalRationale: '悪手。VPN機器を再起動してもDMZに設置されたWebシェルは永続化されており、外部から再接続されるか内部cronでC2通信が継続する。',
            impact: { spread: 25, exfiltration: 20, downtime: 5, trust: -15 },
            logOutput: [
              '[VPN-GW-01] System reboot completed. Services restarted.',
              '[DMZ-01] Cron job executed: /var/tmp/.daemon connecting to 91.240.118.52 on port 443.',
              '[AD LOG] NTLM relay attack initiated from DMZ-01 towards Internal Domain Controller!'
            ],
            nextNodeId: 'vpn_02_reboot_failure'
          }
        ]
      },

      vpn_02_lateral_sweep: {
        id: 'vpn_02_lateral_sweep',
        phase: 'Phase 2: 内部ピボット調査とActive Directory防衛 (T+00:30)',
        title: '内部VLANへの侵入痕跡スキャンとパッチ適用',
        description: '外部通信の遮断によりWebシェルは停止。採取したメモリダンプの解析により、攻撃者が内部Active Directoryや職員業務用ファイルサーバーを探索する前に遮断できたことが確認されました。ベンダーの緊急セキュリティパッチを適用し、ゼロトラスト型SASE/ZTNAへの切り替えを検討します。',
        severity: 'high',
        situationSummary: '侵入はDMZサーバー1台で食い止めに成功。内部セグメントへの汚染なし。',
        telemetryLogs: [
          { timestamp: '23:45:00', source: 'Internal Core FW', level: 'INFO', message: 'No unauthorized SYN packets from DMZ-01 to Internal VLAN (10.10.0.0/16).' },
          { timestamp: '23:50:20', source: 'SIEM Log Correlation', level: 'INFO', message: 'Credential store on DMZ-01 contained no domain admin hashes.' }
        ],
        choices: [
          {
            id: 'c2_patch_credential_rotation',
            label: 'VPN機器の完全初期化・ファームウェア最新パッチ適用、全ユーザーVPN認証情報の強制リセット',
            actionType: 'remediation',
            timeCostMinutes: 45,
            description: '機器設定をバックアップからクリーンリストアして脆弱性修正パッチを適用。漏洩疑いのあるVPNパスワードを全件更新する。',
            tacticalRationale: '恒久対策の徹底。ゼロデイ脆弱性を根本修復し、念のため全ユーザーの認証情報をローテーションすることで再侵入経路を完全に塞ぐ。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -5, downtime: 10, trust: +15 },
            logOutput: [
              '[VPN-GW-01] Factory reset executed. Firmware patched to v12.4.1 (CVE addressed).',
              '[IDP] 1,800 user VPN passwords expired. Forced MFA re-enrollment enacted.',
              '[SECURITY SCAN] Vulnerability re-check: CVE-2025-XXXX fixed successfully.'
            ],
            nextNodeId: 'vpn_03_terminal_mastered_s'
          }
        ]
      },

      vpn_02_reboot_failure: {
        id: 'vpn_02_reboot_failure',
        phase: 'Phase 2: 内部ピボット成功と住民情報DBアクセス (T+01:00)',
        title: 'Webシェル経由の内部Active Directory制圧',
        description: 'VPNを単に再起動したため、DMZ内のWebシェルが生きたまま放置されました。攻撃者はDMZから内部ネットワークへNTLMリレー攻撃を行い、ドメイン管理者のハッシュを奪取。住民情報データベースへクエリを投げ始めました。',
        severity: 'critical',
        situationSummary: '境界防御完全突破。基幹データベースから個人情報が抽出中。',
        telemetryLogs: [
          { timestamp: '00:15:00', source: 'MSSQL Audit', level: 'CRITICAL', message: 'SELECT * FROM Resident_Master executed by DOMAIN\\admin_svc' },
          { timestamp: '00:18:30', source: 'Firewall Egress', level: 'CRITICAL', message: 'High volume outbound SSL stream to untrusted ASN (Bulgaria IP)' }
        ],
        choices: [
          {
            id: 'c2b_pull_datacenter_internet',
            label: 'データセンター回線の物理的切断・警察サイバー捜査隊への緊急通報と公表準備',
            actionType: 'containment',
            timeCostMinutes: 30,
            description: 'これ以上のデータ流出を止めるため、インターネット接続を完全物理遮断する。',
            tacticalRationale: '重傷だが止血処置。すでに一部データは流出したが、全件持ち出しとランサムウェア暗号化による住民サービス停止は防げる。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 30, downtime: 60, trust: -30 },
            logOutput: [
              '[DATA CENTER] WAN link disconnected physically.',
              '[POLICE] Cyber Crime Division on-site at municipal office.',
              '[STATUS] Citizen data export stopped at 4,200 records.'
            ],
            nextNodeId: 'vpn_03_terminal_compromised_c'
          }
        ]
      },

      vpn_03_terminal_mastered_s: {
        id: 'vpn_03_terminal_mastered_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】境界ゼロデイの電光石火封じ込めと多層防御成功',
        description: '上流ルーターでの通信遮断とDMZサーバーのメモリ保全を即座に行い、ゼロデイ攻撃をDMZ内の単一プロセスで完全に封殺しました。内部ネットワークへの一切の足がかりを与えず、翌日にはパッチ適用と認証情報ローテーションを完遂しました。',
        severity: 'contained',
        situationSummary: '情報流出: ゼロ。内部侵入: なし。ゼロデイ攻撃を完全撃退。',
        telemetryLogs: [
          { timestamp: '02:00:00', source: 'CSIRT Command', level: 'INFO', message: 'Incident closed. Zero-Trust Network Access (ZTNA) migration accelerated.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: 'ゼロデイ攻撃に対する模範的CSIRT対応',
          summary: '「上流ネットワークでの早期遮断」「電源を切らないメモリフォレンジック保全」「全認証情報の迅速な更新」を的確に完遂しました。',
          financialEstimate: '被害損害額: 約120万円（緊急パッチ検証・外部監査費のみ）/ 想定被害回避額: 約3.5億円',
          legalImpact: '住民情報・個人データの漏洩ゼロ。行政機関の信頼を維持。',
          complianceStatus: '政府統一基準 / NIST CSF 2.0 評価: Tier 4',
          recommendedPractices: [
            '境界型SSL-VPN機器はゼロデイの主標的となるため、ゼロトラストアクセス(ZTNA)への移行を推進する',
            '機器の単なる再起動はWebシェルや永続化メカニズムを排除できないことを徹底周知する',
            'DMZから内部ネットワークへの通信ポリシーは厳格なステートフルインスペクションで遮断しておく'
          ]
        }
      },

      vpn_03_terminal_compromised_c: {
        id: 'vpn_03_terminal_compromised_c',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Cランク】再起動ミスによる住民情報流出と社会的引責',
        description: '「再起動すれば治る」という安易な判断により、Webシェル経由でActive Directoryが乗っ取られ住民情報4,200件が流出しました。回線切断により全滅は免れたものの、自治体首長による記者会見とお詫び金対応が発生しました。',
        severity: 'critical',
        situationSummary: '住民データ一部流出。全庁ネットワーク停止3日間。',
        telemetryLogs: [
          { timestamp: '03:00:00', source: 'City Hall Press', level: 'CRITICAL', message: 'Emergency press conference held regarding citizen data leak.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'C',
          title: '境界型セキュリティの脆弱性と初動ミスの代償',
          summary: '再起動によってログやメモリ証拠を一部破損し、DMZから内部へのラテラルムーブメントを許してしまいました。',
          financialEstimate: '被害損害額: 約8,500万円（お詫び状送付・原因究明・セキュリティ刷新）',
          legalImpact: '個人情報保護委員会からの是正勧告、住民説明会の開催。',
          complianceStatus: '要改善',
          recommendedPractices: [
            '「疑わしい機器の再起動」はフォレンジック証拠を破壊するため、専門チーム到着まで厳禁とする',
            'ネットワーク機器の重要セキュリティ勧告は24時間以内に適用判断を行う運用体制を組む'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_insider_threat',
    title: '特権管理者によるソースコード＆顧客データ大量持ち出し',
    subtitle: '退職直前のシニアエンジニアによる45GB機密エクスポートと不正競争防止法対応',
    difficulty: '上級 (インシデントコマンダー)',
    category: 'Insider Threat',
    estimatedTime: '15分',
    initialNodeId: 'insider_01_alert',
    initialMetrics: {
      spread: 10,
      exfiltration: 35,
      downtime: 5,
      trust: 95,
    },
    briefing: {
      targetOrganization: 'AI・FinTech クラウドSaaS企業（社員450名）',
      discoveredAlert: '来月末で競合他社へ転職予定のインフラ主任（Domain Admin / AWS Admin権限保持）が、深夜02時に社用PCから未承認の私用Google Driveへ45GBの暗号化ZIPをアップロード中。',
      incidentOfficer: 'CISO兼コンプライアンス法務委員長',
      immediateObjective: 'データ持ち出しの阻止、証拠隠滅の防止（法的証拠の保全）、不正競争防止法に基づく差止請求準備。',
    },
    imagePath: '/src/assets/images/scenario_insider_threat_1793335053388.jpg',
    nodes: {
      insider_01_alert: {
        id: 'insider_01_alert',
        phase: 'Phase 1: 深夜のDLP異常アラート発報 (T+00:00)',
        title: '私用クラウドストレージへの大容量暗号化転送の検知',
        description: '深夜02時18分、CASB/DLP（情報漏洩対策ソリューション）が発報。退職を控えたシニアエンジニアのアカウントから、コアエンジンのソースコード全Git履歴、および顧客12万件のPostgreSQLダンプ（dump_2026.sql.enc）が外部個人アカウントへ送信されています。現在転送は40%完了。',
        severity: 'critical',
        situationSummary: '本人は在宅勤務中。Slackはオフラインだが、VPN接続を通じて大量エクスポートを実行中。',
        telemetryLogs: [
          { timestamp: '02:18:12', source: 'Netskope CASB', level: 'CRITICAL', message: 'DLP Violation: Large upload to Personal Google Drive (User: s_yamada@fintech.co.jp, Volume: 18.2 / 45.0 GB)' },
          { timestamp: '02:18:45', source: 'GitLab Enterprise', level: 'WARN', message: 'Bulk repository archive download (32 private repos cloned in 10 minutes)' },
          { timestamp: '02:19:05', source: 'Postgres RDS', level: 'ALERT', message: 'pg_dump utility executed by user "yamada_admin" against production database' }
        ],
        choices: [
          {
            id: 'c1_silent_freeze_forensics',
            label: '本人の気付かぬうちにVPNセッションをサイレント切断、全特権アカウントをサスペンドし、法廷用フォレンジック保全を開始',
            actionType: 'containment',
            timeCostMinutes: 8,
            description: '転送を直ちに強制遮断。本人のアカウント（AWS, GitHub, VPN, Slack）を無効化し、社用貸与PCのリモートロックと監査ログの改ざん防止ハッシュ固定を行う。',
            tacticalRationale: '最善の法的・実務対応。本人に電話して問い詰めると「慌てて私用PCやクラウド上の証拠ファイルを完全消去」され、裁判で立証不能になるリスクを防ぐ。',
            isOptimal: true,
            impact: { spread: -5, exfiltration: -20, downtime: 0, trust: +5 },
            logOutput: [
              '[VPN] Disconnected session for user s_yamada. IP route dropped.',
              '[CASB] Google Drive upload aborted at 19.1 GB. Incomplete file cannot be extracted.',
              '[IAM/AD] Account s_yamada suspended across Okta, AWS IAM, and Active Directory.',
              '[FORENSICS] Audit logs preserved with cryptographic SHA-256 timestamping.'
            ],
            nextNodeId: 'insider_02_legal_confront'
          },
          {
            id: 'c1_phone_confront',
            label: '直ちに本人の携帯電話へ直接電話し、「今すぐアップロードを中止してデータを消せ」と問い詰める',
            actionType: 'communication',
            timeCostMinutes: 15,
            description: '深夜に直接電話して事実確認を行い、自発的な中止とデータ削除を促す。',
            tacticalRationale: '典型的な失敗例。逆上した従業員が社用PCのディスクを初期化（コマンド実行）したり、すでに上がったファイルを別クラウドへ拡散させ、証拠隠滅に走る。',
            impact: { spread: 15, exfiltration: 30, downtime: 10, trust: -25 },
            logOutput: [
              '[CALL LOG] CISO called s_yamada mobile phone.',
              '[USER REACTION] User panicked. Executed "rm -rf --no-preserve-root /" via local sudo on MacBook.',
              '[GOOGLE DRIVE] Upload continued on personal Wi-Fi device. 45GB transfer COMPLETED.'
            ],
            nextNodeId: 'insider_02_evidence_destroyed'
          }
        ]
      },

      insider_02_legal_confront: {
        id: 'insider_02_legal_confront',
        phase: 'Phase 2: 法務・人事・警察連携と機密データ回収 (T+01:00)',
        title: '不正競争防止法に基づく保全措置と競合への警告',
        description: 'セッション切断によりデータ転送は途中で頓挫。顧問弁護士と緊急協議を行い、不正競争防止法（営業秘密の不正取得・使用）に基づく証拠保全申し立て、および転職先競合企業への「営業秘密侵害の警告書（コンプライアンス通知）」の送達準備を進めます。',
        severity: 'medium',
        situationSummary: '持ち出しデータは破損（不完全）で利用不可。動かぬアクセス証跡を確保。',
        telemetryLogs: [
          { timestamp: '03:15:00', source: 'Corporate Legal', level: 'INFO', message: 'Evidence bundle ready: CASB packet logs, Postgres access times, Git clone logs.' },
          { timestamp: '03:30:00', source: 'Google Workspace API', level: 'INFO', message: 'Legal subpoena draft prepared to request deletion of partial chunk on personal Google account.' }
        ],
        choices: [
          {
            id: 'c2_legal_injunction_interview',
            label: '弁護士同席のもと本人を翌朝召集して事情聴取・誓約書徴求、警察への刑事告訴（不正競争防止法違反）',
            actionType: 'remediation',
            timeCostMinutes: 60,
            description: '確たる証拠を突きつけて個人端末上の残存データを弁護士立ち会いで完全消去。競合他社に対しても営業秘密の利用差し止めを通告する。',
            tacticalRationale: '完璧な幕引き。確固たる証拠のもとで法的措置を講じることで、機密の他社利用を確実に封じ、企業の競争力と顧客資産を防衛する。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: -15, downtime: 0, trust: +20 },
            logOutput: [
              '[LEGAL INTERVIEW] Subject admitted to breach during attorney interview.',
              '[PHYSICAL DISK] Personal storage and MacBook surrendered for bit-stream forensic imaging.',
              '[COMPETITOR] Competing firm acknowledged warning letter and rescinded employment offer.'
            ],
            nextNodeId: 'insider_03_terminal_triumph_s'
          }
        ]
      },

      insider_02_evidence_destroyed: {
        id: 'insider_02_evidence_destroyed',
        phase: 'Phase 2: 証拠隠滅後の法廷闘争と機密漏洩 (T+02:00)',
        title: '社用端末初期化と他社への機密提供',
        description: '電話で問い詰めたことにより、本人は社用端末を初期化して「誤操作であり何も盗んでいない」と主張。しかし45GBのファイルは個人PCに無事ダウンロードされており、競合他社への機密提供を止める直接的証拠の確保が難航しています。',
        severity: 'critical',
        situationSummary: 'ソースコードと顧客12万件が流出完了。証拠隠滅により刑事告訴のハードルが上昇。',
        telemetryLogs: [
          { timestamp: '04:00:00', source: 'Forensics Lab', level: 'CRITICAL', message: 'MacBook internal SSD secure-erased using APFS crypto-wipe.' },
          { timestamp: '04:30:00', source: 'Police Consultation', level: 'WARN', message: 'Difficult to prove criminal intent without intact endpoint logs.' }
        ],
        choices: [
          {
            id: 'c2b_cloud_server_logs_lawsuit',
            label: 'RDSサーバーログおよびCASBの通信記録を再構成し、民事損害賠償訴訟および仮処分を申請',
            actionType: 'communication',
            timeCostMinutes: 90,
            description: '端末側の証拠は失われたが、クラウドサーバー側のログを総動員して民事訴訟を起こす。',
            tacticalRationale: '損害は免れないが放置は許されない。数ヶ月〜数年の法廷闘争となるが、企業の知財防衛姿勢を株主と市場に示す。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 20, downtime: 20, trust: -35 },
            logOutput: [
              '[COURT] Civil lawsuit filed for 500 million yen damages under Unfair Competition Prevention Act.',
              '[MEDIA] Tech media reporting on intellectual property theft lawsuit.'
            ],
            nextNodeId: 'insider_03_terminal_lawsuit_c'
          }
        ]
      },

      insider_03_terminal_triumph_s: {
        id: 'insider_03_terminal_triumph_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】電撃的な証拠保全と営業秘密流出の完全阻止',
        description: '冷静な初動判断により、転送途中で遮断しつつ証拠ログを完全確保しました。本人による証拠隠滅を許さず、弁護士立ち会いの事情聴取で全面自白を獲得。競合への技術流出をゼロで食い止めました。',
        severity: 'contained',
        situationSummary: '機密流出: 実質ゼロ（不完全データ）。知財防衛成功。特権管理の見直し完了。',
        telemetryLogs: [
          { timestamp: '06:00:00', source: 'HR / Legal', level: 'INFO', message: 'Disciplinary dismissal completed. Zero Trust PAM policies implemented.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: '内部不正対策の模範的インシデント指揮',
          summary: '「本人に気づかれずサイレントにセッション遮断」「ログの完全性確保」「不正競争防止法に即した迅速な弁護士連携」を完璧に執行しました。',
          financialEstimate: '被害損害額: 約200万円（法務・フォレンジック費用）/ 技術流出阻止価値: 約15億円以上',
          legalImpact: '営業秘密侵害差止請求の要件を完全充足。顧客情報漏洩なし。',
          complianceStatus: 'IPA 組織における内部不正防止ガイドライン 適合',
          recommendedPractices: [
            '退職予定者の特権アカウントは、退職告知の段階で権限縮小（最小権限の原則）を行う',
            'CASB/DLPによる大容量アップロードの自動ブロックポリシーを事前設定しておく',
            '内部不正の発覚時は、本人への不用意な連絡を避け、証拠保全を最優先する'
          ]
        }
      },

      insider_03_terminal_lawsuit_c: {
        id: 'insider_03_terminal_lawsuit_c',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Cランク】初動の問い詰めによる証拠隠滅と泥沼の法廷闘争',
        description: '電話で感情的に問い詰めた結果、端末を初期化されて刑事告訴の証拠が弱まりました。民事訴訟には持ち込んだものの、競合他社によるコア技術の模倣を即座に止めることができず、市場での優位性に深刻な打撃を受けました。',
        severity: 'critical',
        situationSummary: 'ソースコード流出。特許侵害・著作権侵害の長期法廷闘争へ。',
        telemetryLogs: [
          { timestamp: '08:00:00', source: 'Market Analyst', level: 'WARN', message: 'Competitor announced identical AI feature set.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'C',
          title: '初動の感情的対応が招いた証拠消失の悲劇',
          summary: '「証拠を保全してから対峙する」というフォレンジックの鉄則を怠ったことが、法的な差止請求の遅れに直結しました。',
          financialEstimate: '知財損失・訴訟費用: 約4億円以上',
          legalImpact: '長期訴訟による企業リソースの浪費。',
          complianceStatus: '内部統制上の課題',
          recommendedPractices: [
            'インシデントハンドラーは感情的にならず、客観的証拠（チェーン・オブ・カストディ）を最優先で確立する'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_ai_vishing',
    title: '生成AI役員音声ディープフェイク & 極秘送金詐欺',
    subtitle: 'CEOの声を完全再現した電話着信と3億円のM&A緊急海外送金阻止ミッション',
    difficulty: '上級 (インシデントコマンダー)',
    category: 'AI & Social Engineering',
    estimatedTime: '12分',
    initialNodeId: 'ai_01_alert',
    initialMetrics: {
      spread: 5,
      exfiltration: 30,
      downtime: 5,
      trust: 95,
    },
    briefing: {
      targetOrganization: '東証プライム グローバル精密機械メーカー（年商2,000億円）',
      discoveredAlert: '夜間21時30分、財務統括部長の社用携帯に「代表取締役社長」からの緊急電話が着信。「極秘の欧州企業買収（M&A）のため、明朝09時までに香港の預託信託口座へ3億円を送金せよ」と社長本人の声で緊迫した指示。',
      incidentOfficer: '財務担当役員兼セキュリティコンプライアンス委員',
      immediateObjective: 'AI音声クローニング（ディープフェイク）の真偽見極め、送金プロセスの凍結、および役員音声なりすまし攻撃の封じ込め。',
    },
    imagePath: '/src/assets/images/scenario_ai_vishing_1793335053452.jpg',
    nodes: {
      ai_01_alert: {
        id: 'ai_01_alert',
        phase: 'Phase 1: 不審な役員音声着信と送金指示 (T+00:00)',
        title: '社長の肉声と口調を完全模倣した夜間緊急電話',
        description: '財務部長の社用携帯に社長からの電話着信。「明日朝イチで決済しなければ契約が破談になる。インサイダー情報のため役員会にもまだ通していない。極秘口座へ3億円を急ぎ手配しろ」と指示。声のトーン、息遣い、独特の口癖まで社長そのもの。直後に社長名義の電子署名PDFが個人LINEおよびショートメッセージ(SMS)で送られてきました。',
        severity: 'critical',
        situationSummary: '相手は社長と名乗っているが、社内正規承認ワークフローを通さず、外部チャット経由で緊急送金を要求。',
        telemetryLogs: [
          { timestamp: '21:30:15', source: 'Corporate PBX', level: 'WARN', message: 'Incoming international VoIP call with caller ID spoofed as CEO internal extension' },
          { timestamp: '21:32:00', source: 'Finance Telegram/SMS', level: 'CRITICAL', message: 'Received external message: "M&A Contract Alpha - Wire $2.0M USD to HSBC HK Acct #884-219"' },
          { timestamp: '21:33:10', source: 'Threat Intel Feed', level: 'ALERT', message: 'Active campaign: Akira/Fin7 using ElevenLabs real-time voice synthesis targeting CFOs' }
        ],
        choices: [
          {
            id: 'c1_challenge_passphrase_out_of_band',
            label: '事前設定した「役員緊急時認証コード（コールバック合言葉）」で確認し、社長の公認個人携帯へ別回線で直接折り返し電話',
            actionType: 'investigation',
            timeCostMinutes: 5,
            description: 'かかってきた電話を一旦切り、あらかじめ社内規程で定めた「別ルート（既知のプライベート直通電話）」で社長本人に直接肉声確認をとる。',
            tacticalRationale: 'AIディープフェイク対策の唯一の解。生成AIは声を完璧に模倣できても、事前に物理的に合意したオフラインの秘密合言葉や、攻撃者の通話回線外からの発信には介入できない。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: -20, downtime: 0, trust: +5 },
            logOutput: [
              '[CHALLENGE] Finance GM asked for offline executive verification keyword.',
              '[CALLER] Caller hesitated, became agitated: "What are you talking about! Just wire it now!" and hung up.',
              '[CEO DIRECT] Reached CEO at his residence on landline: CEO confirms he made NO such call. M&A is fabricated.'
            ],
            nextNodeId: 'ai_02_wire_blocked'
          },
          {
            id: 'c1_wire_now_due_to_fear',
            label: '社長の叱責を恐れ、指示に従って深夜オンラインバンキングで送金予約を入力する',
            actionType: 'remediation',
            timeCostMinutes: 20,
            description: '「社長の声なのだから間違いない」と信じ込み、明朝送金の承認処理を進めてしまう。',
            tacticalRationale: '最悪の被弾。香港の国際詐欺口座に着金した瞬間、資金は暗号資産ミキサーへ分散され、1円も回収できなくなる。',
            impact: { spread: 0, exfiltration: 50, downtime: 30, trust: -50 },
            logOutput: [
              '[BANK PORTAL] $2,000,000 USD international wire batch scheduled for 09:00 AM.',
              '[DISASTER] Funds debited automatically at bank opening.',
              '[CEO MORNING] CEO arrives at headquarters: "I never ordered any wire transfer!"'
            ],
            nextNodeId: 'ai_02_lost_funds'
          }
        ]
      },

      ai_02_wire_blocked: {
        id: 'ai_02_wire_blocked',
        phase: 'Phase 2: 全社的ディープフェイク緊急アラートと警察通報 (T+00:15)',
        title: '送金詐欺の完全阻止と経営陣へのIoC共有',
        description: '詐欺であることを確認し、送金処理を水際で完全阻止。社長の公開講演動画（YouTube上の決算説明会動画）から音声がスクレイピングされ、AIモデルで学習されていたことが判明しました。全社財務チームへの注意喚起と警察庁サイバー警察局への情報提供を行います。',
        severity: 'high',
        situationSummary: '金銭被害ゼロ。攻撃者は他部署（海外子会社の経理担当）へも同様の電話を試みている可能性あり。',
        telemetryLogs: [
          { timestamp: '21:45:00', source: 'CISO Alert', level: 'INFO', message: 'Global Finance advisory dispatched: AI Voice Cloning threat active.' },
          { timestamp: '21:50:30', source: 'National Cyber Police', level: 'INFO', message: 'Case intake complete: Bank account numbers added to international freeze list.' }
        ],
        choices: [
          {
            id: 'c2_maker_checker_protocol',
            label: '全海外拠点を含む送金プロセスへの「2名以上対面承認 (Maker-Checker方式)」のシステム的強制と音声認証の全廃',
            actionType: 'remediation',
            timeCostMinutes: 30,
            description: '「電話口の指示による送金例外」を就業規則・送金システム上で物理的に不可能にする恒久ルールを適用する。',
            tacticalRationale: '現代の決定打。声やメールを模倣されても、システム的に2名以上の独立した承認がなければ送金できないガバナンスを構築する。',
            isOptimal: true,
            impact: { spread: -5, exfiltration: -10, downtime: 5, trust: +20 },
            logOutput: [
              '[FINANCE ERP] Rule enforced: No wire over $50k can be authorized without dual-token hardware approval.',
              '[POLICY] Verbal / telephone payment instructions strictly forbidden company-wide.',
              '[RESULT] Fraudulent attempt on European subsidiary safely deflected.'
            ],
            nextNodeId: 'ai_03_terminal_triumph_s'
          }
        ]
      },

      ai_02_lost_funds: {
        id: 'ai_02_lost_funds',
        phase: 'Phase 2: 3億円流出と国際資金追跡 (T+01:00)',
        title: '海外送金完了と資金洗浄ネットワークへの分散',
        description: '翌朝09時10分、3億円の送金が実行され、わずか15分後に香港からカンボジア、ドバイの複数のダミー法人口座を経由してビットコイン/テザー(USDT)へ変換されました。銀行に問い合わせるも「送金指図が正規手順で実行されているため巻き戻し不可」との回答。',
        severity: 'critical',
        situationSummary: '3億円の完全詐取。特別損失計上と役員責任問題。',
        telemetryLogs: [
          { timestamp: '09:25:00', source: 'HSBC HK Desk', level: 'CRITICAL', message: 'Beneficiary account emptied via ATM / OTC crypto broker.' },
          { timestamp: '09:40:00', source: 'Board of Directors', level: 'CRITICAL', message: 'Emergency board meeting convened to review 300 million yen cash loss.' }
        ],
        choices: [
          {
            id: 'c2b_interpol_crisis_pr',
            label: '国際刑事警察機構（インターポール）への資産凍結要請および適時開示（有価証券報告書修正）',
            actionType: 'communication',
            timeCostMinutes: 90,
            description: '資金回収の可能性は低いが国際捜査網に照会し、株主へ特別損失を公表する。',
            tacticalRationale: '組織としての最低限の責任。隠蔽せず公表し、内部統制の不備を認めて再発防止を図る。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 10, downtime: 30, trust: -40 },
            logOutput: [
              '[INTERPOL] Red notice filed. 2 wallets flagged on Chainalysis reactor.',
              '[TSE DISCLOSURE] Extraordinary loss of 300M JPY disclosed to Tokyo Stock Exchange.'
            ],
            nextNodeId: 'ai_03_terminal_disaster_f'
          }
        ]
      },

      ai_03_terminal_triumph_s: {
        id: 'ai_03_terminal_triumph_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】最先端AI詐欺の看破と人的防壁の勝利',
        description: '「社長の声に酷似している」という心理的バイアスに屈せず、別経路での事実確認（コールバック原則）を徹底したことで3億円の詐取を水際で完全阻止しました。全社的な二重承認ガバナンスの確立につながりました。',
        severity: 'contained',
        situationSummary: '被害額: 0円。3億円の流出阻止。次世代ソーシャルエンジニアリングを完全撃退。',
        telemetryLogs: [
          { timestamp: '11:00:00', source: 'Executive Board', level: 'INFO', message: 'Special commendation awarded to Finance GM and Incident Team.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: '生成AI時代に求められる人間の判断力の勝利',
          summary: '「声やビデオを過信しない」「別経路での二重確認」「システム的な二重承認ルール」という、最新AI詐欺に対抗する唯一無二の防衛線を完遂しました。',
          financialEstimate: '被害損害額: 0円 / 詐欺着服阻止額: 3億円',
          legalImpact: '警察庁およびサイバー犯罪対策官から国際詐欺対策の参考事例として評価。',
          complianceStatus: '内部統制最優秀',
          recommendedPractices: [
            '役員が公の場（YouTubeや記者会見）で発言した音声は誰でもAI学習できる前提で脅威モデルを組む',
            '「緊急」「極秘」「例外」を理由とする送金指示はすべて詐欺を疑い、所定の承認フローを絶対に迂回させない',
            '役員間での緊急本人確認用に、ネット非接続で合意した合言葉（マスターコード）を平時に運用する'
          ]
        }
      },

      ai_03_terminal_disaster_f: {
        id: 'ai_03_terminal_disaster_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク】3億円の海外詐取と内部統制崩壊',
        description: '社長の偽音声に騙されて送金を実行してしまい、3億円は全額暗号資産へ洗浄されて回収不能となりました。特別損失の計上により当期赤字に転落し、財務担当役員の引責辞任と株主代表訴訟に発展しました。',
        severity: 'critical',
        situationSummary: '資金全損。社会的信用墜落。内部統制の重大な不備。',
        telemetryLogs: [
          { timestamp: '12:00:00', source: 'Auditors Report', level: 'CRITICAL', message: 'Material weakness identified in financial expenditure controls.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: 'AIディープフェイクによる巨額資金喪失',
          summary: '「声が本人だったから」という理由で社内規程を破り、確認を怠ったことが組織に壊滅的な金銭的・社会的損害をもたらしました。',
          financialEstimate: '金銭損失: 3億円（回収率 0%）',
          legalImpact: '金融庁への重大事故報告、株主代表訴訟、内部統制不備勧告。',
          complianceStatus: '重大な不備認定',
          recommendedPractices: [
            '「声はもはや本人証明にならない」ことを経営陣から現場まで全社員へ再教育する',
            'いかなる役員の指示であっても送金システム単独操作を物理的に不許可とする'
          ]
        }
      }
    }
  }
];

