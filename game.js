// ========== LEVEL DATA ==========
const levels = [
    {
        title: "Level 1: Proposition Match",
        description: "Drag operators to match with their correct symbols.",
        operators: [
            { name: "AND", symbol: "∧", hint: "AND (∧): both statements must be true." },
            { name: "OR", symbol: "∨", hint: "OR (∨): at least one statement is true." },
            { name: "NOT", symbol: "¬", hint: "NOT (¬): reverses the truth value." },
            { name: "IMPLIES", symbol: "→", hint: "IMPLIES (→): 'if first, then second'." }
        ]
    },
    {
        title: "Level 2: Operator Reverse Match",
        description: "Drag symbols to match with their operator names.",
        operators: [
            { name: "AND", symbol: "∧", hint: "It's AND!" },
            { name: "OR", symbol: "∨", hint: "It's OR!" },
            { name: "NOT", symbol: "¬", hint: "It's NOT!" },
            { name: "IMPLIES", symbol: "→", hint: "It's IMPLIES!" }
        ],
        reverse: true
    },
    {
        title: "Level 3: Truth Table Challenge",
        description: "Which symbol means the operator is TRUE only if both inputs are TRUE?",
        operators: [
            { name: "AND", symbol: "∧", hint: "AND is only TRUE when both inputs are TRUE." },
            { name: "OR", symbol: "∨", hint: "OR is TRUE when at least one is TRUE." },
            { name: "NOT", symbol: "¬", hint: "NOT flips the value." },
            { name: "IMPLIES", symbol: "→", hint: "IMPLIES: if first is TRUE, guarantees second is TRUE." }
        ]
    },
    {
        title: "Level 4: Final Symbol Speed Run",
        description: "Drag all symbols to the right as quickly as you can.",
        operators: [
            { name: "AND", symbol: "∧", hint: "Fast AND!" },
            { name: "OR", symbol: "∨", hint: "Fast OR!" },
            { name: "NOT", symbol: "¬", hint: "Fast NOT!" },
            { name: "IMPLIES", symbol: "→", hint: "Fast IMPLIES!" }
        ],
        speedRun: true
    }
];

