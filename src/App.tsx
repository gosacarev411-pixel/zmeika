import { useState, useEffect, useCallback, useRef } from 'react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

const SPEED_MAP: Record<Difficulty, number> = {
  easy: 150,
  medium: 100,
  hard: 60,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
};

function getRandomPosition(snake: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
  return pos;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const snakeRef = useRef<Position[]>([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<Position>(getRandomPosition(snakeRef.current));
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const resetGame = useCallback(() => {
    snakeRef.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    foodRef.current = getRandomPosition(snakeRef.current);
    scoreRef.current = 0;
    setScore(0);
  }, []);

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food with glow effect
    const food = foodRef.current;
    const foodX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const foodY = food.y * CELL_SIZE + CELL_SIZE / 2;
    
    const glowGradient = ctx.createRadialGradient(foodX, foodY, 2, foodX, foodY, CELL_SIZE);
    glowGradient.addColorStop(0, 'rgba(255, 82, 82, 0.8)');
    glowGradient.addColorStop(1, 'rgba(255, 82, 82, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(food.x * CELL_SIZE - CELL_SIZE / 2, food.y * CELL_SIZE - CELL_SIZE / 2, CELL_SIZE * 2, CELL_SIZE * 2);

    ctx.fillStyle = '#ff5252';
    ctx.beginPath();
    ctx.arc(foodX, foodY, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw snake
    const snake = snakeRef.current;
    snake.forEach((segment, index) => {
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;
      const padding = 1;

      if (index === 0) {
        // Head
        const gradient = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
        gradient.addColorStop(0, '#4ade80');
        gradient.addColorStop(1, '#22c55e');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + padding, y + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2, 5);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#1a1a2e';
        const eyeSize = 3;
        const dir = directionRef.current;
        let eye1X = x + CELL_SIZE / 2 - 4;
        let eye1Y = y + CELL_SIZE / 2 - 2;
        let eye2X = x + CELL_SIZE / 2 + 4;
        let eye2Y = y + CELL_SIZE / 2 - 2;

        if (dir === 'DOWN') {
          eye1Y = y + CELL_SIZE / 2 + 2;
          eye2Y = y + CELL_SIZE / 2 + 2;
        } else if (dir === 'LEFT') {
          eye1X = x + CELL_SIZE / 2 - 2;
          eye1Y = y + CELL_SIZE / 2 - 4;
          eye2X = x + CELL_SIZE / 2 - 2;
          eye2Y = y + CELL_SIZE / 2 + 4;
        } else if (dir === 'RIGHT') {
          eye1X = x + CELL_SIZE / 2 + 2;
          eye1Y = y + CELL_SIZE / 2 - 4;
          eye2X = x + CELL_SIZE / 2 + 2;
          eye2Y = y + CELL_SIZE / 2 + 4;
        }

        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Body
        const alpha = 1 - (index / snake.length) * 0.4;
        ctx.fillStyle = `rgba(74, 222, 128, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x + padding, y + padding, CELL_SIZE - padding * 2, CELL_SIZE - padding * 2, 3);
        ctx.fill();
      }
    });
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const elapsed = timestamp - lastTimeRef.current;
    const speed = SPEED_MAP[difficulty];

    if (elapsed >= speed) {
      lastTimeRef.current = timestamp;

      // Update direction
      directionRef.current = nextDirectionRef.current;

      // Move snake
      const snake = [...snakeRef.current];
      const head = { ...snake[0] };

      switch (directionRef.current) {
        case 'UP': head.y -= 1; break;
        case 'DOWN': head.y += 1; break;
        case 'LEFT': head.x -= 1; break;
        case 'RIGHT': head.x += 1; break;
      }

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameState('gameover');
        const finalScore = scoreRef.current;
        if (finalScore > highScore) {
          setHighScore(finalScore);
          localStorage.setItem('snake-highscore', finalScore.toString());
        }
        return;
      }

      // Check self collision
      if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        setGameState('gameover');
        const finalScore = scoreRef.current;
        if (finalScore > highScore) {
          setHighScore(finalScore);
          localStorage.setItem('snake-highscore', finalScore.toString());
        }
        return;
      }

      snake.unshift(head);

      // Check food collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        scoreRef.current += 10;
        setScore(scoreRef.current);
        foodRef.current = getRandomPosition(snake);
      } else {
        snake.pop();
      }

      snakeRef.current = snake;
      drawGame();
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [difficulty, highScore, drawGame]);

  const startGame = useCallback(() => {
    resetGame();
    setGameState('playing');
    lastTimeRef.current = 0;
    drawGame();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [resetGame, drawGame, gameLoop]);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    } else if (gameState === 'paused') {
      setGameState('playing');
      lastTimeRef.current = 0;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState, gameLoop]);

  const changeDirection = useCallback((newDir: Direction) => {
    const current = directionRef.current;
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT'
    };
    if (opposites[newDir] !== current) {
      nextDirectionRef.current = newDir;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'idle' || gameState === 'gameover') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startGame();
          return;
        }
      }

      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'playing' || gameState === 'paused') {
          togglePause();
        }
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        startGame();
        return;
      }

      if (gameState !== 'playing') return;

      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown': case 's': case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft': case 'a': case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight': case 'd': case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, startGame, togglePause, changeDirection]);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchStartRef.current) return;
      
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const minSwipe = 30;

      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
        // Tap - toggle pause or start
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame();
        } else if (gameState === 'playing' || gameState === 'paused') {
          togglePause();
        }
        return;
      }

      if (gameState !== 'playing') return;

      if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
      }
      touchStartRef.current = null;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState, startGame, togglePause, changeDirection]);

  // Initial draw
  useEffect(() => {
    drawGame();
  }, [drawGame]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    if (gameState === 'idle') {
      resetGame();
      drawGame();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent mb-2">
          🐍 Змейка
        </h1>
        <p className="text-slate-400 text-sm">Классическая аркадная игра</p>
      </div>

      {/* Score Panel */}
      <div className="flex gap-4 md:gap-8 mb-4">
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-700/50">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Счёт</div>
          <div className="text-2xl font-bold text-green-400">{score}</div>
        </div>
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-700/50">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Рекорд</div>
          <div className="text-2xl font-bold text-yellow-400">{highScore}</div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="rounded-xl border-2 border-slate-700/50 shadow-2xl shadow-green-900/20"
          style={{ 
            width: `min(${CANVAS_SIZE}px, 85vw)`, 
            height: `min(${CANVAS_SIZE}px, 85vw)`,
            imageRendering: 'pixelated'
          }}
        />

        {/* Overlay for idle state */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
            <div className="text-6xl mb-4 animate-bounce">🐍</div>
            <p className="text-white text-lg font-semibold mb-2">Готовы играть?</p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg shadow-lg hover:shadow-green-500/30 hover:scale-105 transition-all duration-200"
            >
              Начать игру
            </button>
            <p className="text-slate-400 text-xs mt-3">или нажмите Enter / Пробел</p>
          </div>
        )}

        {/* Overlay for paused state */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
            <div className="text-5xl mb-4">⏸️</div>
            <p className="text-white text-xl font-bold mb-2">Пауза</p>
            <button
              onClick={togglePause}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-lg shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all duration-200"
            >
              Продолжить
            </button>
            <p className="text-slate-400 text-xs mt-3">или нажмите Пробел</p>
          </div>
        )}

        {/* Overlay for game over */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm rounded-xl">
            <div className="text-5xl mb-4">💀</div>
            <p className="text-white text-xl font-bold mb-1">Игра окончена!</p>
            <p className="text-green-400 text-3xl font-bold mb-4">{score} очков</p>
            {score >= highScore && score > 0 && (
              <p className="text-yellow-400 text-sm font-semibold mb-3 animate-pulse">🏆 Новый рекорд!</p>
            )}
            <button
              onClick={startGame}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg shadow-lg hover:shadow-green-500/30 hover:scale-105 transition-all duration-200"
            >
              Играть снова
            </button>
            <p className="text-slate-400 text-xs mt-3">или нажмите R</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col items-center gap-3">
        {/* Difficulty selector */}
        <div className="flex gap-2">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => handleDifficultyChange(d)}
              disabled={gameState === 'playing' || gameState === 'paused'}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                difficulty === d
                  ? d === 'easy'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : d === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                    : 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-slate-600'
              } ${gameState === 'playing' || gameState === 'paused' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={togglePause}
              className="px-4 py-2 bg-slate-800/60 text-slate-300 rounded-lg border border-slate-700/50 hover:border-slate-500 hover:text-white transition-all duration-200 text-sm"
            >
              {gameState === 'paused' ? '▶ Продолжить' : '⏸ Пауза'}
            </button>
          )}
          <button
            onClick={startGame}
            className="px-4 py-2 bg-slate-800/60 text-slate-300 rounded-lg border border-slate-700/50 hover:border-slate-500 hover:text-white transition-all duration-200 text-sm"
          >
            🔄 Перезапуск
          </button>
        </div>

        {/* Mobile D-pad controls */}
        <div className="md:hidden mt-2">
          <div className="grid grid-cols-3 gap-1 w-36 mx-auto">
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('UP'); }}
              className="w-12 h-12 bg-slate-800/80 rounded-lg border border-slate-600/50 flex items-center justify-center text-xl active:bg-slate-700 active:scale-95 transition-all"
            >
              ↑
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('LEFT'); }}
              className="w-12 h-12 bg-slate-800/80 rounded-lg border border-slate-600/50 flex items-center justify-center text-xl active:bg-slate-700 active:scale-95 transition-all"
            >
              ←
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('DOWN'); }}
              className="w-12 h-12 bg-slate-800/80 rounded-lg border border-slate-600/50 flex items-center justify-center text-xl active:bg-slate-700 active:scale-95 transition-all"
            >
              ↓
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState === 'playing') changeDirection('RIGHT'); }}
              className="w-12 h-12 bg-slate-800/80 rounded-lg border border-slate-600/50 flex items-center justify-center text-xl active:bg-slate-700 active:scale-95 transition-all"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-slate-500 text-xs max-w-md hidden md:block">
        <p>⌨️ Стрелки / WASD — движение | Пробел — пауза | R — перезапуск</p>
        <p className="mt-1">📱 Свайп — движение | Тап — пауза/старт</p>
      </div>
    </div>
  );
}
