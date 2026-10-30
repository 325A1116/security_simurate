import React, { useState } from 'react';
import { THREAT_TRENDS } from '../../data/threatTrends';
import { ThreatTrendItem } from '../../types/security';
import { Search, ShieldAlert, Sparkles, Check, Copy, AlertCircle, ArrowUpRight, ShieldCheck, Flame } from 'lucide-react';

export const ThreatTrends: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    'ALL',
    'AI・ソーシャルエンジニアリング',
    'アイデンティティ・認証',
    'マルウェア・ランサムウェア',
    'クラウド・サプライチェーン',
    '法規制・コンプライアンス',
  ];

  const filteredThreats = THREAT_TRENDS.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.attackVector.some((v) => v.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.relevantMitre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopyChecklist = (item: ThreatTrendItem) => {
    const text = `【脅威対策チェックリスト: ${item.title}】\n■ 即時対策:\n${item.defensiveMeasures.immediate}\n■ 恒久対策・アーキテクチャ:\n${item.defensiveMeasures.architectural}\n■ MITRE ATT&CK: ${item.relevantMitre}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      {/* Header section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>サイバー脅威インテリジェンス</span>
          <span aria-hidden="true">·</span>
          <span>2025-2026年最新トレンド</span>
          <span aria-hidden="true">·</span>
          <span>MITRE ATT&CK マッピング</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight text-balance">
          最新脅威トレンド & 多層防御ガイド
        </h1>
        <p className="text-slate-400 text-sm max-w-3xl mt-2 leading-relaxed">
          生成AIによるディープフェイク攻撃、AiTMによるMFA突破、情報窃取マルウェア(Infostealer)、クラウド設定不備、改正個人情報保護法の義務化など、現代の実務で避けて通れない最前線の脅威動向と具体的処方箋を網羅。
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
        {/* Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'ALL' ? '全カテゴリー' : cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="脅威名・手口・MITRE検索..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Threat Intelligence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredThreats.map((threat) => {
          const isCopied = copiedId === threat.id;

          return (
            <div
              key={threat.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 flex flex-col justify-between transition-all duration-200 shadow-lg hover:shadow-cyan-950/20"
            >
              <div>
                {/* Unboxed Metadata Strip */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mb-2">
                  <span className="text-cyan-400 font-medium">{threat.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{threat.timelineTrend}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-500">{threat.relevantMitre}</span>
                </div>

                {/* Title */}
                <h2 className="text-lg font-bold text-slate-100 mb-2 leading-snug">
                  {threat.title}
                </h2>

                {/* Severity text with icon */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      threat.severity.includes('Critical')
                        ? 'bg-red-950/80 text-red-300 border-red-800'
                        : 'bg-amber-950/80 text-amber-300 border-amber-800'
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    <span>脅威度: {threat.severity}</span>
                  </span>
                </div>

                {/* Summary */}
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {threat.summary}
                </p>

                {/* Attack Vectors */}
                <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 mb-4">
                  <div className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>典型的な侵入・攻撃手法 (Attack Vectors)</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {threat.attackVector.map((vec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-500 shrink-0 font-bold">›</span>
                        <span>{vec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Real-World Impact */}
                <div className="text-xs text-slate-400 mb-4 bg-slate-950/30 p-3 rounded border border-slate-800/60">
                  <span className="font-semibold text-slate-300 block mb-1">実害事例・被害想定:</span>
                  <span className="text-slate-400 leading-relaxed">{threat.realWorldImpact}</span>
                </div>

                {/* Defensive Measures */}
                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                    <span className="text-cyan-400 font-bold block mb-1">【即時現場対策 (Triage)】</span>
                    <span className="text-slate-300 leading-relaxed">{threat.defensiveMeasures.immediate}</span>
                  </div>
                  <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold block mb-1">【恒久・アーキテクチャ対策】</span>
                    <span className="text-slate-300 leading-relaxed">{threat.defensiveMeasures.architectural}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer with Copy Action */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  IoC / Mitigation Guide
                </span>
                <button
                  onClick={() => handleCopyChecklist(threat)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer text-xs font-medium"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">コピー完了</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>対策手順をコピー</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