let gameState = {
    currentLevel: 0,
    score: 0,
    lives: 3,
    matchedPairs: 0
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const elements = {
    currentLevel: $('#current-level'),
    score: $('#score-value'),
    lives: $('#lives-value'),
    levelTitle: $('#level-title'),
    levelDesc: $('#level-description'),
    hintBtn: $('#hint-btn'),
    checkBtn: $('#check-btn'),
    nextBtn: $('#next-btn'),
    gameArea: $('.game-area')
};

// ========== INITIALIZE ==========
function startGame() {
    gameState.currentLevel = 0;
    gameState.score = 0;
    gameState.lives = 3;
    loadLevel(0);
}

function loadLevel(levelIdx) {
    const level = levels[levelIdx];
    gameState.matchedPairs = 0;
    elements.currentLevel.textContent = levelIdx + 1;
    elements.score.textContent = gameState.score;
    elements.lives.textContent = gameState.lives;
    elements.levelTitle.textContent = level.title;
    elements.levelDesc.textContent = level.description;

    elements.checkBtn.disabled = false;
    elements.hintBtn.disabled = false;
    elements.nextBtn.disabled = true;
    elements.nextBtn.classList.add('btn-disabled');

    renderMatchingGame(level);
}

// ========== RENDER LEVEL ==========
function renderMatchingGame(level) {
    elements.gameArea.querySelector('.matching-container').innerHTML = '';
    // Build columns for drag and drop
    let leftLabel = "LOGICAL OPERATORS", rightLabel = "SYMBOLS", draggables = [], drops = [];

    if (level.reverse) {
        leftLabel = "SYMBOLS";
        rightLabel = "LOGICAL OPERATORS";
        draggables = level.operators.map(o => o.symbol);
        drops = level.operators.map(o => o.name);
    } else {
        draggables = level.operators.map(o => o.name);
        drops = level.operators.map(o => o.symbol);
    }

    // Left column
    const leftColumn = document.createElement('div');
    leftColumn.className = 'game-column';
    leftColumn.innerHTML = `<div class="column-title">${leftLabel}</div>`;
    draggables.forEach(item => {
        const div = document.createElement('div');
        div.className = 'draggable-item';
        div.textContent = item;
        // Use data attributes to track both operator and symbol
        if (level.reverse) {
            div.dataset.symbol = item;
        } else {
            div.dataset.operator = item;
        }
        leftColumn.appendChild(div);
    });

    // Right column
    const rightColumn = document.createElement('div');
    rightColumn.className = 'game-column';
    rightColumn.innerHTML = `<div class="column-title">${rightLabel}</div>`;
    drops.forEach((drop, idx) => {
        const zone = document.createElement('div');
        zone.className = 'drop-zone empty';
        if (level.reverse) {
            zone.dataset.operator = drop;
        } else {
            zone.dataset.symbol = drop;
        }
        rightColumn.appendChild(zone);
    });

    elements.gameArea.querySelector('.matching-container').appendChild(leftColumn);
    elements.gameArea.querySelector('.matching-container').appendChild(rightColumn);

    setupDragAndDrop(level);

    // Add listeners to buttons each time
    elements.hintBtn.onclick = () => showHint(level);
    elements.checkBtn.onclick = () => checkAnswers(level);
    elements.nextBtn.onclick = () => {
        if (gameState.currentLevel < levels.length - 1) {
            gameState.currentLevel++;
            gameState.score += 50;
            loadLevel(gameState.currentLevel);
            showMessage(`Level ${gameState.currentLevel + 1} loaded!`, 'info');
        } else {
            showEndModal();
        }
    };
}

// ========== DRAG & DROP ==========
function setupDragAndDrop(level) {
    const draggables =
        level.reverse
            ? $$('.draggable-item[data-symbol]')
            : $$('.draggable-item[data-operator]');
    const dropZones =
        level.reverse
            ? $$('.drop-zone[data-operator]')
            : $$('.drop-zone[data-symbol]');

    draggables.forEach(item => {
        item.setAttribute('draggable', 'true');
        item.ondragstart = function (e) {
            e.dataTransfer.setData('text/plain', level.reverse ? this.dataset.symbol : this.dataset.operator);
            this.classList.add('dragging');
        };
        item.ondragend = function () {
            this.classList.remove('dragging');
        };
    });

    dropZones.forEach(zone => {
        zone.ondragover = function (e) {
            e.preventDefault();
            zone.classList.add('drag-over');
        };

        zone.ondragleave = function () {
            zone.classList.remove('drag-over');
        };

        zone.ondrop = function (e) {
            e.preventDefault();
            zone.classList.remove('drag-over');
            // Only allow one match per drop
            if (zone.classList.contains('correct')) {
                showMessage('Already matched!', 'warning');
                return;
            }
            // Get operator/symbol from drag
            const dropped = e.dataTransfer.getData('text/plain');

            let correct = false, operator, symbol;
            if (level.reverse) {
                operator = zone.dataset.operator;
                symbol = dropped;
                correct = level.operators.find(o => o.name === operator && o.symbol === symbol);
            } else {
                symbol = zone.dataset.symbol;
                operator = dropped;
                correct = level.operators.find(o => o.name === operator && o.symbol === symbol);
            }

            if (correct) {
                zone.innerHTML = `<div class="match-content"><div>${operator}</div><div>= ${symbol}</div></div>`;
                zone.classList.add('correct');
                zone.classList.remove('empty');
                const draggedItem = level.reverse
                    ? document.querySelector(`.draggable-item[data-symbol="${symbol}"]`)
                    : document.querySelector(`.draggable-item[data-operator="${operator}"]`);
                if (draggedItem) {
                    draggedItem.style.opacity = ".3";
                    draggedItem.setAttribute('draggable','false');
                    draggedItem.style.cursor = "not-allowed";
                }
                gameState.score += 25;
                gameState.matchedPairs++;
                elements.score.textContent = gameState.score;
                showMessage(`Correct! ${operator} = ${symbol}`, 'success');
                // Next level unlock
                if (gameState.matchedPairs === 4) {
                    elements.nextBtn.disabled = false;
                    elements.nextBtn.classList.remove('btn-disabled');
                    showMessage('Excellent! All matches correct!', 'success');
                }
            } else {
                zone.classList.add('incorrect');
                showMessage('Incorrect match!', 'error');
                gameState.lives--;
                elements.lives.textContent = gameState.lives;
                setTimeout(() => zone.classList.remove('incorrect'),1000);
                if (gameState.lives <= 0) return gameOver();
            }
        };
    });
}

// ========== HINTS ==========
function showHint(level) {
    // If matched, show random correct operator hint for unmatched
    const remaining = level.operators.filter(o => {
        return !$$('.drop-zone.correct').find(z =>
            (level.reverse ? z.dataset.operator === o.name : z.dataset.symbol === o.symbol)
        );
    });
    if (remaining.length === 0) {
        showMessage('All matched! No hints needed.', 'info');
        return;
    }
    const hint = remaining[Math.floor(Math.random() * remaining.length)].hint || 'Think logically!';
    showMessage(`💡 ${hint}`, 'info');
}

// ========== CHECK ==========
function checkAnswers(level) {
    if (gameState.matchedPairs === 4) {
        showMessage('Perfect! All matches are correct!', 'success');
    } else {
        showMessage(`You have ${gameState.matchedPairs}/4 correct. Keep trying!`, 'warning');
    }
}

// ========== GAME OVER ==========
function gameOver() {
    showMessage('Game Over! Refresh to try again.', 'error');
    elements.checkBtn.disabled = true;
    elements.hintBtn.disabled = true;
    $$('.draggable-item').forEach(e=>e.setAttribute('draggable', 'false'));
}

// ========== MODAL END ==========
function showEndModal() {
    elements.gameArea.innerHTML = `
        <div class="card">
            <div class="card-title"><i class="fas fa-trophy"></i><h3>Game Complete!</h3></div>
            <p>You scored <strong>${gameState.score}</strong> points.<br>
            Thanks for playing. Refresh to play again!</p>
        </div>
    `;
    showMessage('Congratulations! You finished all levels!', 'success');
    elements.nextBtn.disabled = true;
}

// ========== MESSAGE ==========
function showMessage(text, type) {
    const existingMsg = document.querySelector('.game-message');
    if (existingMsg) existingMsg.remove();
    const msg = document.createElement('div');
    msg.className = `game-message ${type}`;
    msg.textContent = text;
    // Style
    msg.style.background = type === 'success' ? '#15bb90'
        : type === 'error' ? '#ef4746'
        : type === 'warning' ? '#ffb300'
        : '#232325e0';
    document.body.appendChild(msg);
    setTimeout(() => { msg.style.opacity='0'; setTimeout(()=>msg.remove(),500); }, 3000);
}

// ========== ON LOAD ==========
window.addEventListener('DOMContentLoaded', startGame);