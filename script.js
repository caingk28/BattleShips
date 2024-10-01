// Ship factory function
const Ship = (length) => {
  const hitPositions = Array(length).fill(false);
  
  const hit = (position) => {
    if (position >= 0 && position < length) {
      hitPositions[position] = true;
    }
  };

  const isSunk = () => hitPositions.every(hit => hit);

  return {
    length,
    hit,
    isSunk,
    isHitAt: (position) => hitPositions[position]
  };
};

// Gameboard factory function
const Gameboard = () => {
  const board = Array(10).fill(null).map(() => Array(10).fill(null));
  const ships = [];
  const missedAttacks = [];

  const placeShip = (ship, row, col, isVertical) => {
    if (isValidPlacement(ship, row, col, isVertical)) {
      for (let i = 0; i < ship.length; i++) {
        if (isVertical) {
          board[row + i][col] = { ship, position: i };
        } else {
          board[row][col + i] = { ship, position: i };
        }
      }
      ships.push(ship);
      return true;
    }
    return false;
  };

  const isValidPlacement = (ship, row, col, isVertical) => {
    for (let i = 0; i < ship.length; i++) {
      if (isVertical) {
        if (row + i >= 10 || board[row + i][col] !== null) return false;
      } else {
        if (col + i >= 10 || board[row][col + i] !== null) return false;
      }
    }
    return true;
  };

  const receiveAttack = (row, col) => {
    if (board[row][col] === null) {
      missedAttacks.push({ row, col });
      return false;
    } else {
      board[row][col].ship.hit(board[row][col].position);
      return true;
    }
  };

  const allShipsSunk = () => ships.every(ship => ship.isSunk());

  return {
    placeShip,
    receiveAttack,
    allShipsSunk,
    get missedAttacks() { return [...missedAttacks]; },
    get board() { return board.map(row => [...row]); },
    get ships() { return [...ships]; }
  };
};

// Player factory function
const Player = (isComputer = false) => {
  let gameboard = Gameboard();

  const attack = (enemyGameboard, row, col) => {
    return enemyGameboard.receiveAttack(row, col);
  };

  const computerAttack = (enemyGameboard) => {
    let row, col;
    do {
      row = Math.floor(Math.random() * 10);
      col = Math.floor(Math.random() * 10);
    } while (enemyGameboard.missedAttacks.some(attack => attack.row === row && attack.col === col));
    
    attack(enemyGameboard, row, col);
    return [row, col];
  };

  return {
    get gameboard() { return gameboard; },
    set gameboard(newGameboard) { gameboard = newGameboard; },
    attack: isComputer ? computerAttack : attack,
    isComputer
  };
};

// Statistics module
const Statistics = (() => {
  let gamesPlayed = 0;
  let wins = 0;
  let losses = 0;
  let totalShots = 0;
  let hits = 0;

  const resetStats = () => {
    gamesPlayed = 0;
    wins = 0;
    losses = 0;
    totalShots = 0;
    hits = 0;
  };

  const recordGame = (playerWon) => {
    gamesPlayed++;
    if (playerWon) {
      wins++;
    } else {
      losses++;
    }
  };

  const recordShot = (isHit) => {
    totalShots++;
    if (isHit) {
      hits++;
    }
  };

  const getStats = () => {
    return {
      gamesPlayed,
      wins,
      losses,
      hitAccuracy: totalShots > 0 ? (hits / totalShots * 100).toFixed(2) : '0.00'
    };
  };

  return { resetStats, recordGame, recordShot, getStats };
})();

// Game logic module
const GameLogic = (() => {
  let player1, player2, currentPlayer;
  let placementPhase = true;
  let currentShipIndex = 0;
  const shipLengths = [5, 4, 3, 3, 2];

  const initializeGame = () => {
    player1 = Player();
    player2 = Player(true);
    currentPlayer = player1;
    placementPhase = true;
    currentShipIndex = 0;
  };

  const placeShipsRandomly = (gameboard) => {
    shipLengths.forEach(length => {
      let placed = false;
      while (!placed) {
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        const isVertical = Math.random() < 0.5;
        placed = gameboard.placeShip(Ship(length), row, col, isVertical);
      }
    });
  };

  const placePlayerShip = (row, col, isVertical) => {
    if (currentShipIndex >= shipLengths.length) return false;
    
    const shipLength = shipLengths[currentShipIndex];
    const ship = Ship(shipLength);
    
    if (player1.gameboard.placeShip(ship, row, col, isVertical)) {
      currentShipIndex++;
      return true;
    }
    return false;
  };

  const isPlacementPhase = () => placementPhase;

  const endPlacementPhase = () => {
    placementPhase = false;
    placeShipsRandomly(player2.gameboard);
  };

  const resetPlacement = () => {
    player1.gameboard = Gameboard();
    currentShipIndex = 0;
    placementPhase = true;
  };

  const playTurn = (row, col) => {
    if (currentPlayer === player1) {
      const hit = player1.attack(player2.gameboard, row, col);
      Statistics.recordShot(hit);
      const gameOver = player2.gameboard.allShipsSunk();
      if (gameOver) {
        Statistics.recordGame(true);
        return { gameOver, winner: player1, hit };
      }
      currentPlayer = player2;
      return { hit, gameOver: false };
    } else {
      const [hitRow, hitCol] = player2.attack(player1.gameboard);
      const hit = player1.gameboard.board[hitRow][hitCol] !== null;
      const gameOver = player1.gameboard.allShipsSunk();
      if (gameOver) {
        Statistics.recordGame(false);
        return { gameOver, winner: player2, hit, row: hitRow, col: hitCol };
      }
      currentPlayer = player1;
      return { hit, gameOver: false, row: hitRow, col: hitCol };
    }
  };

  return {
    initializeGame,
    playTurn,
    placePlayerShip,
    isPlacementPhase,
    endPlacementPhase,
    resetPlacement,
    get currentPlayer() { return currentPlayer; },
    get player1() { return player1; },
    get player2() { return player2; },
    get remainingShips() { return shipLengths.length - currentShipIndex; },
    get shipLengths() { return [...shipLengths]; }
  };
})();

