import React, { useEffect, useRef, useState } from 'react';
import { Screen } from '../types';
import { RaidEngine } from '../lib/raidEngine';
import { AlertTriangle, Crosshair, ArrowLeft, Skull } from 'lucide-react';

interface RaidGameProps {
  setScreen: (s: Screen) => void;
  saveHook: any;
  activeRaid?: any;
}

export default function RaidGame({ setScreen, saveHook, activeRaid }: RaidGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RaidEngine | null>(null);
  
  const [gameState, setGameState] = useState({
    hp: 100, maxHp: 100, raidPhase: 'EXTERIOR', enemiesLeft: 100, timeToExtract: 60, score: 0,
    isInsideBase: false, inventory: { scraps: 0, data: 0 }
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new RaidEngine(
      canvasRef.current,
      saveHook.save,
      (state) => {
        setGameState(state);
      },
      (score, wave, xpGained) => {
        saveHook.updateSave((prev: any) => ({
           ...prev,
           xp: prev.xp + xpGained,
           scraps: prev.scraps + score + engineRef.current!.inventory.scraps, // Reward conversion
           secretData: (prev.secretData || 0) + engineRef.current!.inventory.data,
           questProgress: engineRef.current?.saveData.questProgress,
           activeQuest: engineRef.current?.saveData.activeQuest
        }));
        setScreen('DOCK'); // Return to dock after raid
      },
      () => {
         if (engineRef.current) {
             saveHook.updateSave((prev: any) => ({
                 ...prev,
                 questProgress: engineRef.current!.saveData.questProgress,
                 activeQuest: engineRef.current!.saveData.activeQuest
             }));
         }
         setScreen('DOCK');
      },
      activeRaid
    );
    
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.cleanup();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#020617] overflow-hidden select-none font-sans text-slate-100">
      <canvas ref={canvasRef} className="block w-full h-full absolute inset-0 z-0" />
      
      {/* Subtle Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #fff 1px, #fff 2px)' }}></div>
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10 mix-blend-overlay" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.8) 100%)' }}></div>

      {/* Raid HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
        <div className="flex flex-col gap-2">
           <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl backdrop-blur-md shadow-lg pointer-events-auto w-64">
             <div className="text-slate-400 font-black tracking-widest uppercase text-xs mb-2">HULL INTEGRITY</div>
             <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden outline outline-1 outline-slate-700/50">
               <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${Math.max(0, (gameState.hp / gameState.maxHp)) * 100}%` }}></div>
             </div>
             <div className="text-right text-xs mt-1 text-slate-400 font-mono">
               {Math.max(0, Math.floor(gameState.hp))} / {gameState.maxHp}
             </div>
           </div>
           
           <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl backdrop-blur-md shadow-lg pointer-events-auto w-64">
             <div className="text-slate-400 font-black tracking-widest uppercase text-xs mb-2">CARGO HOLD</div>
             <div className="flex justify-between text-sm uppercase text-amber-400">
               <span>Scraps</span>
               <span className="font-mono">{gameState.inventory?.scraps || 0}</span>
             </div>
             <div className="flex justify-between text-sm uppercase text-violet-400 mt-1">
               <span>Top Secret Data</span>
               <span className="font-mono">{gameState.inventory?.data || 0}</span>
             </div>
           </div>
        </div>

        <div className="bg-slate-900/80 border border-red-500/50 p-4 rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(239,68,68,0.2)] text-center flex flex-col items-center min-w-[200px]">
           <AlertTriangle className="w-6 h-6 text-red-500 mb-2 animate-pulse" />
           <div className="text-xl font-black uppercase tracking-widest text-red-400">{gameState.raidPhase}</div>
           
           {gameState.raidPhase === 'EXTERIOR' && (
             <div className="text-sm uppercase tracking-widest text-slate-300 mt-2">Enemies: {gameState.enemiesLeft}</div>
           )}
           {gameState.raidPhase === 'INTERIOR' && !gameState.isInsideBase && (
             <div className="text-sm uppercase tracking-widest text-slate-300 mt-2">Breach Fortress Center (Press F)</div>
           )}
           {gameState.raidPhase === 'INTERIOR' && gameState.isInsideBase && (
             <div className="text-sm uppercase tracking-widest text-slate-300 mt-2">Plunder Data & Scraps (Press F to Extract)</div>
           )}
           {gameState.raidPhase === 'EXTRACTION' && (
             <div className="text-xl uppercase tracking-widest text-fuchsia-400 font-mono mt-2">{Math.max(0, Math.ceil(gameState.timeToExtract))}s</div>
           )}
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto">
           <button 
             onClick={() => {
                 if (engineRef.current) {
                     saveHook.updateSave((prev: any) => ({
                         ...prev,
                         questProgress: engineRef.current!.saveData.questProgress,
                         activeQuest: engineRef.current!.saveData.activeQuest
                     }));
                 }
                 setScreen('DOCK');
             }}
             className="px-6 py-3 bg-red-900/80 hover:bg-red-800 border border-red-500 rounded-xl text-white uppercase tracking-widest font-bold text-sm shadow-lg transition-colors flex justify-center items-center gap-2"
           >
             Abort Raid
           </button>
        </div>
      </div>
      {saveHook.save.activeQuest && (
         <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 bg-slate-900/80 border border-amber-500/30 p-4 rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.15)] pointer-events-none w-64">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/70 mb-1">Active Bounty</h4>
            <div className="font-bold text-slate-200 text-sm mb-2">{saveHook.save.activeQuest.name}</div>
            
            <div className="w-full bg-slate-800 rounded-full h-2 mb-1 border border-slate-700 overflow-hidden">
                <div 
                   className="bg-amber-500 h-full rounded-full transition-all"
                   style={{ width: `${Math.min(100, Math.max(0, ((saveHook.save.questProgress || 0) / saveHook.save.activeQuest.target) * 100))}%` }}
                />
            </div>
            <div className="flex justify-end text-[10px] text-amber-400 font-mono">
                {saveHook.save.questProgress || 0} / {saveHook.save.activeQuest.target}
            </div>
         </div>
      )}
    </div>
  );
}
