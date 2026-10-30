import React from 'react';
import { IncidentScenario, ScenarioNode } from '../../types/security';
import { Award, DollarSign, Scale, CheckCircle2, RotateCcw, ListFilter, ArrowRight } from 'lucide-react';

interface AfterActionReportModalProps {
  scenario: IncidentScenario;
  terminalNode: ScenarioNode;
  timeElapsedMinutes: number;
  onRestart: () => void;
  onSelectOtherScenario: () => void;
  onStartRandomScenario?: () => void;
}

export const AfterActionReportModal: React.FC<AfterActionReportModalProps> = ({
  scenario,
  terminalNode,
  timeElapsedMinutes,
  onRestart,
  onSelectOtherScenario,
  onStartRandomScenario,
}) => {
  const outcome = terminalNode.terminalOutcome;
  if (!outcome) return null;

  const hours = Math.floor(timeElapsedMinutes / 60);
  const mins = timeElapsedMinutes % 60;
  const timeFormatted = `${hours}時間 ${mins}分`;

  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'S':
        return {
          badge: 'bg-emerald-950 text-emerald-400 border-emerald-600',
          ring: 'text-emerald-400',
          title: '最高評価: 模範的対応',
        };
      case 'A':
        return {
          badge: 'bg-cyan-950 text-cyan-300 border-cyan-600',
          ring: 'text-cyan-400',
          title: '優秀: 被害最小化達成',
        };
      case 'B':
        return {
          badge: 'bg-blue-950 text-blue-300 border-blue-600',
          ring: 'text-blue-400',
          title: '合格: 自力復旧完遂',
        };
      case 'C':
        return {
          badge: 'bg-amber-950 text-amber-300 border-amber-600',
          ring: 'text-amber-400',
          title: '要改善: 重大損害被弾',
        };
      default:
        return {
          badge: 'bg-red-950 text-red-400 border-red-600',
          ring: 'text-red-400',
          title: '不合格: 組織的致命打',
        };
    }
  };

  const style = getGradeStyle(outcome.grade);

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-6 lg:p-8 max-w-4xl mx-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      {/* Header with Grade Stamp */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>事後報告書 (AFTER ACTION REPORT)</span>
            <span aria-hidden="true">·</span>
            <span>{scenario.title}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">{outcome.title}</h2>
          <p className="text-slate-400 text-sm mt-1">{outcome.summary}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div
            className={`w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center font-mono ${style.badge}`}
          >
            <span className="text-xs uppercase font-medium">GRADE</span>
            <span className="text-3xl font-extrabold leading-none">{outcome.grade}</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>推定財務影響 / 被害算定</span>
          </div>
          <div className="text-sm font-semibold text-slate-200 leading-snug">
            {outcome.financialEstimate}
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Scale className="w-4 h-4 text-blue-400" />
            <span>法的責任・レピュテーション</span>
          </div>
          <div className="text-sm font-semibold text-slate-200 leading-snug">
            {outcome.legalImpact}
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Award className="w-4 h-4 text-amber-400" />
            <span>対応所要時間 & NIST CSF評価</span>
          </div>
          <div className="text-sm font-semibold text-slate-200 leading-snug">
            所要時間: <span className="font-mono text-cyan-400">{timeFormatted}</span>
            <div className="text-xs text-slate-400 font-normal mt-0.5">
              {outcome.complianceStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Key Lessons Learned */}
      <div className="bg-slate-950/70 p-5 rounded-lg border border-slate-800 mb-6">
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>実務上の重要教訓 & 組織推奨アクション</span>
        </h3>
        <div className="space-y-2">
          {outcome.recommendedPractices.map((practice, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
              <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{practice}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <button
          onClick={onSelectOtherScenario}
          className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>シナリオ一覧へ</span>
        </button>

        {onStartRandomScenario && (
          <button
            onClick={onStartRandomScenario}
            className="px-4 py-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800 rounded transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>🎲 次のランダムシナリオへ</span>
          </button>
        )}

        <button
          onClick={onRestart}
          className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-all shadow-md hover:shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>このシナリオを再挑戦</span>
        </button>
      </div>
    </div>
  );
};
