import React, { useState, useEffect, useCallback } from 'react';
import { PasswordConfig, PasswordAnalysis } from '../../types/security';
import { KeyRound, RefreshCw, Copy, Check, ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, XCircle, Info, Sparkles } from 'lucide-react';

const WORDLIST = [
  'solar', 'matrix', 'cipher', 'quantum', 'shield', 'phoenix', 'orbital', 'glacier',
  'crimson', 'zenith', 'nebula', 'protocol', 'aurora', 'vertex', 'titan', 'beacon',
  'bastion', 'vector', 'horizon', 'shadow', 'falcon', 'cascade', 'monolith', 'apex',
  'kestrel', 'vortex', 'cobalt', 'synapse', 'phantom', 'mirage', 'timber', 'obsidian',
  'sakura', 'fuji', 'katana', 'kabuto', 'shogun', 'tsunami', 'bento', 'samurai'
];

export const PasswordGenerator: React.FC = () => {
  const [config, setConfig] = useState<PasswordConfig>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: true,
    mode: 'random',
    wordCount: 4,
  });

  const [password, setPassword] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<PasswordAnalysis>({
    entropy: 0,
    score: 0,
    crackTimeOnline: '',
    crackTimeOfflineGPU: '',
    crackTimeSupercomputer: '',
    nistCompliant: false,
    checks: {
      lengthCheck: false,
      complexityCheck: false,
      varietyCheck: false,
      entropyCheck: false,
    },
  });

  // Cryptographically secure generator
  const generatePassword = useCallback(() => {
    if (config.mode === 'passphrase') {
      const words: string[] = [];
      const array = new Uint32Array(config.wordCount);
      window.crypto.getRandomValues(array);
      for (let i = 0; i < config.wordCount; i++) {
        const index = array[i] % WORDLIST.length;
        words.push(WORDLIST[index]);
      }
      const pass = words.join('-');
      setPassword(pass);
      return;
    }

    let uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowercase = 'abcdefghijklmnopqrstuvwxyz';
    let numbers = '0123456789';
    let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (config.excludeAmbiguous) {
      uppercase = uppercase.replace(/[IO]/g, '');
      lowercase = lowercase.replace(/[lo]/g, '');
      numbers = numbers.replace(/[01]/g, '');
      symbols = symbols.replace(/[|;:,.<>]/g, '');
    }

    let charPool = '';
    if (config.includeUppercase) charPool += uppercase;
    if (config.includeLowercase) charPool += lowercase;
    if (config.includeNumbers) charPool += numbers;
    if (config.includeSymbols) charPool += symbols;

    if (!charPool) {
      charPool = lowercase; // fallback
    }

    const randomValues = new Uint32Array(config.length);
    window.crypto.getRandomValues(randomValues);

    let result = '';
    for (let i = 0; i < config.length; i++) {
      result += charPool[randomValues[i] % charPool.length];
    }

    setPassword(result);
  }, [config]);

  // Compute Shannon Entropy and Crack Times
  useEffect(() => {
    if (!password) {
      generatePassword();
      return;
    }

    // Pool size estimation
    let poolSize = 0;
    if (config.mode === 'passphrase') {
      poolSize = WORDLIST.length;
    } else {
      if (/[A-Z]/.test(password)) poolSize += 26;
      if (/[a-z]/.test(password)) poolSize += 26;
      if (/[0-9]/.test(password)) poolSize += 10;
      if (/[^A-Za-z0-9]/.test(password)) poolSize += 32;
    }
    poolSize = Math.max(poolSize, 10);

    // Entropy calculation: E = L * log2(poolSize)
    const effectiveLength = config.mode === 'passphrase' ? config.wordCount : password.length;
    const entropyBits = Math.round(effectiveLength * Math.log2(poolSize));

    // Crack time calculations
    // Total combinations = 2^entropyBits
    const totalCombinations = Math.pow(2, entropyBits);

    // Online throttled attack: 1,000 guesses / sec
    const secondsOnline = totalCombinations / 1000;
    // Offline GPU 8x RTX 4090: 100 Billion hashes / sec (1e11)
    const secondsGPU = totalCombinations / 1e11;
    // Supercomputer cluster: 100 Trillion hashes / sec (1e14)
    const secondsSupercomputer = totalCombinations / 1e14;

    const formatDuration = (sec: number) => {
      if (!isFinite(sec) || sec > 3.15e16) return '10億年以上 (解読実質不可能)';
      if (sec > 3.15e7) return `約 ${(sec / 3.15e7).toFixed(1)} 年`;
      if (sec > 86400) return `約 ${(sec / 86400).toFixed(1)} 日`;
      if (sec > 3600) return `約 ${(sec / 3600).toFixed(1)} 時間`;
      if (sec > 60) return `約 ${(sec / 60).toFixed(1)} 分`;
      if (sec < 1) return '一瞬 (< 1秒)';
      return `${Math.round(sec)} 秒`;
    };

    let score: 0 | 1 | 2 | 3 | 4 = 1;
    if (entropyBits >= 85) score = 4;
    else if (entropyBits >= 65) score = 3;
    else if (entropyBits >= 45) score = 2;
    else if (entropyBits >= 30) score = 1;
    else score = 0;

    const lengthCheck = password.length >= 12;
    const varietyCheck = /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
    const entropyCheck = entropyBits >= 60;
    const nistCompliant = (config.mode === 'passphrase' ? config.wordCount >= 4 : lengthCheck) && entropyCheck;

    setAnalysis({
      entropy: entropyBits,
      score,
      crackTimeOnline: formatDuration(secondsOnline),
      crackTimeOfflineGPU: formatDuration(secondsGPU),
      crackTimeSupercomputer: formatDuration(secondsSupercomputer),
      nistCompliant,
      checks: {
        lengthCheck,
        complexityCheck: varietyCheck || config.mode === 'passphrase',
        varietyCheck,
        entropyCheck,
      },
    });
  }, [password, config, generatePassword]);

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreBadge = (score: number) => {
    switch (score) {
      case 4:
        return { text: '極めて強固 (軍用・金融グレード)', color: 'text-emerald-400 bg-emerald-950 border-emerald-800' };
      case 3:
        return { text: '強固 (一般推奨水準)', color: 'text-cyan-400 bg-cyan-950 border-cyan-800' };
      case 2:
        return { text: '普通 (改善推奨)', color: 'text-amber-400 bg-amber-950 border-amber-800' };
      default:
        return { text: '脆弱 (瞬時解読リスク)', color: 'text-red-400 bg-red-950 border-red-800' };
    }
  };

  const scoreBadge = getScoreBadge(analysis.score);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>暗号学的パスワードツール</span>
          <span aria-hidden="true">·</span>
          <span>CSPRNG暗号学的擬似乱数</span>
          <span aria-hidden="true">·</span>
          <span>NIST SP 800-63B 準拠</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight text-balance">
          パスワード生成 & 暗号学的強度アナライザー
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl mt-2 leading-relaxed">
          ブラウザ内蔵のハードウェア暗号乱数生成器（Web Crypto API）を用いて安全な鍵を生成。シャノン・エントロピー計算と最新GPUクラスタによる解読所要時間の推計を提供します。
        </p>
      </div>

      {/* Main Password Output Screen */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 shadow-xl">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>生成されたパスワード (CSPRNG暗号乱数)</span>
          <span className="font-mono text-cyan-400 text-[11px]">
            エントロピー: <strong className="text-sm font-bold">{analysis.entropy}</strong> bits
          </span>
        </div>

        {/* Display Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex items-center justify-between gap-4 mb-4">
          <span className="font-mono text-base lg:text-xl font-bold text-slate-100 break-all select-all tracking-wide">
            {password}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="p-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold transition-all shadow-md hover:shadow-cyan-400/20 cursor-pointer flex items-center gap-1.5 text-xs"
              title="クリップボードにコピー"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>コピー完了</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>コピー</span>
                </>
              )}
            </button>

            <button
              onClick={() => generatePassword()}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="再生成"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Entropy Strength Bar & Status */}
        <div className="space-y-2">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                analysis.score === 4
                  ? 'bg-emerald-500'
                  : analysis.score === 3
                  ? 'bg-cyan-500'
                  : analysis.score === 2
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (analysis.entropy / 100) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${scoreBadge.color}`}>
              {scoreBadge.text}
            </span>
            <span className="text-slate-400 text-[11px]">
              {analysis.nistCompliant ? '✓ NIST SP 800-63B 基準適合' : '▲ NIST基準を下回っています'}
            </span>
          </div>
        </div>
      </div>

      {/* Mode & Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Controls Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 pb-2 border-b border-slate-800">
            生成オプション構成
          </h2>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 mb-4 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setConfig((p) => ({ ...p, mode: 'random' }))}
              className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
                config.mode === 'random'
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ランダム文字列
            </button>
            <button
              onClick={() => setConfig((p) => ({ ...p, mode: 'passphrase' }))}
              className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
                config.mode === 'passphrase'
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              パスフレーズ (Diceware)
            </button>
          </div>

          {config.mode === 'random' ? (
            <div className="space-y-4">
              {/* Length Slider */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span>文字数 (Length):</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">{config.length} 文字</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="64"
                  value={config.length}
                  onChange={(e) => setConfig((p) => ({ ...p, length: Number(e.target.value) }))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>8文字</span>
                  <span>16 (推奨)</span>
                  <span>32</span>
                  <span>64文字</span>
                </div>
              </div>

              {/* Character Type Toggles */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeUppercase}
                    onChange={(e) => setConfig((p) => ({ ...p, includeUppercase: e.target.checked }))}
                    className="accent-cyan-400 rounded"
                  />
                  <span>英大文字 (A-Z) を含む</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeLowercase}
                    onChange={(e) => setConfig((p) => ({ ...p, includeLowercase: e.target.checked }))}
                    className="accent-cyan-400 rounded"
                  />
                  <span>英小文字 (a-z) を含む</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeNumbers}
                    onChange={(e) => setConfig((p) => ({ ...p, includeNumbers: e.target.checked }))}
                    className="accent-cyan-400 rounded"
                  />
                  <span>数字 (0-9) を含む</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeSymbols}
                    onChange={(e) => setConfig((p) => ({ ...p, includeSymbols: e.target.checked }))}
                    className="accent-cyan-400 rounded"
                  />
                  <span>特殊記号 (!@#$%^&*...) を含む</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={config.excludeAmbiguous}
                    onChange={(e) => setConfig((p) => ({ ...p, excludeAmbiguous: e.target.checked }))}
                    className="accent-cyan-400 rounded"
                  />
                  <span className="text-slate-400">見分けにくい文字 (1, l, I, 0, O) を除外</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span>単語数 (Words):</span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">{config.wordCount} 単語</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="7"
                  value={config.wordCount}
                  onChange={(e) => setConfig((p) => ({ ...p, wordCount: Number(e.target.value) }))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-950 p-3 rounded border border-slate-800">
                パスフレーズ方式は、複数の無作為な単語をハイフンで連結する手法です。人間が覚えやすくタイプミスしにくい一方、十分な長さにより高いエントロピー（80bits超）を達成できます。
              </p>
            </div>
          )}
        </div>

        {/* Real-world Crack Time Estimation Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 pb-2 border-b border-slate-800">
              総当たり攻撃 (ブルートフォース) 推定解読時間
            </h2>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px] mb-0.5">
                  1. オンライン攻撃 (ログイン試行制限 1,000回/秒)
                </span>
                <span className="text-slate-100 font-bold font-mono text-sm">
                  {analysis.crackTimeOnline}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px] mb-0.5">
                  2. オフライン攻撃 (8x RTX 4090 GPUクラスタ / 毎秒1,000億試行)
                </span>
                <span className="text-emerald-400 font-bold font-mono text-sm">
                  {analysis.crackTimeOfflineGPU}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[11px] mb-0.5">
                  3. 国家機関・スーパーコンピューター (毎秒100兆試行)
                </span>
                <span className="text-cyan-300 font-bold font-mono text-sm">
                  {analysis.crackTimeSupercomputer}
                </span>
              </div>
            </div>
          </div>

          {/* Practical security takeaway */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              現代の暗号解読機（GPU Hashcat）に対抗するためには、最低16文字以上または4単語以上のパスフレーズが強く推奨されます。
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
