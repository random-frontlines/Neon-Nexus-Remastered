import React from 'react';
import { Screen } from '../types';
import { useSaveData } from '../hooks/useSaveData';
import { motion, AnimatePresence } from 'motion/react';
import { WEAPONS, HULLS } from '../lib/gameData';
import { ArrowLeft, Check, Lock, Zap } from 'lucide-react';

export default function Hangar({ setScreen, saveHook }: { setScreen: (s: Screen) => void, saveHook: ReturnType<typeof useSaveData> }) {
  const { save, updateSave } = saveHook;

  const setLoadout = (slot: 'primary' | 'secondary' | 'hull', id: string) => {
    updateSave(prev => ({
      ...prev,
      loadout: { ...prev.loadout, [slot]: id }
    }));
  };

  const renderItem = (itemType: string, list: Record<string, any>, current: string, slot: 'primary' | 'secondary' | 'hull', unlocked: string[]) => {
    return (
      <div className="mb-16">
        <div className="flex items-center gap-4 mb-6">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                {itemType}
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Object.values(list).filter(item => item.type === slot || slot === 'hull').map((item, index) => {
            const isUnlocked = unlocked.includes(item.id);
            const isEquipped = current === item.id;
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                key={item.id} 
                onClick={() => isUnlocked && setLoadout(slot, item.id)}
                className={`group relative overflow-hidden p-6 rounded-2xl flex flex-col border backdrop-blur-md ${
                    isEquipped ? 'bg-cyan-950/30 border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400/20' : 
                    isUnlocked ? 'bg-slate-900/40 border-slate-700/50 hover:border-cyan-500/50 cursor-pointer hover:bg-slate-800/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 
                    'bg-slate-900/20 border-slate-800/50 opacity-60'
                } transition-all duration-300`}
              >
                  {isEquipped && (
                      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                          <div className="absolute top-4 -right-6 bg-cyan-500 text-[#020617] text-[10px] font-black uppercase tracking-widest py-1 px-8 rotate-45 shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                              Active
                          </div>
                      </div>
                  )}
                  
                  {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#020617]/80 rounded-2xl z-20 backdrop-blur-sm">
                          <div className="flex flex-col items-center gap-2">
                              <Lock className="w-6 h-6 text-rose-500" />
                              <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Locked</span>
                          </div>
                      </div>
                  )}
                  
                  {isUnlocked && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                  )}
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                      <div>
                          <div className="text-[10px] text-cyan-500/70 uppercase font-black tracking-[0.2em] mb-1">{isEquipped ? 'Equipped' : isUnlocked ? 'Available' : 'Restricted'}</div>
                          <div className="text-xl font-black text-slate-100 tracking-wide drop-shadow-sm">{item.name}</div>
                      </div>
                  </div>
                  
                  <p className="text-slate-400/90 text-xs flex-1 mt-2 mb-6 leading-relaxed relative z-10">{item.desc}</p>
                  
                  <div className="space-y-4 relative z-10">
                      {item.hp && (
                        <div>
                          <div className="flex justify-between text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">
                              <span>Hull Integrity</span>
                              <span className="text-cyan-400">{item.hp}</span>
                          </div>
                          <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, item.hp/4)}%` }} className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></motion.div>
                          </div>
                        </div>
                      )}
                      {item.speed && (
                         <div className="flex justify-between text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">
                             <span>Mobility</span>
                             <span className="text-fuchsia-400">{item.speed}</span>
                         </div>
                      )}
                      {item.damage && (
                        <div>
                          <div className="flex justify-between text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">
                              <span>Damage Output</span>
                              <span className="text-rose-400">{item.damage}</span>
                          </div>
                          <div className="h-1.5 bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, item.damage * 2)}%` }} className="h-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></motion.div>
                          </div>
                        </div>
                      )}
                      {item.fireRate && (
                         <div className="flex justify-between text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">
                             <span>Fire Rate</span>
                             <span className="text-amber-400">{Math.round(1000/item.fireRate)}/s</span>
                         </div>
                      )}
                  </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#020617] text-slate-100 font-sans overflow-hidden">
      {/* Background Ambience similar to MainMenu */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/3" />

      <header className="h-20 border-b border-cyan-900/30 bg-slate-900/40 flex items-center justify-between px-8 backdrop-blur-xl z-20 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
          <button onClick={() => setScreen('MENU')} className="w-10 h-10 flex items-center justify-center border border-slate-700/50 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase flex items-center gap-3 drop-shadow-md">
              Hangar Bay
            </h1>
            <div className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase mt-1">Loadout Configuration</div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-cyan-700 scrollbar-track-transparent relative z-10">
          <div className="max-w-6xl mx-auto w-full pb-20">
              {renderItem('Hull Classes', HULLS, save.loadout.hull, 'hull', save.unlockedHulls)}
              {renderItem('Primary Systems', WEAPONS, save.loadout.primary, 'primary', save.unlockedWeapons)}
              {renderItem('Auxiliary Systems', WEAPONS, save.loadout.secondary, 'secondary', save.unlockedWeapons)}
          </div>
      </div>
    </div>
  );
}
