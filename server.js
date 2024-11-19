const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());


const symbols = ['🍎', '🍋', '🍒', '💎', '7️⃣', '🎰'];
const calculateWin = (reels, bet) => {
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    switch (reels[0]) {
      case '💎': return bet * 10; 
      case '7️⃣': return bet * 7;
      case '🎰': return bet * 5;
      default: return bet * 3;
    }
  } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
    // Dwa takie same symbole
    return bet * 1.5;
  }
  return 0;
};

app.post('/spin', (req, res) => {
  const { bet } = req.body;
  
  // Generowanie losowych symboli
  const result = Array.from({ length: 3 }, 
    () => symbols[Math.floor(Math.random() * symbols.length)]
  );
  
  const winAmount = calculateWin(result, bet);
  
  res.json({
    result,
    winAmount: Math.floor(winAmount)
  });
});

const calculateMinesMultiplier = (mines, revealed) => {
    const base = mines * 0.4; // Zwiększamy bazę wraz z liczbą min
    return Math.pow(base, revealed / (25 - mines)) * 1.03;
};
  

  const activeGames = new Map();
  
  app.post('/mines/start', (req, res) => {
    const { bet, mines } = req.body;
    
    const minePositions = new Set();
    while (minePositions.size < mines) {
      minePositions.add(Math.floor(Math.random() * 25));
    }
    
    const board = Array(25).fill(null);
    const gameId = Date.now().toString();
    
    activeGames.set(gameId, {
      minePositions,
      revealedCount: 0,
      board,
      bet,
      isActive: true,
      hasLost: false,
      lastMultiplier: 1
    });
    
    res.json({
      gameId,
      board
    });
  });
  
  app.post('/mines/reveal', (req, res) => {
    const { index, bet, mines } = req.body;
    const gameId = req.headers['game-id'];
    const game = activeGames.get(gameId);
    
    if (!game || !game.isActive) {
      return res.status(400).json({ 
        error: 'Invalid game or game already ended',
        forceReset: true 
      });
    }
    
    const isMine = game.minePositions.has(index);
    
    if (isMine) {
      game.hasLost = true;
      game.isActive = false;
      
      const fullBoard = Array(25).fill(null).map((_, i) => 
        game.minePositions.has(i) ? '💣' : '💎'
      );
      
      return res.json({
        isMine: true,
        fullBoard,
        forceReset: true
      });
    }
    
    game.revealedCount++;
    game.board[index] = '💎';
    game.lastMultiplier = calculateMinesMultiplier(mines, game.revealedCount);
    
    res.json({
      isMine: false,
      multiplier: parseFloat(game.lastMultiplier.toFixed(2))
    });
  });
  
  app.post('/mines/cashout', (req, res) => {
    const { gameId, bet } = req.body;
    const game = activeGames.get(gameId);
    
    if (!game || !game.isActive || game.hasLost) {
      return res.status(400).json({ 
        error: 'Invalid cashout attempt',
        forceReset: true 
      });
    }
    
    const winAmount = game.lastMultiplier * game.bet;
    
    game.isActive = false;
    activeGames.delete(gameId);
    
    res.json({
      success: true,
      winAmount: parseFloat(winAmount.toFixed(2))
    });
  });

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});