/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Sun, Zap, Trophy, RefreshCw, AlertTriangle, Languages } from 'lucide-react';

// --- Types & Constants ---

type Language = 'zh' | 'en';

interface Point {
  x: number;
  y: number;
}

interface GameObject {
  id: string;
  x: number;
  y: number;
}

interface EnemyRocket extends GameObject {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
  trajectoryType: 'linear' | 'parabola' | 'sine' | 'zigzag';
  curveParam: number;
}

interface InterceptorMissile extends GameObject {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
}

interface Explosion extends GameObject {
  radius: number;
  maxRadius: number;
  growing: boolean;
  alpha: number;
}

interface City extends GameObject {
  destroyed: boolean;
}

interface Turret extends GameObject {
  id: 'left' | 'middle' | 'right';
  ammo: number;
  maxAmmo: number;
  destroyed: boolean;
}

interface Coin {
  id: string;
  x: number;
  y: number;
  vy: number;
}

interface AngelMessage {
  id: string;
  text: string;
  x: number;
  y: number;
  alpha: number;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const WIN_SCORE = 5000;
const SCORE_PER_KILL = 20;
const COIN_VALUE = 100;
const UFO_COOLDOWN = 30000;
const SUN_WEAPON_COOLDOWN = 30000;

const TRANSLATIONS = {
  zh: {
    title: '地球保卫战：星际对决',
    start: '启动防御系统',
    restart: '重新部署',
    win: '地球安全了！指挥官。',
    lose: '防线失守，地球正在陷落...',
    score: '战功',
    coins: '资源',
    level: '波次',
    nextLevel: '下一波攻势',
    levelComplete: '波次清空',
    bonus: '额外奖励',
    howToPlay: '点击星空发射拦截弹，保护地球免受外星UFO侵袭。',
    victory: '大捷',
    defeat: '战败',
    targetScore: '目标战功',
    angel: '干得漂亮！',
  },
  en: {
    title: 'Earth Defense: Star Wars',
    start: 'Activate Defense',
    restart: 'Redeploy',
    win: 'Earth is safe! Commander.',
    lose: 'Defense collapsed, Earth is falling...',
    score: 'Score',
    coins: 'Coins',
    level: 'Wave',
    nextLevel: 'Next Wave',
    levelComplete: 'Wave Cleared',
    bonus: 'Bonus Points',
    howToPlay: 'Click to fire interceptors and protect Earth from alien UFOs.',
    victory: 'Victory',
    defeat: 'Defeat',
    targetScore: 'Target Score',
    angel: "Great Job!",
  }
};

// --- Game Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'win' | 'lose' | 'transition'>('menu');
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [coins, setCoinScore] = useState(0);
  const coinsTotalRef = useRef(0);
  const [level, setLevel] = useState(1);
  const levelRef = useRef(1);
  const [lang, setLang] = useState<Language>('zh');
  
