import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { HouseAnalytics, HouseType, UserProfile, SectionType } from '../types';

interface WarningMessage {
  id: string;
  grade: string;
  section: string;
  message: string;
  sentBy: string;
  timestamp: any;
}

export default function CoordinatorModule({ currentUser, showNotification }: { currentUser: UserProfile; showNotification: (msg: string) => void }) {
  const [houses, setHouses] = useState<HouseAnalytics[]>([]);
  const [pointsInput, setPointsInput] = useState<number>(10);
  const [targetHouse, setTargetHouse] = useState<HouseType>('Ruby');
  const [reasonInput, setReasonInput] = useState<string>('Excellence in Cultural Festival');
  
  const [warnGrade, setWarnGrade] = useState<string>('Grade 10');
  const [warnSection, setWarnSection] = useState<SectionType>('Solara');
  const [warnMsg, setWarnMsg] = useState<string>('Discipline is required in the corridors during transitions.');

  useEffect(() => {
    if (!auth.currentUser) {
      setHouses([
        { id: 'Ruby', points: 1450, materialsShared: 38, quizzesWon: 27, participation: 91 },
        { id: 'Emerald', points: 1580, materialsShared: 42, quizzesWon: 30, participation: 94 },
        { id: 'Sapphire', points: 1320, materialsShared: 29, quizzesWon: 22, participation: 87 },
        { id: 'Topaz', points: 1410, materialsShared: 35, quizzesWon: 25, participation: 89 }
      ]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'houseAnalytics'), snap => {
      const list: HouseAnalytics[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as HouseAnalytics));
      setHouses(list);
    });
    return () => unsub();
  }, []);

  const handleAwardPoints = async () => {
    try {
      const houseRef = doc(db, 'houseAnalytics', targetHouse);
      await updateDoc(houseRef, {
        points: increment(pointsInput)
      });
      
      // Log contribution
      await addDoc(collection(db, 'houseHistory'), {
        house: targetHouse,
        points: pointsInput,
        reason: reasonInput,
        awardedBy: currentUser.name,
        timestamp: serverTimestamp()
      });

      showNotification(`Successfully awarded ${pointsInput} points to ${targetHouse} House.`);
      setReasonInput('');
    } catch (err) {
      console.error(err);
      showNotification('Error awarding points.');
    }
  };

  const handleSendWarning = async () => {
    try {
      await addDoc(collection(db, 'warnings'), {
        grade: warnGrade,
        section: warnSection,
        message: warnMsg,
        sentBy: currentUser.name,
        timestamp: serverTimestamp()
      });
      showNotification(`Warning broadcasted to ${warnGrade} ${warnSection}.`);
      setWarnMsg('');
    } catch (err) {
      console.error(err);
      showNotification('Error sending warning.');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. House Analytics & Point Control */}
      <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🏆</span>
          <div>
            <h4 className="font-bold text-white text-lg font-display uppercase tracking-tight">House Point Management</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Coordinator Level Override</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {houses.map(h => (
            <div key={h.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-[10px] uppercase font-black text-slate-500 mb-1">{h.id} Points</div>
              <div className="text-2xl font-black text-white">{h.points}</div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-950/60 rounded-2xl border border-indigo-500/10 space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Target House</label>
              <select 
                value={targetHouse} 
                onChange={e => setTargetHouse(e.target.value as HouseType)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold"
              >
                <option value="Ruby">Ruby House</option>
                <option value="Emerald">Emerald House</option>
                <option value="Sapphire">Sapphire House</option>
                <option value="Topaz">Topaz House</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Points Amount</label>
              <input 
                type="number" 
                value={pointsInput} 
                onChange={e => setPointsInput(Number(e.target.value))}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Reason / Event Name</label>
              <input 
                type="text" 
                placeholder="Excellence in Cultural Festival..."
                value={reasonInput} 
                onChange={e => setReasonInput(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold"
              />
            </div>
          </div>
          <button 
            onClick={handleAwardPoints}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all"
          >
            Award Points and Update Leaderboard
          </button>
        </div>
      </div>

      {/* 2. Warning Control */}
      <div className="p-6 bg-slate-900 border border-white/5 rounded-3xl space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-bold text-white text-lg font-display uppercase tracking-tight">System Warnings & Alerts</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Targeted Classroom Notice</p>
          </div>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-2xl border border-rose-500/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Target Grade</label>
              <select 
                value={warnGrade} 
                onChange={e => setWarnGrade(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold"
              >
                {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Target Section</label>
              <select 
                value={warnSection} 
                onChange={e => setWarnSection(e.target.value as SectionType)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold"
              >
                <option value="Solara">Solara (Gamma)</option>
                <option value="Astra">Astra (Alpha)</option>
                <option value="Elera">Elera (Beta)</option>
                <option value="Vega">Vega (Delta)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[9px] uppercase font-bold text-slate-400 mb-1 block">Critical Warning Message</label>
            <textarea 
              rows={3}
              placeholder="Enter disciplinary or critical notice message..."
              value={warnMsg} 
              onChange={e => setWarnMsg(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-rose-500/50"
            />
          </div>
          <button 
            onClick={handleSendWarning}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all"
          >
            Broadcast Targeted Class Warning
          </button>
        </div>
      </div>
    </div>
  );
}
