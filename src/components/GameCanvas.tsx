import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../lib/engine';
import { useSaveData } from '../hooks/useSaveData';
import { Screen } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import DockStation from './DockStation';
import RaidMenu from './RaidMenu';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../AuthContext';

interface GameCanvasProps {
  setScreen: (s: Screen) => void;
  saveHook: ReturnType<typeof useSaveData>;
  initialSubScreen?: Screen;
  setActiveRaid?: (raid: any) => void;
}

export default function GameCanvas({ setScreen, saveHook, initialSubScreen = 'GAME', setActiveRaid }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [subScreen, setSubScreen] = useState<Screen>(initialSubScreen);
  const [planets, setPlanets] = useState<any[]>([]);
  const { user, username } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  
  const [gameState, setGameState] = useState({
    hp: 100, maxHp: 100, xp: 0, xpReq: 100, level: 1, score: 0, enemiesLeft: 0, location: 'Deep Space', powerUpType: '', canDock: false, nearPlanet: false, planetData: null as any
  });

  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [messages, setMessages] = useState<{sender: string, text: string}[]>([]);
  const [chatVisible, setChatVisible] = useState(false);
  const chatTimerRef = useRef<any>(null);
  const [playersListOpen, setPlayersListOpen] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<any[]>([]);

  const showChat = () => {
    setChatVisible(true);
    if (chatTimerRef.current) clearTimeout(chatTimerRef.current);
    chatTimerRef.current = setTimeout(() => {
        if (!chatOpen) setChatVisible(false);
    }, 5000);
  };

  useEffect(() => {
    if (!canvasRef.current || !username) return;

    socketRef.current = io();
    socketRef.current.on('connect', () => {
       socketRef.current?.emit('join', { username, level: saveHook.save.highestWave || 1 });
    });

    socketRef.current.on('initData', (data) => {
       if (engineRef.current) {
          engineRef.current.setPlanets(data.planets);
          if (data.activePlanets) {
             engineRef.current.activePlanets = data.activePlanets;
          }
          setPlanets(engineRef.current.planets);
       }
    });
    
    socketRef.current.on('planetUpdate', (pState) => {
        if (engineRef.current) {
            engineRef.current.activePlanets[pState.id] = pState;
            engineRef.current.triggerPlanetWave(pState);
            engineRef.current.isRunning = true; // resume if paused
        }
    });

    socketRef.current.on('bossDefeated', ({ pId, contributors }) => {
        if (engineRef.current) engineRef.current.onBossDefeated(pId, contributors);
    });

    socketRef.current.on('planetEnded', (pId) => {
        if (engineRef.current) delete engineRef.current.activePlanets[pId];
    });

    socketRef.current.on('chatMessage', (msg) => {
       setMessages(prev => [...prev.slice(-19), msg]);
       showChat();
    });

    socketRef.current.on('playersSync', (players) => {
       setOnlinePlayers(Object.values(players));
       if (engineRef.current) engineRef.current.setMultiplayerState(players);
    });

    socketRef.current.on('playerJoined', (player) => {
       setOnlinePlayers(prev => {
          if (!prev.find(p => p.id === player.id)) return [...prev, player];
          return prev;
       });
       if (engineRef.current) engineRef.current.onPlayerJoined(player);
    });
    
    socketRef.current.on('playerMoved', (player) => {
       if (engineRef.current) engineRef.current.onPlayerMoved(player);
    });

    socketRef.current.on('playerLeft', (id) => {
       setOnlinePlayers(prev => prev.filter(p => p.id !== id));
       if (engineRef.current) engineRef.current.onPlayerLeft(id);
    });
    
    // Add socket events here ...
    
    const engine = new GameEngine(
      canvasRef.current, 
      saveHook.save, 
      setGameState, 
      (score, dummyWave, xpGained) => {
        saveHook.addXp(xpGained);
        saveHook.updateSave(prev => ({
            ...prev,
            highestWave: Math.max(prev.highestWave, Math.floor(gameState.level)),
            questProgress: engineRef.current?.saveData.questProgress,
            activeQuest: engineRef.current?.saveData.activeQuest
        }));
        setScreen('GAMEOVER');
      },
      () => {
          if (engineRef.current) {
              saveHook.updateSave(prev => ({
                  ...prev,
                  xp: engineRef.current!.player.xp,
                  questProgress: engineRef.current!.saveData.questProgress,
                  activeQuest: engineRef.current!.saveData.activeQuest
              }));
          }
          setSubScreen('DOCK');
      },
      (pId) => {
          socketRef.current?.emit('enterPlanet', pId);
      },
      socketRef.current,
      username
    );
    
    engineRef.current = engine;
    setPlanets(engine.planets);
    engine.start();

    const handleKeyChat = (e: KeyboardEvent) => {
       if (e.key.toLowerCase() === 't' && !engineRef.current?.isPaused && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          engineRef.current.keys = {};
          setChatOpen(true);
          showChat();
       }
       if (e.key === 'Tab') {
          e.preventDefault();
          setPlayersListOpen(true);
       }
       if (e.key === 'Escape' && chatOpen) {
          setChatOpen(false);
          showChat();
       }
    };
    
    const handleKeyUpChat = (e: KeyboardEvent) => {
       if (e.key === 'Tab') {
          e.preventDefault();
          setPlayersListOpen(false);
       }
    };

    window.addEventListener('keydown', handleKeyChat);
    window.addEventListener('keyup', handleKeyUpChat);

    return () => {
      engine.cleanup();
      socketRef.current?.disconnect();
      window.removeEventListener('keydown', handleKeyChat);
      window.removeEventListener('keyup', handleKeyUpChat);
    };
  }, [username]);

  useEffect(() => {
     if (engineRef.current) {
        if (subScreen === 'DOCK' || subScreen === 'RAID_MENU') {
           engineRef.current.isPaused = true;
           engineRef.current.keys = {}; // Clear keys to prevent spinning
        } else {
           engineRef.current.isPaused = false;
        }
     }
  }, [subScreen]);

  return (
    <div className="relative w-full h-full bg-[#020617] overflow-hidden select-none font-sans text-slate-100">
      {subScreen === 'DOCK' && (
          <div className="absolute inset-0 z-50">
              <DockStation 
                  setScreen={setScreen} 
                  saveHook={saveHook} 
                  setSubScreen={setSubScreen}
                  planets={planets}
                  warpToPlanet={(p) => {
                      if (engineRef.current) {
                          engineRef.current.player.x = p.x + p.radius + 100;
                          engineRef.current.player.y = p.y + p.radius + 100;
                          setSubScreen('GAME');
                      }
                  }}
              />
          </div>
      )}
      {subScreen === 'RAID_MENU' && (
          <div className="absolute inset-0 z-50">
              <RaidMenu 
                  setScreen={setScreen} 
                  saveHook={saveHook} 
                  setSubScreen={setSubScreen}
                  setActiveRaid={setActiveRaid}
              />
          </div>
      )}

      <canvas ref={canvasRef} className="block w-full h-full absolute inset-0 z-0" />
      
      {/* Subtle Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, #fff 1px, #fff 2px)' }}></div>
      <div className="absolute inset-0 pointer-events-none z-0 opacity-10 mix-blend-overlay" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.8) 100%)' }}></div>

      <AnimatePresence>
          {gameState.canDock && (
              <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none"
              >
                  <div className="bg-slate-900/80 border border-cyan-500/50 backdrop-blur-md px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.3)] flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3">
                          <span className="text-cyan-400 font-mono text-xl font-black bg-cyan-950/50 px-3 py-1 rounded border border-cyan-500/30">F</span>
                          <span className="text-slate-200 uppercase tracking-[0.2em] font-black text-lg">To Dock</span>
                      </div>
                      <div className="text-cyan-500/70 text-[10px] uppercase tracking-[0.3em] font-black mt-1">Nexus Command Station</div>
                  </div>
              </motion.div>
          )}
          {gameState.nearPlanet && gameState.planetData && !gameState.activePlanetData && (
              <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-1/4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
              >
                  <div className="bg-slate-900/80 border border-fuchsia-500/50 backdrop-blur-md px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(217,70,239,0.3)] flex flex-col items-center gap-2">
                       <div className="flex items-center gap-3">
                           <span className="text-fuchsia-400 font-mono text-xl font-black bg-fuchsia-950/50 px-3 py-1 rounded border border-fuchsia-500/30">F</span>
                           <span className="text-slate-200 uppercase tracking-[0.2em] font-black text-sm">Enter Atmosphere</span>
                       </div>
                       <div className="text-fuchsia-500/70 text-[10px] uppercase tracking-[0.3em] font-black mt-1">{gameState.planetData.name} (Threat {gameState.planetData.diff})</div>
                  </div>
              </motion.div>
          )}
          {gameState.activePlanetData && gameState.planetData && (
              <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none"
              >
                  <div className="bg-slate-900/80 border border-rose-500/50 backdrop-blur-md px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.3)] flex flex-col items-center gap-1">
                       <div className="text-rose-400 font-black tracking-widest uppercase text-xl text-shadow-glow">
                           Wave {gameState.activePlanetData.wave} / {gameState.activePlanetData.maxWaves}
                       </div>
                       <div className="text-rose-500/70 text-[10px] uppercase tracking-[0.2em] font-bold">Deploying on {gameState.planetData.name}...</div>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      <motion.div  
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between z-10 p-6"
      >
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-700/50 backdrop-blur-md pl-1 p-1 pr-6 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                  <svg className="w-5 h-5 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
              </div>
              <div className="flex flex-col py-1">
                  <div className="text-[10px] text-cyan-500/70 font-black uppercase tracking-[0.3em] leading-none mb-1">Location</div>
                  <h2 className="text-sm font-black tracking-[0.1em] text-slate-100 uppercase leading-none drop-shadow-sm">{gameState.location}</h2>
              </div>
          </div>
          
          <div className="flex gap-6 items-center bg-slate-900/60 border border-slate-700/50 backdrop-blur-md px-6 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-500/70 font-black mb-1">Score</div>
                  <div className="text-2xl font-black font-mono text-fuchsia-300 drop-shadow-[0_0_8px_rgba(217,70,239,0.5)] leading-none">{gameState.score.toLocaleString()}</div>
              </div>
              <div className="w-px h-10 bg-slate-700/50"></div>
              <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/70 font-black mb-1">Hostiles</div>
                  <div className="text-2xl font-black font-mono text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] leading-none">{gameState.enemiesLeft}</div>
              </div>
          </div>
        </header>

        <div className="flex justify-between items-end mb-4">
            <div className="flex flex-col gap-4">
                <div className="text-slate-400 text-[10px] tracking-[0.2em] uppercase font-black bg-slate-900/60 px-5 py-4 rounded-xl border border-slate-700/50 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] leading-loose">
                    <span className="text-cyan-400">WASD</span> Move &bull; <span className="text-cyan-400">Mouse</span> Aim<br/>
                    <span className="text-amber-400">Space</span> Boost &bull; <span className="text-fuchsia-400">M</span> Map<br/>
                    <span className="text-rose-400">Left Click</span> Fire &bull; <span className="text-emerald-400">T</span> Chat
                </div>
                {gameState.powerUpType !== '' && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                className="bg-slate-900/60 border border-slate-700/50 px-5 py-3 rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${gameState.powerUpType === 'rapid' ? 'bg-amber-400' : 'bg-blue-500'}`} />
                        <span className="text-xs uppercase font-black tracking-[0.2em] text-slate-200">
                            {gameState.powerUpType === 'rapid' ? 'Rapid Fire Active' : 'Spread Shot Active'}
                        </span>
                    </motion.div>
                )}
            </div>
            
            <div className="w-80 bg-slate-900/60 border border-slate-700/50 p-6 rounded-2xl backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between text-[11px] uppercase font-black text-slate-400 tracking-[0.2em] mb-2">
                    <span>Hull Integrity</span>
                    <span className="text-cyan-400 font-mono">{Math.floor(gameState.hp)} / {Math.floor(gameState.maxHp)}</span>
                </div>
                <div className="h-2 bg-slate-800/80 rounded-full mb-6 overflow-hidden shadow-inner">
                    <div 
                        className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-all duration-200" 
                        style={{ width: `${Math.max(0, (gameState.hp / gameState.maxHp) * 100)}%` }}
                    />
                </div>
                
                <div className="flex justify-between text-[11px] uppercase font-black text-slate-400 tracking-[0.2em] mb-2">
                    <span>Nexus <span className="text-fuchsia-400">LVL {gameState.level}</span> {saveHook.save.prestige ? <span className="text-rose-400 ml-1">★{saveHook.save.prestige}</span> : null}</span>
                    <span className="text-fuchsia-400 font-mono">{Math.floor(gameState.xp)} / {gameState.xpReq} XP</span>
                </div>
                <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden shadow-inner flex relative">
                    <div className="absolute inset-0 bg-slate-800/80" />
                    <div 
                        className="h-full bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)] transition-all duration-300 relative z-10" 
                        style={{ width: `${Math.max(0, (gameState.xp / gameState.xpReq) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
      </motion.div>

      {/* Multiplayer UI Layer */}
      {chatVisible && messages.length > 0 && (
         <div className="absolute bottom-6 left-6 w-80 pointer-events-none z-40 bg-transparent flex flex-col justify-end drop-shadow-md">
            <div className="max-h-64 overflow-hidden flex flex-col justify-end gap-1 mb-2 mask-image-gradient">
                {messages.map((m, i) => (
                    <div key={i} className="text-sm break-words leading-tight bg-slate-900/40 inline-block px-2 py-1 rounded backdrop-blur-sm self-start">
                      <span className={`font-black tracking-wider ${m.sender === 'System' ? 'text-amber-400' : 'text-sky-300'}`}>[{m.sender}]:</span>
                      <span className={`ml-2 font-medium ${m.sender === 'System' ? 'text-amber-200' : 'text-white'}`}>{m.text}</span>
                    </div>
                ))}
            </div>
         </div>
      )}

      {chatOpen && (
         <div className="absolute bottom-6 left-6 w-96 z-50">
            <div className="max-h-64 overflow-hidden flex flex-col justify-end gap-1 mb-2 pointer-events-auto">
                {messages.map((m, i) => (
                    <div key={i} className="text-sm break-words leading-tight bg-slate-900/80 inline-block px-2 py-1 rounded backdrop-blur-md self-start">
                      <span className={`font-black tracking-wider ${m.sender === 'System' ? 'text-amber-400' : 'text-sky-300'}`}>[{m.sender}]:</span>
                      <span className={`ml-2 font-medium ${m.sender === 'System' ? 'text-amber-200' : 'text-white'}`}>{m.text}</span>
                    </div>
                ))}
            </div>
            <form onSubmit={(e) => {
               e.preventDefault();
               if (chatText.trim() && socketRef.current) {
                  socketRef.current.emit('chat', chatText.trim());
                  setChatText('');
               }
               setChatOpen(false);
               showChat();
            }}>
                <div className="relative">
                    <input 
                       autoFocus
                       type="text"
                       value={chatText}
                       onChange={e => setChatText(e.target.value)}
                       className="w-full bg-slate-900/90 border border-sky-500/50 p-3 rounded-lg text-slate-100 outline-none focus:border-sky-400 focus:shadow-[0_0_15px_rgba(56,189,248,0.2)] transition-all backdrop-blur-xl"
                       placeholder="Say something..."
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] tracking-widest uppercase pointer-events-none">Esc to cancel</div>
                </div>
            </form>
         </div>
      )}

      {playersListOpen && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] z-50 bg-slate-900/90 border border-fuchsia-500/50 p-6 rounded-2xl backdrop-blur-xl shadow-[0_0_50px_rgba(217,70,239,0.3)] pointer-events-none">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-fuchsia-400 font-black tracking-[0.2em] uppercase text-xs">Active Pilots</h3>
               <div className="text-slate-400 text-[10px] font-mono bg-slate-800 px-2 py-1 rounded">{onlinePlayers.length} ONLINE</div>
            </div>
            <div className="flex flex-col gap-3 max-h-64 overflow-hidden">
               {onlinePlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: p.color, color: p.color }} />
                     <span className="text-slate-200 font-black tracking-widest text-sm">{p.username}</span>
                  </div>
               ))}
            </div>
         </div>
      )}

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
