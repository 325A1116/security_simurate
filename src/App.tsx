/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppView } from './types/security';
import { Navigation } from './components/Navigation';
import { IncidentSimulator } from './components/IncidentSimulator/IncidentSimulator';
import { ThreatTrends } from './components/ThreatIntelligence/ThreatTrends';
import { SecurityQuiz } from './components/Quiz/SecurityQuiz';
import { VulnerabilityScanner } from './components/VulnerabilityScanner/VulnerabilityScanner';
import { PasswordGenerator } from './components/PasswordTool/PasswordGenerator';
import { Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('simulator');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* 3-Zone Top Bar */}
      <Navigation
        currentView={currentView}
        onSelectView={setCurrentView}
        onQuickStartTraining={() => setCurrentView('simulator')}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {currentView === 'simulator' && <IncidentSimulator />}
        {currentView === 'threats' && <ThreatTrends />}
        {currentView === 'quiz' && <SecurityQuiz />}
        {currentView === 'scanner' && <VulnerabilityScanner />}
        {currentView === 'password' && <PasswordGenerator />}
      </main>

      {/* Quiet, Professional Anti-Slop Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 px-4 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-300">CYBERSHIELD COMMAND</span>
            <span aria-hidden="true">·</span>
            <span>実戦型サイバー防衛・インシデント訓練プラットフォーム</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <span>NIST CSF 2.0 / MITRE ATT&CK 準拠</span>
            <span aria-hidden="true">·</span>
            <span>改正個人情報保護法 72時間報告対応</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
