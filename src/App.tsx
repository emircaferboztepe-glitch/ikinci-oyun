import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Trophy, Zap, Shield, FastForward } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameState, Obstacle, Collectible } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, JUMP_FORCE, INITIAL_SPEED, SPEED_INCREMENT, PLAYER_X } from './constants';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [distance, setDistance] = useState(0);

  // Game Ref State
  const gameRef = useRef({
    player: {
      y: CANVAS_HEIGHT - 80,
      vy: 0,
      isJumping: false,
      isSliding: false,
      slideTimer: 0,
      width: 40,
      height: 60,
    },
    sonic: {
      x: -100,
      targetX: -100,
      animationFrame: 0,
    },
    obstacles: [] as Obstacle[],
    collectibles: [] as Collectible[],
    speed: INITIAL_SPEED,
    distance: 0,
    frameCount: 0,
    lastObstacleTime: 0,
    lastCollectibleTime: 0,
  });

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    setDistance(0);
    gameRef.current = {
      player: {
        y: CANVAS_HEIGHT - 80,
        vy: 0,
        isJumping: false,
        isSliding: false,
        slideTimer: 0,
        width: 40,
        height: 60,
      },
      sonic: {
        x: -150,
        targetX: -150,
        animationFrame: 0,
      },
      obstacles: [],
      collectibles: [],
      speed: INITIAL_SPEED,
      distance: 0,
      frameCount: 0,
      lastObstacleTime: 0,
      lastCollectibleTime: 0,
    };
  };

  const handleGameOver = () => {
    setGameState(GameState.GAMEOVER);
    if (gameRef.current.distance > highScore) {
      setHighScore(Math.floor(gameRef.current.distance));
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyQ') {
        if (!gameRef.current.player.isJumping && !gameRef.current.player.isSliding) {
          gameRef.current.player.vy = JUMP_FORCE;
          gameRef.current.player.isJumping = true;
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyE') {
        if (!gameRef.current.player.isJumping) {
          gameRef.current.player.isSliding = true;
          gameRef.current.player.slideTimer = 30;
          gameRef.current.player.height = 30;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const update = () => {
      const g = gameRef.current;
      const p = g.player;

      // Update Speed
      g.speed += SPEED_INCREMENT;
      g.distance += g.speed / 10;
      setDistance(Math.floor(g.distance));

      // Player Physics
      p.vy += GRAVITY;
      p.y += p.vy;

      const groundY = CANVAS_HEIGHT - 80;
      if (p.y > groundY - (p.isSliding ? 30 : 60)) {
        p.y = groundY - (p.isSliding ? 30 : 60);
        p.vy = 0;
        p.isJumping = false;
      }

      if (p.isSliding) {
        p.slideTimer--;
        if (p.slideTimer <= 0) {
          p.isSliding = false;
          p.height = 60;
          p.y -= 30; // Pop back up
        }
      }

      // Sonic AI (The Chaser)
      // Sonic gets closer if speed is low or player hits something (not implemented yet)
      // For now, Sonic stays at a certain distance but moves slightly
      g.sonic.targetX = -100 + Math.sin(g.frameCount * 0.05) * 20;
      g.sonic.x += (g.sonic.targetX - g.sonic.x) * 0.1;
      g.sonic.animationFrame++;

      // Spawn Obstacles
      if (g.frameCount - g.lastObstacleTime > 100 / (g.speed / 5)) {
        const type = Math.random() > 0.6 ? (Math.random() > 0.5 ? 'high-wall' : 'low-wall') : 'spike';
        g.obstacles.push({
          x: CANVAS_WIDTH,
          y: type === 'high-wall' ? groundY - 80 : groundY - 30,
          width: 30,
          height: type === 'high-wall' ? 30 : 30,
          type
        });
        g.lastObstacleTime = g.frameCount;
      }

      // Spawn Collectibles
      if (g.frameCount - g.lastCollectibleTime > 150) {
        g.collectibles.push({
          x: CANVAS_WIDTH,
          y: groundY - 50 - Math.random() * 100,
          width: 20,
          height: 20,
          type: 'ring',
          collected: false
        });
        g.lastCollectibleTime = g.frameCount;
      }

      // Update Obstacles
      g.obstacles = g.obstacles.filter(obs => {
        obs.x -= g.speed;
        
        // Collision Detection
        const playerRect = { x: PLAYER_X, y: p.y, w: p.width, h: p.height };
        const obsRect = { x: obs.x, y: obs.y, w: obs.width, h: obs.height };

        if (
          playerRect.x < obsRect.x + obsRect.w &&
          playerRect.x + playerRect.w > obsRect.x &&
          playerRect.y < obsRect.y + obsRect.h &&
          playerRect.y + playerRect.h > obsRect.y
        ) {
          handleGameOver();
        }

        return obs.x > -50;
      });

      // Update Collectibles
      g.collectibles = g.collectibles.filter(col => {
        col.x -= g.speed;
        
        if (!col.collected) {
          const playerRect = { x: PLAYER_X, y: p.y, w: p.width, h: p.height };
          const colRect = { x: col.x, y: col.y, w: col.width, h: col.height };

          if (
            playerRect.x < colRect.x + colRect.w &&
            playerRect.x + playerRect.w > colRect.x &&
            playerRect.y < colRect.y + colRect.h &&
            playerRect.y + playerRect.h > colRect.y
          ) {
            col.collected = true;
            setScore(s => s + 10);
            g.speed += 0.1; // Small boost
          }
        }

        return col.x > -50;
      });

      g.frameCount++;
    };

    const draw = () => {
      const g = gameRef.current;
      const p = g.player;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background (Green Hill Zone Style)
      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - 80);
      skyGrad.addColorStop(0, '#4da6ff'); // Bright Blue
      skyGrad.addColorStop(1, '#ade0ff'); // Light Blue
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - 80);

      // Clouds (Simple circles)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      const drawCloud = (x: number, y: number) => {
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 15, y - 10, 20, 0, Math.PI * 2);
        ctx.arc(x + 30, y, 20, 0, Math.PI * 2);
        ctx.fill();
      };
      drawCloud((100 - g.distance * 0.2) % (CANVAS_WIDTH + 100), 50);
      drawCloud((400 - g.distance * 0.2) % (CANVAS_WIDTH + 100), 80);
      drawCloud((700 - g.distance * 0.2) % (CANVAS_WIDTH + 100), 40);

      // Rolling Hills
      ctx.fillStyle = '#2d8a2d'; // Darker Green
      const drawHill = (x: number, height: number, width: number) => {
        ctx.beginPath();
        ctx.ellipse(x, CANVAS_HEIGHT - 80, width, height, 0, Math.PI, 0);
        ctx.fill();
      };
      drawHill((200 - g.distance * 0.5) % (CANVAS_WIDTH + 400), 100, 200);
      drawHill((600 - g.distance * 0.5) % (CANVAS_WIDTH + 400), 120, 250);
      drawHill((1000 - g.distance * 0.5) % (CANVAS_WIDTH + 400), 80, 180);

      // Lighter Green Hills
      ctx.fillStyle = '#45b345'; // Lighter Green
      drawHill((0 - g.distance * 0.8) % (CANVAS_WIDTH + 400), 60, 150);
      drawHill((400 - g.distance * 0.8) % (CANVAS_WIDTH + 400), 80, 200);
      drawHill((800 - g.distance * 0.8) % (CANVAS_WIDTH + 400), 50, 120);

      // Ground (3D Perspective - Checkered Brown)
      ctx.fillStyle = '#8b4513'; // Saddle Brown
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT - 80);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 80);
      ctx.lineTo(CANVAS_WIDTH + 100, CANVAS_HEIGHT);
      ctx.lineTo(-100, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Checkered Pattern on Ground
      ctx.fillStyle = '#a0522d'; // Sienna
      for (let i = -5; i < 15; i++) {
        for (let j = 0; j < 4; j++) {
          if ((i + j) % 2 === 0) {
            const x1 = (i * 80 - (g.distance * 5) % 80);
            const y1 = CANVAS_HEIGHT - 80 + j * 20;
            const x2 = x1 + 80;
            const y2 = y1 + 20;
            
            ctx.beginPath();
            // Simple perspective for checkers
            const p1x = x1 + (x1 - CANVAS_WIDTH/2) * (j * 0.15);
            const p2x = x2 + (x2 - CANVAS_WIDTH/2) * (j * 0.15);
            const p3x = x2 + (x2 - CANVAS_WIDTH/2) * ((j+1) * 0.15);
            const p4x = x1 + (x1 - CANVAS_WIDTH/2) * ((j+1) * 0.15);
            
            ctx.moveTo(p1x, y1);
            ctx.lineTo(p2x, y1);
            ctx.lineTo(p3x, y2);
            ctx.lineTo(p4x, y2);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // Green Grass Top
      ctx.fillStyle = '#32cd32'; // Lime Green
      ctx.fillRect(0, CANVAS_HEIGHT - 85, CANVAS_WIDTH, 5);

      ctx.strokeStyle = '#228b22'; // Forest Green
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT - 80);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 80);
      ctx.stroke();

      // Draw Grid Lines for Speed Effect (3D Perspective)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      for (let i = -2; i < 12; i++) {
        const xBase = (i * 100 - (g.distance * 5) % 100);
        ctx.beginPath();
        ctx.moveTo(xBase, CANVAS_HEIGHT - 80);
        // Perspective lines fan out
        ctx.lineTo(xBase + (xBase - CANVAS_WIDTH/2) * 0.5, CANVAS_HEIGHT);
        ctx.stroke();
      }

      // Draw Player (Sonic - Blue)
      ctx.fillStyle = '#0066ff'; // Sonic Blue
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#0066ff';
      // Simple Sonic Head/Hair shape
      if (p.isSliding) {
        ctx.beginPath();
        ctx.ellipse(PLAYER_X + p.width/2, p.y + p.height/2, p.width/2, p.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(PLAYER_X, p.y, p.width, p.height);
        // Spikes
        ctx.beginPath();
        ctx.moveTo(PLAYER_X, p.y + 10);
        ctx.lineTo(PLAYER_X - 10, p.y + 20);
        ctx.lineTo(PLAYER_X, p.y + 30);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Draw Chaser (Dark Shadow - Black/Red)
      ctx.fillStyle = '#1a1a1a'; // Dark
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff0000'; // Red Glow
      const sonicY = CANVAS_HEIGHT - 140 + Math.sin(g.frameCount * 0.1) * 10;
      ctx.fillRect(g.sonic.x, sonicY, 60, 60);
      // Eyes
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(g.sonic.x + 40, sonicY + 15, 10, 5);
      
      // Trail effect
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(g.sonic.x - 20, sonicY + 5, 60, 60);
      ctx.fillRect(g.sonic.x - 40, sonicY + 10, 60, 60);
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      // Draw Obstacles
      g.obstacles.forEach(obs => {
        ctx.fillStyle = '#533483';
        if (obs.type === 'spike') {
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.fill();
        } else {
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        }
      });

      // Draw Collectibles
      g.collectibles.forEach(col => {
        if (!col.collected) {
          ctx.fillStyle = '#ffd700';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ffd700';
          ctx.beginPath();
          ctx.arc(col.x + col.width / 2, col.y + col.height / 2, col.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationId);
  }, [gameState]);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white font-sans selection:bg-[#e94560] selection:text-white flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-[800px] flex justify-between items-end mb-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-[#0066ff]">
            Sonic'in Kaçışı <span className="text-white">3</span>
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Green Hill Zone Protocol</p>
        </div>
        <div className="flex gap-8 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Distance</p>
            <p className="text-2xl font-mono font-bold">{distance}m</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Rings</p>
            <p className="text-2xl font-mono font-bold text-[#ffd700]">{score}</p>
          </div>
        </div>
      </div>

      {/* Game Stage */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#e94560] to-[#00f2ff] rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-[#16213e] rounded-lg overflow-hidden border border-white/10 shadow-2xl">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block cursor-none"
          />

          {/* Overlays */}
          <AnimatePresence>
            {gameState === GameState.START && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 bg-[#e94560] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(233,69,96,0.5)]">
                      <Zap className="w-10 h-10 text-white fill-white" />
                    </div>
                  </div>
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter">Ready to Run?</h2>
                  <p className="text-slate-400 max-w-md mx-auto">
                    A dark shadow is right behind you. Jump over spikes, slide under high walls, and collect rings to survive.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <span className="text-[#e94560] block mb-1">Q / SPACE / UP</span>
                      JUMP
                    </div>
                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                      <span className="text-[#e94560] block mb-1">E / DOWN</span>
                      SLIDE
                    </div>
                  </div>
                  <button
                    onClick={startGame}
                    className="group relative px-8 py-4 bg-[#e94560] hover:bg-[#ff5d7a] text-white font-black italic uppercase tracking-widest rounded-full transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    Start Escape
                  </button>
                </motion.div>
              </motion.div>
            )}

            {gameState === GameState.GAMEOVER && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h2 className="text-6xl font-black italic uppercase tracking-tighter text-[#e94560]">Caught!</h2>
                  <div className="flex gap-12 justify-center">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Final Distance</p>
                      <p className="text-4xl font-mono font-bold">{distance}m</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Best Record</p>
                      <p className="text-4xl font-mono font-bold text-[#00f2ff]">{highScore}m</p>
                    </div>
                  </div>
                  <button
                    onClick={startGame}
                    className="group relative px-8 py-4 bg-white text-black font-black italic uppercase tracking-widest rounded-full transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Try Again
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / Controls Info */}
      <div className="mt-8 grid grid-cols-3 gap-6 w-full max-w-[800px]">
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
          <div className="p-2 bg-[#e94560]/20 rounded-lg">
            <Trophy className="w-5 h-5 text-[#e94560]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">High Score</p>
            <p className="font-mono font-bold">{highScore}m</p>
          </div>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
          <div className="p-2 bg-[#ffd700]/20 rounded-lg">
            <Zap className="w-5 h-5 text-[#ffd700]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Speed Factor</p>
            <p className="font-mono font-bold">x{(gameRef.current.speed / INITIAL_SPEED).toFixed(1)}</p>
          </div>
        </div>
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
          <div className="p-2 bg-[#00f2ff]/20 rounded-lg">
            <Shield className="w-5 h-5 text-[#00f2ff]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Status</p>
            <p className="font-mono font-bold uppercase text-xs">
              {gameState === GameState.PLAYING ? 'In Pursuit' : 'Standby'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
