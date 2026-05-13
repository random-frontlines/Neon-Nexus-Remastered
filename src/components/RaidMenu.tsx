import React, { useState, useEffect } from 'react';
import { Screen } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Users, ArrowLeft, Skull, Play, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface RaidMenuProps {
  setScreen: (s: Screen) => void;
  setSubScreen: (s: Screen) => void;
  saveHook: any;
  setActiveRaid?: (raid: any) => void;
}

export default function RaidMenu({ setScreen, setSubScreen, saveHook, setActiveRaid }: RaidMenuProps) {
  const [view, setView] = useState<'MAIN' | 'HOST' | 'JOIN' | 'LOBBY'>('MAIN');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [currentLobby, setCurrentLobby] = useState<any>(null);
  
  // Host Form State
  const [hostName, setHostName] = useState('My Raid Operations');
  const [hostMinLevel, setHostMinLevel] = useState(1);
  const [hostMaxPlayers, setHostMaxPlayers] = useState(4);
  const [hostDiff, setHostDiff] = useState('Medium');

  useEffect(() => {
    const s = io();
    setSocket(s);

    s.on('initData', (data) => {
        if (data.raidLobbies) {
            setLobbies(Object.values(data.raidLobbies));
        }
    });

    s.on('raidLobbyUpdate', (data) => {
        setLobbies(Object.values(data));
        if (currentLobby) {
            setCurrentLobby(data[currentLobby.id]);
        }
    });

    s.on('raidCreated', (lobby) => {
        setCurrentLobby(lobby);
        setView('LOBBY');
    });

    s.on('raidStarted', (lobby) => {
        if (setActiveRaid) setActiveRaid(lobby);
        setScreen('RAID_GAME');
    });

    const username = saveHook.save.username || 'Player';
    s.emit('join', { username, level: saveHook.save.highestWave || 1 });

    return () => {
        if (currentLobby) {
            s.emit('leaveRaid', currentLobby.id);
        }
        s.disconnect();
    };
  }, []);

  const handleJoinLobby = (id: string) => {
      socket?.emit('joinRaid', id);
      const l = lobbies.find(x => x.id === id);
      setCurrentLobby(l);
      setView('LOBBY');
  };

  const handleLeaveLobby = () => {
      socket?.emit('leaveRaid', currentLobby?.id);
      setCurrentLobby(null);
      setView('MAIN');
  };

  return (
    <div className="absolute inset-0 bg-slate-950/90 text-slate-200 flex flex-col items-center justify-center p-8 overflow-hidden backdrop-blur-md">
      <div className="absolute inset-0 pointer-events-none z-0">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-900/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        key={view}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="z-10 bg-slate-900/90 border border-red-500/30 backdrop-blur-xl p-10 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center w-full max-w-3xl"
      >
        <button 
          onClick={() => {
              if (view === 'MAIN') setSubScreen('DOCK');
              else if (view === 'LOBBY') handleLeaveLobby();
              else setView('MAIN');
          }}
          className="self-start flex items-center gap-2 text-slate-400 hover:text-white mb-6 uppercase tracking-widest text-sm font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {view === 'MAIN' ? 'Back to Dock' : 'Back'}
        </button>

        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <div className="w-20 h-20 bg-red-500/20 border border-red-400 rounded-2xl flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
             <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
            Tactical Raids
          </h1>
          <p className="text-red-500/70 uppercase tracking-[0.2em] text-sm">High Risk, High Reward Operations</p>
        </div>

        {view === 'MAIN' && (
            <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto">
              <button 
                onClick={() => setView('HOST')}
                className="group w-full relative flex flex-col items-center justify-center p-8 bg-slate-800/50 border border-red-900/50 hover:border-red-500/80 hover:bg-slate-800 rounded-2xl transition-all text-center overflow-hidden"
              >
                <ShieldAlert className="w-8 h-8 text-red-400 mb-6 relative z-10" />
                <h3 className="text-2xl uppercase tracking-widest font-black text-slate-200 group-hover:text-white relative z-10">Host Raid</h3>
                <p className="text-slate-400 mt-2 relative z-10 text-sm leading-relaxed max-w-sm">
                  Start a new lobby. Customize difficulty, maximum players, and wait for backup.
                </p>
              </button>

              <button 
                onClick={() => setView('JOIN')}
                className="group w-full relative flex flex-col items-center justify-center p-8 bg-slate-800/50 border border-slate-700 hover:border-indigo-500/80 hover:bg-slate-800 rounded-2xl transition-all text-center overflow-hidden"
              >
                <Users className="w-8 h-8 text-indigo-400 mb-6 relative z-10" />
                <h3 className="text-2xl uppercase tracking-widest font-black text-slate-200 group-hover:text-white relative z-10">Find Raid</h3>
                <p className="text-slate-400 mt-2 relative z-10 text-sm leading-relaxed max-w-sm">
                  Join an existing active lobby. Backup a host to extract high-value loot.
                </p>
              </button>
            </div>
        )}

        {view === 'HOST' && (
            <div className="w-full flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-red-400 uppercase text-xs font-bold tracking-widest">Raid Name</label>
                    <input type="text" value={hostName} onChange={e=>setHostName(e.target.value)} className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-red-400 uppercase text-xs font-bold tracking-widest">Difficulty</label>
                        <select value={hostDiff} onChange={e=>setHostDiff(e.target.value)} className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-white">
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                            <option>Challenging</option>
                            <option>Nightmare</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-red-400 uppercase text-xs font-bold tracking-widest">Max Players</label>
                        <select value={hostMaxPlayers} onChange={e=>setHostMaxPlayers(Number(e.target.value))} className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-white">
                            <option value={1}>1 Player (Solo)</option>
                            <option value={2}>2 Players</option>
                            <option value={3}>3 Players</option>
                            <option value={4}>4 Players</option>
                        </select>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-red-400 uppercase text-xs font-bold tracking-widest">Minimum Level (Optional)</label>
                    <input type="number" min={1} value={hostMinLevel} onChange={e=>setHostMinLevel(Number(e.target.value))} className="bg-slate-950 border border-slate-700 p-3 rounded-lg text-white" />
                </div>
                
                <button 
                  onClick={() => {
                      socket?.emit('createRaid', { name: hostName, difficulty: hostDiff, maxPlayers: hostMaxPlayers, minLevel: hostMinLevel });
                  }}
                  className="mt-4 px-6 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-xl transition-colors"
                >
                    Initialize Lobby
                </button>
            </div>
        )}

        {view === 'JOIN' && (
            <div className="w-full flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {lobbies.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 uppercase tracking-widest">No active lobbies found</div>
                ) : (
                    lobbies.map(l => (
                        <div key={l.id} className="flex flex-col md:flex-row justify-between items-center bg-slate-800/50 p-4 border border-slate-700 rounded-xl">
                            <div className="flex flex-col mb-4 md:mb-0">
                                <div className="text-slate-200 font-bold uppercase tracking-wider">{l.name}</div>
                                <div className="text-xs text-slate-400 uppercase tracking-widest">
                                    Host: {l.hostName} | Diff: {l.difficulty} | Lvl {l.minLevel}+
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-bold text-slate-400">{l.participants.length} / {l.maxPlayers}</div>
                                {l.participants.length < l.maxPlayers && !l.started ? (
                                    <button 
                                        onClick={() => handleJoinLobby(l.id)}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs uppercase font-bold tracking-widest rounded transition-colors"
                                    >Join</button>
                                ) : (
                                    <button disabled className="px-4 py-2 bg-slate-700 text-slate-500 text-xs uppercase font-bold tracking-widest rounded cursor-not-allowed">Full/Started</button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {view === 'LOBBY' && currentLobby && (
            <div className="w-full flex flex-col items-center">
                <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-200 mb-2">{currentLobby.name}</h2>
                <div className="flex gap-4 text-xs font-bold text-red-400 uppercase tracking-widest mb-8">
                    <span>{currentLobby.difficulty}</span> &bull;
                    <span>{currentLobby.participants.length} / {currentLobby.maxPlayers} Players</span> &bull;
                    <span>LVL {currentLobby.minLevel}+</span>
                </div>

                <div className="w-full max-w-md bg-slate-800/30 border border-slate-700 rounded-xl p-4 mb-8">
                    <h3 className="text-sm uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-700 pb-2">Roster</h3>
                    {currentLobby.participants.map((pid: string, idx: number) => (
                        <div key={pid} className="flex justify-between items-center py-2">
                           <span className="text-slate-300 font-mono">{pid === socket?.id ? 'You' : `Player ${idx+1}`}</span>
                           {pid === currentLobby.host && <span className="text-[10px] text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded uppercase font-bold">Host</span>}
                        </div>
                    ))}
                </div>

                {currentLobby.host === socket?.id ? (
                    <button 
                       onClick={() => socket?.emit('startRaid', currentLobby.id)}
                       className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl transition-colors flex items-center gap-2"
                    >
                       <Play className="w-5 h-5" /> Execute Raid
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest text-sm font-bold">
                        <Loader2 className="w-5 h-5 animate-spin" /> Waiting for Host...
                    </div>
                )}
            </div>
        )}
      </motion.div>
    </div>
  );
}
