import React, { useState } from 'react';
import { Screen } from '../types';
import { HULLS as HULL_TYPES, WEAPONS as WEAPON_TYPES } from '../lib/gameData';
import { playBuy, playError } from '../lib/audio';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Bomb, Store, DollarSign, Globe, ArrowRight, Play, Coins, ShoppingCart, ClipboardList } from 'lucide-react';

interface DockStationProps {
  setScreen: (s: Screen) => void;
  setSubScreen: (s: Screen) => void;
  saveHook: any;
  planets: any[];
  warpToPlanet: (planet: any) => void;
}

export default function DockStation({ setScreen, setSubScreen, saveHook, planets, warpToPlanet }: DockStationProps) {
  const [showWarp, setShowWarp] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showQuests, setShowQuests] = useState(false);

  const renderMain = () => (
    <motion.div 
      key="main"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="z-10 bg-slate-900/90 border border-sky-500/30 backdrop-blur-xl p-10 rounded-3xl shadow-[0_0_50px_rgba(14,165,233,0.15)] flex flex-col items-center w-full max-w-2xl"
    >
      <div className="flex flex-col items-center text-center space-y-4 mb-12">
        <div className="w-20 h-20 bg-sky-500/20 border border-sky-400 rounded-2xl flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
           <Store className="w-10 h-10 text-sky-400" />
        </div>
        <h1 className="text-4xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
          Nexus Command
        </h1>
        <p className="text-sky-500/70 uppercase tracking-[0.2em] text-sm flex flex-col md:flex-row items-center gap-4">
          <span>Docking Alpha-7</span>
          <span className="hidden md:inline">&bull;</span>
          <span className="text-amber-400 font-bold">{saveHook.save.scraps || 0} Scraps</span>
          <span className="text-violet-400 font-bold">{saveHook.save.secretData || 0} Data Cores</span>
          <span className="text-emerald-400 font-bold">{saveHook.save.tokens || 0} Tokens</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-8">
        <button 
          onClick={() => setShowShop(true)}
          className="group relative flex flex-col items-center justify-center p-8 bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 rounded-2xl transition-all"
        >
          <ShoppingCart className="w-10 h-10 text-slate-400 group-hover:text-emerald-400 mb-4 transition-colors" />
          <span className="uppercase tracking-widest font-bold text-slate-300 group-hover:text-white">Supply Shop</span>
          <span className="text-xs text-slate-500 mt-2 text-center">Trade & Buy Upgrades</span>
        </button>

        <button 
          onClick={() => setSubScreen('RAID_MENU')}
          className="group relative flex flex-col items-center justify-center p-8 bg-slate-800/50 border border-slate-700 hover:border-red-500/50 hover:bg-slate-800 rounded-2xl transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
          <Bomb className="w-10 h-10 text-slate-400 group-hover:text-red-400 mb-4 transition-colors" />
          <span className="uppercase tracking-widest font-bold text-slate-300 group-hover:text-white">Initiate Raid</span>
          <span className="text-xs text-slate-500 mt-2">Infiltrate Enemy Bases</span>
        </button>

        <button 
          onClick={() => setShowWarp(true)}
          className="group relative flex flex-col items-center justify-center p-8 bg-slate-800/50 border border-slate-700 hover:border-fuchsia-500/50 hover:bg-slate-800 rounded-2xl transition-all w-full"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
          <Globe className="w-10 h-10 text-slate-400 group-hover:text-fuchsia-400 mb-4 transition-colors" />
          <span className="uppercase tracking-widest font-bold text-slate-300 group-hover:text-white">Warp Travel</span>
          <span className="text-xs text-slate-500 mt-2">Fast travel to planets</span>
        </button>

        <button 
          onClick={() => setShowQuests(true)}
          className="group relative flex flex-col items-center justify-center p-8 bg-slate-800/50 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 rounded-2xl transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity"></div>
          <ClipboardList className="w-10 h-10 text-slate-400 group-hover:text-amber-400 mb-4 transition-colors" />
          <span className="uppercase tracking-widest font-bold text-slate-300 group-hover:text-white">Bounties</span>
          <span className="text-xs text-slate-500 mt-2">Earn rewards</span>
        </button>

        <button 
          onClick={() => setSubScreen('GAME')}
          className="group relative flex flex-col items-center justify-center p-8 bg-slate-800/50 border border-slate-700 hover:border-sky-500/50 hover:bg-slate-800 rounded-2xl transition-all"
        >
          <Play className="w-10 h-10 text-slate-400 group-hover:text-sky-400 mb-4 transition-colors" />
          <span className="uppercase tracking-widest font-bold text-slate-300 group-hover:text-white">Return to Map</span>
          <span className="text-xs text-slate-500 mt-2">Resume exploration</span>
        </button>

        <button 
          onClick={() => setScreen('MENU')}
          className="group relative flex flex-col items-center justify-center p-8 bg-slate-800/50 border border-slate-700 hover:border-red-500/50 hover:bg-slate-800 rounded-2xl transition-all"
        >
          <LogOut className="w-10 h-10 text-slate-400 group-hover:text-red-400 mb-4 transition-colors" />
          <span className="uppercase tracking-widest font-bold text-slate-300 group-hover:text-white">Exit to Main Menu</span>
          <span className="text-xs text-slate-500 mt-2">Leave current run</span>
        </button>
      </div>
    </motion.div>
  );

  const renderWarp = () => (
    <motion.div 
      key="warp"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="z-10 bg-slate-900/90 border border-fuchsia-500/30 backdrop-blur-xl p-10 rounded-3xl shadow-[0_0_50px_rgba(217,70,239,0.15)] flex flex-col items-center w-full max-w-3xl"
    >
      <div className="flex w-full justify-between items-center mb-8 border-b border-slate-800 pb-4">
         <div>
           <h2 className="text-2xl font-black uppercase tracking-widest text-fuchsia-400">Available Destinations</h2>
           <p className="text-slate-500 text-sm mt-1">Select a planet to initiate jump sequence</p>
         </div>
         <button onClick={() => setShowWarp(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 uppercase font-bold text-sm tracking-wider">
           Cancel
         </button>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
         {planets.map((p, i) => (
           <button 
             key={i}
             onClick={() => warpToPlanet(p)}
             className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 hover:border-fuchsia-500/50 rounded-xl group transition-all text-left"
           >
             <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full border-2 border-slate-700 group-hover:border-fuchsia-400 flex items-center justify-center shrink-0" style={{ backgroundColor: p.color + '40' }}>
                 <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
               </div>
               <div>
                 <div className="font-bold text-slate-200 uppercase tracking-widest">{p.name}</div>
                 <div className="text-xs text-slate-500 mt-1 uppercase">Threat Level: {p.difficulty}</div>
               </div>
             </div>
             <ArrowRight className="text-slate-600 group-hover:text-fuchsia-400 w-5 h-5 transition-colors" />
           </button>
         ))}
      </div>
    </motion.div>
  );

  const renderShop = () => (
    <motion.div 
      key="shop"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="z-10 bg-slate-900/90 border border-emerald-500/30 backdrop-blur-xl p-10 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col items-center w-full max-w-4xl"
    >
      <div className="flex w-full justify-between items-center mb-8 border-b border-slate-800 pb-4">
         <div>
           <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-400">Supply Shop</h2>
           <p className="text-slate-500 text-sm mt-1">
               Tokens: <span className="text-emerald-400">{saveHook.save.tokens || 0}</span> | 
               XP: <span className="text-fuchsia-400">{saveHook.save.xp || 0}</span>
               { (saveHook.save.prestige || 0) > 0 && <span className="ml-2 text-rose-400">| ★{saveHook.save.prestige}</span> }
           </p>
         </div>
         <button onClick={() => setShowShop(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 uppercase font-bold text-sm tracking-wider">
           Leave
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {/* Exchange Section */}
        <div className="space-y-4">
           { (saveHook.save.level || 1) >= 15 && (
               <div className="flex justify-between items-center bg-fuchsia-900/30 p-4 rounded-xl border border-fuchsia-600/50 mb-6 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-500/20 via-transparent to-transparent opacity-50"></div>
                   <div className="relative z-10">
                       <div className="font-black text-fuchsia-300 uppercase tracking-widest text-lg drop-shadow-[0_0_5px_rgba(217,70,239,0.8)]">Prestige</div>
                       <div className="text-xs text-fuchsia-200/70">Reset level to 1, gain +1 Prestige (+50% DMG, +200 HP).</div>
                       <div className="text-[10px] text-fuchsia-400 mt-1">Current Prestige: {saveHook.save.prestige || 0}</div>
                   </div>
                   <button 
                      onClick={() => {
                           playBuy();
                           saveHook.updateSave((prev: any) => ({
                               ...prev,
                               prestige: (prev.prestige || 0) + 1,
                               level: 1,
                               xp: 0
                           }));
                      }}
                      className="relative z-10 px-5 py-3 bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/80 rounded-lg hover:bg-fuchsia-600/60 hover:scale-105 transition-all uppercase font-black tracking-widest text-sm shadow-[0_0_15px_rgba(217,70,239,0.4)]"
                   >
                       Prestige
                   </button>
               </div>
           )}
           <h3 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-4">Exchanges</h3>
           
           <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
               <div>
                   <div className="font-bold text-slate-200">Convert Loot to Tokens</div>
                   <div className="text-xs text-slate-400">Trade all scraps and data cores</div>
               </div>
               <button 
                  onClick={() => {
                       if ((saveHook.save.scraps || 0) > 0 || (saveHook.save.secretData || 0) > 0) {
                           playBuy();
                           saveHook.updateSave((prev: any) => ({
                               ...prev,
                               tokens: (prev.tokens || 0) + ((prev.scraps || 0) * 5) + ((prev.secretData || 0) * 100),
                               scraps: 0,
                               secretData: 0
                           }));
                       } else {
                           playError();
                       }
                  }}
                  className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-600/40 uppercase font-bold text-xs"
               >
                   Exchange
               </button>
           </div>

           <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
               <div>
                   <div className="font-bold text-slate-200">Buy Special Fuel (Potion)</div>
                   <div className="text-xs text-slate-400">Cost: 50 Tokens. Restores HP in battle.</div>
               </div>
               <button 
                  onClick={() => {
                       if ((saveHook.save.tokens || 0) >= 50) {
                           playBuy();
                           saveHook.updateSave((prev: any) => ({
                               ...prev,
                               tokens: prev.tokens - 50,
                               potions: (prev.potions || 0) + 1
                           }));
                       } else {
                           playError();
                       }
                  }}
                  className="px-4 py-2 bg-amber-600/20 text-amber-400 border border-amber-500/50 rounded-lg hover:bg-amber-600/40 uppercase font-bold text-xs"
               >
                   Buy (50 Tokens)
               </button>
           </div>

           <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
               <div>
                   <div className="font-bold text-slate-200">Convert Tokens to XP</div>
                   <div className="text-xs text-slate-400">Trade 10 Tokens for 1000 XP</div>
               </div>
               <button 
                  onClick={() => {
                       if ((saveHook.save.tokens || 0) >= 10) {
                           playBuy();
                           saveHook.updateSave((prev: any) => ({
                               ...prev,
                               tokens: prev.tokens - 10,
                               xp: (prev.xp || 0) + 1000
                           }));
                       } else {
                           playError();
                       }
                  }}
                  className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 rounded-lg hover:bg-indigo-600/40 uppercase font-bold text-xs"
               >
                   Convert (10 Tokens)
               </button>
           </div>
           
           <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
               <div>
                   <div className="font-bold text-slate-200">Buy Reinforced Armor (Lv.{saveHook.save.bonusArmor || 0})</div>
                   <div className="text-xs text-slate-400">Cost: 150 Tokens. Reduces incoming damage permanently.</div>
               </div>
               <button 
                  onClick={() => {
                       if ((saveHook.save.tokens || 0) >= 150) {
                           playBuy();
                           saveHook.updateSave((prev: any) => ({
                               ...prev,
                               tokens: prev.tokens - 150,
                               bonusArmor: (prev.bonusArmor || 0) + 1
                           }));
                       } else {
                           playError();
                       }
                  }}
                  className="px-4 py-2 bg-slate-600/20 text-slate-300 border border-slate-500/50 rounded-lg hover:bg-slate-600/40 uppercase font-bold text-xs"
               >
                   Buy (150 Tokens)
               </button>
           </div>

           <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
               <div>
                   <div className="font-bold text-slate-200">Engine Overdrive (Lv.{Math.round((saveHook.save.bonusSpeed || 0) * 10)})</div>
                   <div className="text-xs text-slate-400">Cost: 200 Tokens. Permanently increases movement speed.</div>
               </div>
               <button 
                  onClick={() => {
                       if ((saveHook.save.tokens || 0) >= 200) {
                           playBuy();
                           saveHook.updateSave((prev: any) => ({
                               ...prev,
                               tokens: prev.tokens - 200,
                               bonusSpeed: (prev.bonusSpeed || 0) + 0.1
                           }));
                       } else {
                           playError();
                       }
                  }}
                  className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-600/40 uppercase font-bold text-xs"
               >
                   Buy (200 Tokens)
               </button>
           </div>
           
           <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
               <div>
                   <div className="font-bold text-slate-200">Weapon Amplifier (Lv.{(saveHook.save.bonusDamage || 0) / 2})</div>
                   <div className="text-xs text-slate-400">Cost: 350 Tokens. Permanently increases all damage dealt.</div>
               </div>
               <button 
                  onClick={() => {
                       if ((saveHook.save.tokens || 0) >= 350) {
                           playBuy();
                           saveHook.updateSave((prev: any) => ({
                               ...prev,
                               tokens: prev.tokens - 350,
                               bonusDamage: (prev.bonusDamage || 0) + 2
                           }));
                       } else {
                           playError();
                       }
                  }}
                  className="px-4 py-2 bg-rose-600/20 text-rose-400 border border-rose-500/50 rounded-lg hover:bg-rose-600/40 uppercase font-bold text-xs"
               >
                   Buy (350 Tokens)
               </button>
           </div>
           
           <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700 mt-4">
               <div>
                   <div className="font-bold text-slate-200">Buy Nexus Point</div>
                   <div className="text-xs text-slate-400">Cost: 300 Tokens. Used in the Skill Tree.</div>
               </div>
               <button 
                  onClick={() => {
                       if ((saveHook.save.tokens || 0) >= 300) {
                           playBuy();
                           saveHook.updateSave((prev: any) => ({
                               ...prev,
                               tokens: prev.tokens - 300,
                               skillPoints: (prev.skillPoints || 0) + 1
                           }));
                       } else {
                           playError();
                       }
                  }}
                  className="px-4 py-2 bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/50 rounded-lg hover:bg-fuchsia-600/40 uppercase font-bold text-xs"
               >
                   Buy (300 Tokens)
               </button>
           </div>
        </div>

        {/* Hull Purchase Section */}
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-4">Hulls & Upgrades</h3>
            {Object.entries(HULL_TYPES).map(([id, hull]) => {
                const isOwned = saveHook.save.unlockedHulls?.includes(id);
                const costTokens = hull.costScraps || 500; // Using scraps cost as tokens here for simplicity
                return (
                    <div key={id} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div>
                            <div className="font-bold text-slate-200 uppercase" style={{ color: hull.color }}>{hull.name}</div>
                            <div className="text-xs text-slate-400">{hull.desc}</div>
                        </div>
                        {isOwned ? (
                             <span className="text-slate-500 text-xs font-bold uppercase tracking-wider px-2">Owned</span>
                        ) : (
                             <button 
                                onClick={() => {
                                     if ((saveHook.save.tokens || 0) >= costTokens) {
                                         playBuy();
                                         saveHook.updateSave((prev: any) => ({
                                             ...prev,
                                             tokens: prev.tokens - costTokens,
                                             unlockedHulls: [...(prev.unlockedHulls || ['scout']), id]
                                         }));
                                     } else {
                                         playError();
                                     }
                                }}
                                className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-600/40 uppercase font-bold text-xs shrink-0"
                             >
                                Buy ({costTokens} Tokens)
                             </button>
                        )}
                    </div>
                );
            })}
            
            <h3 className="text-lg font-bold text-slate-300 uppercase tracking-widest mt-8 mb-4">Weapons & Modules</h3>
            {Object.entries(WEAPON_TYPES).map(([id, w]) => {
                const isOwned = saveHook.save.unlockedWeapons?.includes(id);
                const costTokens = w.cost || 0;
                if (costTokens === 0) return null; // Default weapons
                return (
                    <div key={id} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <div>
                            <div className="font-bold text-slate-200 uppercase" style={{ color: w.type === 'primary' ? '#06b6d4' : '#f97316' }}>{w.name}</div>
                            <div className="text-xs text-slate-400">{w.desc}</div>
                        </div>
                        {isOwned ? (
                             <span className="text-slate-500 text-xs font-bold uppercase tracking-wider px-2">Owned</span>
                        ) : (
                             <button 
                                onClick={() => {
                                     if ((saveHook.save.tokens || 0) >= costTokens) {
                                         playBuy();
                                         saveHook.updateSave((prev: any) => ({
                                             ...prev,
                                             tokens: prev.tokens - costTokens,
                                             unlockedWeapons: [...(prev.unlockedWeapons || ['plasma', 'missile']), id]
                                         }));
                                     } else {
                                         playError();
                                     }
                                }}
                                className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-600/40 uppercase font-bold text-xs shrink-0"
                             >
                                Buy ({costTokens} Tokens)
                             </button>
                        )}
                    </div>
                );
            })}
            
        </div>
      </div>
    </motion.div>
  );

  const QUESTS = [
    { id: 'q1', name: 'Rookie Exterminator', desc: 'Destroy 50 enemies', target: 50, rewardTokens: 50, rewardXp: 500 },
    { id: 'q2', name: 'Veteran Exterminator', desc: 'Destroy 200 enemies', target: 200, rewardTokens: 250, rewardXp: 3000 },
    { id: 'q3', name: 'Elite Exterminator', desc: 'Destroy 500 enemies', target: 500, rewardTokens: 800, rewardXp: 10000 },
    { id: 'q4', name: 'Master Exterminator', desc: 'Destroy 1,000 enemies', target: 1000, rewardTokens: 2000, rewardXp: 25000 },
    { id: 'q5', name: 'Grandmaster Exterminator', desc: 'Destroy 2,500 enemies', target: 2500, rewardTokens: 6000, rewardXp: 75000 },
    { id: 'q6', name: 'Legendary Exterminator', desc: 'Destroy 5,000 enemies', target: 5000, rewardTokens: 15000, rewardXp: 200000 },
  ];

  const renderQuests = () => (
    <motion.div 
      key="quests"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="z-10 bg-slate-900/90 border border-amber-500/30 backdrop-blur-xl p-10 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col items-center w-full max-w-2xl"
    >
      <div className="flex w-full justify-between items-center mb-8 border-b border-slate-800 pb-4">
         <div>
           <h2 className="text-2xl font-black uppercase tracking-widest text-amber-400">Bounties</h2>
           <p className="text-slate-500 text-sm mt-1">Accept missions for rewards</p>
         </div>
         <button onClick={() => setShowQuests(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 uppercase font-bold text-sm tracking-wider">
           Leave
         </button>
      </div>

      <div className="w-full space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
         {QUESTS.map(q => {
             const activeQuest = saveHook.save.activeQuest;
             const isCompleted = saveHook.save.completedQuests?.includes(q.id);
             const isActive = activeQuest?.id === q.id;

             return (
                 <div key={q.id} className="flex flex-col sm:flex-row justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                     <div className="mb-4 sm:mb-0">
                         <div className="font-bold text-slate-200 uppercase tracking-widest">{q.name}</div>
                         <div className="text-xs text-slate-400 mt-1">{q.desc}</div>
                         <div className="text-xs text-amber-400 font-bold mt-2">Rewards: {q.rewardTokens} Tokens, {q.rewardXp} XP</div>
                     </div>
                     {isCompleted ? (
                          <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider px-2">Completed</span>
                     ) : isActive ? (
                          <div className="flex flex-col items-center">
                              <span className="text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">Active ({saveHook.save.questProgress || 0} / {q.target})</span>
                              { (saveHook.save.questProgress || 0) >= q.target && (
                                  <button onClick={() => {
                                       playBuy();
                                       saveHook.updateSave((prev: any) => ({
                                           ...prev,
                                           tokens: (prev.tokens || 0) + q.rewardTokens,
                                           xp: (prev.xp || 0) + q.rewardXp,
                                           completedQuests: [...(prev.completedQuests || []), q.id],
                                           activeQuest: null,
                                           questProgress: 0
                                       }));
                                  }} className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 rounded-lg hover:bg-emerald-600/40 uppercase font-bold text-xs shrink-0">
                                      Claim Reward
                                  </button>
                              )}
                          </div>
                     ) : (
                          <button 
                             onClick={() => {
                                  if (!activeQuest) {
                                      saveHook.updateSave((prev: any) => ({
                                          ...prev,
                                          activeQuest: q,
                                          questProgress: 0
                                      }));
                                  }
                             }}
                             disabled={!!activeQuest}
                             className={`px-4 py-2 uppercase font-bold text-xs shrink-0 rounded-lg border ${activeQuest ? 'opacity-50 cursor-not-allowed bg-slate-700/50 text-slate-500 border-slate-600' : 'bg-amber-600/20 text-amber-400 border-amber-500/50 hover:bg-amber-600/40'}`}
                          >
                             {activeQuest ? 'Another quest active' : 'Accept Bounty'}
                          </button>
                     )}
                 </div>
             );
         })}
      </div>
    </motion.div>
  );

  return (
    <div className="absolute inset-0 bg-slate-950/90 text-slate-200 flex flex-col items-center justify-center p-8 overflow-hidden backdrop-blur-md">
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-900/10 rounded-full blur-3xl"></div>
      </div>

      <AnimatePresence mode="wait">
        {!showWarp && !showShop && !showQuests ? renderMain() : showWarp ? renderWarp() : showShop ? renderShop() : renderQuests()}
      </AnimatePresence>
    </div>
  );
}
