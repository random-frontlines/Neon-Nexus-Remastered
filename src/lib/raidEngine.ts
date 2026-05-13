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
  name?: string;
  level?: number;
  dashTimer?: number;
  spawnTimer?: number;
  mineTimer?: number;
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

export class RaidEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  saveData: PlayerSave;
  onGameOver: (score: number, wave: number, xpGained: number) => void;
  onUpdateState: (state: any) => void;
  onDock?: () => void;
  
  width: number = 0;
  height: number = 0;
  arenaSize: number = 10000;
  
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
  
  // Raid Phase control
  raidPhase: 'EXTERIOR' | 'INTERIOR' | 'EXTRACTION' = 'EXTERIOR';
  enemiesToKill: number = 30;
  timeToExtract: number = 60;
  
  // Custom Enemy Configs
  enemyDefs: Record<number, any> = {
      0: { name: 'Chaser', color: '#d946ef', radius: 14, hpMult: 1, speedMult: 1, xpMult: 1, type: 0 },
      1: { name: 'Shooter', color: '#ef4444', radius: 16, hpMult: 1.2, speedMult: 0.8, xpMult: 1.5, type: 1, shootTimer: 120 },
      2: { name: 'Tank', color: '#3b82f6', radius: 24, hpMult: 4, speedMult: 0.5, xpMult: 2.5, type: 2 },
      3: { name: 'Dasher', color: '#eab308', radius: 12, hpMult: 0.8, speedMult: 1.8, xpMult: 1.5, type: 3 },
      4: { name: 'Splitter', color: '#22c55e', radius: 20, hpMult: 2, speedMult: 0.7, xpMult: 2, type: 4 },
      5: { name: 'Sniper', color: '#06b6d4', radius: 14, hpMult: 1.5, speedMult: 0.9, xpMult: 3, type: 5, shootTimer: 180 },
      6: { name: 'Pulsar', color: '#8b5cf6', radius: 18, hpMult: 2.5, speedMult: 0.6, xpMult: 3, type: 6 },
      7: { name: 'Swarm Queen', color: '#f97316', radius: 28, hpMult: 3.5, speedMult: 0.4, xpMult: 4, type: 7, spawnTimer: 300 },
      8: { name: 'Juggernaut', color: '#be123c', radius: 32, hpMult: 8, speedMult: 0.3, xpMult: 6, type: 8, shootTimer: 180 },
      9: { name: 'Mine Layer', color: '#f8fafc', radius: 16, hpMult: 1.5, speedMult: 0.8, xpMult: 2, type: 9, mineTimer: 200 }
  };
  
  isInsideBase: boolean = false;
  loots: (Entity & { type: 'scrap' | 'data' })[] = [];
  inventory = { scraps: 0, data: 0 };
  
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
    powerUpType: '' as 'rapid' | 'spread' | ''
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

  reactStateTimer: number = 0;

  activeRaid: any;

  constructor(
    canvas: HTMLCanvasElement, 
    saveData: PlayerSave, 
    onUpdateState: (state: any) => void,
    onGameOver: (score: number, wave: number, xpGained: number) => void,
    onDock?: () => void,
    activeRaid?: any
  ) {
    this.activeRaid = activeRaid;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false }); // optimize
    if (!ctx) throw new Error('Canvas 2D context not found');
    this.ctx = ctx;
    this.saveData = saveData;
    this.onUpdateState = onUpdateState;
    this.onGameOver = onGameOver;
    this.onDock = onDock;
    
    this.resize();
    window.addEventListener('resize', this.resize);
    
    this.initPlanets();
    this.initPlayer();
    this.initStars();
    
    this.setupInputs();
  }

  resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  };

  initPlanets() {
      this.planets = [];
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
    this.player.damageMult = permaDamageMult; 
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
    
    // Start at edge for Raid
    this.player.x = 500;
    this.player.y = 500;

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
      } else if (e.code === 'KeyF') {
          if (this.raidPhase === 'INTERIOR') {
              if (!this.isInsideBase) {
                  const distToBase = Math.hypot(this.player.x - this.arenaSize / 2, this.player.y - this.arenaSize / 2);
                  if (distToBase < 400) {
                      this.enterBase();
                  }
              } else {
                  this.leaveBase();
              }
          }
      }
  };
  handleKeyUp = (e: KeyboardEvent) => { this.keys[e.key.toLowerCase()] = false; };
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
      this.onUpdateState({
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          score: this.score,
          enemiesLeft: this.enemiesToKill,
          raidPhase: this.raidPhase,
          timeToExtract: this.timeToExtract,
          isInsideBase: this.isInsideBase,
          inventory: this.inventory
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
    this.updateLoots(dt);
    this.updatePowerUps(dt);
    this.updateFloatingTexts(dt);
    
    if (this.raidPhase === 'INTERIOR' && !this.isInsideBase) {
        const distToBase = Math.hypot(this.player.x - this.arenaSize / 2, this.player.y - this.arenaSize / 2);
        if (distToBase < 400 && this.spawnTimer < 0 && Math.floor(this.timeToExtract % 2) === 0) {
            // Blink text or something? Actually let's just show text in React state
        }
    }
    
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

              if (e.type === 4) { // Splitter dies
                  for (let s = 0; s < 3; s++) {
                      this.createEnemy(e.x + (Math.random()-0.5)*30, e.y + (Math.random()-0.5)*30, 0); // Spawn Chasers
                  }
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
              if (this.raidPhase === 'EXTERIOR') {
                 this.enemiesToKill--;
                 if (this.enemiesToKill <= 0) {
                     this.raidPhase = 'INTERIOR';
                 }
              }
              this.updateReactState();
              continue;
          }
          
          // Despawn if too far from player
          const distToPlayer = Math.hypot(this.player.x - e.x, this.player.y - e.y);
          if (distToPlayer > 5000) {
              this.enemies.splice(i, 1);
              continue;
          }

          if (distToPlayer < 1500) {
              e.aggro = true;
          } else {
              e.aggro = false;
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
                          radius: 3, color: e.color, life: 100, isEnemy: true, damage: 15 + (e.level || 1) * 2, hitList: []
                      });
                  }
              } else if (e.type === 3) { // Dasher
                  if (e.dashTimer === undefined) e.dashTimer = 0;
                  e.dashTimer -= dt * 60;
                  if (e.dashTimer <= 0 && distToPlayer < 400) {
                      e.dashTimer = 150;
                      e.vx = Math.cos(angleToPlayer) * e.speed * 8;
                      e.vy = Math.sin(angleToPlayer) * e.speed * 8;
                  }
                  if (e.dashTimer > 130) {
                      e.x += e.vx * dt * 60;
                      e.y += e.vy * dt * 60;
                  } else {
                      e.x += Math.cos(angleToPlayer) * e.speed * dt * 60;
                      e.y += Math.sin(angleToPlayer) * e.speed * dt * 60;
                  }
              } else if (e.type === 5) { // Sniper
                  if (distToPlayer < 500) {
                      e.x -= Math.cos(angleToPlayer) * e.speed * dt * 60;
                      e.y -= Math.sin(angleToPlayer) * e.speed * dt * 60;
                  } else if (distToPlayer > 800) {
                      e.x += Math.cos(angleToPlayer) * e.speed * dt * 60;
                      e.y += Math.sin(angleToPlayer) * e.speed * dt * 60;
                  }
                  e.shootTimer -= dt * 60;
                  if (e.shootTimer <= 0 && distToPlayer < 1000) {
                      e.shootTimer = 180;
                      this.projectiles.push({
                          id: this.entityIdCounter++, x: e.x, y: e.y,
                          vx: Math.cos(angleToPlayer) * 12 + e.vx, 
                          vy: Math.sin(angleToPlayer) * 12 + e.vy,
                          radius: 4, color: e.color, life: 150, isEnemy: true, damage: 30 + (e.level || 1) * 3, hitList: []
                      });
                  }
              } else if (e.type === 6) { // Pulsar
                  e.x += Math.cos(angleToPlayer) * e.speed * dt * 60;
                  e.y += Math.sin(angleToPlayer) * e.speed * dt * 60;
                  if (e.shootTimer === undefined) e.shootTimer = 0;
                  e.shootTimer -= dt * 60;
                  if (e.shootTimer <= 0 && distToPlayer < 300) {
                      e.shootTimer = 100;
                      this.createExplosion(e.x, e.y, e.color, 40);
                      if (distToPlayer < 150) {
                          const dmg = Math.max(1, (30 + (e.level || 1) * 5) - (this.saveData.bonusArmor || 0) * 2);
                          this.player.hp -= dmg;
                          this.hitStopTimer = 5;
                          this.screenShake = Math.max(this.screenShake, 10);
                          if (this.player.hp <= 0) {
                              this.updateReactState();
                              this.handleGameOver();
                              return;
                          }
                      }
                  }
              } else if (e.type === 7) { // Swarm Queen
                  if (distToPlayer > 500) {
                      e.x += Math.cos(angleToPlayer) * e.speed * dt * 60;
                      e.y += Math.sin(angleToPlayer) * e.speed * dt * 60;
                  }
                  if (e.spawnTimer === undefined) e.spawnTimer = 0;
                  e.spawnTimer -= dt * 60;
                  if (e.spawnTimer <= 0) {
                      e.spawnTimer = 300;
                      this.createEnemy(e.x + 30, e.y, 0);
                      this.createEnemy(e.x - 30, e.y, 0);
                  }
              } else if (e.type === 8) { // Juggernaut
                  e.x += Math.cos(angleToPlayer) * e.speed * dt * 60;
                  e.y += Math.sin(angleToPlayer) * e.speed * dt * 60;
                  e.shootTimer -= dt * 60;
                  if (e.shootTimer <= 0 && distToPlayer < 800) {
                      e.shootTimer = 180;
                      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                          this.projectiles.push({
                              id: this.entityIdCounter++, x: e.x, y: e.y,
                              vx: Math.cos(a) * 5, vy: Math.sin(a) * 5,
                              radius: 5, color: e.color, life: 120, isEnemy: true, damage: 20 + (e.level || 1) * 2, hitList: []
                          });
                      }
                  }
              } else if (e.type === 9) { // MineLayer
                  e.x += Math.cos(angleToPlayer) * e.speed * dt * 60;
                  e.y += Math.sin(angleToPlayer) * e.speed * dt * 60;
                  if (e.mineTimer === undefined) e.mineTimer = 0;
                  e.mineTimer -= dt * 60;
                  if (e.mineTimer <= 0) {
                      e.mineTimer = 200;
                      this.projectiles.push({
                          id: this.entityIdCounter++, x: e.x, y: e.y,
                          vx: 0, vy: 0,
                          radius: 8, color: '#ef4444', life: 600, isEnemy: true, damage: 40 + (e.level || 1) * 4, hitList: []
                      });
                  }
              } else { // Chaser & Tank
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
                  if (e.hp <= 0 && this.player.vampire > 0) {
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
      if (this.raidPhase === 'EXTERIOR') {
          // Keep spawning up to what we need to kill, capped at 30
          const needed = Math.min(30, this.enemiesToKill - this.enemies.length);
          if (needed > 0) {
              this.spawnTimer -= dt * 60;
              if (this.spawnTimer <= 0) {
                 this.spawnTimer = 20; // 1/3 second
                 let angle = Math.random() * Math.PI * 2;
                 let dist = 300 + Math.random() * 800; // closer to the base
                 let x = this.arenaSize / 2 + Math.cos(angle) * dist;
                 let y = this.arenaSize / 2 + Math.sin(angle) * dist;
                 this.createEnemy(x, y);
                 this.updateReactState();
              }
          }
      } else if (this.raidPhase === 'EXTRACTION') {
          this.timeToExtract -= dt;
          if (this.timeToExtract <= 0) {
              // Win!
              this.isRunning = false;
              if (this.onGameOver) this.onGameOver(1000, 1, this.xpGained); // Extra reward
              return;
          }
          
          if (this.enemies.length < 50) {
              this.spawnTimer -= dt * 60;
              if (this.spawnTimer <= 0) {
                  this.spawnTimer = 20; // Fast spawns
                  let angle = Math.random() * Math.PI * 2;
                  let dist = this.width / 2 + Math.random() * 500;
                  let x = Math.max(50, Math.min(this.arenaSize - 50, this.player.x + Math.cos(angle) * dist));
                  let y = Math.max(50, Math.min(this.arenaSize - 50, this.player.y + Math.sin(angle) * dist));
                  
                  this.createEnemy(x, y);
                  this.updateReactState();
              }
          }
      }
      this.updateReactState();
  }
  
  enterBase() {
      this.isInsideBase = true;
      // Move player far away
      this.player.x = 50000;
      this.player.y = 50000;
      this.player.vx = 0;
      this.player.vy = 0;
      this.enemies = [];
      this.xpOrbs = [];
      this.powerUps = [];
      this.particles = [];
      this.projectiles = [];
      // Spawn loot inside
      for (let i = 0; i < 40; i++) {
          this.loots.push({
              id: this.entityIdCounter++,
              x: 50000 + (Math.random() - 0.5) * 1500,
              y: 50000 + (Math.random() - 0.5) * 1500,
              vx: 0, vy: 0,
              radius: 6,
              color: '#fbbf24', // Scrap
              type: 'scrap'
          });
      }
      for (let i = 0; i < 5; i++) {
          this.loots.push({
              id: this.entityIdCounter++,
              x: 50000 + (Math.random() - 0.5) * 1500,
              y: 50000 + (Math.random() - 0.5) * 1500,
              vx: 0, vy: 0,
              radius: 8,
              color: '#8b5cf6', // Data
              type: 'data'
          });
      }
      // Add small resistance
      for (let i = 0; i < 20; i++) {
         let angle = Math.random() * Math.PI * 2;
         let dist = 200 + Math.random() * 800;
         let x = 50000 + Math.cos(angle) * dist;
         let y = 50000 + Math.sin(angle) * dist;
         this.createEnemy(x, y);
      }
      this.updateReactState();
  }

  leaveBase() {
      this.isInsideBase = false;
      this.raidPhase = 'EXTRACTION';
      this.timeToExtract = 60; // reset extraction timer
      this.player.x = this.arenaSize / 2;
      this.player.y = this.arenaSize / 2 + 500;
      this.player.vx = 0;
      this.player.vy = 0;
      this.enemies = []; // clear indoor enemies
      this.updateReactState();
  }

  updateLoots(dt: number) {
      for (let i = this.loots.length - 1; i >= 0; i--) {
          const loot = this.loots[i];
          const dist = Math.hypot(this.player.x - loot.x, this.player.y - loot.y);
          
          if (dist < this.player.magnetRadius) {
              const angle = Math.atan2(this.player.y - loot.y, this.player.x - loot.x);
              loot.vx += Math.cos(angle) * 20 * dt;
              loot.vy += Math.sin(angle) * 20 * dt;
          }
          
          loot.x += loot.vx;
          loot.y += loot.vy;
          loot.vx *= 0.9;
          loot.vy *= 0.9;
          
          if (dist < this.player.radius + loot.radius) {
              if (loot.type === 'scrap') {
                  this.inventory.scraps += 1;
              } else {
                  this.inventory.data += 1;
              }
              this.score += (loot.type === 'data' ? 50 : 10);
              this.audioPickup();
              this.loots.splice(i, 1);
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

  createEnemy(x: number, y: number, specificType?: number) {
      let difficulty = this.activeRaid?.difficulty || 1;
      const prestigeLvl = this.saveData.prestige || 0;
      let level = Math.max(1, difficulty + Math.floor(Math.random() * 3) - 1) + (prestigeLvl * 5);
      
      let typeList = [0];
      if (difficulty >= 2) typeList.push(1);
      if (difficulty >= 3) typeList.push(2);
      if (difficulty >= 4) typeList.push(3);
      if (difficulty >= 5) typeList.push(4);
      if (difficulty >= 6) typeList.push(5);
      if (difficulty >= 7) typeList.push(6);
      if (difficulty >= 8) typeList.push(7);
      if (difficulty >= 9) typeList.push(8);
      if (difficulty >= 10) typeList.push(9);
      
      let chosenType = specificType !== undefined ? specificType : typeList[Math.floor(Math.random() * typeList.length)];
      
      let def = this.enemyDefs[chosenType];
      let baseHp = (this.raidPhase === 'EXTERIOR' ? 80 : 50) + (10 * level * def.hpMult);
      let baseSpeed = 2.5 * def.speedMult;
      let baseXp = 5 * level * def.xpMult * (1 + prestigeLvl);
      
      this.enemies.push({
          id: this.entityIdCounter++, x, y,
          vx: 0, vy: 0,
          radius: def.radius, color: def.color,
          type: chosenType,
          hp: baseHp, maxHp: baseHp,
          speed: baseSpeed, xpValue: baseXp,
          shootTimer: def.shootTimer || 0,
          aggro: true, name: def.name, level: level,
          dashTimer: 0, spawnTimer: def.spawnTimer || 0, mineTimer: def.mineTimer || 0
      });
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
    
    // Draw Background Grid (Neon Wireframe aesthetic/Floor)
    if (this.isInsideBase) {
        this.ctx.fillStyle = '#1e1b4b'; // deep purple/indigo background for interior
        this.ctx.fillRect(camX, camY, this.width, this.height);
        this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)'; // violet grid
        this.ctx.lineWidth = 2;
    } else {
        this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
        this.ctx.lineWidth = 1;
    }
    
    this.ctx.beginPath();
    const gridStep = this.isInsideBase ? 80 : 150;
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
    if (!this.isInsideBase) {
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
    }

    // Draw Enemy Main Base
    const baseX = this.arenaSize / 2;
    const baseY = this.arenaSize / 2;
    if (!this.isInsideBase && baseX + 1000 > camX && baseX - 1000 < camX + this.width &&
        baseY + 1000 > camY && baseY - 1000 < camY + this.height) {
        
        this.ctx.save();
        this.ctx.translate(baseX, baseY);
        
        // Base Aura
        const baseGrad = this.ctx.createRadialGradient(0, 0, 200, 0, 0, 800);
        baseGrad.addColorStop(0, 'rgba(244, 63, 94, 0.2)'); // rose-500
        baseGrad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = baseGrad;
        this.ctx.beginPath(); this.ctx.arc(0, 0, 800, 0, Math.PI * 2); this.ctx.fill();

        // Rotating outer spiked ring
        this.ctx.rotate(performance.now() * 0.0001);
        this.ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        this.ctx.lineWidth = 4;
        
        this.ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI / 6) * i;
            const radius = i % 2 === 0 ? 450 : 350;
            if (i === 0) this.ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            else this.ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        this.ctx.closePath();
        this.ctx.stroke();

        // Warning inner ring
        this.ctx.rotate(-performance.now() * 0.0003);
        this.ctx.strokeStyle = 'rgba(217, 70, 239, 0.5)'; // fuchsia-500
        this.ctx.lineWidth = 8;
        this.ctx.setLineDash([30, 30]);
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 280, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Core structure
        this.ctx.rotate(performance.now() * 0.0001);
        this.ctx.fillStyle = '#0f172a'; // slate-900
        this.ctx.strokeStyle = '#f43f5e'; // rose-500
        this.ctx.lineWidth = 6;
        
        // Octagon core
        this.ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI / 4) * i;
            if (i === 0) this.ctx.moveTo(Math.cos(a) * 200, Math.sin(a) * 200);
            else this.ctx.lineTo(Math.cos(a) * 200, Math.sin(a) * 200);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Central hub
        const pulse = Math.sin(performance.now() * 0.005) * 10 + 40;
        this.ctx.fillStyle = '#f43f5e';
        this.ctx.beginPath(); this.ctx.arc(0, 0, pulse, 0, Math.PI * 2); this.ctx.fill();

        this.ctx.restore();
        
        // Floating text
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.font = 'bold 36px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("ENEMY FORTRESS", baseX, baseY - 450);
        this.ctx.font = '14px monospace';
        this.ctx.fillStyle = '#f43f5e';
        this.ctx.fillText("RESTRICTED AREA", baseX, baseY - 420);
    }

    // Draw Planets
    if (!this.isInsideBase) {
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

    // Loots
    for (const o of this.loots) {
        this.ctx.fillStyle = o.color;
        if (o.type === 'data') {
            this.ctx.fillRect(o.x - o.radius, o.y - o.radius, o.radius * 2, o.radius * 2);
            this.ctx.strokeStyle = '#fff';
            this.ctx.strokeRect(o.x - o.radius, o.y - o.radius, o.radius * 2, o.radius * 2);
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(o.x, o.y - o.radius);
            this.ctx.lineTo(o.x + o.radius, o.y);
            this.ctx.lineTo(o.x, o.y + o.radius);
            this.ctx.lineTo(o.x - o.radius, o.y);
            this.ctx.fill();
        }
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
        
        if (e.type === 1) { // Shooter - Triangle
            this.ctx.moveTo(e.radius, 0);
            this.ctx.lineTo(-e.radius, -e.radius);
            this.ctx.lineTo(-e.radius, e.radius);
        } else if (e.type === 2 || e.type === 8) { // Tank, Juggernaut - Square
            this.ctx.rect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
        } else if (e.type === 3) { // Dasher - Diamond
            this.ctx.moveTo(e.radius, 0);
            this.ctx.lineTo(0, e.radius);
            this.ctx.lineTo(-e.radius, 0);
            this.ctx.lineTo(0, -e.radius);
        } else if (e.type === 4 || e.type === 7) { // Splitter, Swarm Queen - Pentagon/Octagon
            let sides = e.type === 7 ? 8 : 5;
            for (let k = 0; k < sides; k++) {
                this.ctx.lineTo(e.radius * Math.cos(k * Math.PI * 2 / sides), e.radius * Math.sin(k * Math.PI * 2 / sides));
            }
        } else if (e.type === 5) { // Sniper - Hexagon
            for (let k = 0; k < 6; k++) {
                this.ctx.lineTo(e.radius * Math.cos(k * Math.PI / 3), e.radius * Math.sin(k * Math.PI / 3));
            }
        } else if (e.type === 6) { // Pulsar - Star
            for (let k = 0; k < 10; k++) {
                let r = k % 2 === 0 ? e.radius : e.radius * 0.4;
                this.ctx.lineTo(r * Math.cos(k * Math.PI / 5), r * Math.sin(k * Math.PI / 5));
            }
        } else if (e.type === 9) { // MineLayer - Cross
            this.ctx.moveTo(e.radius, e.radius/3);
            this.ctx.lineTo(e.radius/3, e.radius/3);
            this.ctx.lineTo(e.radius/3, e.radius);
            this.ctx.lineTo(-e.radius/3, e.radius);
            this.ctx.lineTo(-e.radius/3, e.radius/3);
            this.ctx.lineTo(-e.radius, e.radius/3);
            this.ctx.lineTo(-e.radius, -e.radius/3);
            this.ctx.lineTo(-e.radius/3, -e.radius/3);
            this.ctx.lineTo(-e.radius/3, -e.radius);
            this.ctx.lineTo(e.radius/3, -e.radius);
            this.ctx.lineTo(e.radius/3, -e.radius/3);
            this.ctx.lineTo(e.radius, -e.radius/3);
        } else { // Chaser & default
            for (let k = 0; k < 4; k++) {
                this.ctx.lineTo(e.radius * Math.cos(k * Math.PI / 2 + Math.PI/4), e.radius * Math.sin(k * Math.PI / 2 + Math.PI/4));
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
