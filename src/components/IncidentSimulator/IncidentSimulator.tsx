import React, { useState } from 'react';
import { INCIDENT_SCENARIOS } from '../../data/incidentScenarios';
import { IncidentScenario, ScenarioNode, IncidentChoice, IncidentMetric } from '../../types/security';
import { TacticalDashboard } from './TacticalDashboard';
import { TerminalLogStream, LogEntry } from './TerminalLogStream';
import { BranchingTreeVisualizer } from './BranchingTreeVisualizer';
import { AfterActionReportModal } from './AfterActionReportModal';
import { Crosshair, Play, ShieldAlert, GitBranch, Terminal, RotateCcw, AlertTriangle, ArrowRight, Info, CheckCircle2 } from 'lucide-react';

interface IncidentSimulatorProps {
  initialScenarioId?: string;
}

export const IncidentSimulator: React.FC<IncidentSimulatorProps> = ({
  initialScenarioId = 'scenario_ransomware',
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(initialScenarioId);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Active Game State
  const [currentNodeId, setCurrentNodeId] = useState<string>('');
  const [metrics, setMetrics] = useState<IncidentMetric>({ spread: 0, exfiltration: 0, downtime: 0, trust: 0 });
  const [timeElapsedMinutes, setTimeElapsedMinutes] = useState<number>(0);
  const [visitedNodeIds, setVisitedNodeIds] = useState<string[]>([]);
  const [historyChoices, setHistoryChoices] = useState<{ choiceLabel: string; fromNodeId: string; toNodeId: string }[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeRightTab, setActiveRightTab] = useState<'terminal' | 'tree'>('terminal');

  const currentScenario = INCIDENT_SCENARIOS.find((s) => s.id === selectedScenarioId) || INCIDENT_SCENARIOS[0];
  const currentNode: ScenarioNode | undefined = isPlaying ? currentScenario.nodes[currentNodeId] : undefined;

  // Start Scenario
  const handleStartScenario = (scenario: IncidentScenario) => {
    setSelectedScenarioId(scenario.id);
    setCurrentNodeId(scenario.initialNodeId);
    setMetrics({ ...scenario.initialMetrics });
    setTimeElapsedMinutes(0);
    setVisitedNodeIds([scenario.initialNodeId]);
    setHistoryChoices([]);

    const initialNode = scenario.nodes[scenario.initialNodeId];
    const initialLogs: LogEntry[] = initialNode.telemetryLogs.map((l, index) => ({
      id: `init-${index}-${Date.now()}`,
      timestamp: l.timestamp,
      source: l.source,
      level: l.level,
      message: l.message,
    }));

    setLogs(initialLogs);
    setIsPlaying(true);
    setActiveRightTab('terminal');
  };

  // Execute a tactical decision
  const handleSelectChoice = (choice: IncidentChoice) => {
    if (!currentNode) return;

    // Calculate updated metrics
    const newMetrics: IncidentMetric = {
      spread: Math.min(100, Math.max(0, metrics.spread + (choice.impact.spread || 0))),
      exfiltration: Math.min(100, Math.max(0, metrics.exfiltration + (choice.impact.exfiltration || 0))),
      downtime: Math.min(100, Math.max(0, metrics.downtime + (choice.impact.downtime || 0))),
      trust: Math.min(100, Math.max(0, metrics.trust + (choice.impact.trust || 0))),
    };

    // Calculate updated time
    const newTime = timeElapsedMinutes + choice.timeCostMinutes;

    // Build new log entries
    const hours = Math.floor(newTime / 60);
    const mins = newTime % 60;
    const timeFormatted = `${String(9 + hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${Math.floor(Math.random() * 50 + 10)}`;

    const choiceLogEntries: LogEntry[] = choice.logOutput.map((msg, idx) => ({
      id: `act-${Date.now()}-${idx}`,
      timestamp: timeFormatted,
      source: 'COMMANDER-ACTION',
      level: choice.isOptimal ? 'INFO' : 'ALERT',
      message: msg,
    }));

    // Next Node
    const nextNode = currentScenario.nodes[choice.nextNodeId];
    let nextNodeLogs: LogEntry[] = [];
    if (nextNode) {
      nextNodeLogs = nextNode.telemetryLogs.map((l, idx) => ({
        id: `node-${Date.now()}-${idx}`,
        timestamp: l.timestamp,
        source: l.source,
        level: l.level,
        message: l.message,
      }));
    }

    setMetrics(newMetrics);
    setTimeElapsedMinutes(newTime);
    setCurrentNodeId(choice.nextNodeId);
    setVisitedNodeIds((prev) => [...prev, choice.nextNodeId]);
    setHistoryChoices((prev) => [
      ...prev,
      {
        choiceLabel: choice.label,
        fromNodeId: currentNode.id,
        toNodeId: choice.nextNodeId,
      },
    ]);
    setLogs((prev) => [...prev, ...choiceLogEntries, ...nextNodeLogs]);
  };

  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = [
    'ALL',
    'Ransomware',
    'BEC & Phishing',
    'Cloud & Supply Chain',
    'Zero-Day & Perimeter',
    'Insider Threat',
    'AI & Social Engineering',
  ];

  const filteredScenarios = INCIDENT_SCENARIOS.filter(
    (s) => activeCategory === 'ALL' || s.category === activeCategory
  );

  const handleStartRandomScenario = () => {
    // Pick randomly from all available scenarios (or within filtered if desired, but user asked for random出題)
    const candidates = filteredScenarios.length > 0 ? filteredScenarios : INCIDENT_SCENARIOS;
    const randomIndex = Math.floor(Math.random() * candidates.length);
    handleStartScenario(candidates[randomIndex]);
  };

  const handleRestart = () => {
    handleStartScenario(currentScenario);
  };

  const handleReturnToSelect = () => {
    setIsPlaying(false);
  };

  // If not in game, show scenario selection briefing room
  if (!isPlaying) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <span>実務型サイバー演習</span>
              <span aria-hidden="true">·</span>
              <span>被害状況分岐シナリオ</span>
              <span aria-hidden="true">·</span>
              <span>全{INCIDENT_SCENARIOS.length}ケース収録</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight text-balance">
              実戦インシデント対応シミュレーター
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl mt-2 leading-relaxed">
              教科書通りの座学ではなく、発報されるSOCログ、侵害拡大のタイムリミット、被害状況に応じた分岐シナリオを体感する実務訓練モードです。
              特定のシナリオを選択して受講することも、実戦に即したランダム出題で即応力を試すことも可能です。
            </p>
          </div>

          {/* Random Scenario Trigger Button */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={handleStartRandomScenario}
              className="py-3 px-5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-cyan-500/25 cursor-pointer whitespace-nowrap group"
            >
              <span className="text-base group-hover:rotate-180 transition-transform duration-500">🎲</span>
              <span>ランダムで出題開始 (即応ブラインド訓練)</span>
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs mb-6 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeCategory === cat
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'ALL' ? `全シナリオ (${INCIDENT_SCENARIOS.length})` : cat}
            </button>
          ))}
        </div>

        {/* Scenario Selection Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario) => {
            const isCurrent = scenario.id === selectedScenarioId;
            return (
              <div
                key={scenario.id}
                className={`bg-slate-900 border rounded-xl overflow-hidden flex flex-col transition-all duration-200 group ${
                  isCurrent ? 'border-cyan-500/80 shadow-lg shadow-cyan-950/50' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Visual Image Header */}
                <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={scenario.imagePath}
                    alt={scenario.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-2 text-[11px] font-semibold text-slate-200 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded border border-slate-700">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{scenario.category}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span>{scenario.difficulty}</span>
                      <span aria-hidden="true">·</span>
                      <span>所要目安: {scenario.estimatedTime}</span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {scenario.title}
                    </h2>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      {scenario.subtitle}
                    </p>

                    {/* Briefing preview */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-500 shrink-0 font-medium">対象組織:</span>
                        <span className="text-slate-300 truncate">{scenario.briefing.targetOrganization}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-500 shrink-0 font-medium">初動任務:</span>
                        <span className="text-slate-300 line-clamp-2">{scenario.briefing.immediateObjective}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleStartScenario(scenario)}
                      className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-cyan-400/20 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>このシナリオで実戦演習を開始</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tactical Command Briefing rules */}
        <div className="mt-12 bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>インシデントコマンダー訓練の心得</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
            <div>
              <span className="font-semibold text-slate-200 block mb-1">1. ログと兆候を凝視せよ</span>
              右側のSOCログストリームには、EDR・ファイアウォール・ADの生の挙動がリアルタイム出力されます。単なる直感ではなく証跡に基づいて判断してください。
            </div>
            <div>
              <span className="font-semibold text-slate-200 block mb-1">2. 電源断と論理隔離を混同するな</span>
              電源を引っこ抜くとRAM内の重要証拠が消滅します。最新の初動は「電源を入れたままEDRで通信を論理遮断する」ことが国際標準です。
            </div>
            <div>
              <span className="font-semibold text-slate-200 block mb-1">3. 隠蔽は最悪の結末を招く</span>
              ダークウェブ暴露や法定義務（個人情報保護委員会への72時間以内報告）が存在するため、隠蔽は必ずFランク（経営破綻・刑事告訴）へ直結します。
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE GAMEPLAY VIEW
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
      {/* Top Header & Scenario Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={handleReturnToSelect}
            className="text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 rounded border border-slate-700"
          >
            ← シナリオ一覧へ戻る
          </button>
          <div>
            <span className="text-xs text-slate-400 block">{currentScenario.category} · {currentScenario.difficulty}</span>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span>{currentScenario.title}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRestart}
            className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>最初からやり直す</span>
          </button>
        </div>
      </div>

      {/* Tactical Status Dashboard (Gauges, Timeline, Severity) */}
      {currentNode && (
        <TacticalDashboard
          metrics={metrics}
          timeElapsedMinutes={timeElapsedMinutes}
          phaseTitle={currentNode.phase}
          severity={currentNode.severity}
        />
      )}

      {/* Main Interactive Stage Split */}
      {currentNode?.isTerminal ? (
        /* Terminal Outcome (After Action Report) */
        <AfterActionReportModal
          scenario={currentScenario}
          terminalNode={currentNode}
          timeElapsedMinutes={timeElapsedMinutes}
          onRestart={handleRestart}
          onSelectOtherScenario={handleReturnToSelect}
          onStartRandomScenario={handleStartRandomScenario}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Situation & Decision Action Cards (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Current Situation Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1">
                <span>現場状況インテリジェンス</span>
                <span className="text-cyan-400 font-mono text-[11px]">{currentNode?.phase}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 mb-2">{currentNode?.title}</h2>
              <p className="text-slate-300 text-xs leading-relaxed mb-4">
                {currentNode?.description}
              </p>

              {/* Situation Summary Highlight */}
              <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-xs text-amber-300/90 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-200">現状サマリー: </span>
                  {currentNode?.situationSummary}
                </div>
              </div>
            </div>

            {/* Decision Choices Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  コマンダーの意思決定 (TACTICAL DECISIONS)
                </span>
                <span className="text-[11px] text-slate-500">選択肢をクリックして実行</span>
              </div>

              <div className="space-y-3">
                {currentNode?.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleSelectChoice(choice)}
                    className="w-full text-left p-4 rounded-lg bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/80 transition-all duration-150 group cursor-pointer shadow-sm hover:shadow-cyan-950/30"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors leading-snug">
                        {choice.label}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 whitespace-nowrap shrink-0 font-mono">
                        <span>所要 +{choice.timeCostMinutes}分</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed mb-2">
                      {choice.description}
                    </p>

                    {/* Tactical Rationale Preview */}
                    <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                        <span>戦術根拠: {choice.tacticalRationale}</span>
                      </span>
                      <span className="text-cyan-400 font-semibold group-hover:translate-x-1 transition-transform shrink-0 ml-2">
                        実行 →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: SOC Terminal / Branching Map (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveRightTab('terminal')}
                className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  activeRightTab === 'terminal'
                    ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>リアルタイムSOCログ</span>
              </button>
              <button
                onClick={() => setActiveRightTab('tree')}
                className={`flex-1 py-1.5 rounded font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  activeRightTab === 'tree'
                    ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>分岐マップ ({visitedNodeIds.length}ノード通過)</span>
              </button>
            </div>

            {/* Tab 1: Terminal Log Stream */}
            {activeRightTab === 'terminal' && (
              <TerminalLogStream
                logs={logs}
                simulatedTimeText={`T+${Math.floor(timeElapsedMinutes / 60)}h ${timeElapsedMinutes % 60}m`}
              />
            )}

            {/* Tab 2: Branching Visualizer */}
            {activeRightTab === 'tree' && (
              <BranchingTreeVisualizer
                scenario={currentScenario}
                currentNodeId={currentNodeId}
                visitedNodeIds={visitedNodeIds}
                historyChoices={historyChoices}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
