import { useState } from 'react';
import { motion } from 'motion/react';
import { useSaveData } from './hooks/useSaveData';
import { Screen } from './types';
import MainMenu from './components/MainMenu';
import Hangar from './components/Hangar';
import SkillTree from './components/SkillTree';
import GameCanvas from './components/GameCanvas';
import DockStation from './components/DockStation';
import RaidMenu from './components/RaidMenu';
import RaidGame from './components/RaidGame';
import LoginMenu from './components/LoginMenu';
import { useAuth } from './AuthContext';

export default function App() {
  const [screen, setScreen] = useState<Screen>('MENU');
  const [activeRaid, setActiveRaid] = useState<any>(null);
  const saveHook = useSaveData();
  const { user, username, loading } = useAuth();

  if (loading) {
    return <div className="w-screen h-screen bg-[#020617] flex items-center justify-center text-sky-500 font-mono">LOADING COMMAND...</div>;
  }

  if (!user || !username) {
     return <LoginMenu />;
  }

  return (
    <div className="w-screen h-screen bg-[#020617] text-slate-100 font-sans flex flex-col overflow-hidden text-sm">
      {screen === 'MENU' && <MainMenu setScreen={setScreen} saveHook={saveHook} />}
      {screen === 'HANGAR' && <Hangar setScreen={setScreen} saveHook={saveHook} />}
      {screen === 'SKILLS' && <SkillTree setScreen={setScreen} saveHook={saveHook} />}
      {(screen === 'GAME' || screen === 'DOCK' || screen === 'RAID_MENU') && (
          <GameCanvas setScreen={setScreen} saveHook={saveHook} initialSubScreen={screen} setActiveRaid={setActiveRaid} />
      )}
      {screen === 'RAID_GAME' && <RaidGame setScreen={setScreen} saveHook={saveHook} activeRaid={activeRaid} />}
      
      {screen === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-[#020617]/90 flex flex-col items-center justify-center backdrop-blur-xl z-50">
          {/* Animated Background Gradients */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-900/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />

          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="p-12 border border-rose-900/30 rounded-3xl bg-slate-900/40 shadow-[0_0_80px_rgba(244,63,94,0.15)] text-center backdrop-blur-2xl relative overflow-hidden"
          >
            {/* Subtle inner glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/50 to-transparent"></div>

            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-rose-600 tracking-[0.25em] mb-4 uppercase drop-shadow-md">System Failure</h1>
            <p className="text-xl text-slate-400 mb-10 uppercase tracking-[0.3em] font-black">
                Highest Wave: <span className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{saveHook.save.highestWave}</span>
            </p>
            <div className="flex flex-col gap-4 max-w-sm mx-auto">
              <button onClick={() => setScreen('HANGAR')} className="group relative overflow-hidden px-8 py-4 bg-slate-900/80 border border-slate-700/50 text-xs font-black uppercase tracking-[0.2em] text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-800 transition-all duration-300 rounded-xl hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                Upgrades & Loadout
              </button>
              <button onClick={() => setScreen('MENU')} className="group relative overflow-hidden px-8 py-4 bg-slate-900/80 border border-slate-700/50 text-xs font-black uppercase tracking-[0.2em] text-slate-300 hover:text-fuchsia-300 hover:border-fuchsia-500/50 hover:bg-slate-800 transition-all duration-300 rounded-xl hover:shadow-[0_0_20px_rgba(217,70,239,0.2)] hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-fuchsia-400/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                Main Menu
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
