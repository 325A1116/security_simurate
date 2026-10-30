import React, { useState } from 'react';
import { QUIZ_QUESTIONS } from '../../data/quizData';
import { QuizQuestion } from '../../types/security';
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, RotateCcw, Award, Lightbulb, ShieldAlert, Sparkles } from 'lucide-react';

export const SecurityQuiz: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [answeredList, setAnsweredList] = useState<{ questionId: string; isCorrect: boolean }[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const categories = [
    'ALL',
    '初動対応',
    'フィッシング・認証',
    'マルウェア防御',
    'クラウド・設定不備',
    '法規制・ガバナンス',
  ];

  const filteredQuestions = QUIZ_QUESTIONS.filter(
    (q) => selectedCategory === 'ALL' || q.category === selectedCategory
  );

  const currentQ: QuizQuestion | undefined = filteredQuestions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (isAnswered || !currentQ) return;
    setSelectedAnswer(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
    } else {
      setStreak(0);
    }

    setAnsweredList((prev) => [...prev, { questionId: currentQ.id, isCorrect }]);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < filteredQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setAnsweredList([]);
    setIsCompleted(false);
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setAnsweredList([]);
    setIsCompleted(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
      {/* Quiz Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <span>実務判定演習</span>
          <span aria-hidden="true">·</span>
          <span>即時解説 & MITRE ATT&CK照合</span>
          <span aria-hidden="true">·</span>
          <span>実戦クイズ</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight text-balance">
          実戦サイバーセキュリティ防衛クイズ
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed">
          単なる用語の暗記ではなく、「この状況で最初に何をすべきか？」「なぜその行動は危険なのか？」という現場での実践的トリアージ能力をテストします。
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs mb-6 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat === 'ALL' ? '全問一括演習' : cat}
          </button>
        ))}
      </div>

      {/* Score and Progress Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3 rounded-lg mb-6 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-slate-400">
            問題進捗:{' '}
            <span className="font-mono font-bold text-slate-200">
              {currentIndex + 1} / {filteredQuestions.length}
            </span>
          </span>
          <span className="text-slate-400">
            正解数:{' '}
            <span className="font-mono font-bold text-emerald-400">
              {score}問
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <span className="text-amber-400 font-bold flex items-center gap-1 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
              🔥 {streak}連続正解
            </span>
          )}
        </div>
      </div>

      {/* Quiz Body or Completion Report */}
      {isCompleted ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center mx-auto mb-4 text-cyan-400">
            <Award className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-slate-100 mb-2">演習完了！結果発表</h2>
          <p className="text-slate-400 text-sm mb-6">
            全{filteredQuestions.length}問中、
            <span className="text-cyan-400 font-bold font-mono text-lg mx-1">{score}問</span>
            正解しました（正答率: {Math.round((score / filteredQuestions.length) * 100)}%）。
          </p>

          <div className="max-w-md mx-auto grid grid-cols-2 gap-3 text-left mb-6">
            <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs">
              <span className="text-slate-500 block">最高連続正解</span>
              <span className="text-amber-400 font-mono font-bold text-base">{maxStreak} 問連続</span>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs">
              <span className="text-slate-500 block">防衛トリアージ評価</span>
              <span className="text-slate-200 font-bold text-base">
                {score / filteredQuestions.length >= 0.85
                  ? 'Expert (即戦力)'
                  : score / filteredQuestions.length >= 0.6
                  ? 'Competent (実務対応可)'
                  : 'Needs Practice (要復習)'}
              </span>
            </div>
          </div>

          <button
            onClick={handleRestartQuiz}
            className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded transition-all inline-flex items-center gap-2 cursor-pointer shadow-md hover:shadow-cyan-400/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>もう一度挑戦する</span>
          </button>
        </div>
      ) : currentQ ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 lg:p-7 shadow-xl">
          {/* Question Metadata */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-medium">{currentQ.category}</span>
              <span aria-hidden="true">·</span>
              <span>難易度: {currentQ.difficulty}</span>
            </div>
            {currentQ.mitreRef && (
              <span className="font-mono text-slate-500 text-[11px]">{currentQ.mitreRef}</span>
            )}
          </div>

          {/* Question Statement */}
          <h2 className="text-base lg:text-lg font-bold text-slate-100 mb-6 leading-relaxed">
            {currentQ.question}
          </h2>

          {/* Options List */}
          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrectAnswer = idx === currentQ.correctIndex;

              let buttonStyle = 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 text-slate-200';
              if (isAnswered) {
                if (isCorrectAnswer) {
                  buttonStyle = 'bg-emerald-950/60 border-emerald-600 text-emerald-200 font-medium';
                } else if (isSelected) {
                  buttonStyle = 'bg-red-950/60 border-red-600 text-red-200';
                } else {
                  buttonStyle = 'bg-slate-950/50 border-slate-900 text-slate-500 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-lg border transition-all text-xs leading-relaxed flex items-start gap-3 cursor-pointer ${buttonStyle}`}
                >
                  <span className="w-5 h-5 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="flex-1">{option}</span>

                  {isAnswered && isCorrectAnswer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Section after answering */}
          {isAnswered && (
            <div className="space-y-4 pt-4 border-t border-slate-800 animate-in fade-in duration-200">
              {/* Correctness banner */}
              <div
                className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-bold ${
                  selectedAnswer === currentQ.correctIndex
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-red-950/60 border-red-800 text-red-300'
                }`}
              >
                {selectedAnswer === currentQ.correctIndex ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>正解です！ 適切な判断です。</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>不正解です。実務では危険を伴う対応です。</span>
                  </>
                )}
              </div>

              {/* Detailed Explanation */}
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs">
                <span className="font-bold text-slate-200 block mb-1">【実務解説】</span>
                <p className="text-slate-300 leading-relaxed mb-3">{currentQ.explanation}</p>

                {/* Why other options are bad */}
                {currentQ.wrongRationale && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-slate-400">
                    <span className="font-semibold text-slate-300 block mb-1 text-[11px]">
                      【他の選択肢が不適切な理由】
                    </span>
                    {currentQ.wrongRationale.map((rationale, rIdx) => (
                      <div key={rIdx} className="flex items-start gap-1.5 text-[11px]">
                        <span className="text-red-400 shrink-0">✕</span>
                        <span>{rationale}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Practical rule takeaway */}
              <div className="bg-cyan-950/40 border border-cyan-900/60 p-3.5 rounded-lg flex items-start gap-2.5 text-xs text-cyan-200">
                <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-cyan-300 block mb-0.5">実務の鉄則:</span>
                  <span>{currentQ.keyRule}</span>
                </div>
              </div>

              {/* Next Question button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-cyan-400/20"
                >
                  <span>{currentIndex + 1 === filteredQuestions.length ? '結果を確認する' : '次の問題へ進む'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
