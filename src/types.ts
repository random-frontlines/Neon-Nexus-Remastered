export type Screen = 'MENU' | 'HANGAR' | 'SKILLS' | 'GAME' | 'GAMEOVER' | 'DOCK' | 'RAID_MENU' | 'RAID_GAME';

export interface PlayerSave {
  level: number;
  xp: number;
  prestige?: number;
  skillPoints: number;
  skills: Record<string, number>;
  unlockedWeapons: string[];
  unlockedHulls: string[];
  loadout: {
    primary: string;
    secondary: string;
    hull: string;
  };
  highestWave: number;
  scraps: number;
  secretData?: number;
  tokens?: number;
  bonusArmor?: number;
  bonusDamage?: number;
  bonusSpeed?: number;
  invincibleKeybind?: string;
  nukeKeybind?: string;
  muteAudio?: boolean;
}

export interface GameResult {
  wave: number;
  xpGained: number;
  score: number;
}
