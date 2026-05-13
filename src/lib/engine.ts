import { WEAPONS, HULLS, SKILLS } from './gameData';
import { PlayerSave } from '../types';
import { playShoot, playLaser, playMissile, playExplosion, playHit, playLevelUp, playPowerup, playDash, playError } from './audio';

interface Entity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  type?: number;
  markForDeletion?: boolean;
}

interface Projectile extends Entity {
  damage: number;
  isEnemy: boolean;
  life: number;
  pierce?: number;
  homing?: boolean;
  aoe?: number;
  hitList: number[];
}

interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  xpValue: number;
  shootTimer: number;
  aggro: boolean;
  isBoss?: boolean;
  planetId?: number;
  name?: string;
  level?: number;
}

interface Particle extends Entity {
  life: number;
  maxLife: number;
  alpha: number;
}

interface XpOrb extends Entity {
  value: number;
  magnetized: boolean;
}

interface PowerUp extends Entity {
  powerType: 'health' | 'rapid' | 'spread';
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
}

interface Planet {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  name: string;
  difficulty: number;
}

const PLANET_NAMES = [
  "Aethelgard", "Xerxes Prime", "Nova Roma", "Helion", "Zalthor", 
  "Kryptos", "Orion's Belt", "Tarsis IV", "Veridia", "Nyx",
  "Solaris", "Vortexia", "Aegis", "Vanguard", "Eridani"
];
const PLANET_COLORS = [
  '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#d946ef', '#06b6d4', '#f97316', '#8b5cf6', '#10b981', '#f43f5e'
];

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  saveData: PlayerSave;
  onGameOver: (score: number, wave: number, xpGained: number) => void;
  onUpdateState: (state: any) => void;
  onDock?: () => void;
  onEnterPlanet?: (planetId: number) => void;
  
  width: number = 0;
  height: number = 0;
  arenaSize: number = 40000;
  
  lastTime: number = 0;
  animationFrameId: number = 0;
  
  // Engine control
  camX!: number;
  camY!: number;
  combo: number = 0;
  comboTimer: number = 0;
  maxCombo: number = 0;
  hitStopTimer: number = 0;
  isRunning: boolean = false;
  isPaused: boolean = false;
  score: number = 0;
  spawnTimer: number = 0;
  xpGained: number = 0;
  nearestPlanet: Planet | null = null;
  screenShake: number = 0;
  playerTrail: { x: number; y: number; alpha: number; life: number; maxLife: number; radius: number }[] = [];
  
  // Player
  player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 14,
    hp: 150,
    maxHp: 150,
    speed: 4,
    color: '#06b6d4',
    angle: 0,
    primaryTimer: 0,
    secondaryTimer: 0,
    damageMult: 1,
    fireRateMult: 1,
    critChance: 0,
    magnetRadius: 100,
    level: 1,
    xp: 0,
    xpReq: 100,
    boostTimer: 0,
    boostCooldownTimer: 0,
    boostCooldownMult: 1,
    boostSpeedMult: 1,
    regenRate: 0,
    vampire: 0,
    hasNova: false,
    hasDashDamage: false,
    hasNuke: false,
    invincibleSkillLevel: 0,
    novaCooldownTimer: 0,
    invincibleCooldownTimer: 0,
    invincibleTimer: 0,
    nukeCooldownTimer: 0,
    powerUpTimer: 0,
    powerUpType: '' as 'rapid' | 'spread' | '',
    username: ''
  };
  
  keys: Record<string, boolean> = {};
  mouse = { x: 0, y: 0, down: false };
  
  // Entities
  projectiles: Projectile[] = [];
  enemies: Enemy[] = [];
  particles: Particle[] = [];
  xpOrbs: XpOrb[] = [];
  powerUps: PowerUp[] = [];
  floatingTexts: FloatingText[] = [];
  stars: { x: number, y: number, size: number, speed: number, alpha: number }[] = [];
  planets: Planet[] = [];
  
  entityIdCounter = 0;
  activePlanets: Record<number, any> = {};

  triggerPlanetWave(pState: any) {
      const p = this.planets.find(x => x.id === pState.id);
      if (!p) return;
      // Spawn new wave of enemies!
      const count = 10 + pState.wave * 5 + p.difficulty * 2;
      for (let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = p.radius + 200 + Math.random() * 500;
          this.enemies.push(this.createPlanetEnemy(p.x + Math.cos(angle)*dist, p.y + Math.sin(angle)*dist, p));
      }
      
      // Boss
      const angle = Math.random() * Math.PI * 2;
      const dist = p.radius + 300;
      const boss = this.createPlanetEnemy(p.x + Math.cos(angle)*dist, p.y + Math.sin(angle)*dist, p, true);
      boss.id = `boss-${p.id}`; // deterministic ID
      // buff boss based on wave
      boss.maxHp *= pState.wave;
      boss.hp = boss.maxHp;
      this.enemies.push(boss);
      
      this.addFloatingText(this.player.x, this.player.y - 100, `WAVE ${pState.wave} on ${p.name}!`, '#ef4444');
  }

  createRandomEnemy(): Enemy {
      const types = [
          { radius: 12, maxHp: 15, speed: 2.5, color: '#d946ef', type: 0, xpValue: 2, name: 'Chaser' }, // Basic chaser
          { radius: 16, maxHp: 30, speed: 1.5, color: '#f43f5e', type: 1, xpValue: 5, name: 'Shooter' }, // Basic shooter
          { radius: 20, maxHp: 80, speed: 1.0, color: '#fb923c', type: 0, xpValue: 10, name: 'Tank' }, // Tank
          { radius: 10, maxHp: 10, speed: 4.0, color: '#eab308', type: 0, xpValue: 3, name: 'Drone' }, // Drone fast
          { radius: 15, maxHp: 25, speed: 2.0, color: '#a855f7', type: 1, xpValue: 6, name: 'Sniper' }, // Sniper
          { radius: 18, maxHp: 40, speed: 1.2, color: '#14b8a6', type: 1, xpValue: 8, name: 'Spread' }, // Spread shooter
          { radius: 25, maxHp: 100, speed: 0.8, color: '#ef4444', type: 2, xpValue: 15, name: 'Charger' }, // Charger
          { radius: 14, maxHp: 20, speed: 2.2, color: '#8b5cf6', type: 0, xpValue: 4, name: 'Swarmer' }, // Swarmer
          { radius: 22, maxHp: 60, speed: 1.5, color: '#3b82f6', type: 1, xpValue: 12, name: 'Pulse' }, // Pulse shooter
          { radius: 30, maxHp: 200, speed: 0.5, color: '#6366f1', type: 0, xpValue: 25, name: 'Juggernaut' }, // Juggernaut
      ];
      
      const t = types[Math.floor(Math.random() * types.length)];
      return {
          id: this.entityIdCounter++,
          x: 0, y: 0,
          vx: 0, vy: 0,
          radius: t.radius,
          color: t.color,
          type: t.type,
          hp: t.maxHp,
          maxHp: t.maxHp,
          speed: t.speed,
          xpValue: t.xpValue,
          shootTimer: 60,
          name: t.name,
          level: 1,
          aggro: false
      };
  }

  createPlanetEnemy(x: number, y: number, p: Planet, isBoss: boolean = false): Enemy {
      const e = this.createRandomEnemy();
      e.x = x;
      e.y = y;
      
      const prestigeLvl = this.saveData.prestige || 0;
      e.level = Math.max(1, p.difficulty + Math.floor(Math.random() * 3) - 1) + (prestigeLvl * 5);
      e.xpValue *= (1 + prestigeLvl);
      
      if (isBoss) {
         e.radius *= 4;
         e.maxHp *= 15 * p.difficulty;
         e.hp = e.maxHp;
         e.speed *= 0.5;
         e.color = '#dc2626';
         e.isBoss = true;
         e.planetId = p.id;
         e.name += " Boss";
      } else {
         e.maxHp *= (1 + p.difficulty * 0.5);
         e.hp = e.maxHp;
         e.speed *= (1 + p.difficulty * 0.1);
      }
      return e;
  }

  onBossDefeated(pId: number, contributors: Record<string, number>) {
      const p = this.planets.find(x => x.id === pId);
      if (!p) return;
      
      // Remove boss if still exists local
      this.enemies = this.enemies.filter(e => e.id !== `boss-${pId}`);
      
      // Did I contribute?
      if (this.socket && contributors[this.socket.id]) {
          const ratio = contributors[this.socket.id] / Object.values(contributors).reduce((a:any,b:any) => a+b, 0);
          const xp = Math.floor(1000 * p.difficulty * ratio);
          this.player.xp += xp;
          this.addFloatingText(this.player.x, this.player.y, `+${xp} XP`, '#a855f7');
          // small chance of scrap (money/power)
          if (Math.random() < 0.2) {
              this.powerUps.push({
                 id: this.entityIdCounter++,
                 x: this.player.x + 50,
                 y: this.player.y,
                 type: Math.random() < 0.5 ? 'rapid' : 'spread',
                 color: '#facc15',
                 radius: 12,
                 life: 600
              });
              this.addFloatingText(this.player.x, this.player.y - 20, "BOSS LOOT", '#f59e0b');
          }
      }
  }

  reactStateTimer: number = 0;

  socket?: any;
  onlinePlayers: Record<string, any> = {};
  lastSyncTime: number = 0;

  constructor(
    canvas: HTMLCanvasElement, 
    saveData: PlayerSave, 
    onUpdateState: (state: any) => void,
    onGameOver: (score: number, wave: number, xpGained: number) => void,
    onDock?: () => void,
    onEnterPlanet?: (pId: number) => void,
    socket?: any,
    username?: string
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false }); // optimize
    if (!ctx) throw new Error('Canvas 2D context not found');
    this.ctx = ctx;
    this.saveData = saveData;
    this.player.username = username || 'Player';
    this.onUpdateState = onUpdateState;
    this.onGameOver = onGameOver;
    this.onDock = onDock;
    this.onEnterPlanet = onEnterPlanet;
    this.socket = socket;
    
    this.resize();
    window.addEventListener('resize', this.resize);
    
    this.initPlayer();
    this.initStars();
    
    this.setupInputs();
  }

  setMultiplayerState(players: any) {
     this.onlinePlayers = players;
  }
  onPlayerJoined(player: any) {
     this.onlinePlayers[player.id] = player;
  }
  onPlayerMoved(player: any) {
     if (this.onlinePlayers[player.id]) {
         // Interpolate target
         this.onlinePlayers[player.id].targetX = player.x;
         this.onlinePlayers[player.id].targetY = player.y;
         this.onlinePlayers[player.id].angle = player.angle;
     } else {
         this.onlinePlayers[player.id] = player;
     }
  }
  onPlayerLeft(id: string) {
     delete this.onlinePlayers[id];
  }

  resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  };

  setPlanets(pList: any[]) {
      this.planets = pList.map((p) => ({
          ...p,
          // shift from -15000:15000 to center of arena
          x: (this.arenaSize / 2) + p.x,
          y: (this.arenaSize / 2) + p.y
      }));
  }

  initPlanets() {
      const numPlanets = 15;
      const centerX = this.arenaSize / 2;
      const centerY = this.arenaSize / 2;
      const maxDist = Math.hypot(centerX, centerY);

      for (let i = 0; i < numPlanets; i++) {
          let px = 0, py = 0, valid = false;
          let attempts = 0;
          while (!valid && attempts < 1000) {
              attempts++;
              px = Math.random() * (this.arenaSize - 2000) + 1000;
              py = Math.random() * (this.arenaSize - 2000) + 1000;
              valid = true;
              
              const distToCenter = Math.hypot(px - centerX, py - centerY);
              // Not too close to the base (min 4000)
              if (distToCenter < 4000) {
                  valid = false;
                  continue;
              }

              // Not too close to each other (min 3000, relaxing if attempts get too high)
              const minAllowedDist = Math.max(1500, 3000 - attempts * 2);
              for (const p of this.planets) {
                  if (Math.hypot(px - p.x, py - p.y) < minAllowedDist) {
                      valid = false;
                      break;
                  }
              }
          }
          
          const distToCenter = Math.hypot(px - centerX, py - centerY);
          // Difficulty scales with distance from base (1 to 10)
          const diff = Math.min(10, Math.max(1, Math.floor(((distToCenter - 4000) / (maxDist - 4000)) * 10) + 1)); 

          this.planets.push({
              id: this.entityIdCounter++,
              x: px,
              y: py,
              radius: Math.random() * 400 + 300,
              color: PLANET_COLORS[i % PLANET_COLORS.length],
              name: PLANET_NAMES[i % PLANET_NAMES.length] || "Unknown",
              difficulty: diff
          });
      }
  }
  
  initStars() {
    for (let i = 0; i < 1500; i++) {
        this.stars.push({
            x: Math.random() * this.arenaSize,
            y: Math.random() * this.arenaSize,
            size: Math.random() * 2.5 + 0.5,
            speed: Math.random() * 0.8 + 0.05,
            alpha: Math.random() * 0.8 + 0.2
        });
    }
  }

  initPlayer() {
    const { loadout, skills, level: saveLevel, xp } = this.saveData;
    const hull = HULLS[loadout.hull] || HULLS['fighter'];
    
    // Natural permanent progression based on saveLevel
    const prestigeLvl = this.saveData.prestige || 0;
    const permaHpBonus = saveLevel * 10 + prestigeLvl * 200;
    const permaDamageMult = 1 + (saveLevel * 0.05) + (prestigeLvl * 0.5);

    // Apply bonuses
    const speedBonus = 1 + (this.saveData.bonusSpeed || 0);
    this.player.damageMult = permaDamageMult; // + in-game level multiplier is added later or here? Let's add it below
    this.player.fireRateMult = Math.max(0.2, 1);
    this.player.critChance = 0.05 + Math.min(0.5, saveLevel * 0.01);
    this.player.magnetRadius = 100 + (skills.magnet || 0) * 40;
    
    this.player.boostCooldownMult = 1 - (skills.boostCooldown || 0) * 0.1;
    this.player.boostSpeedMult = 1;
    this.player.regenRate = (skills.regen || 0) * 0.5;
    this.player.vampire = (skills.vampire || 0) * 0.02;
    this.player.hasNova = (skills.nova || 0) > 0;
    this.player.hasDashDamage = (skills.dashDamage || 0) > 0;
    this.player.hasNuke = (skills.nuke || 0) > 0;
    this.player.invincibleSkillLevel = (skills.invincible || 0);
    
    this.player.radius = hull.size;
    this.player.maxHp = hull.hp + permaHpBonus;
    this.player.hp = this.player.maxHp;
    this.player.speed = hull.speed * speedBonus * 0.2; // Significantly reduced base speed to force use of Boost
    this.player.color = hull.color || '#06b6d4';
    
    // Start near a random low difficulty planet or center
    let startP = this.planets.find(p => p.difficulty <= 3) || this.planets[0];
    if (startP) {
        this.player.x = startP.x + 1000;
        this.player.y = startP.y + 1000;
    } else {
        this.player.x = this.arenaSize / 2;
        this.player.y = this.arenaSize / 2;
    }

    this.player.level = saveLevel;
    this.player.xp = xp;
    this.player.xpReq = this.getXpRequired(saveLevel);
    
    this.updateReactState();
  }
  
  getXpRequired(level: number) {
      return level * 100 + Math.floor(Math.pow(level, 1.5) * 50);
  }

  setupInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.style.cursor = 'none';
  }

  cleanup() {
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.style.cursor = 'auto';
    cancelAnimationFrame(this.animationFrameId);
  }

  handleKeyDown = (e: KeyboardEvent) => { 
      if (e.repeat) return;
      if (document.activeElement?.tagName === 'INPUT') return;
      
      this.keys[e.key.toLowerCase()] = true; 
      if (e.code === 'Space' && this.player.boostCooldownTimer <= 0) {
          this.player.boostTimer = 45; // 0.75 seconds of boost
          this.player.boostCooldownTimer = 180 * this.player.boostCooldownMult; // Boost cooldown
          this.audioBump();
          // Spawn big puff Behind player
          this.createExplosion(this.player.x - Math.cos(this.player.angle)*20, this.player.y - Math.sin(this.player.angle)*20, '#06b6d4', 15);
      } else if (e.code === 'KeyE' && this.player.hasNova && this.player.novaCooldownTimer <= 0) {
          this.player.novaCooldownTimer = Math.max(300, 1200 - (this.saveData.skills?.nova || 0) * 120); // Base 20s
          // Spawn Nova
          for (let k = 0; k < 36; k++) {
              const a = (Math.PI * 2 / 36) * k;
              this.projectiles.push({
                  id: this.entityIdCounter++, x: this.player.x, y: this.player.y,
                  vx: Math.cos(a) * 15, vy: Math.sin(a) * 15,
                  radius: 8, color: '#fcd34d', life: 40, isEnemy: false, 
                  damage: 300 * this.player.damageMult, hitList: [], pierce: 999
              });
          }
          this.createExplosion(this.player.x, this.player.y, '#fcd34d', 80);
          this.screenShake = 15;
          this.addFloatingText(this.player.x, this.player.y - 40, 'NOVA!', '#fcd34d', 60);
      }
      
      const invincibleKey = this.saveData.invincibleKeybind || '1';
      if (e.key === invincibleKey && this.player.invincibleSkillLevel > 0 && this.player.invincibleCooldownTimer <= 0) {
          const duration = 120 + this.player.invincibleSkillLevel * 30; // Base 2s + 0.5s per level
          this.player.invincibleTimer = duration;
          this.player.invincibleCooldownTimer = 1800; // 30s cooldown
          this.addFloatingText(this.player.x, this.player.y - 40, 'INVINCIBLE!', '#60a5fa', 60);
      }
      
      const nukeKey = this.saveData.nukeKeybind || '2';
      if (e.key === nukeKey && this.player.hasNuke && this.player.nukeCooldownTimer <= 0) {
          this.player.nukeCooldownTimer = 3600; // 60s cooldown
          this.addFloatingText(this.player.x, this.player.y - 40, 'ORBITAL STRIKE!', '#f43f5e', 120);
          this.createExplosion(this.player.x, this.player.y, '#f43f5e', 300);
          this.screenShake = 30;
          
          for (let e of this.enemies) {
              const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
              if (d < 1000) {
                  e.hp -= 1500 * this.player.damageMult;
              }
          }
      }
      
      if (e.code === 'KeyF') {
          const distToBase = Math.hypot(this.player.x - this.arenaSize / 2, this.player.y - this.arenaSize / 2);
          if (distToBase < 800) {
              if (this.onDock) this.onDock();
          } else if (this.nearestPlanet) {
              const distToPlanet = Math.hypot(this.player.x - this.nearestPlanet.x, this.player.y - this.nearestPlanet.y);
              if (distToPlanet < this.nearestPlanet.radius + 300) {
                  this.keys['f'] = false;
                  if (this.onEnterPlanet) this.onEnterPlanet(this.nearestPlanet.id);
              }
          }
      }
  };
  handleKeyUp = (e: KeyboardEvent) => { 
      if (document.activeElement?.tagName === 'INPUT') {
          this.keys = {}; // Clear any stuck keys
          return;
      }
      this.keys[e.key.toLowerCase()] = false; 
  };
  handleMouseMove = (e: MouseEvent) => { 
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left; 
      this.mouse.y = e.clientY - rect.top; 
  };
  handleMouseDown = (e: MouseEvent) => { if(e.button === 0) this.mouse.down = true; };
  handleMouseUp = (e: MouseEvent) => { if(e.button === 0) this.mouse.down = false; };

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  loop = (time: number) => {
    if (!this.isRunning) return;
    
    let dt = Math.min((time - this.lastTime) / 1000, 0.1); // Cap dt
    this.lastTime = time;

    if (this.isPaused) dt = 0;

    if (this.hitStopTimer > 0) {
        this.hitStopTimer -= dt * 60;
        dt = 0; // Freeze engine logic but keep redrawing
    }

    if (dt > 0) {
        this.update(dt);
    }
    
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
  
  updateReactState() {
      let locName = 'Deep Space';
      const distToBase = Math.hypot(this.player.x - this.arenaSize / 2, this.player.y - this.arenaSize / 2);
      const canDock = distToBase < 800;
      let nearPlanet = false;
      let planetData = null;
      let activePlanetData = null;
      
      if (canDock) {
          locName = 'Main Base Sector';
      } else if (this.nearestPlanet) {
          const dist = Math.hypot(this.player.x - this.nearestPlanet.x, this.player.y - this.nearestPlanet.y);
          if (dist < 4000) {
              locName = `${this.nearestPlanet.name} Orbit (Threat ${this.nearestPlanet.difficulty})`;
          }
          if (dist < this.nearestPlanet.radius + 300) {
              nearPlanet = true;
              planetData = { id: this.nearestPlanet.id, name: this.nearestPlanet.name, diff: this.nearestPlanet.difficulty };
              if (this.socket && this.activePlanets[this.nearestPlanet.id]) {
                  const ap = this.activePlanets[this.nearestPlanet.id];
                  if (ap.participants && ap.participants.includes(this.socket.id)) {
                      activePlanetData = ap;
                      locName = `${this.nearestPlanet.name} Atmosphere`;
                  }
              }
          }
      }

      this.onUpdateState({
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          xp: this.player.xp,
          xpReq: this.player.xpReq,
          level: this.player.level,
          score: this.score,
          enemiesLeft: this.enemies.length,
          location: locName,
          powerUpType: this.player.powerUpType,
          canDock,
          nearPlanet,
          planetData,
          activePlanetData
      });
  }

  update(dt: number) {
    if (this.comboTimer > 0) {
        this.comboTimer -= dt * 60;
        if (this.comboTimer <= 0) this.combo = 0;
    }

    if (this.screenShake > 0) {
        this.screenShake -= dt * 60;
        if (this.screenShake < 0) this.screenShake = 0;
    }

    this.updatePlayer(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateParticles(dt);
    this.updateXpOrbs(dt);
    this.updatePowerUps(dt);
    this.updateFloatingTexts(dt);
    
    // Find nearest planet
    let minD = Infinity;
    this.nearestPlanet = null;
    for (const p of this.planets) {
        const d = Math.hypot(this.player.x - p.x, this.player.y - p.y);
        if (d < minD) {
            minD = d;
            this.nearestPlanet = p;
        }
    }
    
    this.updateSpawns(dt);

    if (this.socket) {
       this.lastSyncTime += dt;
       // Sync at 5hz
       if (this.lastSyncTime > 0.2) {
          this.lastSyncTime = 0;
          this.socket.emit('updatePos', { x: this.player.x, y: this.player.y, angle: this.player.angle });
       }
    }

    // Interpolate online players
    for (const id in this.onlinePlayers) {
        const op = this.onlinePlayers[id];
        if (op.targetX !== undefined) {
           op.x += (op.targetX - op.x) * 0.1;
           op.y += (op.targetY - op.y) * 0.1;
           
           // If they are far, snap
           if (Math.hypot(op.targetX - op.x, op.targetY - op.y) > 400) {
              op.x = op.targetX;
              op.y = op.targetY;
           }
        }
    }
  }

  updatePlayer(dt: number) {
    this.reactStateTimer -= dt * 60;
    if (this.reactStateTimer <= 0) {
        this.reactStateTimer = 10;
        this.updateReactState();
    }

    if (this.player.regenRate > 0) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regenRate * dt);
    }
    
    if (this.player.boostCooldownTimer > 0) this.player.boostCooldownTimer -= dt * 60;
    if (this.player.novaCooldownTimer > 0) this.player.novaCooldownTimer -= dt * 60;
    if (this.player.nukeCooldownTimer > 0) this.player.nukeCooldownTimer -= dt * 60;
    if (this.player.invincibleCooldownTimer > 0) this.player.invincibleCooldownTimer -= dt * 60;
    if (this.player.invincibleTimer > 0) this.player.invincibleTimer -= dt * 60;
    
    if (this.player.powerUpTimer > 0) {
        this.player.powerUpTimer -= dt * 60;
        if (this.player.powerUpTimer <= 0) {
            this.player.powerUpType = '';
        }
    }

    // Movement
    let dx = 0, dy = 0;
    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
    }

    if (this.player.boostTimer > 0) {
        this.player.boostTimer -= dt * 60;
        
        let targetVx = dx * this.player.speed * 40 * this.player.boostSpeedMult;
        let targetVy = dy * this.player.speed * 40 * this.player.boostSpeedMult;
        
        if (dx === 0 && dy === 0) {
            targetVx = Math.cos(this.player.angle) * this.player.speed * 40 * this.player.boostSpeedMult;
            targetVy = Math.sin(this.player.angle) * this.player.speed * 40 * this.player.boostSpeedMult;
        }

        this.player.vx += (targetVx - this.player.vx) * 0.2;
        this.player.vy += (targetVy - this.player.vy) * 0.2;
        
        // Dash particle trail
        if (Math.random() < 0.5) {
            this.createExplosion(this.player.x, this.player.y, '#06b6d4', 2);
        }
    }

    if (this.player.boostTimer <= 0) {
        this.player.vx += dx * this.player.speed * dt * 60;
        this.player.vy += dy * this.player.speed * dt * 60;
        this.player.vx *= 0.9; // friction
        this.player.vy *= 0.9;
    }
    
    this.player.x += this.player.vx;
    this.player.y += this.player.vy;
    
    // Bounds checking
    if (this.socket && this.nearestPlanet && this.activePlanets[this.nearestPlanet.id]) {
        const ap = this.activePlanets[this.nearestPlanet.id];
        if (ap.participants && ap.participants.includes(this.socket.id)) {
            // inside planet atmosphere restrict movement to planet area
            const maxDist = this.nearestPlanet.radius + 300;
            const dist = Math.hypot(this.player.x - this.nearestPlanet.x, this.player.y - this.nearestPlanet.y);
            if (dist > maxDist) {
                const a = Math.atan2(this.player.y - this.nearestPlanet.y, this.player.x - this.nearestPlanet.x);
                this.player.x = this.nearestPlanet.x + Math.cos(a) * maxDist;
                this.player.y = this.nearestPlanet.y + Math.sin(a) * maxDist;
                this.player.vx *= -0.5;
                this.player.vy *= -0.5;
            }
        } else {
             // General arena boundary
            this.player.x = Math.max(0, Math.min(this.arenaSize, this.player.x));
            this.player.y = Math.max(0, Math.min(this.arenaSize, this.player.y));
        }
    } else {
        // General arena boundary
        this.player.x = Math.max(0, Math.min(this.arenaSize, this.player.x));
        this.player.y = Math.max(0, Math.min(this.arenaSize, this.player.y));
    }
    
    if (Math.hypot(this.player.vx, this.player.vy) > 0.5) {
        if (Math.random() < 0.4) {
            this.playerTrail.push({
                x: this.player.x, y: this.player.y, 
                alpha: 0.6, life: 15, maxLife: 15, radius: this.player.radius * 0.8
            });
        }
    }
    
    // Boundaries
    const r = this.player.radius;
    if (this.player.x < r) { this.player.x = r; this.player.vx = 0; }
    if (this.player.x > this.arenaSize - r) { this.player.x = this.arenaSize - r; this.player.vx = 0; }
    if (this.player.y < r) { this.player.y = r; this.player.vy = 0; }
    if (this.player.y > this.arenaSize - r) { this.player.y = this.arenaSize - r; this.player.vy = 0; }

    // Aiming
    const camX = this.player.x - this.width / 2;
    const camY = this.player.y - this.height / 2;
    const worldMouseX = this.mouse.x + camX;
    const worldMouseY = this.mouse.y + camY;
    
    this.player.angle = Math.atan2(worldMouseY - this.player.y, worldMouseX - this.player.x);

    // Shooting
    if (this.player.primaryTimer > 0) this.player.primaryTimer -= dt * 60;
    if (this.player.secondaryTimer > 0) this.player.secondaryTimer -= dt * 60;

    if (this.mouse.down) {
        this.fireWeapon(this.saveData.loadout.primary, 'primary');
        this.fireWeapon(this.saveData.loadout.secondary, 'secondary');
    }
  }
  
  fireWeapon(weaponId: string, slot: 'primary' | 'secondary') {
      const w = WEAPONS[weaponId];
      if (!w) return;
      
      const timer = slot === 'primary' ? this.player.primaryTimer : this.player.secondaryTimer;
      if (timer > 0) return;
      
      const isRapid = this.player.powerUpType === 'rapid';
      const isSpread = this.player.powerUpType === 'spread';
      
      const fireRate = w.fireRate * this.player.fireRateMult * (isRapid ? 0.3 : 1);
      if (slot === 'primary') {
          this.player.primaryTimer = fireRate;
          if (w.name?.includes('Laser') || w.name?.includes('Omega')) playLaser();
          else playShoot();
      } else {
          this.player.secondaryTimer = fireRate;
          if (w.homing) playMissile();
          else playShoot();
      }
      
      let count = w.count || 1;
      if (isSpread && !w.aoe) count += 2;
      
      const baseDmg = w.damage * this.player.damageMult;
      
      if (w.aoe) {
          // Nova burst
          for (let i = 0; i < 36; i++) {
              const a = (Math.PI * 2 / 36) * i;
              this.projectiles.push({
                  id: this.entityIdCounter++, x: this.player.x, y: this.player.y,
                  vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed,
                  radius: w.id === 'singularity' ? 8 : 4, color: w.id === 'singularity' ? '#581c87' : '#d946ef', life: w.aoe / w.speed, isEnemy: false,
                  damage: baseDmg, hitList: [], pierce: 999
              });
          }
          if (w.id === 'singularity') {
              this.createExplosion(this.player.x, this.player.y, '#581c87', 40);
              this.screenShake = Math.max(this.screenShake, 15);
          }
          return;
      }

      for (let i = 0; i < count; i++) {
          let spreadA = this.player.angle;
          if (count > 1) {
              const baseSpread = w.spread || 0.2;
              spreadA += (i - (count - 1) / 2) * baseSpread;
          }
          this.projectiles.push({
              id: this.entityIdCounter++,
              x: this.player.x + Math.cos(spreadA) * this.player.radius,
              y: this.player.y + Math.sin(spreadA) * this.player.radius,
              vx: Math.cos(spreadA) * w.speed,
              vy: Math.sin(spreadA) * w.speed,
              radius: 2,
              color: slot === 'primary' ? '#06b6d4' : '#f97316', // cyan-500 / orange-500
              life: 100,
              isEnemy: false,
              damage: baseDmg,
              hitList: [],
              pierce: w.pierce || 0,
              homing: w.homing
          });
      }
      
      // Knockback
      this.player.vx -= Math.cos(this.player.angle) * 1.5;
      this.player.vy -= Math.sin(this.player.angle) * 1.5;
  }

  updateProjectiles(dt: number) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const p = this.projectiles[i];
           p.life -= dt * 60;
           
           if (p.homing && !p.isEnemy) {
               let closest = null;
               let minDist = 600;
               for (const e of this.enemies) {
                   const d = Math.hypot(e.x - p.x, e.y - p.y);
                   if (d < minDist) { minDist = d; closest = e; }
               }
               if (closest) {
                   const targetA = Math.atan2(closest.y - p.y, closest.x - p.x);
                   const currentA = Math.atan2(p.vy, p.vx);
                   // Lerp angle
                   let diff = targetA - currentA;
                   while (diff < -Math.PI) diff += Math.PI * 2;
                   while (diff > Math.PI) diff -= Math.PI * 2;
                   const newA = currentA + diff * 0.1;
                   const speed = Math.hypot(p.vx, p.vy);
                   p.vx = Math.cos(newA) * speed;
                   p.vy = Math.sin(newA) * speed;
               }
           }
           
           p.x += p.vx * dt * 60;
           p.y += p.vy * dt * 60;
           
           if (p.isEnemy) {
               if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < p.radius + this.player.radius) {
                   p.life = 0;
                   if (this.player.invincibleTimer <= 0) {
                       const dmg = Math.max(1, p.damage - (this.saveData.bonusArmor || 0) * 2);
                       this.player.hp -= dmg;
                       this.createExplosion(this.player.x, this.player.y, '#ef4444', 20);
                       this.screenShake = Math.max(this.screenShake, 5);
                       this.updateReactState();
                       if (this.player.hp <= 0) {
                           this.handleGameOver();
                       }
                   } else {
                       this.createExplosion(p.x, p.y, '#3b82f6', 15);
                   }
               }
           }

           // Trail
           if (Math.random() < 0.6) {
               this.particles.push({
                   id: this.entityIdCounter++, x: p.x, y: p.y,
                   vx: (Math.random()-0.5), vy: (Math.random()-0.5),
                   radius: Math.random() * 2 + 1, color: p.color,
                   life: 15, maxLife: 15, alpha: 1
               });
           }
           
           if (p.life <= 0 || p.x < 0 || p.x > this.arenaSize || p.y < 0 || p.y > this.arenaSize) {
               this.projectiles.splice(i, 1);
           }
      }
  }

  updateEnemies(dt: number) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          
          if (e.hp <= 0) {
              if (this.saveData.activeQuest) {
                  this.saveData.questProgress = (this.saveData.questProgress || 0) + 1;
              }

              this.combo++;
              this.comboTimer = 180; // 3 seconds
              this.maxCombo = Math.max(this.maxCombo, this.combo);
              
              if (this.combo > 1) {
                  this.addFloatingText(e.x, e.y, `${this.combo}x COMBO`, '#fcd34d', 40);
              }

              this.createExplosion(e.x, e.y, e.color, 25);
              
              // Debris
              for(let k=0; k<5; k++) {
                  this.particles.push({
                      id: this.entityIdCounter++, x: e.x, y: e.y,
                      vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                      radius: Math.random() * 3 + 1, color: e.color,
                      life: 40, maxLife: 40, alpha: 1
                  });
              }

              this.score += Math.floor(e.xpValue * 10 * (1 + this.combo * 0.1));
              
              if (Math.random() < 0.1) {
                  const r = Math.random();
                  const type = r < 0.4 ? 'health' : (r < 0.7 ? 'rapid' : 'spread');
                  this.powerUps.push({
                      id: this.entityIdCounter++, x: e.x, y: e.y,
                      vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                      radius: 8, color: type === 'health' ? '#ef4444' : (type === 'rapid' ? '#eab308' : '#3b82f6'),
                      life: 600, maxLife: 600, powerType: type as any
                  });
              }

              // Drop XP
              this.xpOrbs.push({
                  id: this.entityIdCounter++, x: e.x, y: e.y,
                  vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                  radius: 4, color: '#22c55e', value: e.xpValue, magnetized: false // green-500
              });
              this.enemies.splice(i, 1);
              this.updateReactState();
              continue;
          }
          
          // Despawn if too far from player
          const distToPlayer = Math.hypot(this.player.x - e.x, this.player.y - e.y);
          if (distToPlayer > 5000) {
              this.enemies.splice(i, 1);
              continue;
          }

          const distToBase = Math.hypot(e.x - this.arenaSize / 2, e.y - this.arenaSize / 2);
          if (distToBase < 1200) {
              e.aggro = false;
          } else if (distToPlayer < 1000) {
              e.aggro = true;
          }

          const angleToPlayer = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          
          if (e.aggro) {
              // Enemy Trail
              if (Math.random() < 0.2) {
                  this.playerTrail.push({
                      x: e.x, y: e.y, 
                      alpha: 0.3, life: 10, maxLife: 10, radius: e.radius * 0.7
                  });
              }
              if (e.type === 1) { // Shooter
                  if (distToPlayer > 400) {
                      e.x += Math.cos(angleToPlayer) * e.speed * dt * 60;
                      e.y += Math.sin(angleToPlayer) * e.speed * dt * 60;
                  }
                  e.shootTimer -= dt * 60;
                  if (e.shootTimer <= 0 && distToPlayer < 700) {
                      e.shootTimer = 120;
                      this.projectiles.push({
                          id: this.entityIdCounter++, x: e.x, y: e.y,
                          vx: Math.cos(angleToPlayer) * 6 + e.vx, 
                          vy: Math.sin(angleToPlayer) * 6 + e.vy,
                          radius: 3, color: '#ef4444', life: 100, isEnemy: true, damage: 15 + (e.level || 1) * 2, hitList: [] // red-500
                      });
                  }
              } else { // Chaser
                 e.x += Math.cos(angleToPlayer) * e.speed * dt * 60;
                 e.y += Math.sin(angleToPlayer) * e.speed * dt * 60;
              }
          } else {
              // Idle wander
              e.x += e.vx * dt * 60;
              e.y += e.vy * dt * 60;
              if (Math.random() < 0.05) {
                  e.vx = (Math.random() - 0.5) * e.speed;
                  e.vy = (Math.random() - 0.5) * e.speed;
              }
          }
          
          // Player Collision
          if (distToPlayer < this.player.radius + e.radius) {
              if (this.player.boostTimer > 0) {
                  if (this.player.hasDashDamage) {
                      e.hp -= 50 * this.player.damageMult; // Dash damage
                      this.createExplosion(e.x, e.y, '#fcd34d', 20);
                      this.hitStopTimer = 2;
                      this.screenShake = Math.max(this.screenShake, 5);
                  }
              } else if (this.player.invincibleTimer <= 0) {
                  const dmg = Math.max(1, (20 + (e.level || 1) * 2) - (this.saveData.bonusArmor || 0) * 2);
                  this.player.hp -= dmg;
                  e.hp = 0; // Destroy enemy on hit
                  this.createExplosion(this.player.x, this.player.y, '#ef4444', 30);
                  // knockback
                  this.player.vx += Math.cos(angleToPlayer) * -20;
                  this.player.vy += Math.sin(angleToPlayer) * -20;
                  this.hitStopTimer = 8; // juice
                  this.screenShake = Math.max(this.screenShake, 15);
                  this.updateReactState();
                  if (this.player.hp <= 0) {
                      this.handleGameOver();
                      return;
                  }
              } else {
                  // invincible pushback against enemy
                  e.hp -= 10 * this.player.damageMult;
                  e.vx += Math.cos(angleToPlayer) * 10;
                  e.vy += Math.sin(angleToPlayer) * 10;
                  this.createExplosion(e.x, e.y, '#60a5fa', 15);
              }
          }
          
          // Projectile Collision
          for (let j = this.projectiles.length - 1; j >= 0; j--) {
              const p = this.projectiles[j];
              if (p.isEnemy || p.hitList.includes(e.id)) continue;
              if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
                  let dmgToDeal = p.damage + (this.saveData.bonusDamage || 0);
                  let isCrit = Math.random() < this.player.critChance;
                  if (isCrit) {
                      dmgToDeal *= 2.5;
                      this.hitStopTimer = 2; // small pause on crits
                      this.screenShake = Math.max(this.screenShake, 4);
                  }
                  
                  e.hp -= dmgToDeal;
                  if (e.isBoss && e.planetId) {
                      if (this.socket) {
                          this.socket.emit('bossHit', { pId: e.planetId, dmg: dmgToDeal });
                      }
                      // we don't delete boss locally until server says so, but we can set hp
                      // actually it might die instantly locally. Let's just wait for server.
                      // Wait, we can keep it alive at 1 hp locally.
                      if (e.hp <= 0) e.hp = 1;
                  }
                  
                  if (e.hp <= 0 && this.player.vampire > 0 && !e.isBoss) {
                      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * this.player.vampire);
                  }

                  p.hitList.push(e.id);
                  e.aggro = true; // Aggro on hit
                  this.addFloatingText(e.x, e.y, Math.floor(dmgToDeal).toString(), isCrit ? '#fcd34d' : '#f8fafc'); // yellow-300 / slate-50
                  this.createExplosion(p.x, p.y, p.color, 8);
                  
                  // Hit flash
                  e.shootTimer = e.shootTimer; // Just dummy to show we hit
                  if (p.pierce !== undefined && p.pierce > 0) {
                      p.pierce--;
                  } else {
                      this.projectiles.splice(j, 1);
                  }
              }
          }
      }
  }

  updateSpawns(dt: number) {
      if (!this.nearestPlanet) return;
      
      const distToPlanet = Math.hypot(this.player.x - this.nearestPlanet.x, this.player.y - this.nearestPlanet.y);
      if (distToPlanet > 4000) return; // Only spawn if reasonably close to a planet

      // Cap enemies based on planet difficulty. More enemies closer to harder planets.
      const distFactor = Math.max(0, 1 - (distToPlanet / 4000));
      const maxEnemies = Math.floor((15 + this.nearestPlanet.difficulty * 6) * distFactor);
      
      if (this.enemies.length < maxEnemies) {
          this.spawnTimer -= dt * 60;
          if (this.spawnTimer <= 0) {
              const spawnRate = Math.max(10, 80 - this.nearestPlanet.difficulty * 6);
              this.spawnTimer = spawnRate;
              
              let angle = Math.random() * Math.PI * 2;
              let dist = this.width / 2 + Math.random() * 500;
              let x = this.player.x + Math.cos(angle) * dist;
              let y = this.player.y + Math.sin(angle) * dist;
              
              // Ensure inside bounds
              x = Math.max(50, Math.min(this.arenaSize - 50, x));
              y = Math.max(50, Math.min(this.arenaSize - 50, y));
              
              const e = this.createRandomEnemy();
              e.x = x;
              e.y = y;
              
              let diff = this.nearestPlanet.difficulty;
              const prestigeLvl = this.saveData.prestige || 0;
              e.level = Math.max(1, diff + Math.floor(Math.random() * 3) - 1) + (prestigeLvl * 5);
              e.hp *= (1 + diff * 0.4);
              e.maxHp = e.hp;
              e.speed *= (1 + diff * 0.05);
              e.xpValue *= (1 + prestigeLvl);
              
              this.enemies.push(e);
              this.updateReactState();
          }
      }
  }
  
  updateXpOrbs(dt: number) {
      for (let i = this.xpOrbs.length - 1; i >= 0; i--) {
          const orb = this.xpOrbs[i];
          const dist = Math.hypot(this.player.x - orb.x, this.player.y - orb.y);
          
          if (dist < this.player.magnetRadius) {
              orb.magnetized = true;
          }
          
          if (orb.magnetized) {
              const angle = Math.atan2(this.player.y - orb.y, this.player.x - orb.x);
              orb.vx += Math.cos(angle) * 2 * dt * 60;
              orb.vy += Math.sin(angle) * 2 * dt * 60;
              orb.vx *= 0.9; // Apply friction even when magnetized
              orb.vy *= 0.9;
          } else {
              orb.vx *= 0.9;
              orb.vy *= 0.9;
          }
          
          orb.x += orb.vx * dt * 60;
          orb.y += orb.vy * dt * 60;
          
          if (dist < this.player.radius + orb.radius) {
              const xpVal = Math.floor(orb.value * (1 + this.combo * 0.05));
              this.player.xp += xpVal;
              this.xpGained += xpVal;
              
              if (this.player.xp >= this.player.xpReq) {
                  this.player.xp -= this.player.xpReq;
                  this.player.level++;
                  this.player.xpReq = this.getXpRequired(this.player.level);
                  
                  // Level up effects
                  this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.2); // Heal 20% on level up
                  playLevelUp();
                  this.addFloatingText(this.player.x, this.player.y - 40, 'LEVEL UP!', '#06b6d4', 120);
                  this.createExplosion(this.player.x, this.player.y, '#06b6d4', 80);
                  
                  if (this.player.hasNova) {
                      // Fire ring of projectiles
                      for (let k = 0; k < 36; k++) {
                          const a = (Math.PI * 2 / 36) * k;
                          this.projectiles.push({
                              id: this.entityIdCounter++, x: this.player.x, y: this.player.y,
                              vx: Math.cos(a) * 12, vy: Math.sin(a) * 12,
                              radius: 6, color: '#fcd34d', life: 40, isEnemy: false, 
                              damage: 100, hitList: [], pierce: 999
                          });
                      }
                      this.screenShake = 20;
                  }
              }
              this.xpOrbs.splice(i, 1);
              this.updateReactState();
          }
      }
  }

  updatePowerUps(dt: number) {
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
          const p = this.powerUps[i];
          p.life -= dt * 60;
          if (p.life <= 0) {
              this.powerUps.splice(i, 1);
              continue;
          }
          
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.x += p.vx * dt * 60;
          p.y += p.vy * dt * 60;
          
          const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
          if (dist < this.player.radius + p.radius) {
              if (p.powerType === 'health') {
                  playPowerup();
                  this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
                  this.addFloatingText(this.player.x, this.player.y, '+40 HP', '#ef4444', 40);
              } else {
                  playPowerup();
                  this.player.powerUpTimer = 600; // 10 seconds (assuming 60fps)
                  this.player.powerUpType = p.powerType;
                  this.addFloatingText(this.player.x, this.player.y, p.powerType.toUpperCase(), p.color, 40);
              }
              this.createExplosion(p.x, p.y, p.color, 15);
              this.powerUps.splice(i, 1);
          }
      }
  }

  updateParticles(dt: number) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx * dt * 60;
          p.y += p.vy * dt * 60;
          p.vx *= 0.92;
          p.vy *= 0.92;
          p.life -= dt * 60;
          p.alpha = Math.max(0, p.life / p.maxLife);
          if (p.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.playerTrail.length - 1; i >= 0; i--) {
          const t = this.playerTrail[i];
          t.life -= dt * 60;
          t.alpha = (t.life / t.maxLife) * 0.6;
          if (t.life <= 0) this.playerTrail.splice(i, 1);
      }
  }
  
  updateFloatingTexts(dt: number) {
       for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
          const ft = this.floatingTexts[i];
          ft.y += ft.vy * dt * 60;
          ft.vy *= 0.95; // ease out
          ft.life -= dt * 60;
          if (ft.life <= 0) this.floatingTexts.splice(i, 1);
      }
  }

  audioBump() {
      playDash();
  }

  createExplosion(x: number, y: number, color: string, count: number) {
      if (count > 20) playExplosion();
      else if (count > 5) playHit();
      this.screenShake = Math.max(this.screenShake, count * 0.4);
      if (this.particles.length > 800) return; // Prevent lag
      for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const s = Math.random() * (count > 20 ? 15 : 6) + 1; // More spread for bigger explosions
          this.particles.push({
              id: this.entityIdCounter++, x, y, radius: Math.random() * (count > 20 ? 6 : 3) + 1,
              vx: Math.cos(a) * s, vy: Math.sin(a) * s, color,
              life: 30 + Math.random() * 40, maxLife: 70, alpha: 1
          });
      }
  }
  
  addFloatingText(x: number, y: number, text: string, color: string, life = 40) {
      this.floatingTexts.push({
          id: this.entityIdCounter++,
          x: x + (Math.random() * 30 - 15),
          y: y + (Math.random() * 20 - 10),
          text, color, life, maxLife: life, vy: -1.5
      });
  }

  handleGameOver() {
      this.isRunning = false;
      this.onGameOver(this.score, Math.floor(this.player.level), this.xpGained);
  }

  // --- RENDERING ---
  
  draw() {
    this.ctx.fillStyle = '#020617'; // slate-950
    this.ctx.fillRect(0, 0, this.width, this.height);

    const targetCamX = this.player.x - this.width / 2;
    const targetCamY = this.player.y - this.height / 2;

    if (this.camX === undefined) {
        this.camX = targetCamX;
        this.camY = targetCamY;
    }

    const smoothFactor = 0.08;
    this.camX += (targetCamX - this.camX) * smoothFactor;
    this.camY += (targetCamY - this.camY) * smoothFactor;

    const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;
    const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;

    const camX = this.camX + shakeX;
    const camY = this.camY + shakeY;

    this.ctx.save();
    this.ctx.translate(-camX, -camY);
    
    // Draw Background Grid (Neon Wireframe aesthetic)
    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    const gridStep = 150;
    const startX = Math.floor(camX / gridStep) * gridStep;
    const startY = Math.floor(camY / gridStep) * gridStep;
    for (let x = startX; x < camX + this.width; x += gridStep) {
        this.ctx.moveTo(x, camY); this.ctx.lineTo(x, camY + this.height);
    }
    for (let y = startY; y < camY + this.height; y += gridStep) {
        this.ctx.moveTo(camX, y); this.ctx.lineTo(camX + this.width, y);
    }
    this.ctx.stroke();
    
    // Arena Bounds
    this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)'; // rose-500
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, 0, this.arenaSize, this.arenaSize);
    
    // Stars Parallax
    this.ctx.fillStyle = '#cbd5e1'; // slate-300
    for (const star of this.stars) {
        let sx = star.x - camX * star.speed;
        let sy = star.y - camY * star.speed;
        
        // Wrap stars around the screen
        sx = ((sx % this.width) + this.width) % this.width;
        sy = ((sy % this.height) + this.height) % this.height;
        
        this.ctx.globalAlpha = star.alpha;
        this.ctx.fillRect(camX + sx, camY + sy, star.size, star.size);
    }
    this.ctx.globalAlpha = 1;

    // Draw Main Base
    const baseX = this.arenaSize / 2;
    const baseY = this.arenaSize / 2;
    if (baseX + 1000 > camX && baseX - 1000 < camX + this.width &&
        baseY + 1000 > camY && baseY - 1000 < camY + this.height) {
        
        this.ctx.save();
        this.ctx.translate(baseX, baseY);
        
        // Base Aura
        const baseGrad = this.ctx.createRadialGradient(0, 0, 200, 0, 0, 800);
        baseGrad.addColorStop(0, 'rgba(56, 189, 248, 0.15)'); // sky-400
        baseGrad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = baseGrad;
        this.ctx.beginPath(); this.ctx.arc(0, 0, 800, 0, Math.PI * 2); this.ctx.fill();

        // Rotating outer ring
        this.ctx.rotate(performance.now() * 0.0001);
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.setLineDash([40, 20, 10, 20]);
        this.ctx.arc(0, 0, 400, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Core structure
        this.ctx.rotate(-performance.now() * 0.0002);
        this.ctx.fillStyle = '#0f172a'; // slate-900
        this.ctx.strokeStyle = '#38bdf8'; // sky-400
        this.ctx.lineWidth = 4;
        
        // Hexagon core
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            if (i === 0) this.ctx.moveTo(Math.cos(a) * 200, Math.sin(a) * 200);
            else this.ctx.lineTo(Math.cos(a) * 200, Math.sin(a) * 200);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Inner detail lines
        this.ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const a = (Math.PI / 3) * i * 2;
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(Math.cos(a) * 200, Math.sin(a) * 200);
        }
        this.ctx.stroke();

        // Central hub
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.beginPath(); this.ctx.arc(0, 0, 40, 0, Math.PI * 2); this.ctx.fill();

        this.ctx.restore();
        
        // Floating text
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.font = 'bold 36px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("NEXUS COMMAND", baseX, baseY - 450);
        this.ctx.font = '14px monospace';
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fillText("SAFE ZONE", baseX, baseY - 420);
    }

    // Draw Planets
    for (const p of this.planets) {
        // Frustum culling for planets
        if (p.x + p.radius * 2 < camX || p.x - p.radius * 2 > camX + this.width || 
            p.y + p.radius * 2 < camY || p.y - p.radius * 2 > camY + this.height) continue;
            
        // Aura glow
        const grad = this.ctx.createRadialGradient(p.x, p.y, p.radius * 0.8, p.x, p.y, p.radius * 1.5);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.globalAlpha = 0.15;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius * 1.5, 0, Math.PI * 2); this.ctx.fill();
        
        // Planet base
        this.ctx.globalAlpha = 1;

        // Create crescent shadow effect
        const planetGrad = this.ctx.createRadialGradient(
            p.x - p.radius * 0.4, p.y - p.radius * 0.4, p.radius * 0.1,
            p.x, p.y, p.radius
        );
        planetGrad.addColorStop(0, p.color);
        planetGrad.addColorStop(1, '#020617');

        this.ctx.fillStyle = planetGrad;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.fill();

        // Vector style Craters / features
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        const numCraters = (p.id * 3) % 4 + 2; 
        for(let i=1; i<=numCraters; i++) {
           const cx = p.x + Math.sin(p.id * i * 11) * p.radius * 0.5;
           const cy = p.y + Math.cos(p.id * i * 17) * p.radius * 0.5;
           const cr = p.radius * 0.1 * (p.id * i % 3 + 1);
           
           this.ctx.beginPath(); this.ctx.arc(cx, cy, cr, 0, Math.PI*2); this.ctx.fill();
           // Crater highlight
           this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
           this.ctx.lineWidth = cr * 0.1;
           this.ctx.beginPath(); this.ctx.arc(cx - cr*0.1, cy - cr*0.1, cr, 0, Math.PI); this.ctx.stroke();
        }

        // Atmosphere glow
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 4;
        this.ctx.globalAlpha = 0.3;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.stroke();
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 1;

        // Rings for some planets
        if (p.id % 2 === 0) {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.id * 15) * Math.PI / 180);
            this.ctx.scale(1, 0.3);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.radius * 1.6, 0, Math.PI * 2);
            // Ring gradient
            const ringGrad = this.ctx.createLinearGradient(-p.radius*1.6, 0, p.radius*1.6, 0);
            ringGrad.addColorStop(0, 'rgba(255,255,255,0)');
            ringGrad.addColorStop(0.2, p.color);
            ringGrad.addColorStop(0.8, p.color);
            ringGrad.addColorStop(1, 'rgba(255,255,255,0)');
            
            this.ctx.strokeStyle = ringGrad;
            this.ctx.lineWidth = p.radius * 0.15;
            this.ctx.globalAlpha = 0.4;
            this.ctx.stroke();
            this.ctx.restore();
        }

        this.ctx.fillStyle = '#f8fafc';
        this.ctx.font = 'bold 24px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(p.name, p.x, p.y - 10);
        this.ctx.font = '14px monospace';
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = 0.8;
        this.ctx.fillText(`Threat Level ${p.difficulty}`, p.x, p.y + 20);
        this.ctx.globalAlpha = 1;
    }

    // Player Trail
    for (const t of this.playerTrail) {
        this.ctx.globalAlpha = t.alpha;
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath(); this.ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2); this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    // Particles (Additive Blending)
    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.fill();
        
        // Add a glow to particles
        this.ctx.globalAlpha = p.alpha * 0.3;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2); this.ctx.fill();
    }
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;

    // XP Orbs
    for (const o of this.xpOrbs) {
        this.ctx.fillStyle = o.color;
        this.ctx.beginPath(); this.ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.globalAlpha = 0.4;
        this.ctx.beginPath(); this.ctx.arc(o.x, o.y, o.radius * 2, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }

    // Powerups
    for (const p of this.powerUps) {
        if (p.life < 120 && p.life % 20 < 10) continue; // blink before expiry
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        this.ctx.globalAlpha = 0.3;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        // Symbol inside
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let symbol = p.powerType === 'health' ? '+' : p.powerType === 'rapid' ? 'R' : 'S';
        this.ctx.fillText(symbol, p.x, p.y);
    }

    // Projectiles
    this.ctx.globalCompositeOperation = 'lighter';
    for (const p of this.projectiles) {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.globalAlpha = 0.2;
        this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius * 6, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
    this.ctx.globalCompositeOperation = 'source-over';

    // Enemies
    for (const e of this.enemies) {
        this.ctx.save();
        this.ctx.translate(e.x, e.y);
        
        // Name & Level
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Lv.${e.level || 1} ${e.name || 'Enemy'}`, 0, -e.radius - 18);

        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(-15, -e.radius - 12, 30, 3);
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(-15, -e.radius - 12, 30 * (e.hp / e.maxHp), 3);
        
        this.ctx.rotate(Math.atan2(this.player.y - e.y, this.player.x - e.x));
        this.ctx.strokeStyle = e.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        if (e.type === 1) { // Shooter
            this.ctx.moveTo(e.radius, 0);
            this.ctx.lineTo(-e.radius, -e.radius);
            this.ctx.lineTo(-e.radius, e.radius);
        } else { // Chaser
            for (let k = 0; k < 4; k++) {
                this.ctx.lineTo(e.radius * Math.cos(k * Math.PI / 2), e.radius * Math.sin(k * Math.PI / 2));
            }
        }
        this.ctx.closePath();
        
        // Fast glow
        this.ctx.fillStyle = e.color;
        this.ctx.globalAlpha = 0.2;
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
    }

    // Pointer to nearest planet
    if (this.nearestPlanet) {
        const distToPlanet = Math.hypot(this.player.x - this.nearestPlanet.x, this.player.y - this.nearestPlanet.y);
        if (distToPlanet > this.width / 2) {
            const angleToPlanet = Math.atan2(this.nearestPlanet.y - this.player.y, this.nearestPlanet.x - this.player.x);
            const ptrX = camX + this.width / 2 + Math.cos(angleToPlanet) * (Math.min(this.width, this.height) / 2 - 40);
            const ptrY = camY + this.height / 2 + Math.sin(angleToPlanet) * (Math.min(this.width, this.height) / 2 - 40);
            
            this.ctx.save();
            this.ctx.translate(ptrX, ptrY);
            this.ctx.rotate(angleToPlanet);
            this.ctx.fillStyle = this.nearestPlanet.color;
            this.ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 200) * 0.3; // pulsating
            this.ctx.beginPath();
            this.ctx.moveTo(10, 0);
            this.ctx.lineTo(-10, -8);
            this.ctx.lineTo(-6, 0);
            this.ctx.lineTo(-10, 8);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    // Draw online players
    for (const id in this.onlinePlayers) {
        const op = this.onlinePlayers[id];
        this.ctx.save();
        this.ctx.translate(op.x, op.y);
        
        // Name tag
        this.ctx.fillStyle = op.color || '#fff';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Lv.${op.level || 1} ${op.username}`, 0, -20);
        
        this.ctx.rotate(op.angle || 0);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.radius + 5, 0);
        this.ctx.lineTo(-this.player.radius, -this.player.radius * 0.8);
        this.ctx.lineTo(-this.player.radius * 0.4, 0);
        this.ctx.lineTo(-this.player.radius, this.player.radius * 0.8);
        this.ctx.closePath();
        
        this.ctx.globalAlpha = 0.4;
        this.ctx.fillStyle = op.color || '#22d3ee';
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        this.ctx.strokeStyle = op.color || '#22d3ee';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = '#020617';
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    // Player
    this.ctx.save();
    this.ctx.translate(this.player.x, this.player.y);
    
    // Invincible Aura
    if (this.player.invincibleTimer > 0) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.player.radius + 15 + Math.sin(Date.now() / 100) * 5, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(96, 165, 250, ${Math.min(0.5, this.player.invincibleTimer / 60)})`;
        this.ctx.fill();
        this.ctx.strokeStyle = '#60a5fa';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    // Player Name
    this.ctx.fillStyle = this.player.color;
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Lv.${this.player.level} ${this.player.username}`, 0, -20);
    
    // Player HUD (Health bar)
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    this.ctx.fillRect(-20, this.player.radius + 15, 40, 4);
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.fillRect(-20, this.player.radius + 15, 40 * (Math.max(0, this.player.hp) / this.player.maxHp), 4);

    this.ctx.rotate(this.player.angle);
    this.ctx.strokeStyle = '#22d3ee'; // cyan-400
    this.ctx.lineWidth = 2;
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.radius + 5, 0);
    this.ctx.lineTo(-this.player.radius, -this.player.radius * 0.8);
    this.ctx.lineTo(-this.player.radius * 0.4, 0);
    this.ctx.lineTo(-this.player.radius, this.player.radius * 0.8);
    this.ctx.closePath();
    
    // Fast glow
    this.ctx.globalAlpha = this.player.boostTimer > 0 ? 0.8 : 0.4;
    this.ctx.fillStyle = this.player.boostTimer > 0 ? '#f8fafc' : '#22d3ee';
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
    
    this.ctx.fillStyle = this.player.boostTimer > 0 ? '#22d3ee' : '#020617';
    this.ctx.fill();
    this.ctx.stroke();
    
    // Thrust
    if (this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d'] || this.keys['arrowup'] || this.keys['arrowdown'] || this.keys['arrowleft'] || this.keys['arrowright']) {
        this.ctx.beginPath();
        this.ctx.moveTo(-this.player.radius * 0.5, 0);
        this.ctx.lineTo(-this.player.radius * 1.8 - Math.random() * 8, 0);
        this.ctx.strokeStyle = '#f97316'; // orange-500
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }
    this.ctx.restore();
    
    // Magnet Ring
    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.magnetRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    for (const ft of this.floatingTexts) {
        const progress = 1 - (ft.life / ft.maxLife);
        this.ctx.globalAlpha = ft.life / ft.maxLife;
        this.ctx.fillStyle = ft.color;
        
        let scale = 1;
        if (progress < 0.2) scale = 1 + Math.sin(progress * Math.PI * 5) * 0.5;

        this.ctx.font = `bold ${Math.floor(14 * scale)}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(ft.text, ft.x, ft.y);
    }
    this.ctx.globalAlpha = 1;

    // Custom crosshair
    const worldMouseX = this.mouse.x + camX;
    const worldMouseY = this.mouse.y + camY;
    
    this.ctx.save();
    this.ctx.translate(worldMouseX, worldMouseY);
    this.ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)'; // cyan-400
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(-15, 0); this.ctx.lineTo(-5, 0);
    this.ctx.moveTo(15, 0); this.ctx.lineTo(5, 0);
    this.ctx.moveTo(0, -15); this.ctx.lineTo(0, -5);
    this.ctx.moveTo(0, 15); this.ctx.lineTo(0, 5);
    this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.restore();

    // Vignette
    const gradient = this.ctx.createRadialGradient(
        this.width / 2, this.height / 2, this.height * 0.4,
        this.width / 2, this.height / 2, this.height * 0.8
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    this.ctx.fillStyle = gradient;
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalCompositeOperation = 'source-over';

    if (this.combo > 1) {
        this.ctx.fillStyle = '#fcd34d';
        this.ctx.font = 'bold 24px sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${this.combo}x COMBO`, this.width - 20, 40);
        
        this.ctx.fillStyle = 'rgba(252, 211, 77, 0.3)';
        this.ctx.fillRect(this.width - 220, 50, 200, 4);
        this.ctx.fillStyle = '#fcd34d';
        this.ctx.fillRect(this.width - 220, 50, 200 * (this.comboTimer / 180), 4);
    }

    this.drawMinimap(camX, camY);
  }

  drawMinimap(camX: number, camY: number) {
      const showFullMap = this.keys['m'];
      const size = showFullMap ? Math.min(this.width, this.height) * 0.8 : 180;
      const margin = 20;
      
      let x, y;
      if (showFullMap) {
          x = (this.width - size) / 2;
          y = (this.height - size) / 2;
      } else {
          x = this.width - size - margin;
          y = margin + 100; // Moved to top-right below the Score/Hostile UI, avoiding bottom-right overlap
      }

      this.ctx.fillStyle = showFullMap ? 'rgba(15, 23, 42, 0.85)' : 'rgba(15, 23, 42, 0.6)'; 
      this.ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
      this.ctx.lineWidth = showFullMap ? 3 : 1;
      this.ctx.fillRect(x, y, size, size);
      this.ctx.strokeRect(x, y, size, size);

      const scale = size / this.arenaSize;

      // Bases (Main base in center)
      this.ctx.fillStyle = '#0f172a'; // dark background for base
      this.ctx.strokeStyle = '#38bdf8'; // light blue outline
      this.ctx.lineWidth = showFullMap ? 2 : 1;
      this.ctx.beginPath();
      this.ctx.arc(x + (this.arenaSize / 2) * scale, y + (this.arenaSize / 2) * scale, Math.max(3, 400 * scale), 0, Math.PI*2);
      this.ctx.fill();
      this.ctx.stroke();
      if (showFullMap) {
          this.ctx.fillStyle = '#38bdf8';
          this.ctx.textAlign = 'center';
          this.ctx.font = '12px monospace';
          this.ctx.fillText("MAIN BASE", x + (this.arenaSize / 2) * scale, y + (this.arenaSize / 2) * scale + 600 * scale);
      }

      // Planets
      for (const p of this.planets) {
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = 0.6;
          this.ctx.beginPath();
          this.ctx.arc(x + p.x * scale, y + p.y * scale, Math.max(1, p.radius * scale), 0, Math.PI*2);
          this.ctx.fill();
          
          if (showFullMap) {
              this.ctx.globalAlpha = 1;
              this.ctx.fillStyle = '#f8fafc';
              this.ctx.font = '10px sans-serif';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(p.name, x + p.x * scale, y + p.y * scale - p.radius * scale - 5);
          }
      }
      this.ctx.globalAlpha = 1;

      // Player
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(x + this.player.x * scale, y + this.player.y * scale, showFullMap ? 4 : 2, 0, Math.PI*2);
      this.ctx.fill();
      
      // Viewport rectangle
      this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + camX * scale, y + camY * scale, this.width * scale, this.height * scale);
  }
}
