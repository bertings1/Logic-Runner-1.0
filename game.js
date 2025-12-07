// Game State
let gameState = {
    currentLevel: 1,
    score: 0,
    lives: 3,
    totalLevels: 4,
    matchedPairs: 0,
    correctMatches: {
        'AND': '∧',
        'OR': '∨', 
        'NOT': '¬',
        'IMPLIES': '→'
    }
};

// DOM Elements
const elements = {
    currentLevel: document.getElementById('current-level'),
    score: document.getElementById('score-value'),
    lives: document.getElementById('lives-value'),
    levelTitle: document.getElementById('level-title'),
    levelDesc: document.getElementById('level-description'),
    hintBtn: document.getElementById('hint-btn'),
    checkBtn: document.getElementById('check-btn'),
    nextBtn: document.getElementById('next-btn')
};

// Initialize Game
function initGame() {
    console.log("Game initializing...");
    updateUI();
    setupEventListeners();
    setupDragAndDrop();
}

// Update UI
function updateUI() {
    elements.currentLevel.textContent = gameState.currentLevel;
    elements.score.textContent = gameState.score;
    elements.lives.textContent = gameState.lives;
}

// Setup Event Listeners
function setupEventListeners() {
    console.log("Setting up event listeners...");
    
    if (elements.hintBtn) {
        elements.hintBtn.addEventListener('click', showHint);
        console.log("Hint button listener added");
    }
    
    if (elements.checkBtn) {
        elements.checkBtn.addEventListener('click', checkAnswers);
        console.log("Check button listener added");
    }
    
    if (elements.nextBtn) {
        elements.nextBtn.addEventListener('click', nextLevel);
        console.log("Next button listener added");
    }
}

// DRAG AND DROP - FIXED VERSION
function setupDragAndDrop() {
    console.log("Setting up drag and drop...");
    
    const draggables = document.querySelectorAll('.draggable-item');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    console.log(`Found ${draggables.length} draggable items`);
    console.log(`Found ${dropZones.length} drop zones`);
    
    // Add drag events to each draggable item
    draggables.forEach(item => {
        item.setAttribute('draggable', 'true');
        
        item.addEventListener('dragstart', function(e) {
            console.log('Drag started:', this.textContent);
            e.dataTransfer.setData('text/plain', this.dataset.operator);
            this.classList.add('dragging');
        });
        
        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
        });
    });
    
    // Add drop events to each drop zone
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        zone.addEventListener('dragenter', function(e) {
            e.preventDefault();
        });
        
        zone.addEventListener('dragleave', function() {
            this.classList.remove('drag-over');
        });
        
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            const operator = e.dataTransfer.getData('text/plain');
            const symbol = this.dataset.symbol;
            console.log(`Dropped ${operator} on ${symbol}`);
            
            // Check if this drop zone already has content
            if (this.querySelector('.match-content')) {
                showMessage('This symbol already has a match!', 'warning');
                return;
            }
            
            // Check if match is correct
            if (gameState.correctMatches[operator] === symbol) {
                // CORRECT MATCH
                this.innerHTML = `
                    <div class="match-content">
                        <div class="operator">${operator}</div>
                        <div class="symbol">= ${symbol}</div>
                    </div>
                `;
                this.classList.add('correct');
                
                // Mark the dragged item as used
                const draggedItem = document.querySelector(`.draggable-item[data-operator="${operator}"]`);
                if (draggedItem) {
                    draggedItem.style.opacity = '0.3';
                    draggedItem.style.cursor = 'not-allowed';
                    draggedItem.setAttribute('draggable', 'false');
                }
                
                gameState.matchedPairs++;
                gameState.score += 25;
                updateUI();
                showMessage(`Correct! ${operator} = ${symbol}`, 'success');
                
                // Check if all matches are complete
                if (gameState.matchedPairs === 4) {
                    elements.nextBtn.disabled = false;
                    showMessage('Excellent! All matches correct!', 'success');
                }
            } else {
                // WRONG MATCH
                this.classList.add('incorrect');
                showMessage(`Incorrect! ${operator} ≠ ${symbol}`, 'error');
                
                gameState.lives--;
                updateUI();
                
                if (gameState.lives <= 0) {
                    gameOver();
                }
                
                // Remove incorrect class after 1 second
                setTimeout(() => {
                    this.classList.remove('incorrect');
                }, 1000);
            }
        });
    });
}