  // Game entities refs
  const enemiesRef = useRef<EnemyRocket[]>([]);
  const missilesRef = useRef<InterceptorMissile[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const citiesRef = useRef<City[]>([]);
  const turretsRef = useRef<Turret[]>([]);
  const starsRef = useRef<{x: number, y: number, size: number, opacity: number}[]>([]);
  const fallingCoinsRef = useRef<Coin[]>([]);
  const angelMessagesRef = useRef<AngelMessage[]>([]);
  const ufosDestroyedRef = useRef(0);
  
  const requestRef = useRef<number>(null);
  const gameStateRef = useRef<'menu' | 'playing' | 'win' | 'lose' | 'transition'>('menu');
  const lastSpawnTime = useRef<number>(0);
  const spawnInterval = useRef<number>(2000);
  const enemiesSpawnedInLevel = useRef(0);
  const totalEnemiesInLevel = useRef(10);
  const lastUfoTimeRef = useRef<number>(0);
  const [ufoCooldownRemaining, setUfoCooldownRemaining] = useState(0);
  const [sunFlashAlpha, setSunFlashAlpha] = useState(0);
  const sunFlashAlphaRef = useRef(0);
  const sunActiveRef = useRef(false);
  const sunStartTimeRef = useRef(0);
  const ufoActiveRef = useRef<boolean>(false);
  const ufoXRef = useRef<number>(-100);

  const t = TRANSLATIONS[lang];

  // Sync gameStateRef with gameState for the loop
  useEffect(() => {
    gameStateRef.current = gameState;
    
    if (gameState === 'playing') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'e') {
          triggerSunWeapon();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [gameState]);

  const triggerSunWeapon = () => {
    const now = performance.now();
    if (lastUfoTimeRef.current !== 0 && now - lastUfoTimeRef.current < SUN_WEAPON_COOLDOWN) return;

    lastUfoTimeRef.current = now;
    sunActiveRef.current = true;
    sunStartTimeRef.current = now;
    sunFlashAlphaRef.current = 1;
    setSunFlashAlpha(1);

    // Destroy all enemies and convert to coins
    const chainExplosions: Explosion[] = [];
    enemiesRef.current.forEach(enemy => {
      scoreRef.current += SCORE_PER_KILL;
      ufosDestroyedRef.current++;
      
      // Spawn coin
      fallingCoinsRef.current.push({
        id: `coin-${enemy.id}-${Math.random()}`,
        x: enemy.x,
        y: enemy.y,
        vy: 2
      });

      // Luffy encouragement
      if (ufosDestroyedRef.current % 5 === 0) {
        angelMessagesRef.current.push({
          id: `angel-${Date.now()}`,
          text: TRANSLATIONS[lang].angel,
          x: GAME_WIDTH - 100,
          y: 150 + Math.random() * 100,
          alpha: 1
        });
      }

      chainExplosions.push({
        id: `sun-kill-${enemy.id}`,
        x: enemy.x,
        y: enemy.y,
        radius: 0,
        maxRadius: 60,
        growing: true,
        alpha: 1
      });
    });
    enemiesRef.current = [];
    explosionsRef.current.push(...chainExplosions);
    setScore(scoreRef.current);
  };

  // Cooldown timer effect
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const interval = setInterval(() => {
      const now = performance.now();
      if (lastUfoTimeRef.current === 0) {
        setUfoCooldownRemaining(0);
      } else {
        const elapsed = now - lastUfoTimeRef.current;
        const remaining = Math.max(0, Math.ceil((UFO_COOLDOWN - elapsed) / 1000));
        setUfoCooldownRemaining(remaining);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [gameState]);

  // Initialize game entities
  const startLevel = useCallback((lvl: number) => {
    levelRef.current = lvl;
    setLevel(lvl);
    enemiesSpawnedInLevel.current = 0;
    totalEnemiesInLevel.current = 10 + lvl * 5;
    
    // Replenish ammo
    turretsRef.current.forEach(t => {
      if (!t.destroyed) t.ammo = t.maxAmmo;
    });
    
    enemiesRef.current = [];
    missilesRef.current = [];
    explosionsRef.current = [];
    
    spawnInterval.current = Math.max(500, 2000 - (lvl * 100));
    lastSpawnTime.current = performance.now();
    
    setGameState('playing');
    gameStateRef.current = 'playing';
  }, []);

  const initGame = useCallback(() => {
    setScore(0);
    scoreRef.current = 0;
    setCoinScore(0);
    coinsTotalRef.current = 0;
    enemiesRef.current = [];
    missilesRef.current = [];
    explosionsRef.current = [];
    fallingCoinsRef.current = [];
    angelMessagesRef.current = [];
    ufosDestroyedRef.current = 0;
    lastUfoTimeRef.current = 0;
    
    // 6 Cities
    const cities: City[] = [];
    const citySpacing = GAME_WIDTH / 9;
    [1, 2, 3, 5, 6, 7].forEach((pos, i) => {
      cities.push({
        id: `city-${i}`,
        x: pos * citySpacing,
        y: GAME_HEIGHT - 40,
        destroyed: false
      });
    });
    citiesRef.current = cities;

    // 3 Turrets
    turretsRef.current = [
      { id: 'left', x: 40, y: GAME_HEIGHT - 60, ammo: 60, maxAmmo: 60, destroyed: false },
      { id: 'middle', x: GAME_WIDTH / 2, y: GAME_HEIGHT - 60, ammo: 120, maxAmmo: 120, destroyed: false },
      { id: 'right', x: GAME_WIDTH - 40, y: GAME_HEIGHT - 60, ammo: 60, maxAmmo: 60, destroyed: false },
    ];

    // Stars
    const stars = [];
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        size: Math.random() * 2,
        opacity: Math.random()
      });
    }
    starsRef.current = stars;

    startLevel(1);
  }, [startLevel]);

  const spawnEnemy = useCallback(() => {
    if (enemiesSpawnedInLevel.current >= totalEnemiesInLevel.current) return;

    const targets = [...citiesRef.current.filter(c => !c.destroyed), ...turretsRef.current.filter(t => !t.destroyed)];
    if (targets.length === 0) return;

    const target = targets[Math.floor(Math.random() * targets.length)];
    const startX = Math.random() * GAME_WIDTH;
    
    const trajectoryTypes: ('linear' | 'parabola' | 'sine' | 'zigzag')[] = ['linear', 'parabola', 'sine', 'zigzag'];
    const trajectoryType = trajectoryTypes[Math.floor(Math.random() * trajectoryTypes.length)];
    let curveParam = 0;
    if (trajectoryType === 'parabola') curveParam = (Math.random() - 0.5) * 200;
    if (trajectoryType === 'sine') curveParam = 30 + Math.random() * 50;
    if (trajectoryType === 'zigzag') curveParam = 20 + Math.random() * 30;

    const newEnemy: EnemyRocket = {
      id: Math.random().toString(36).substr(2, 9),
      startX: startX,
      startY: 0,
      x: startX,
      y: 0,
      targetX: target.x,
      targetY: target.y,
      speed: 0.0004 + Math.random() * 0.0006 + (levelRef.current * 0.0002), 
      progress: 0,
      trajectoryType,
      curveParam
    };
    enemiesRef.current.push(newEnemy);
    enemiesSpawnedInLevel.current++;
  }, []);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameStateRef.current !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const targetX = (clientX - rect.left) * scaleX;
    const targetY = (clientY - rect.top) * scaleY;

    // Find nearest turret with ammo
    const availableTurrets = turretsRef.current
      .filter(t => !t.destroyed && t.ammo > 0)
      .sort((a, b) => {
        const distA = Math.hypot(a.x - targetX, a.y - targetY);
        const distB = Math.hypot(b.x - targetX, b.y - targetY);
        return distA - distB;
      });

    if (availableTurrets.length > 0) {
      const turret = availableTurrets[0];
      const shotCount = Math.min(turret.ammo, 3);
      turret.ammo -= shotCount;

      for (let i = 0; i < shotCount; i++) {
        const offset = (i - (shotCount - 1) / 2) * 20;
        missilesRef.current.push({
          id: Math.random().toString(36).substr(2, 9),
          startX: turret.x,
          startY: turret.y,
          x: turret.x,
          y: turret.y,
          targetX: targetX + offset,
          targetY: targetY,
          speed: 0.02,
          progress: 0
        });
      }
    }
  };

