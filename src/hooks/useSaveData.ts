import { useState, useEffect } from 'react';
import { PlayerSave } from '../types';
import { setMute } from '../lib/audio';

export const DEFAULT_SAVE: PlayerSave = {
  level: 1,
  xp: 0,
  skillPoints: 0,
  skills: { damage: 0, fireRate: 0, speed: 0, maxHp: 0, magnet: 0, crit: 0 },
  unlockedWeapons: ['plasma', 'missile'],
  unlockedHulls: ['fighter'],
  loadout: { primary: 'plasma', secondary: 'missile', hull: 'fighter' },
  highestWave: 0,
  scraps: 0,
  invincibleKeybind: '1',
  nukeKeybind: '2',
  muteAudio: false
};

export function useSaveData() {
  const [save, setSave] = useState<PlayerSave>(() => {
    try {
      const stored = localStorage.getItem('neon_nexus_remaster_save');
      const loaded = stored ? { ...DEFAULT_SAVE, ...JSON.parse(stored) } : DEFAULT_SAVE;
      setMute(!!loaded.muteAudio);
      return loaded;
    } catch (e) {
      return DEFAULT_SAVE;
    }
  });

  useEffect(() => {
    localStorage.setItem('neon_nexus_remaster_save', JSON.stringify(save));
  }, [save]);

  const updateSave = (updates: Partial<PlayerSave> | ((prev: PlayerSave) => PlayerSave)) => {
    setSave(prev => {
      const newSave = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      if (newSave.muteAudio !== undefined) {
         setMute(newSave.muteAudio);
      }
      return newSave;
    });
  };

  const addXp = (amount: number) => {
    setSave(prev => {
      let { xp, level, skillPoints } = prev;
      xp += amount;
      let required = getXpRequired(level);
      while (xp >= required) {
        xp -= required;
        level++;
        skillPoints++;
        required = getXpRequired(level);
      }
      return { ...prev, xp, level, skillPoints };
    });
  };

  return { save, updateSave, addXp, reset: () => setSave(DEFAULT_SAVE) };
}

export function getXpRequired(level: number) {
  return level * 100 + Math.floor(Math.pow(level, 1.5) * 50);
}
