// Game State
let currentLevel = 1;
let score = 0;
let lives = 3;
let gameStarted = false;

// DOM Elements
const levelElement = document.getElementById('current-level');
const scoreElement = document.getElementById('score-value');
const livesElement = document.getElementById('lives-value');
const levelTitle = document.getElementById('level-title');
const levelDesc = document.getElementById('level-description');
const hintBtn = document.getElementById('hint-btn');
const checkBtn = document.getElementById('check-btn');
const nextBtn = document.getElementById('next-btn');

// Initialize Game
function initGame() {
    updateUI();
    setupDragAndDrop();
    
    hintBtn.addEventListener('click', showHint);
    checkBtn.addEventListener('click', checkAnswers);
    nextBtn.addEventListener('click', nextLevel);
}

// Update UI
function updateUI() {
    levelElement.textContent = currentLevel;
    scoreElement.textContent = score;
    livesElement.textContent = lives;
}

// Setup Drag and Drop
function setupDragAndDrop() {
    const draggables = document.querySelectorAll('.draggable-item');
    const dropZones = document.querySelectorAll('.drop-zone');
    
    draggables.forEach(item => {
        item.addEventListener('dragstart', dragStart);
        item.addEventListener('dragend', dragEnd);
    });
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', dragOver);
        zone.addEventListener('dragenter', dragEnter);
        zone.addEventListener('dragleave', dragLeave);
        zone.addEventListener('drop', drop);
    });
}

function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.operator);
    e.target.classList.add('dragging');
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
    e.target.classList.add('active');
}

function dragLeave(e) {
    e.target.classList.remove('active');
}

function drop(e) {
    e.preventDefault();
    const operator = e.dataTransfer.getData('text/plain');
    const symbol = e.target.dataset.symbol;
    
    // Remove active class
    e.target.classList.remove('active');
    
    // Check if correct
    const correctPairs = {
        'AND': '∧',
        'OR': '∨',
        'NOT': '¬',
        'IMPLIES': '→'
    };
    
    if (correctPairs[operator] === symbol) {
        // Correct match
        e.target.style.background = 'rgba(16, 163, 127, 0.2)';
        e.target.textContent = `${operator} = ${symbol}`;
        e.target.classList.add('matched');
        
        // Find and hide the dragged item
        const draggedItem = document.querySelector(`.draggable-item[data-operator="${operator}"]`);
        if (draggedItem) {
            draggedItem.style.opacity = '0.3';
            draggedItem.style.cursor = 'default';
        }
        
        // Check if all matches are complete
        checkAllMatches();
    } else {
        // Wrong match
        e.target.style.background = 'rgba(239, 65, 70, 0.2)';
        lives--;
        updateUI();
        
        if (lives <= 0) {
            gameOver();
        }
    }
}

// Check all matches
function checkAllMatches() {
    const matchedItems = document.querySelectorAll('.drop-zone.matched');
    if (matchedItems.length === 4) {
        // All matches complete
        nextBtn.disabled = false;
        score += 100;
        updateUI();
        showFeedback('Excellent! All matches are correct!', 'success');
    }
}

// Show Hint
function showHint() {
    const hints = [
        "AND (∧) requires both propositions to be true",
        "OR (∨) requires at least one proposition to be true",
        "NOT (¬) reverses the truth value",
        "IMPLIES (→) means 'if p then q'"
    ];
    
    const randomHint = hints[Math.floor(Math.random() * hints.length)];
    showFeedback(`Hint: ${randomHint}`, 'info');
}

// Check Answers
function checkAnswers() {
    const matchedItems = document.querySelectorAll('.drop-zone.matched');
    
    if (matchedItems.length === 4) {
        showFeedback('Perfect! All matches are correct!', 'success');
        nextBtn.disabled = false;
    } else {
        showFeedback(`You have ${matchedItems.length}/4 correct. Keep trying!`, 'warning');
    }
}

// Next Level
function nextLevel() {
    if (currentLevel < 4) {
        currentLevel++;
        score += 50;
        updateUI();
        
        levelTitle.textContent = `Level ${currentLevel}: Truth Tables`;
        levelDesc.textContent = 'Complete the truth table for the given expression';
        
        // Reset for next level
        nextBtn.disabled = true;
        showFeedback(`Level ${currentLevel} loaded! Good luck!`, 'info');
        
        // Here you would load the next level content
        // For now, just show a message
        const gameContent = document.querySelector('.game-content-area');
        gameContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h3>Truth Table Challenge</h3>
                <p>Complete the truth table for: (p ∧ q) → r</p>
                <p>Coming soon in the full version!</p>
            </div>
        `;
    } else {
        showFeedback('Congratulations! You completed all levels!', 'success');
        nextBtn.disabled = true;
    }
}

// Show Feedback
function showFeedback(message, type) {
    // Create feedback element if it doesn't exist
    let feedbackEl = document.getElementById('feedback-message');
    if (!feedbackEl) {
        feedbackEl = document.createElement('div');
        feedbackEl.id = 'feedback-message';
        feedbackEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(feedbackEl);
    }
    
    // Set message and color
    feedbackEl.textContent = message;
    
    if (type === 'success') {
        feedbackEl.style.background = '#10a37f';
    } else if (type === 'warning') {
        feedbackEl.style.background = '#f7b500';
    } else if (type === 'error') {
        feedbackEl.style.background = '#ef4146';
    } else {
        feedbackEl.style.background = '#667eea';
    }
    
    // Show and auto-hide
    feedbackEl.style.opacity = '1';
    feedbackEl.style.transform = 'translateX(0)';
    
    setTimeout(() => {
        feedbackEl.style.opacity = '0';
        feedbackEl.style.transform = 'translateX(100px)';
    }, 3000);
}

// Game Over
function gameOver() {
    showFeedback('Game Over! Refresh to try again.', 'error');
    checkBtn.disabled = true;
    hintBtn.disabled = true;
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initGame);