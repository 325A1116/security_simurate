import React from 'react';
import { IncidentScenario } from '../../types/security';
import { GitBranch, CheckCircle2, AlertCircle, CircleDot } from 'lucide-react';

interface BranchingTreeVisualizerProps {
  scenario: IncidentScenario;
  currentNodeId: string;
  visitedNodeIds: string[];
  historyChoices: { choiceLabel: string; fromNodeId: string; toNodeId: string }[];
  onSelectNodePreview?: (nodeId: string) => void;
}

export const BranchingTreeVisualizer: React.FC<BranchingTreeVisualizerProps> = ({
  scenario,
  currentNodeId,
  visitedNodeIds,
  historyChoices,
}) => {
  const nodeEntries = Object.values(scenario.nodes);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 font-mono text-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-slate-200">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm">分岐シナリオ・インシデント進行マップ</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> 現在地
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> 通過済み
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-slate-700 bg-slate-950"></span> 未到達・分岐先
          </span>
        </div>
      </div>

      {/* Decision Trail history */}
      {historyChoices.length > 0 && (
        <div className="mb-4 bg-slate-950/60 p-3 rounded border border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            実施された意思決定の軌跡 (Decision Trail)
          </div>
          <div className="space-y-1.5">
            {historyChoices.map((h, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-300">
                <span className="text-cyan-500 font-bold">Step {idx + 1}.</span>
                <span className="text-slate-200">{h.choiceLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenario Graph List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {nodeEntries.map((node) => {
          const isCurrent = node.id === currentNodeId;
          const isVisited = visitedNodeIds.includes(node.id);
          const isTerminal = node.isTerminal;

          let statusBorder = 'border-slate-800 bg-slate-950/40 text-slate-400';
          if (isCurrent) {
            statusBorder = 'border-cyan-400 bg-cyan-950/30 text-cyan-100 shadow-sm shadow-cyan-950';
          } else if (isVisited) {
            statusBorder = 'border-slate-700 bg-slate-900/80 text-slate-300';
          }

          return (
            <div
              key={node.id}
              className={`p-3 rounded border transition-all text-left ${statusBorder}`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{node.phase}</span>
                {isCurrent ? (
                  <span className="flex items-center gap-1 text-[10px] text-cyan-300 font-bold uppercase">
                    <CircleDot className="w-3 h-3 text-cyan-400 animate-pulse" />
                    現在地
                  </span>
                ) : isVisited ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    通過
                  </span>
                ) : isTerminal ? (
                  <span className="text-[10px] text-amber-400 font-medium">終点候補</span>
                ) : (
                  <span className="text-[10px] text-slate-600">待機中</span>
                )}
              </div>

              <div className="font-semibold text-xs text-slate-100 mb-1 leading-snug line-clamp-2">
                {node.title}
              </div>

              {node.isTerminal && node.terminalOutcome && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">結末評価:</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      node.terminalOutcome.grade === 'S'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : node.terminalOutcome.grade === 'A'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        : node.terminalOutcome.grade === 'B'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    Grade {node.terminalOutcome.grade}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