// AudioPlayer module
const AudioPlayer = (() => {
  const sounds = {
    hit: new Audio(),
    miss: new Audio(),
    sink: new Audio(),
    victory: new Audio()
  };

  const loadSound = (name, path) => {
    return new Promise((resolve, reject) => {
      sounds[name].src = path;
      sounds[name].oncanplaythrough = resolve;
      sounds[name].onerror = reject;
    });
  };

  const init = async () => {
    try {
      await Promise.all([
        loadSound('hit', './sounds/hit.mp3'),
        loadSound('miss', './sounds/miss.mp3'),
        loadSound('sink', './sounds/sink.mp3'),
        loadSound('victory', './sounds/victory.mp3')
      ]);
      console.log('All sounds loaded successfully');
    } catch (error) {
      console.error('Error loading sounds:', error);
    }
  };

  const play = (soundName) => {
    if (sounds[soundName]) {
      sounds[soundName].play().catch(e => console.error(`Error playing ${soundName} sound:`, e));
    } else {
      console.error(`Sound ${soundName} not found`);
    }
  };

  return { init, play };
})();

// UI module
const UI = (() => {
  let playerBoard, computerBoard, messageDisplay, startButton, resetButton;
  let statsDisplay, gamesPlayedElement, winsElement, lossesElement, hitAccuracyElement;
  let isVertical = false;

  const initializeUI = () => {
    playerBoard = document.getElementById('player-board');
    computerBoard = document.getElementById('computer-board');
    messageDisplay = document.getElementById('message-display');
    startButton = document.getElementById('start-button');
    resetButton = document.getElementById('reset-button');

    statsDisplay = document.getElementById('stats-display');
    gamesPlayedElement = document.getElementById('games-played');
    winsElement = document.getElementById('wins');
    lossesElement = document.getElementById('losses');
    hitAccuracyElement = document.getElementById('hit-accuracy');

    const orientationButton = document.createElement('button');
    orientationButton.textContent = 'Rotate Ship';
    orientationButton.addEventListener('click', () => {
      isVertical = !isVertical;
      orientationButton.textContent = isVertical ? 'Horizontal' : 'Vertical';
    });
    document.body.appendChild(orientationButton);

    if (startButton) {
      startButton.addEventListener('click', startGame);
    }
    if (resetButton) {
      resetButton.addEventListener('click', resetShipPlacement);
    }
    updateMessage("Click 'Start Game' to begin!");
    updateStatsDisplay();
  };

  const startGame = () => {
    GameLogic.initializeGame();
    renderBoards();
    updateMessage("Place your ships!");
    startButton.disabled = true;
    resetButton.disabled = false;
    updateStatsDisplay();
  };

  const resetShipPlacement = () => {
    GameLogic.resetPlacement();
    renderBoards();
    updateMessage("Ship placement reset. Place your ships!");
  };

  const renderBoards = () => {
    if (GameLogic.player1 && GameLogic.player2) {
      renderBoard(playerBoard, GameLogic.player1.gameboard, true);
      renderBoard(computerBoard, GameLogic.player2.gameboard, false);
    }
  };

  const renderBoard = (boardElement, gameboard, showShips) => {
    if (!boardElement || !gameboard) return;

    boardElement.innerHTML = '';
    gameboard.board.forEach((row, i) => {
      row.forEach((cell, j) => {
        const cellElement = document.createElement('div');
        cellElement.classList.add('cell');
        cellElement.dataset.row = i;
        cellElement.dataset.col = j;
        if (showShips && cell !== null) {
          cellElement.classList.add('ship');
        }
        if (gameboard.missedAttacks.some(attack => attack.row === i && attack.col === j)) {
          cellElement.classList.add('miss');
        }
        if (cell !== null && cell.ship.isHitAt(cell.position)) {
          cellElement.classList.add('hit');
        }
        cellElement.addEventListener('click', () => cellClick(i, j, showShips));
        if (showShips) {
          cellElement.addEventListener('mouseover', () => showPlacementPreview(i, j));
          cellElement.addEventListener('mouseout', clearPlacementPreview);
        }
        boardElement.appendChild(cellElement);
      });
    });
  };

  const showPlacementPreview = (row, col) => {
    if (!GameLogic.isPlacementPhase()) return;

    const shipLength = GameLogic.remainingShips > 0 ? GameLogic.shipLengths[GameLogic.remainingShips - 1] : 0;
    
    for (let i = 0; i < shipLength; i++) {
      const cellElement = isVertical
        ? document.querySelector(`[data-row="${row + i}"][data-col="${col}"]`)
        : document.querySelector(`[data-row="${row}"][data-col="${col + i}"]`);
      
      if (cellElement) {
        cellElement.classList.add('preview');
      }
    }
  };

  const clearPlacementPreview = () => {
    document.querySelectorAll('.preview').forEach(cell => cell.classList.remove('preview'));
  };

  const isShipSunk = (gameboard, row, col) => {
    const cell = gameboard.board[row][col];
    return cell !== null && cell.ship.isSunk();
  };

  const animateAttack = (row, col, boardElement) => {
    const cellElement = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    const rect = cellElement.getBoundingClientRect();
    const attackElement = document.createElement('div');
    attackElement.classList.add('attack-animation');
    attackElement.style.left = `${rect.left + rect.width / 2}px`;
    attackElement.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(attackElement);
    setTimeout(() => {
      document.body.removeChild(attackElement);
    }, 500);
  };

  const cellClick = (row, col, isPlayerBoard) => {
    if (GameLogic.isPlacementPhase()) {
      if (isPlayerBoard && GameLogic.placePlayerShip(row, col, isVertical)) {
        renderBoards();
        if (GameLogic.remainingShips === 0) {
          GameLogic.endPlacementPhase();
          updateMessage("All ships placed. Click on the enemy's board to attack!");
          resetButton.disabled = true;
        } else {
          updateMessage(`Place your ${GameLogic.remainingShips} remaining ship(s)`);
        }
      }
    } else if (!isPlayerBoard && GameLogic.currentPlayer === GameLogic.player1) {
      animateAttack(row, col, computerBoard);
      const result = GameLogic.playTurn(row, col);
      setTimeout(() => {
        renderBoards();
        if (result.gameOver) {
          AudioPlayer.play('sink');
          endGame(result.winner);
          return;
        }
        if (result.hit) {
          if (isShipSunk(GameLogic.player2.gameboard, row, col)) {
            AudioPlayer.play('sink');
            updateMessage("You sunk a ship! Computer's turn...");
          } else {
            AudioPlayer.play('hit');
            updateMessage("Hit! Computer's turn...");
          }
        } else {
          AudioPlayer.play('miss');
          updateMessage("Miss! Computer's turn...");
        }
        
        // Computer's turn
        setTimeout(() => {
          const [computerRow, computerCol] = GameLogic.player2.attack(GameLogic.player1.gameboard);
          animateAttack(computerRow, computerCol, playerBoard);
          setTimeout(() => {
            const computerResult = GameLogic.playTurn();
            renderBoards();
            if (computerResult.gameOver) {
              AudioPlayer.play('sink');
              endGame(computerResult.winner);
            } else {
              if (computerResult.hit) {
                if (isShipSunk(GameLogic.player1.gameboard, computerResult.row, computerResult.col)) {
                  AudioPlayer.play('sink');
                  updateMessage("Computer sunk your ship! Your turn...");
                } else {
                  AudioPlayer.play('hit');
                  updateMessage("Computer hit! Your turn...");
                }
              } else {
                AudioPlayer.play('miss');
                updateMessage("Computer missed! Your turn...");
              }
            }
            updateStatsDisplay();
          }, 500);
        }, 1000);
      }, 500);
    }
  };

  const updateMessage = (message) => {
    if (messageDisplay) {
      messageDisplay.textContent = message;
    }
  };

  const updateStatsDisplay = () => {
    const stats = Statistics.getStats();
    gamesPlayedElement.textContent = stats.gamesPlayed;
    winsElement.textContent = stats.wins;
    lossesElement.textContent = stats.losses;
    hitAccuracyElement.textContent = stats.hitAccuracy;
  };

  const endGame = (winner) => {
    if (winner === GameLogic.player1) {
      updateMessage("Congratulations! You won!");
      AudioPlayer.play('victory');
      celebrateVictory();
    } else {
      updateMessage("Game over. Computer wins.");
    }
    startButton.disabled = false;
    resetButton.disabled = true;
    // Disable further clicks on the computer's board
    computerBoard.removeEventListener('click', cellClick);
    updateStatsDisplay();
  };

  const celebrateVictory = () => {
    // Confetti effect
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // since particles fall down, start a bit higher than random
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  return { initializeUI };
})();

// Initialize the UI and load sounds when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  UI.initializeUI();
  AudioPlayer.init();
});