  const update = useCallback((time: number) => {
    if (gameStateRef.current !== 'playing') return;

    try {
      // Spawn logic
      if (time - lastSpawnTime.current > spawnInterval.current) {
        spawnEnemy();
        lastSpawnTime.current = time;
        spawnInterval.current = Math.max(400, 2000 - (levelRef.current * 150));
      }

      // Update Enemies
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        enemy.progress += enemy.speed;
        const baseX = enemy.startX + (enemy.targetX - enemy.startX) * enemy.progress;
        const baseY = enemy.startY + (enemy.targetY - enemy.startY) * enemy.progress;

        switch (enemy.trajectoryType) {
          case 'parabola':
            enemy.x = baseX + Math.sin(enemy.progress * Math.PI) * enemy.curveParam;
            enemy.y = baseY;
            break;
          case 'sine':
            enemy.x = baseX + Math.sin(enemy.progress * Math.PI * 6) * enemy.curveParam;
            enemy.y = baseY;
            break;
          case 'zigzag':
            // Triangle wave for zigzag
            const triangle = Math.abs((enemy.progress * 10 % 2) - 1) * 2 - 1;
            enemy.x = baseX + triangle * enemy.curveParam;
            enemy.y = baseY;
            break;
          case 'linear':
          default:
            enemy.x = baseX;
            enemy.y = baseY;
            break;
        }

        if (enemy.progress >= 1) {
          explosionsRef.current.push({
            id: `exp-enemy-${enemy.id}-${time}`,
            x: enemy.targetX,
            y: enemy.targetY,
            radius: 0,
            maxRadius: 40,
            growing: true,
            alpha: 1
          });

          citiesRef.current.forEach(city => {
            if (!city.destroyed && Math.abs(city.x - enemy.targetX) < 20) {
              city.destroyed = true;
            }
          });
          turretsRef.current.forEach(turret => {
            if (!turret.destroyed && Math.abs(turret.x - enemy.targetX) < 20) {
              turret.destroyed = true;
            }
          });
          return false;
        }
        return true;
      });

      // Update Missiles
      missilesRef.current = missilesRef.current.filter(missile => {
        missile.progress += missile.speed;
        missile.x = missile.startX + (missile.targetX - missile.startX) * missile.progress;
        missile.y = missile.startY + (missile.targetY - missile.startY) * missile.progress;

        if (missile.progress >= 1) {
          explosionsRef.current.push({
            id: `exp-missile-${missile.id}-${time}`,
            x: missile.targetX,
            y: missile.targetY,
            radius: 0,
            maxRadius: 100, // Doubled from 50
            growing: true,
            alpha: 1
          });
          return false;
        }
        return true;
      });

      // Update Explosions & Collisions
      const chainExplosions: Explosion[] = [];
      let scoreGained = 0;
      
      explosionsRef.current = explosionsRef.current.filter(exp => {
        if (exp.growing) {
          exp.radius += 2.5;
          if (exp.radius >= exp.maxRadius) exp.growing = false;
        } else {
          exp.radius -= 1.2;
          exp.alpha -= 0.025;
        }

        const rSq = exp.radius * exp.radius;
        enemiesRef.current = enemiesRef.current.filter(enemy => {
          const dx = enemy.x - exp.x;
          const dy = enemy.y - exp.y;
          if (dx * dx + dy * dy < rSq) {
            scoreGained += SCORE_PER_KILL;
            ufosDestroyedRef.current++;

            // Spawn coin
            fallingCoinsRef.current.push({
              id: `coin-${enemy.id}-${time}`,
              x: enemy.x,
              y: enemy.y,
              vy: 2
            });

            // Angel encouragement
            if (ufosDestroyedRef.current % 5 === 0) {
              angelMessagesRef.current.push({
                id: `angel-${time}`,
                text: TRANSLATIONS[lang].angel,
                x: GAME_WIDTH - 200,
                y: 100 + Math.random() * 200,
                alpha: 1
              });
            }

            chainExplosions.push({
              id: `exp-c-${enemy.id}-${time}-${Math.random()}`,
              x: enemy.x,
              y: enemy.y,
              radius: 0,
              maxRadius: 35,
              growing: true,
              alpha: 1
            });
            return false;
          }
          return true;
        });
        return exp.alpha > 0;
      });

      if (chainExplosions.length > 0) {
        explosionsRef.current.push(...chainExplosions);
      }

      // Update Coins
      fallingCoinsRef.current = fallingCoinsRef.current.filter(coin => {
        coin.y += coin.vy;
        if (coin.y >= GAME_HEIGHT - 30) {
          coinsTotalRef.current += COIN_VALUE;
          setCoinScore(coinsTotalRef.current);
          return false;
        }
        return true;
      });

      // Update Angel Messages
      angelMessagesRef.current = angelMessagesRef.current.filter(msg => {
        msg.y -= 0.5;
        msg.alpha -= 0.005;
        return msg.alpha > 0;
      });

      if (scoreGained > 0) {
        scoreRef.current += scoreGained;
        setScore(scoreRef.current);
      }

      // Update UFO
      if (ufoActiveRef.current) {
        ufoXRef.current += 12;
        if (ufoXRef.current > GAME_WIDTH + 150) ufoActiveRef.current = false;
      }

      // Update Sun Weapon Flash
      if (sunFlashAlphaRef.current > 0) {
        sunFlashAlphaRef.current -= 0.02;
        if (sunFlashAlphaRef.current < 0) sunFlashAlphaRef.current = 0;
        setSunFlashAlpha(sunFlashAlphaRef.current);
      }
      if (sunActiveRef.current && time - sunStartTimeRef.current > 2000) {
        sunActiveRef.current = false;
      }

      // Check Win/Loss/Transition
      let nextState: 'playing' | 'win' | 'lose' | 'transition' = 'playing';
      if (scoreRef.current >= WIN_SCORE) {
        nextState = 'win';
      } else if (turretsRef.current.every(t => t.destroyed) || citiesRef.current.every(c => c.destroyed)) {
        nextState = 'lose';
      } else if (enemiesSpawnedInLevel.current >= totalEnemiesInLevel.current && enemiesRef.current.length === 0 && explosionsRef.current.length === 0) {
        nextState = 'transition';
      }

      if (nextState !== 'playing') {
        setGameState(nextState);
        gameStateRef.current = nextState;
        draw();
        return;
      }

      draw();
      requestRef.current = requestAnimationFrame(update);
    } catch (err) {
      console.error("Game Loop Error:", err);
      requestRef.current = requestAnimationFrame(update);
    }
  }, [spawnEnemy]); // Removed score and gameState dependency

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Space Background (Stars & Nebula)
    starsRef.current.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Twinkle
      if (Math.random() > 0.98) star.opacity = Math.random();
    });

    const gradient = ctx.createRadialGradient(GAME_WIDTH/2, GAME_HEIGHT/2, 0, GAME_WIDTH/2, GAME_HEIGHT/2, GAME_WIDTH);
    gradient.addColorStop(0, 'rgba(30, 0, 60, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Ground (Earth Arc)
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT + 1000, 1050, 0, Math.PI * 2);
    ctx.fill();
    
    // Earth Atmosphere Glow
    const earthGlow = ctx.createRadialGradient(GAME_WIDTH/2, GAME_HEIGHT + 1000, 1050, GAME_WIDTH/2, GAME_HEIGHT + 1000, 1100);
    earthGlow.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    earthGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = earthGlow;
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT + 1000, 1100, 0, Math.PI * 2);
    ctx.fill();

    // Draw Cities
    citiesRef.current.forEach(city => {
      if (!city.destroyed) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(city.x - 15, city.y, 30, 20);
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(city.x - 10, city.y - 10, 20, 10);
        
        // City Lights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(city.x - 8, city.y - 5, 4, 4);
        ctx.fillRect(city.x + 4, city.y - 5, 4, 4);
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(city.x - 15, city.y + 10, 30, 10);
      }
    });

    // Draw Turrets
    const turretFlash = Math.sin(performance.now() / 100) > 0;
    turretsRef.current.forEach(turret => {
      if (!turret.destroyed) {
        // High-tech base
        ctx.fillStyle = '#334155';
        ctx.fillRect(turret.x - 25, turret.y + 10, 50, 15);
        
        // Flashing Core
        ctx.fillStyle = turretFlash ? '#38bdf8' : '#0369a1';
        ctx.beginPath();
        ctx.arc(turret.x, turret.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Cannon
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(turret.x, turret.y + 10);
        ctx.lineTo(turret.x, turret.y - 20);
        ctx.stroke();

        // Ammo indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(turret.ammo.toString(), turret.x, turret.y + 45);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(turret.x, turret.y + 10, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Enemies (UFOs)
    enemiesRef.current.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      
      // UFO Body (Doubled Size)
      const ufoSize = 16;
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 0, ufoSize * 2, ufoSize * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // UFO Dome
      ctx.fillStyle = 'rgba(186, 230, 253, 0.8)';
      ctx.beginPath();
      ctx.arc(0, -ufoSize * 0.3, ufoSize * 0.8, 0, Math.PI, true);
      ctx.fill();
      
      // UFO Lights
      const lightTime = performance.now() / 200;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = Math.sin(lightTime + i) > 0 ? '#f87171' : '#7f1d1d';
        ctx.beginPath();
        ctx.arc(-ufoSize + i * (ufoSize * 0.6), ufoSize * 0.2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      
      // Trail
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.beginPath();
      ctx.moveTo(enemy.startX, enemy.startY);
      ctx.lineTo(enemy.x, enemy.y);
      ctx.stroke();
    });

    // Draw Coins
    fallingCoinsRef.current.forEach(coin => {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', coin.x, coin.y + 4);
    });

    // Draw Angel Messages (Luffy)
    angelMessagesRef.current.forEach(msg => {
      ctx.save();
      ctx.translate(GAME_WIDTH - 80, msg.y);
      ctx.globalAlpha = msg.alpha;

      // Luffy Drawing
      // Straw Hat
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(0, -10, 40, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      // Red Band
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-30, -12, 60, 4);
      // Face
      ctx.fillStyle = '#ffedd5';
      ctx.beginPath();
      ctx.arc(0, 10, 25, 0, Math.PI * 2);
      ctx.fill();
      // Smile
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 15, 12, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      // Eyes
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-8, 5, 2, 0, Math.PI * 2);
      ctx.arc(8, 5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Text
      ctx.fillStyle = `rgba(255, 255, 255, ${msg.alpha})`;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(msg.text, -40, 20);
      
      ctx.restore();
    });

    // Draw Missiles
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    missilesRef.current.forEach(missile => {
      ctx.beginPath();
      ctx.moveTo(missile.startX, missile.startY);
      ctx.lineTo(missile.x, missile.y);
      ctx.stroke();

      // Target X
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(missile.targetX - 5, missile.targetY - 5);
      ctx.lineTo(missile.targetX + 5, missile.targetY + 5);
      ctx.moveTo(missile.targetX + 5, missile.targetY - 5);
      ctx.lineTo(missile.targetX - 5, missile.targetY + 5);
      ctx.stroke();
    });

    // Draw Explosions
    explosionsRef.current.forEach(exp => {
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${exp.alpha * 0.8})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 100, 0, ${exp.alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw UFO
    if (ufoActiveRef.current) {
      const x = ufoXRef.current;
      const y = 50;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(x, y, 40, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(x, y - 5, 15, 0, Math.PI, true);
      ctx.fill();
      
      // UFO Lights
      const time = performance.now() / 100;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = Math.sin(time + i) > 0 ? '#fbbf24' : '#78350f';
        ctx.beginPath();
        ctx.arc(x - 25 + i * 12.5, y + 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Beam
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.beginPath();
      ctx.moveTo(x - 20, y + 15);
      ctx.lineTo(x + 20, y + 15);
      ctx.lineTo(x + 60, GAME_HEIGHT);
      ctx.lineTo(x - 60, GAME_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    // Draw Sun Weapon
    if (sunActiveRef.current) {
      const sunGlow = ctx.createRadialGradient(GAME_WIDTH / 2, 150, 20, GAME_WIDTH / 2, 150, 300);
      sunGlow.addColorStop(0, 'rgba(255, 255, 200, 1)');
      sunGlow.addColorStop(0.2, 'rgba(255, 200, 50, 0.8)');
      sunGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');
      
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(GAME_WIDTH / 2, 150, 300, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(GAME_WIDTH / 2, 150, 60, 0, Math.PI * 2);
      ctx.fill();
    }

    // Full Screen Flash
    if (sunFlashAlphaRef.current > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${sunFlashAlphaRef.current})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(update);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, update]);

  const startGame = () => {
    initGame();
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-emerald-500/30 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            {t.title}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{t.score}</span>
            <span className="text-xl font-mono font-medium text-emerald-400">{score.toString().padStart(5, '0')}</span>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{t.coins}</span>
            <span className="text-xl font-mono font-medium text-yellow-400">{coins.toString().padStart(5, '0')}</span>
          </div>
          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="p-2 hover:bg-white/5 rounded-full transition-colors border border-white/10"
          >
            <Languages className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative w-full max-w-4xl aspect-[4/3] bg-black rounded-2xl border border-white/10 shadow-2xl overflow-hidden group">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="w-full h-full cursor-crosshair touch-none"
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasClick}
        />

        {/* HUD Mobile */}
        <div className="absolute top-4 left-4 md:hidden flex flex-col gap-1">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">{t.score}</span>
            <span className="text-lg font-mono font-medium text-emerald-400">{score}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">{t.coins}</span>
            <span className="text-lg font-mono font-medium text-yellow-400">{coins}</span>
          </div>
        </div>

        {/* Level Display */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">{t.level}</span>
            <span className="text-xl font-mono font-medium text-white">{level}</span>
          </div>
        )}

        {/* UFO Status */}
        {gameState === 'playing' && (
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
            <button 
              onClick={triggerSunWeapon}
              disabled={ufoCooldownRemaining > 0}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-md transition-all ${ufoCooldownRemaining === 0 ? 'bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30 cursor-pointer' : 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'}`}
            >
              <Sun className={`w-4 h-4 ${ufoCooldownRemaining === 0 ? 'animate-spin-slow' : ''}`} />
              <span className="text-xs font-bold uppercase tracking-wider">SOLAR [E]</span>
              {ufoCooldownRemaining > 0 && (
                <span className="font-mono text-xs ml-1">{ufoCooldownRemaining}s</span>
              )}
            </button>
          </div>
        )}

        {/* Overlays */}
        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-md"
              >
                <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                  <Target className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-bold mb-4">{t.title}</h2>
                <p className="text-neutral-400 mb-8 leading-relaxed">
                  {t.howToPlay}
                </p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">{t.targetScore}</div>
                    <div className="text-2xl font-mono text-emerald-400">{WIN_SCORE}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Missiles</div>
                    <div className="text-2xl font-mono text-blue-400">240</div>
                  </div>
                </div>
                <button 
                  onClick={startGame}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  {t.start}
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'transition' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-md"
              >
                <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
                  <Trophy className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-3xl font-bold mb-2">{t.levelComplete}</h2>
                <p className="text-neutral-400 mb-8">
                  {t.level} {level} {t.victory}
                </p>
                
                <button 
                  onClick={() => startLevel(level + 1)}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  {t.nextLevel}
                </button>
              </motion.div>
            </motion.div>
          )}

          {(gameState === 'win' || gameState === 'lose') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-md"
              >
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 ${gameState === 'win' ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-red-500/20 border-red-500/40'}`}>
                  {gameState === 'win' ? (
                    <Trophy className="w-12 h-12 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-red-400" />
                  )}
                </div>
                
                <h2 className={`text-4xl font-bold mb-2 ${gameState === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {gameState === 'win' ? t.victory : t.defeat}
                </h2>
                <p className="text-neutral-400 mb-8 text-lg">
                  {gameState === 'win' ? t.win : t.lose}
                </p>

                <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
                  <div className="text-sm text-neutral-500 uppercase tracking-widest mb-1">{t.score}</div>
                  <div className="text-5xl font-mono font-bold text-white">{score}</div>
                </div>

                <button 
                  onClick={startGame}
                  className="w-full py-4 bg-white text-black font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  {t.restart}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold mb-1">Precision Strike</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">Aim ahead of the targets. Explosions take time to expand.</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold mb-1">Resource Management</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">The middle turret has double the ammo. Use it wisely.</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold mb-1">Chain Reaction</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">Destroyed rockets trigger smaller explosions that can hit others.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
