import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Dices, Shuffle, Zap, HelpCircle, Trophy, RefreshCw, 
  Play, Pause, RotateCcw, Volume2, Flame, CheckCircle, Clock, Users, Gift
} from 'lucide-react';
import { UserProfile } from '../types';

interface TeacherFunZoneProps {
  currentUser: UserProfile;
}

const MOCK_STUDENTS = [
  'Aarav Sharma', 'Rohan Mehta', 'Kavya Singh', 'Ananya Gupta', 
  'Priya Nair', 'Siddharth Rao', 'Diya Kapoor', 'Vikram Joshi',
  'Ishaan Patel', 'Meera Reddy', 'Aditya Verma', 'Sanya Malhotra'
];

const DEFAULT_WHEEL_ITEMS = [
  'Answer Next Question ❓', 'Choose Next Student 👈', '+10 House Points 🌟',
  'Bonus Star Badge ⭐', 'Sing a Song 🎵', 'Tell a Math Joke 😂',
  'Skip Turn 🛑', 'Pass Question to Friend 🤝'
];

const RAPID_FIRE_QUESTIONS = [
  { q: 'What is the speed of light in vacuum?', a: '3 × 10^8 m/s' },
  { q: 'Which element has atomic number 1?', a: 'Hydrogen' },
  { q: 'Who discovered Penicillin?', a: 'Alexander Fleming' },
  { q: 'What is the derivative of sin(x)?', a: 'cos(x)' },
  { q: 'In which year did India gain independence?', a: '1947' },
  { q: 'What is the powerhouse of the cell?', a: 'Mitochondria' }
];