// Show Hint
function showHint() {
    const hints = [
        "💡 Hint: AND (∧) means both statements must be true",
        "💡 Hint: OR (∨) means at least one statement is true", 
        "💡 Hint: NOT (¬) reverses the truth value",
        "💡 Hint: IMPLIES (→) means 'if first, then second'"
    ];
    const randomHint = hints[Math.floor(Math.random() * hints.length)];
    showMessage(randomHint, 'info');
}

// Check Answers
function checkAnswers() {
    if (gameState.matchedPairs === 4) {
        showMessage('Perfect! All matches are correct!', 'success');
    } else {
        showMessage(`You have ${gameState.matchedPairs}/4 correct. Keep trying!`, 'warning');
    }
}

// Next Level
function nextLevel() {
    if (gameState.currentLevel < gameState.totalLevels) {
        gameState.currentLevel++;
        gameState.score += 50;
        gameState.matchedPairs = 0;
        
        elements.currentLevel.textContent = gameState.currentLevel;
        elements.nextBtn.disabled = true;
        
        // Reset game area for next level
        resetGameArea();
        
        showMessage(`Level ${gameState.currentLevel} loaded!`, 'info');
        updateUI();
    } else {
        showMessage('Congratulations! Game Complete!', 'success');
    }
}

// Reset Game Area
function resetGameArea() {
    const operatorsColumn = document.querySelector('.column:first-child');
    const symbolsColumn = document.querySelector('.column:last-child');
    
    // Reset operators
    const operators = ['AND', 'OR', 'NOT', 'IMPLIES'];
    operatorsColumn.innerHTML = '<div class="column-header">OPERATORS</div>';
    operators.forEach(op => {
        const div = document.createElement('div');
        div.className = 'draggable-item';
        div.textContent = op;
        div.dataset.operator = op;
        operatorsColumn.appendChild(div);
    });
    
    // Reset symbols
    const symbols = ['∧', '∨', '¬', '→'];
    symbolsColumn.innerHTML = '<div class="column-header">SYMBOLS</div>';
    symbols.forEach(sym => {
        const div = document.createElement('div');
        div.className = 'drop-zone';
        div.dataset.symbol = sym;
        symbolsColumn.appendChild(div);
    });
    
    // Re-setup drag and drop
    setupDragAndDrop();
}

// Show Message
function showMessage(text, type) {
    // Remove existing message
    const existingMsg = document.querySelector('.game-message');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    // Create new message
    const msg = document.createElement('div');
    msg.className = `game-message ${type}`;
    msg.textContent = text;
    msg.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    
    // Set color based on type
    if (type === 'success') {
        msg.style.background = 'linear-gradient(135deg, #10a37f, #0d8c6d)';
    } else if (type === 'error') {
        msg.style.background = 'linear-gradient(135deg, #ef4146, #d13438)';
    } else if (type === 'warning') {
        msg.style.background = 'linear-gradient(135deg, #f7b500, #e6a200)';
    } else {
        msg.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    }
    
    document.body.appendChild(msg);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        msg.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => msg.remove(), 300);
    }, 3000);
}

// Game Over
function gameOver() {
    showMessage('Game Over! Refresh to try again.', 'error');
    elements.checkBtn.disabled = true;
    elements.hintBtn.disabled = true;
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing game...");
    initGame();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100px);
            opacity: 0;
        }
    }
    
    .drag-over {
        border-color: #10a37f !important;
        background: rgba(16, 163, 127, 0.1) !important;
    }
    
    .correct {
        border-color: #10a37f !important;
        background: rgba(16, 163, 127, 0.1) !important;
    }
    
    .incorrect {
        border-color: #ef4146 !important;
        background: rgba(239, 65, 70, 0.1) !important;
        animation: shake 0.5s ease;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .match-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
    }
    
    .match-content .operator {
        font-weight: 600;
        font-size: 1.1rem;
    }
    
    .match-content .symbol {
        font-size: 1.5rem;
        color: #10a37f;
        margin-top: 5px;
    }
`;
document.head.appendChild(style);