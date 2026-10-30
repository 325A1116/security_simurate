import React from 'react';
import { IncidentMetric } from '../../types/security';
import { Clock, AlertTriangle, Database, Activity, ShieldCheck } from 'lucide-react';

interface TacticalDashboardProps {
  metrics: IncidentMetric;
  timeElapsedMinutes: number;
  phaseTitle: string;
  severity: 'critical' | 'high' | 'medium' | 'contained';
}

export const TacticalDashboard: React.FC<TacticalDashboardProps> = ({
  metrics,
  timeElapsedMinutes,
  phaseTitle,
  severity,
}) => {
  // Format elapsed time into T+HH:MM
  const hours = Math.floor(timeElapsedMinutes / 60);
  const mins = timeElapsedMinutes % 60;
  const timeFormatted = `T+${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  const getMetricColor = (val: number, inverse = false) => {
    // If inverse (e.g. Trust), higher is better
    const effective = inverse ? 100 - val : val;
    if (effective >= 70) return 'text-red-400 bg-red-500';
    if (effective >= 40) return 'text-amber-400 bg-amber-500';
    return 'text-emerald-400 bg-emerald-500';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-3 border-b border-slate-800">
        <div>
          <span className="text-xs text-slate-400 block mb-0.5">インシデント進行フェーズ</span>
          <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>{phaseTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block mb-0.5">経過時間 (TIMELINE)</span>
            <div className="text-base font-bold font-mono text-cyan-400 flex items-center gap-1.5 justify-end">
              <Clock className="w-4 h-4 text-cyan-500" />
              <span>{timeFormatted}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block mb-0.5">事態重大度 (SEVERITY)</span>
            <div
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${
                severity === 'critical'
                  ? 'bg-red-950/80 text-red-300 border-red-800'
                  : severity === 'high'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : severity === 'medium'
                  ? 'bg-yellow-950/80 text-yellow-300 border-yellow-800'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}
            >
              {severity === 'critical' && '● 重大 (CRITICAL)'}
              {severity === 'high' && '▲ 高度 (HIGH)'}
              {severity === 'medium' && '■ 警戒 (MEDIUM)'}
              {severity === 'contained' && '✓ 封じ込め完了 (CONTAINED)'}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Tactical Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1: Spread */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              被害拡散度
            </span>
            <span className="font-mono font-bold text-slate-200 tabular-nums">
              {metrics.spread}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMetricColor(metrics.spread).split(' ')[1]}`}
              style={{ width: `${Math.min(100, Math.max(0, metrics.spread))}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {metrics.spread > 60 ? '基幹AD・全域延焼リスク' : metrics.spread > 30 ? '特定VLAN侵入中' : '端末隔離成功'}
          </span>
        </div>

        {/* Metric 2: Exfiltration */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              データ流出リスク
            </span>
            <span className="font-mono font-bold text-slate-200 tabular-nums">
              {metrics.exfiltration}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMetricColor(metrics.exfiltration).split(' ')[1]}`}
              style={{ width: `${Math.min(100, Math.max(0, metrics.exfiltration))}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {metrics.exfiltration > 60 ? '暗号資産二重恐喝リスク' : metrics.exfiltration > 25 ? '外向き通信検知' : '漏洩防止維持'}
          </span>
        </div>

        {/* Metric 3: Downtime */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              業務停止影響
            </span>
            <span className="font-mono font-bold text-slate-200 tabular-nums">
              {metrics.downtime}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMetricColor(metrics.downtime).split(' ')[1]}`}
              style={{ width: `${Math.min(100, Math.max(0, metrics.downtime))}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {metrics.downtime > 60 ? '全社操業停止状態' : metrics.downtime > 20 ? '一部業務オフライン' : '通常稼働継続'}
          </span>
        </div>

        {/* Metric 4: Trust */}
        <div className="bg-slate-950 p-3 rounded border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              組織・社会的信用
            </span>
            <span className="font-mono font-bold text-slate-200 tabular-nums">
              {metrics.trust}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getMetricColor(metrics.trust, true).split(' ')[1]}`}
              style={{ width: `${Math.min(100, Math.max(0, metrics.trust))}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {metrics.trust < 40 ? '課徴金・訴訟リスク大' : metrics.trust < 70 ? '風評被害懸念' : 'コンプライアンス維持'}
          </span>
        </div>
      </div>
    </div>
  );
};
