import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import path from 'path';

const generatePlanets = () => {
    const planets: any[] = [];
    let attempts = 0;
    while(planets.length < 20 && attempts < 2000) {
        attempts++;
        const r = 4000 + Math.random() * 18000; // 4000 to 22000
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        const radius = 400 + Math.random() * 800; // radius up to 1200
        
        // Relax the distance requirement if we failed many times
        const distancePadding = Math.max(500, 2500 - attempts);

        let valid = true;
        for (const p of planets) {
            const dist = Math.hypot(p.x - x, p.y - y);
            if (dist < (p.radius + radius + distancePadding)) {
                valid = false;
                break;
            }
        }
        
        if (valid) {
            const normalizedDist = (r - 4000) / 18000; 
            const difficulty = Math.max(1, Math.min(10, Math.ceil(normalizedDist * 10)));
            
            planets.push({
                id: planets.length,
                x,
                y,
                radius,
                color: `hsl(${Math.random() * 360}, 70%, 50%)`,
                name: `Sector-${Math.floor(Math.random() * 1000)}`,
                difficulty
            });
        }
    }
    return planets;
};

const PLANETS = generatePlanets();


async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*' }
  });
  
  const players: Record<string, any> = {};
  const activePlanets: Record<number, any> = {};
  const raidLobbies: Record<string, any> = {};
  
  io.on('connection', (socket) => {
    socket.emit('initData', { planets: PLANETS, activePlanets, raidLobbies });

    socket.on('join', (data) => {
      players[socket.id] = { 
        id: socket.id, 
        username: data.username, 
        level: data.level || 1,
        x: data.x || 0, 
        y: data.y || 0,
        vx: 0,
        vy: 0,
        angle: 0,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}` 
      };
      socket.emit('playersSync', players);
      socket.broadcast.emit('playerJoined', players[socket.id]);
      socket.broadcast.emit('chatMessage', { sender: 'System', text: `${data.username} connected.` });
    });
    
    socket.on('enterPlanet', (pId) => {
       if (!players[socket.id]) return;
       const p = PLANETS.find(p => p.id === pId);
       if (!p) return;
       
       if (!activePlanets[pId]) {
           let bossHp = 1500 * p.difficulty;
           let maxWaves = p.difficulty * 2;
           activePlanets[pId] = { id: pId, wave: 1, maxWaves, enemiesSpawned: 0, participants: [socket.id], boss: { hp: bossHp, maxHp: bossHp, contributors: {} } };
           io.emit('chatMessage', { sender: 'System', text: `${players[socket.id].username} started a wave on ${p.name}!` });
       } else {
           if (!activePlanets[pId].participants.includes(socket.id)) {
               activePlanets[pId].participants.push(socket.id);
               io.emit('chatMessage', { sender: 'System', text: `${players[socket.id].username} joined the battle on ${p.name}!` });
           }
       }
       io.emit('planetUpdate', activePlanets[pId]);
    });

    socket.on('bossHit', ({ pId, dmg }) => {
        // sync boss health
        if (activePlanets[pId] && activePlanets[pId].boss) {
            activePlanets[pId].boss.hp -= dmg;
            if (!activePlanets[pId].boss.contributors) activePlanets[pId].boss.contributors = {};
            activePlanets[pId].boss.contributors[socket.id] = (activePlanets[pId].boss.contributors[socket.id] || 0) + dmg;
            
            if (activePlanets[pId].boss.hp <= 0) {
               io.emit('bossDefeated', { pId, contributors: activePlanets[pId].boss.contributors });
               const p = PLANETS.find(x => x.id === pId);
               
               if (activePlanets[pId].wave >= activePlanets[pId].maxWaves) {
                   delete activePlanets[pId];
                   io.emit('planetEnded', pId);
                   io.emit('chatMessage', { sender: 'System', text: `Planet ${p?.name} has been cleared!` });
               } else {
                   activePlanets[pId].wave++;
                   activePlanets[pId].boss = { hp: 1500 * (p?.difficulty||1) * activePlanets[pId].wave, contributors: {} };
                   io.emit('planetUpdate', activePlanets[pId]);
               }
            }
        }
    });

    socket.on('updatePos', (data) => {
      if (players[socket.id]) {
         Object.assign(players[socket.id], data);
         socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
      }
    });

    socket.on('shoot', (data) => {
      if (players[socket.id]) {
         socket.broadcast.emit('playerShoot', { id: socket.id, ...data });
      }
    });
    
    socket.on('chat', (text) => {
      if (players[socket.id]) {
         io.emit('chatMessage', { sender: players[socket.id].username, text });
      }
    });

    // Raid Multiplayer
    socket.on('createRaid', (lobbyData) => {
        const raidId = Math.random().toString(36).substring(2, 9);
        raidLobbies[raidId] = {
            id: raidId,
            host: socket.id,
            hostName: players[socket.id]?.username || 'Unknown',
            name: lobbyData.name || 'Untitled Raid',
            minLevel: lobbyData.minLevel || 1,
            maxPlayers: lobbyData.maxPlayers || 4,
            difficulty: lobbyData.difficulty || 'Medium',
            participants: [socket.id],
            started: false
        };
        io.emit('raidLobbyUpdate', raidLobbies);
        socket.emit('raidCreated', raidLobbies[raidId]);
    });

    socket.on('joinRaid', (raidId) => {
        const raid = raidLobbies[raidId];
        if (raid && !raid.started && raid.participants.length < raid.maxPlayers) {
            if (!raid.participants.includes(socket.id)) {
                raid.participants.push(socket.id);
            }
            io.emit('raidLobbyUpdate', raidLobbies);
        }
    });

    socket.on('leaveRaid', (raidId) => {
        const raid = raidLobbies[raidId];
        if (raid) {
            raid.participants = raid.participants.filter((id: string) => id !== socket.id);
            if (raid.participants.length === 0 || raid.host === socket.id) {
                delete raidLobbies[raidId]; // If host leaves, kill lobby
            } else if (raid.host === socket.id && raid.participants.length > 0) {
                raid.host = raid.participants[0];
                raid.hostName = players[raid.host]?.username || 'Unknown';
            }
            io.emit('raidLobbyUpdate', raidLobbies);
        }
    });

    socket.on('startRaid', (raidId) => {
        const raid = raidLobbies[raidId];
        if (raid && raid.host === socket.id) {
            raid.started = true;
            io.emit('raidLobbyUpdate', raidLobbies);
            raid.participants.forEach((pid: string) => {
                io.to(pid).emit('raidStarted', raid);
            });
        }
    });

    socket.on('raidPlayerSync', (data) => {
        socket.broadcast.emit('raidPlayerUpdate', { id: socket.id, ...data });
    });
    
    socket.on('disconnect', () => {
      if(players[socket.id]) {
         const name = players[socket.id].username;
         delete players[socket.id];
         io.emit('playerLeft', socket.id);
         io.emit('chatMessage', { sender: 'System', text: `${name} disconnected.` });
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
