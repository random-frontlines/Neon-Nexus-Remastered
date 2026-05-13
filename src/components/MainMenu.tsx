import React, { useState } from 'react';
import { Screen } from '../types';
import { useSaveData } from '../hooks/useSaveData';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Rocket, Command, RotateCcw, Users, Search, UserPlus, Settings } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

export default function MainMenu({ setScreen, saveHook }: { setScreen: (s: Screen) => void, saveHook: ReturnType<typeof useSaveData> }) {
  const { save, reset, updateSave } = saveHook;
  const { user } = useAuth();
  const [showSocial, setShowSocial] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);

  const handleSearchFriend = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!searchUsername.trim()) return;
     try {
       const q = query(collection(db, 'users'), where('username', '==', searchUsername.trim()));
       const snap = await getDocs(q);
       if (!snap.empty) {
          setSearchResult({ id: snap.docs[0].id, ...snap.docs[0].data() });
       } else {
          setSearchResult('NOT_FOUND');
       }
     } catch (e) {
       console.error(e);
     }
  };

  const handleAddFriend = async () => {
     if (user && searchResult && searchResult !== 'NOT_FOUND') {
         // In a real app we'd add to subcollection or array. For simplicity:
         alert(`Friend request sent to ${searchResult.username}! (Mocked)`);
         setSearchResult(null);
         setSearchUsername('');
     }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8 bg-[#020617] text-slate-100 overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-fuchsia-900/20 rounded-full blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        className="text-center z-10 flex flex-col items-center mb-12"
      >
        <div className="flex items-center gap-6 mb-2">
            <div className="relative w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.4)] flex items-center justify-center before:absolute before:inset-0 before:bg-white/20 before:rounded-lg before:m-1">
                <svg className="w-8 h-8 text-white relative z-10 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
            </div>
            <div className="text-left flex flex-col justify-center">
                <h1 className="text-5xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-500 uppercase drop-shadow-sm leading-none">
                  Neon Nexus
                </h1>
                <div className="h-1 w-full bg-slate-800/80 rounded-full mt-3 overflow-hidden shadow-inner">
                    <div className="h-full w-2/3 bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 animate-pulse"></div>
                </div>
            </div>
        </div>
        <p className="text-xs text-cyan-400/80 font-black uppercase tracking-[0.6em] ml-16 mt-2">
          Remastered Edition
        </p>
      </motion.div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex flex-col gap-4 w-full max-w-sm z-10"
      >
        <button onClick={() => setScreen('GAME')} className="group relative overflow-hidden flex items-center justify-center gap-4 px-8 py-5 bg-cyan-950/40 border border-cyan-500/50 hover:bg-cyan-900/60 hover:border-cyan-300 text-cyan-300 hover:text-white font-black text-sm uppercase tracking-[0.4em] transition-all duration-300 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.02] backdrop-blur-md">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
          <Play className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" />
          Launch Session
        </button>

        <div className="grid grid-cols-2 gap-4">
           <button onClick={() => setScreen('HANGAR')} className="group flex flex-col items-center justify-center gap-3 px-4 py-4 bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 text-slate-400 hover:text-cyan-400 font-bold text-xs uppercase tracking-[0.1em] transition-all duration-300 rounded-xl backdrop-blur-md hover:scale-[1.02]">
             <Rocket className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
             Loadout
           </button>
           
           <button onClick={() => setShowSocial(true)} className="group flex flex-col items-center justify-center gap-3 px-4 py-4 bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 text-slate-400 hover:text-sky-400 font-bold text-xs uppercase tracking-[0.1em] transition-all duration-300 rounded-xl backdrop-blur-md hover:scale-[1.02]">
             <Users className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
             Social
           </button>
        </div>

        <button onClick={() => setScreen('SKILLS')} className="group flex items-center justify-center gap-3 px-8 py-4 bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 text-slate-400 hover:text-fuchsia-400 font-bold text-xs uppercase tracking-[0.2em] transition-all duration-300 rounded-xl backdrop-blur-md hover:scale-[1.02]">
          <Command className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Tech Interface
          {save.skillPoints > 0 && (
              <span className="ml-2 bg-fuchsia-500/20 border border-fuchsia-500/50 text-fuchsia-300 text-[10px] px-2 py-0.5 rounded shadow-[0_0_10px_rgba(217,70,239,0.3)] font-black animate-pulse">{save.skillPoints} PTS</span>
          )}
        </button>
      </motion.div>

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="mt-16 z-10 flex gap-12 items-center bg-slate-900/30 border border-slate-700/30 px-10 py-6 rounded-2xl backdrop-blur-xl shadow-2xl"
      >
        <div className="text-center flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/70 font-black mb-2">Pilot Level</div>
          <div className="text-3xl font-black font-mono text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">{save.level}</div>
        </div>
        <div className="w-px h-12 bg-slate-700/50"></div>
        <div className="text-center flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-500/70 font-black mb-2">Highest Wave</div>
          <div className="text-3xl font-black font-mono text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">{save.highestWave}</div>
        </div>
      </motion.div>
      
      <div className="absolute bottom-6 right-6 flex gap-4">
        <button onClick={() => setShowSettings(true)} className="text-slate-600 hover:text-cyan-500 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-black transition-colors bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800 hover:border-cyan-900 backdrop-blur-md">
            <Settings className="w-3 h-3" /> Settings
        </button>
        <button onClick={() => { if(confirm('Reset all progress?')) reset(); }} className="text-slate-600 hover:text-rose-500 flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase font-black transition-colors bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800 hover:border-rose-900 backdrop-blur-md">
            <RotateCcw className="w-3 h-3" /> Reset Save
        </button>
      </div>

      {showSettings && (
         <div className="absolute inset-0 bg-[#020617]/80 flex items-center justify-center z-50 p-4">
             <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white px-3 py-1">X</button>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 tracking-widest uppercase mb-6 flex items-center gap-2"><Settings /> Settings</h2>
                
                <div className="space-y-6">
                    <div>
                        <div className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Invincibility Skill Keybind</div>
                        <div className="text-xs text-slate-500 mb-3">Set the key (1-9) to activate Invincibility during gameplay.</div>
                        <div className="flex flex-wrap gap-2">
                            {['1','2','3','4','5','6','7','8','9'].map(key => (
                                <button 
                                    key={key} 
                                    onClick={() => updateSave({ invincibleKeybind: key })}
                                    className={`w-10 h-10 rounded text-lg font-bold border transition-colors ${save.invincibleKeybind === key || (!save.invincibleKeybind && key === '1') ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Orbital Strike (Nuke) Keybind</div>
                        <div className="text-xs text-slate-500 mb-3">Set the key (1-9) to activate Orbital Strike. Must not conflict.</div>
                        <div className="flex flex-wrap gap-2">
                            {['1','2','3','4','5','6','7','8','9'].map(key => (
                                <button 
                                    key={key} 
                                    disabled={save.invincibleKeybind === key}
                                    onClick={() => updateSave({ nukeKeybind: key })}
                                    className={`w-10 h-10 rounded text-lg font-bold border transition-colors ${save.nukeKeybind === key || (!save.nukeKeybind && key === '2') ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.5)]' : save.invincibleKeybind === key ? 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-700">
                        <div className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Audio</div>
                        <label className="flex items-center gap-3 text-slate-400 text-sm cursor-pointer hover:text-white transition-colors">
                            <input 
                                type="checkbox" 
                                checked={save.muteAudio || false} 
                                onChange={(e) => {
                                    const muted = e.target.checked;
                                    updateSave({ muteAudio: muted });
                                }}
                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-cyan-500" 
                            />
                            Mute Sound Effects
                        </label>
                    </div>
                </div>
             </div>
         </div>
      )}

      {showSocial && (
         <div className="absolute inset-0 bg-[#020617]/80 flex items-center justify-center z-50 p-4">
             <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(14,165,233,0.15)] relative">
                <button onClick={() => setShowSocial(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white px-3 py-1">X</button>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 tracking-widest uppercase mb-6 flex items-center gap-2"><Users /> Pilot Social</h2>
                
                <form onSubmit={handleSearchFriend} className="flex gap-2 mb-6">
                   <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                         type="text" 
                         placeholder="Search CallSign..."
                         value={searchUsername}
                         onChange={e => setSearchUsername(e.target.value)}
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-sky-400 transition-colors"
                      />
                   </div>
                   <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-bold">Find</button>
                </form>

                {searchResult === 'NOT_FOUND' && (
                    <div className="text-amber-400 text-sm text-center py-4 bg-slate-950 rounded-lg border border-slate-800">No pilot found with that callsign.</div>
                )}
                {searchResult && searchResult !== 'NOT_FOUND' && (
                    <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                       <div className="flex flex-col">
                          <span className="text-slate-200 font-bold tracking-widest">{searchResult.username}</span>
                       </div>
                       <button onClick={handleAddFriend} className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 px-3 py-2 rounded-lg text-sm font-bold transition-colors">
                           <UserPlus className="w-4 h-4" /> Add
                       </button>
                    </div>
                )}
             </div>
         </div>
      )}

    </div>
  );
}
