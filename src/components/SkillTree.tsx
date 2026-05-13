import React, { useState } from 'react';
import { Screen } from '../types';
import { useSaveData } from '../hooks/useSaveData';
import { motion, AnimatePresence } from 'motion/react';
import { SKILLS } from '../lib/gameData';
import { ArrowLeft, ChevronUp, Lock, Zap, Target, Wind, Crosshair, Shield, Magnet, Heart, Sun, FastForward, Droplet, Radiation } from 'lucide-react';

const ICONS: Record<string, any> = {
    Crosshair, Shield, Magnet, Zap, Target, Wind, Heart, Sun, FastForward, Droplet, Radiation
};

export default function SkillTree({ setScreen, saveHook }: { setScreen: (s: Screen) => void, saveHook: ReturnType<typeof useSaveData> }) {
  const { save, updateSave } = saveHook;
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const getRequirementsMet = (id: string) => {
      const skill = SKILLS[id];
      if (!skill.reqs) return true;
      for (const [reqId, reqLevel] of Object.entries(skill.reqs)) {
          const currentReqLevel = save.skills[reqId] || 0;
          if (currentReqLevel < (reqLevel as number)) {
              return false;
          }
      }
      return true;
  };

  const getMissingRequirementsText = (id: string) => {
      const skill = SKILLS[id];
      if (!skill.reqs) return [];
      const missing = [];
      for (const [reqId, reqLevel] of Object.entries(skill.reqs)) {
          const currentReqLevel = save.skills[reqId] || 0;
          if (currentReqLevel < (reqLevel as number)) {
              missing.push(`${SKILLS[reqId].name} Lvl ${reqLevel}`);
          }
      }
      return missing;
  };

  const upgradeSkill = (id: string) => {
      const skill = SKILLS[id];
      const currentLevel = save.skills[id] || 0;
      if (save.skillPoints > 0 && currentLevel < skill.maxLevel && getRequirementsMet(id)) {
          updateSave(prev => ({
              ...prev,
              skillPoints: prev.skillPoints - 1,
              skills: { ...prev.skills, [id]: (prev.skills[id] || 0) + 1 }
          }));
      }
  };

  // Build connection lines
  const lines = [];
  for (const skillId of Object.keys(SKILLS)) {
      const skill = SKILLS[skillId];
      if (skill.reqs) {
          for (const reqId of Object.keys(skill.reqs)) {
              const reqSkill = SKILLS[reqId];
              
              let isVisible = true;
              if (skill.reqs && Object.keys(skill.reqs).length > 0) {
                  isVisible = false;
                  for (const rId of Object.keys(skill.reqs)) {
                      if ((save.skills[rId] || 0) > 0) {
                          isVisible = true;
                          break;
                      }
                  }
              }

              lines.push({
                  id: `${reqId}-${skillId}`,
                  x1: reqSkill.x, y1: reqSkill.y,
                  x2: skill.x, y2: skill.y,
                  active: getRequirementsMet(skillId),
                  visible: isVisible
              });
          }
      }
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#020617] text-slate-100 overflow-hidden relative font-sans">
      <header className="h-20 border-b border-cyan-900/30 bg-slate-900/40 flex items-center justify-between px-8 backdrop-blur-xl z-20 shrink-0 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-6">
          <button onClick={() => setScreen('MENU')} className="w-10 h-10 flex items-center justify-center border border-slate-700/50 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-cyan-400 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 uppercase flex items-center gap-3 drop-shadow-md">
              Tech Interface
            </h1>
            <div className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase mt-1">Skill Specialization</div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
            <div className="text-right flex flex-col items-end">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">Nexus Points</div>
                <div className="text-2xl font-black font-mono text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">{save.skillPoints} <span className="text-sm text-fuchsia-500/50">PTS</span></div>
            </div>
        </div>
      </header>

      <div className="flex-1 relative w-full h-full overflow-auto" style={{ background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)' }}>
          {/* Animated Background Gradients & Grid */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_800px_at_50%_0%,_rgba(6,182,212,0.15),_transparent)]"></div>
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_800px_at_50%_100%,_rgba(217,70,239,0.15),_transparent)]"></div>
          
          <div className="relative w-[1200px] h-[1000px] mx-auto mt-20 mb-32">
              
              <svg className="absolute inset-0 w-full h-full pointer-events-none filter drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {lines.map(line => {
                      if (!line.visible && !line.active) return null;
                      const midY = (line.y1 + line.y2) / 2;
                      const d = `M ${line.x1} ${line.y1} C ${line.x1} ${midY}, ${line.x2} ${midY}, ${line.x2} ${line.y2}`;
                      return (
                          <motion.path 
                              key={line.id}
                              d={d}
                              fill="none"
                              stroke={line.active ? "rgba(34, 211, 238, 0.4)" : "rgba(30, 41, 59, 0.5)"}
                              strokeWidth={line.active ? 0.3 : 0.15}
                              strokeDasharray={line.active ? "none" : "1 1"}
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1, ease: "easeOut" }}
                          />
                      );
                  })}
              </svg>

              {Object.values(SKILLS).map((skill, index) => {
                  const level = save.skills[skill.id] || 0;
                  const reqsMet = getRequirementsMet(skill.id);
                  const Icon = ICONS[skill.icon] || Crosshair;
                  const isSelected = selectedSkill === skill.id;

                  let isVisible = true;
                  if (skill.reqs && Object.keys(skill.reqs).length > 0) {
                      isVisible = false;
                      for (const reqId of Object.keys(skill.reqs)) {
                          if ((save.skills[reqId] || 0) > 0) {
                              isVisible = true;
                              break;
                          }
                      }
                  }

                  if (!isVisible) return null;

                  return (
                      <motion.div 
                          key={skill.id}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          onClick={() => setSelectedSkill(skill.id)}
                          className={`absolute w-16 h-16 -ml-8 -mt-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-300 z-10 backdrop-blur-md
                              ${!reqsMet ? 'bg-slate-900/50 border-slate-800/80 text-slate-700' : 
                                level > 0 ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)]' : 
                                'bg-slate-800/60 border-slate-600 text-slate-400 hover:border-cyan-500 hover:text-cyan-400'}
                              ${isSelected ? 'ring-4 ring-fuchsia-500/60 scale-110 shadow-[0_0_30px_rgba(217,70,239,0.5)]' : ''}`}
                          style={{ left: `${skill.x}%`, top: `${skill.y}%` }}
                      >
                          <Icon className={`w-7 h-7 ${level > 0 ? 'drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : ''}`} />
                          
                          {level > 0 && (
                              <div className="absolute -bottom-2 -right-2 bg-slate-900 border-2 border-cyan-500 text-cyan-300 text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                                  {level}/{skill.maxLevel}
                              </div>
                          )}
                          {!reqsMet && (
                              <div className="absolute -top-2 -right-2 bg-slate-900 border-2 border-rose-900 text-rose-500 p-1 rounded-full z-20">
                                  <Lock className="w-3 h-3" />
                              </div>
                          )}
                          
                          {/* Name label beneath */}
                          <div className={`absolute top-full mt-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.2em] ${reqsMet ? 'text-slate-300 drop-shadow-md' : 'text-slate-600'}`}>
                              {skill.name}
                          </div>
                          
                          {/* Ambient glow behind complete nodes */}
                          {level >= skill.maxLevel && (
                              <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-cyan-400" style={{ animationDuration: '3s' }} />
                          )}
                      </motion.div>
                  );
              })}
          </div>
      </div>

      <AnimatePresence>
          {selectedSkill && (
              <motion.div 
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="absolute bottom-0 left-0 w-full bg-slate-900/90 border-t border-cyan-500/30 backdrop-blur-2xl p-8 z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
              >
                  <button onClick={() => setSelectedSkill(null)} className="absolute top-6 right-8 text-slate-500 hover:text-cyan-400 text-xs font-black uppercase tracking-[0.2em] transition-colors">Close</button>
                  
                  <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-center md:items-start">
                      {(() => {
                          const skill = SKILLS[selectedSkill];
                          const level = save.skills[skill.id] || 0;
                          const isMaxed = level >= skill.maxLevel;
                          const reqsMet = getRequirementsMet(skill.id);
                          const canAfford = save.skillPoints > 0 && !isMaxed && reqsMet;
                          const missingReqs = getMissingRequirementsText(skill.id);
                          const Icon = ICONS[skill.icon] || Crosshair;

                          return (
                              <>
                                  <div className="flex-1">
                                      <div className="flex items-center gap-6 mb-4">
                                          <div className={`p-4 rounded-xl border flex items-center justify-center ${level > 0 ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}>
                                              <Icon className="w-10 h-10" />
                                          </div>
                                          <div>
                                              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 uppercase tracking-[0.1em]">{skill.name}</h2>
                                              <div className="text-cyan-400 font-black uppercase text-xs tracking-[0.3em] mt-1 drop-shadow-sm">Level {level} / {skill.maxLevel}</div>
                                          </div>
                                      </div>
                                      <p className="text-slate-300 mt-4 leading-relaxed text-sm max-w-2xl">{skill.desc}</p>
                                      
                                      {!reqsMet && (
                                          <div className="mt-6 p-4 bg-rose-950/20 border border-rose-900/30 rounded-lg flex flex-col gap-2">
                                              <span className="text-xs font-black text-rose-500 uppercase tracking-[0.1em] flex items-center gap-2"><Lock className="w-3 h-3"/> Missing Requirements:</span>
                                              <div className="flex flex-wrap gap-2 mt-1">
                                                {missingReqs.map((req, i) => (
                                                    <div key={i} className="text-xs font-bold text-rose-300 bg-rose-950/50 px-2 py-1 rounded border border-rose-900/50">{req}</div>
                                                ))}
                                              </div>
                                          </div>
                                      )}

                                      <div className="w-full flex gap-2 mt-8 max-w-xl">
                                          {Array.from({length: skill.maxLevel}).map((_, i) => (
                                              <div key={i} className={`h-1.5 flex-1 rounded-full ${i < level ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-slate-800'}`} />
                                          ))}
                                      </div>
                                  </div>
                                  
                                  <div className="w-full md:w-72 shrink-0 flex flex-col justify-center mt-6 md:mt-0">
                                      <button 
                                          disabled={!canAfford}
                                          onClick={() => upgradeSkill(skill.id)}
                                          className={`group relative overflow-hidden w-full py-5 px-6 rounded-xl font-bold uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-2 transition-all duration-300 border backdrop-blur-md ${
                                              canAfford 
                                              ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 hover:text-cyan-50 hover:bg-cyan-900/60 hover:border-cyan-300 cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.02]' 
                                              : isMaxed
                                                  ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-500/50 cursor-not-allowed'
                                                  : 'bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed'
                                          }`}
                                      >
                                          {canAfford && (
                                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                                          )}
                                          
                                          {isMaxed ? (
                                              <span className="text-sm tracking-[0.3em]">Max Level</span>
                                          ) : !reqsMet ? (
                                              <span className="text-sm text-rose-500/70 flex items-center gap-2 tracking-[0.2em]"><Lock className="w-4 h-4"/> Locked</span>
                                          ) : (
                                              <>
                                                  <div className="flex items-center gap-2 text-lg">
                                                    <ChevronUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" /> Upgrade
                                                  </div>
                                                  <div className="text-[10px] text-cyan-500/70 tracking-[0.1em]">Cost: 1 Nexus Point</div>
                                              </>
                                          )}
                                      </button>
                                  </div>
                              </>
                          );
                      })()}
                  </div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
