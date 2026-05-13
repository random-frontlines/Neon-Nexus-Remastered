export const WEAPONS: Record<string, any> = {
  plasma: { id: 'plasma', name: 'Plasma Blaster', type: 'primary', damage: 10, fireRate: 10, speed: 15, cost: 0, desc: 'Reliable fast-firing blaster.' },
  scatter: { id: 'scatter', name: 'Scatter Gun', type: 'primary', damage: 6, fireRate: 25, speed: 12, count: 3, spread: 0.25, cost: 500, desc: 'Fires 3 projectiles in a spread.' },
  minigun: { id: 'minigun', name: 'Vulcan Minigun', type: 'primary', damage: 4, fireRate: 3, speed: 18, cost: 750, desc: 'Extreme fire rate, low damage per hit.' },
  railgun: { id: 'railgun', name: 'Railgun', type: 'primary', damage: 40, fireRate: 45, speed: 25, pierce: 3, cost: 1000, desc: 'High damage, piercing beam.' },
  laser: { id: 'laser', name: 'Photon Laser', type: 'primary', damage: 15, fireRate: 5, speed: 30, pierce: 1, cost: 1500, desc: 'Fast, continuous laser beam.' },
  omega: { id: 'omega', name: 'Omega Stream', type: 'primary', damage: 80, fireRate: 2, speed: 40, pierce: 99, cost: 8000, desc: 'Endgame unstoppable piercing beam of destruction.' },
  missile: { id: 'missile', name: 'Micro Missiles', type: 'secondary', damage: 15, fireRate: 60, speed: 8, homing: true, cost: 0, desc: 'Fires homing missiles towards nearest enemy.' },
  heavyMissile: { id: 'heavyMissile', name: 'Heavy Torpedo', type: 'secondary', damage: 80, fireRate: 120, speed: 5, homing: true, cost: 800, desc: 'Slow, devastating homing torpedo.' },
  swarm: { id: 'swarm', name: 'Swarm Pods', type: 'secondary', damage: 8, fireRate: 45, speed: 10, count: 5, spread: 0.5, homing: true, cost: 1200, desc: 'Fires a swarm of 5 micro-missiles.' },
  singularity: { id: 'singularity', name: 'Singularity Array', type: 'secondary', damage: 300, fireRate: 180, speed: 10, aoe: 250, cost: 10000, desc: 'Fires a massive localized black hole explosion.' }
};

export const HULLS: Record<string, any> = {
  interceptor: { id: 'interceptor', name: 'Interceptor', hp: 80, speed: 5.5, size: 10, cost: 500, desc: 'Fast, fragile, small hitbox.', color: '#0ff' },
  fighter: { id: 'fighter', name: 'Fighter', hp: 150, speed: 4, size: 14, cost: 0, desc: 'Balanced hull.', color: '#f90' },
  juggernaut: { id: 'juggernaut', name: 'Juggernaut', hp: 350, speed: 2.5, size: 20, cost: 1200, desc: 'Slow, massive health pool.', color: '#f0f' },
  paladin: { id: 'paladin', name: 'Paladin', hp: 250, speed: 4.5, size: 16, cost: 2000, desc: 'Premium durable hull with decent speed.', color: '#fbbf24' },
  ghost: { id: 'ghost', name: 'Ghost', hp: 60, speed: 6.5, size: 8, cost: 1500, desc: 'Incredibly fast and tiny, highly fragile.', color: '#94a3b8' },
  dreadnought: { id: 'dreadnought', name: 'Dreadnought', hp: 1000, speed: 3.5, size: 28, cost: 15000, desc: 'The ultimate endgame fortress ship.', color: '#ef4444' }
};

export const SKILLS: Record<string, any> = {
  magnet: { id: 'magnet', name: 'XP Magnet', maxLevel: 10, effect: 40, desc: '+40 Magnet radius.', reqs: {}, x: 50, y: 80, icon: 'Magnet' },
  regen: { id: 'regen', name: 'Auto-Repair', maxLevel: 5, effect: 0.5, desc: 'Heal +0.5 HP/sec.', reqs: {}, x: 25, y: 80, icon: 'Heart' },
  boostCooldown: { id: 'boostCooldown', name: 'Boost Cooling', maxLevel: 5, effect: 10, desc: 'Reduces Boost cooldown.', reqs: {}, x: 75, y: 80, icon: 'Wind' },
  
  dashDamage: { id: 'dashDamage', name: 'Dash Damage', maxLevel: 5, effect: 20, desc: 'Deals damage when boosting into enemies.', reqs: { boostCooldown: 2 }, x: 75, y: 60, icon: 'FastForward' },
  nova: { id: 'nova', name: 'Active Nova', maxLevel: 5, effect: 1, desc: 'Press E: Massive blast (Cooldown reduces per level)', reqs: { magnet: 3 }, x: 50, y: 60, icon: 'Sun' },
  invincible: { id: 'invincible', name: 'Invincibility', maxLevel: 5, effect: 2, desc: 'Press 1-9: Invincible for duration.', reqs: { regen: 3 }, x: 25, y: 60, icon: 'Shield' },

  vampire: { id: 'vampire', name: 'Vampirism', maxLevel: 5, effect: 0.02, desc: 'Heal 2% on kill.', reqs: { regen: 5 }, x: 25, y: 30, icon: 'Droplet' },
  nuke: { id: 'nuke', name: 'Orbital Strike', maxLevel: 1, effect: 1, desc: 'Massive blast every 60s.', reqs: { nova: 3 }, x: 50, y: 30, icon: 'Radiation' },
  chainLightning: { id: 'chainLightning', name: 'Chain Lightning', maxLevel: 5, effect: 3, desc: 'Chance to chain damage to enemies.', reqs: { dashDamage: 3 }, x: 75, y: 30, icon: 'Zap' }
};
