import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, Copy, Check } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  level: 'CRITICAL' | 'ALERT' | 'WARN' | 'INFO';
  message: string;
}

interface TerminalLogStreamProps {
  logs: LogEntry[];
  simulatedTimeText: string;
}

export const TerminalLogStream: React.FC<TerminalLogStreamProps> = ({
  logs,
  simulatedTimeText,
}) => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'CRITICAL' | 'ALERT' | 'WARN' | 'INFO'>('ALL');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.source}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg flex flex-col h-[380px] lg:h-[440px] font-mono text-xs overflow-hidden shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="bg-slate-900/90 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200 text-[11px] tracking-wide">
            SOC 統合テレメトリログ (LIVE EDR / SIEM FEED)
          </span>
          <span className="text-slate-500 text-[10px] hidden sm:inline">
            · {simulatedTimeText}
          </span>
        </div>

        {/* Level Filters & Copy */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-950 rounded p-0.5 border border-slate-800 text-[10px]">
            {(['ALL', 'CRITICAL', 'ALERT', 'WARN', 'INFO'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  filterLevel === level
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyLogs}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="ログをクリップボードにコピー"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Log Feed Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-12">
            該当フィルター条件のログはありません
          </div>
        ) : (
          filteredLogs.map((log) => {
            let levelBadge = 'text-slate-400 bg-slate-900 border-slate-800';
            if (log.level === 'CRITICAL') {
              levelBadge = 'text-red-400 bg-red-950/50 border-red-900/60 font-bold';
            } else if (log.level === 'ALERT') {
              levelBadge = 'text-amber-400 bg-amber-950/40 border-amber-900/50 font-semibold';
            } else if (log.level === 'WARN') {
              levelBadge = 'text-yellow-300 bg-yellow-950/30 border-yellow-900/40';
            } else if (log.level === 'INFO') {
              levelBadge = 'text-cyan-300 bg-cyan-950/30 border-cyan-900/40';
            }

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 text-[11px] leading-relaxed hover:bg-slate-900/50 px-1.5 py-0.5 rounded transition-colors group"
              >
                <span className="text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                  {log.timestamp}
                </span>

                <span className="text-slate-400 whitespace-nowrap shrink-0 max-w-[120px] truncate font-medium">
                  [{log.source}]
                </span>

                <span
                  className={`px-1.5 py-0 rounded border text-[10px] whitespace-nowrap shrink-0 ${levelBadge}`}
                >
                  {log.level}
                </span>

                <span className="text-slate-300 break-all font-mono group-hover:text-slate-100">
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Terminal status bar */}
      <div className="bg-slate-950 px-3 py-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-cyan-500" />
          <span>Syslog Agent: Connected (4 Active Connectors)</span>
        </div>
        <div>Total Logs: {logs.length} entries</div>
      </div>
    </div>
  );
};