export const TeacherFunZone: React.FC<TeacherFunZoneProps> = ({ currentUser }) => {
  const [activeGame, setActiveGame] = useState<'picker' | 'wheel' | 'rapid' | 'dice' | 'wordchain'>('picker');

  // Random Student Picker State
  const [pickedStudent, setPickedStudent] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  // Spin Wheel State
  const [wheelItems, setWheelItems] = useState<string[]>(DEFAULT_WHEEL_ITEMS);
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelWinner, setWheelWinner] = useState<string | null>(null);

  // Rapid Fire State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(30);
  const [timerActive, setTimerActive] = useState(false);

  // Dice Roll State
  const [diceCount, setDiceCount] = useState(1);
  const [diceResults, setDiceResults] = useState<number[]>([6]);
  const [isRolling, setIsRolling] = useState(false);

  // Handlers
  const handlePickRandomStudent = () => {
    setIsPicking(true);
    setPickedStudent(null);
    let count = 0;
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * MOCK_STUDENTS.length);
      setPickedStudent(MOCK_STUDENTS[idx]);
      count++;
      if (count > 20) {
        clearInterval(interval);
        setIsPicking(false);
      }
    }, 80);
  };

  const handleSpinWheel = () => {
    if (spinning) return;
    setSpinning(true);
    setWheelWinner(null);
    const extraDeg = Math.floor(Math.random() * 360) + 1440; // 4 full turns + random
    const newRotation = wheelRotation + extraDeg;
    setWheelRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      const actualDeg = newRotation % 360;
      const sliceSize = 360 / wheelItems.length;
      const winnerIdx = Math.floor((360 - (actualDeg % 360)) / sliceSize) % wheelItems.length;
      setWheelWinner(wheelItems[winnerIdx]);
    }, 3500);
  };

  const handleRollDice = () => {
    setIsRolling(true);
    setTimeout(() => {
      const results = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
      setDiceResults(results);
      setIsRolling(false);
    }, 500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Title Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 rounded-3xl border border-purple-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Interactive Classroom Engagement
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Teacher <span className="text-amber-400">Fun Zone</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Energize your live classes with random pickers, prize wheels, rapid-fire quizzes, and dice rolls.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/10 overflow-x-auto">
          {[
            { id: 'picker', label: 'Random Student', icon: Shuffle },
            { id: 'wheel', label: 'Spin Wheel', icon: RefreshCw },
            { id: 'rapid', label: 'Rapid Fire Quiz', icon: Zap },
            { id: 'dice', label: 'Dice Roller', icon: Dices }
          ].map(g => {
            const Icon = g.icon;
            const isActive = activeGame === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setActiveGame(g.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Game Stage */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        {/* GAME 1: RANDOM STUDENT PICKER */}
        {activeGame === 'picker' && (
          <div className="space-y-6 text-center max-w-2xl mx-auto py-8">
            <div className="inline-block p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <Shuffle className="w-12 h-12 text-indigo-400 animate-pulse" />
            </div>

            <h3 className="text-2xl font-black text-white">Random Student Picker</h3>
            <p className="text-xs text-slate-400">Fairly select a student to answer, demonstrate, or lead the next discussion.</p>

            {/* Display Box */}
            <div className="h-32 bg-slate-950 border-2 border-indigo-500/40 rounded-3xl flex items-center justify-center p-6 shadow-inner relative overflow-hidden">
              <span className={`text-2xl md:text-3xl font-black font-mono tracking-tight ${isPicking ? 'text-indigo-400 animate-bounce' : 'text-amber-300'}`}>
                {pickedStudent || 'Click "Pick Random Student" below!'}
              </span>
            </div>

            <button
              onClick={handlePickRandomStudent}
              disabled={isPicking}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isPicking ? 'Shuffling Students...' : '🎯 Pick Random Student'}
            </button>
          </div>
        )}

        {/* GAME 2: SPIN WHEEL */}
        {activeGame === 'wheel' && (
          <div className="space-y-6 text-center max-w-xl mx-auto py-4">
            <h3 className="text-xl font-black text-white">Classroom Reward Spin Wheel</h3>
            <p className="text-xs text-slate-400">Spin for bonus house points, star badges, or classroom activities.</p>

            {/* Wheel Canvas Mock */}
            <div className="relative w-64 h-64 mx-auto my-4">
              {/* Pointer */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl z-20 text-red-500 drop-shadow-md">
                ▼
              </div>

              {/* Rotating Wheel Container */}
              <div
                className="w-full h-full rounded-full border-4 border-amber-400 bg-slate-950 shadow-2xl relative overflow-hidden transition-transform duration-[3500ms] ease-out flex items-center justify-center"
                style={{ transform: `rotate(${wheelRotation}deg)` }}
              >
                <div className="text-center font-bold text-xs text-indigo-300 p-4">
                  🎡 {wheelItems.length} Rewards Loaded
                </div>
              </div>
            </div>

            {wheelWinner && (
              <div className="p-4 bg-amber-500/20 border border-amber-500/40 rounded-2xl animate-fadeIn">
                <span className="text-xs font-black text-amber-300 uppercase block">🎉 Wheel Result</span>
                <span className="text-lg font-extrabold text-white">{wheelWinner}</span>
              </div>
            )}

            <button
              onClick={handleSpinWheel}
              disabled={spinning}
              className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {spinning ? 'Spinning Wheel...' : '🎡 Spin the Wheel'}
            </button>
          </div>
        )}

        {/* GAME 3: RAPID FIRE QUIZ */}
        {activeGame === 'rapid' && (
          <div className="space-y-6 max-w-xl mx-auto py-4">
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-slate-300">Question {currentQIndex + 1} / {RAPID_FIRE_QUESTIONS.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-400">Score: {score}</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
              <h4 className="text-lg font-black text-white leading-relaxed">
                {RAPID_FIRE_QUESTIONS[currentQIndex].q}
              </h4>

              {showAnswer ? (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold text-sm animate-fadeIn">
                  Answer: {RAPID_FIRE_QUESTIONS[currentQIndex].a}
                </div>
              ) : (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="px-4 py-2 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl"
                >
                  Show Answer
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setScore(s => s + 10);
                  setShowAnswer(false);
                  setCurrentQIndex(i => (i + 1) % RAPID_FIRE_QUESTIONS.length);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Correct (+10 pts)
              </button>
              <button
                onClick={() => {
                  setShowAnswer(false);
                  setCurrentQIndex(i => (i + 1) % RAPID_FIRE_QUESTIONS.length);
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Next Question →
              </button>
            </div>
          </div>
        )}

        {/* GAME 4: DICE ROLLER */}
        {activeGame === 'dice' && (
          <div className="space-y-6 text-center max-w-md mx-auto py-8">
            <h3 className="text-xl font-black text-white">Classroom Dice Roller</h3>
            <p className="text-xs text-slate-400">Roll dice for group numbers, teams, or math probabilities.</p>

            <div className="flex items-center justify-center gap-4 my-6">
              {diceResults.map((val, idx) => (
                <div
                  key={idx}
                  className={`w-20 h-20 rounded-2xl bg-amber-500 text-slate-950 font-black text-4xl flex items-center justify-center shadow-xl ${isRolling ? 'animate-spin' : ''}`}
                >
                  {val}
                </div>
              ))}
            </div>

            <button
              onClick={handleRollDice}
              disabled={isRolling}
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-2xl shadow-xl transition-all"
            >
              🎲 Roll Dice
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherFunZone;
