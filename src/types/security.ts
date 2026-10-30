/**
 * Information Security & Incident Response Simulator Types
 */

export type AppView = 'simulator' | 'threats' | 'quiz' | 'scanner' | 'password';

// Incident Simulation Types
export interface IncidentMetric {
  spread: number;        // 被害拡散度 0-100%
  exfiltration: number;  // データ流出リスク 0-100%
  downtime: number;      // 業務停止影響 0-100%
  trust: number;         // 組織・社会的信用 0-100%
}

export interface IncidentChoice {
  id: string;
  label: string;
  actionType: 'containment' | 'forensics' | 'communication' | 'remediation' | 'investigation';
  timeCostMinutes: number; // 消費時間
  description: string;
  tacticalRationale: string; // なぜこの選択肢が有効/危険なのかの実務解説
  impact: Partial<IncidentMetric>;
  logOutput: string[];     // この行動で出力されるログ
  nextNodeId: string;
  isOptimal?: boolean;
}

export interface ScenarioNode {
  id: string;
  phase: string;          // 例: "Phase 1: 初動検知・トリアージ"
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'contained';
  situationSummary: string; // 現状の現場サマリー
  telemetryLogs: {
    timestamp: string;
    source: string;       // EDR, Firewall, AD, CloudTrail, Sysmon
    level: 'INFO' | 'WARN' | 'ALERT' | 'CRITICAL';
    message: string;
  }[];
  choices: IncidentChoice[];
  isTerminal?: boolean;   // 終点ノード（結末）
  terminalOutcome?: {
    grade: 'S' | 'A' | 'B' | 'C' | 'F';
    title: string;
    summary: string;
    financialEstimate: string;
    legalImpact: string;
    complianceStatus: string;
    recommendedPractices: string[];
  };
}

export interface IncidentScenario {
  id: string;
  title: string;
  subtitle: string;
  difficulty: '初級 (基礎トリアージ)' | '中級 (実務CSIRT)' | '上級 (インシデントコマンダー)';
  category: 'Ransomware' | 'BEC & Phishing' | 'Cloud & Supply Chain' | 'Zero-Day & Perimeter' | 'Insider Threat' | 'AI & Social Engineering';
  estimatedTime: string;
  initialNodeId: string;
  initialMetrics: IncidentMetric;
  briefing: {
    targetOrganization: string;
    discoveredAlert: string;
    incidentOfficer: string;
    immediateObjective: string;
  };
  imagePath: string;
  nodes: Record<string, ScenarioNode>;
}

// Threat Trends Types
export interface ThreatTrendItem {
  id: string;
  category: 'AI・ソーシャルエンジニアリング' | 'マルウェア・ランサムウェア' | 'アイデンティティ・認証' | 'クラウド・サプライチェーン' | '法規制・コンプライアンス';
  title: string;
  summary: string;
  severity: '極めて高い (Critical)' | '高 (High)' | '中 (Medium)';
  timelineTrend: string; // "2025-2026年急増中" など
  attackVector: string[];
  realWorldImpact: string;
  defensiveMeasures: {
    immediate: string;   // 即時対策
    architectural: string; // 恒久対策・アーキテクチャ
  };
  relevantMitre: string; // 例: "T1566.002, T1114"
}

// Security Quiz Types
export interface QuizQuestion {
  id: string;
  category: '初動対応' | 'フィッシング・認証' | 'マルウェア防御' | 'クラウド・設定不備' | '法規制・ガバナンス';
  difficulty: 'Basic' | 'Advanced' | 'Expert';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  wrongRationale: string[]; // なぜ他の選択肢が不適切なのか
  mitreRef?: string;
  keyRule: string; // 実務で覚えておくべき鉄則
}

// Vulnerability Scanner Types
export interface VulnCheckItem {
  id: string;
  name: string;
  category: 'HTTPヘッダー' | 'SSL/TLS' | '認証・セッション' | 'API・アクセス制御' | 'クラウド設定';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  risk: string;
  remediationSnippet: string;
}

export interface ScanResultItem extends VulnCheckItem {
  status: 'passed' | 'failed' | 'warning';
  currentValue: string;
  recommendedValue: string;
}

// Password Generator Types
export interface PasswordConfig {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean; // l, 1, I, O, 0 など
  mode: 'random' | 'passphrase';
  wordCount: number;
}

export interface PasswordAnalysis {
  entropy: number;
  score: 0 | 1 | 2 | 3 | 4; // zxcvbn-like 0-4
  crackTimeOnline: string;
  crackTimeOfflineGPU: string;
  crackTimeSupercomputer: string;
  nistCompliant: boolean;
  checks: {
    lengthCheck: boolean;
    complexityCheck: boolean;
    varietyCheck: boolean;
    entropyCheck: boolean;
  };
}
