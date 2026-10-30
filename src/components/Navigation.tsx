import React from 'react';
import { AppView } from '../types/security';
import { ShieldAlert, Crosshair, BookOpen, HelpCircle, ScanEye, KeyRound } from 'lucide-react';

interface NavigationProps {
  currentView: AppView;
  onSelectView: (view: AppView) => void;
  onQuickStartTraining: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  onQuickStartTraining,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <button
          onClick={() => onSelectView('simulator')}
          className="flex items-center gap-2.5 text-left text-lg font-bold tracking-tight text-slate-100 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400/60 transition-colors">
            <Crosshair className="w-4 h-4" />
          </div>
          <span>CYBERSHIELD COMMAND</span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onSelectView('simulator')}
            className={`flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === 'simulator'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 -mb-[2px]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>実戦インシデント訓練</span>
          </button>

          <button
            onClick={() => onSelectView('threats')}
            className={`flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === 'threats'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 -mb-[2px]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>最新脅威トレンド</span>
          </button>

          <button
            onClick={() => onSelectView('quiz')}
            className={`flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === 'quiz'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 -mb-[2px]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>防衛クイズ演習</span>
          </button>

          <button
            onClick={() => onSelectView('scanner')}
            className={`flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === 'scanner'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 -mb-[2px]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ScanEye className="w-4 h-4" />
            <span>脆弱性診断</span>
          </button>

          <button
            onClick={() => onSelectView('password')}
            className={`flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentView === 'password'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 -mb-[2px]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>パスワード生成</span>
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onQuickStartTraining}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-all shadow-sm hover:shadow-cyan-500/20 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>訓練シナリオ起動</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="flex md:hidden overflow-x-auto gap-3 pt-3 mt-2 border-t border-slate-800 text-xs">
        <button
          onClick={() => onSelectView('simulator')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${currentView === 'simulator' ? 'bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400'}`}
        >
          訓練シミュレーション
        </button>
        <button
          onClick={() => onSelectView('threats')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${currentView === 'threats' ? 'bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400'}`}
        >
          最新脅威トレンド
        </button>
        <button
          onClick={() => onSelectView('quiz')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${currentView === 'quiz' ? 'bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400'}`}
        >
          防衛クイズ
        </button>
        <button
          onClick={() => onSelectView('scanner')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${currentView === 'scanner' ? 'bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400'}`}
        >
          脆弱性診断
        </button>
        <button
          onClick={() => onSelectView('password')}
          className={`px-2.5 py-1.5 rounded whitespace-nowrap ${currentView === 'password' ? 'bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-800' : 'text-slate-400'}`}
        >
          パスワード生成
        </button>
      </div>
    </header>
  );
};
