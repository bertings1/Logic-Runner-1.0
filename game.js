/* game.js
   - fixes: navigation, tutorial modal, about content, single floating UI,
   - adds: sounds, name input for leaderboard, tutorial popup, working retry/quit,
   - removes: NOR/NAND and "type answer" for expert
*/

(() => {
  // --- Operators: only core ones
  const operators = [
    { name: "AND", symbol: "∧", desc: "True if both are true" },
    { name: "OR", symbol: "∨", desc: "True if either is true" },
    { name: "NOT", symbol: "¬", desc: "Inverts truth" },
    { name: "IMPLIES", symbol: "→", desc: "If A is true, B is true" }
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- QUESTION POOLS: unique by difficulty (no repeated question between difficulties)
  const POOLS = {
    easy: [
      { type: 'match', ops: ['AND', 'OR', 'NOT', 'IMPLIES'] },
      { type: 'sentence', sentence: "A ___ B (true if both are true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "AND" },
      { type: 'sentence', sentence: "A ___ B (true if either is true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "OR" },
      { type: 'sentence', sentence: "___ A (true if A is false)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "NOT" },
      { type: 'sentence', sentence: "If it rains ___ you use an umbrella", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "IMPLIES" }
    ],
    medium: [
      { type: 'sentence', sentence: "You can enter if you have a ticket ___ your name is on the list.", choices: ["AND", "OR", "IMPLIES"], answer: "OR" },
      { type: 'tt', op: "AND" },
      { type: 'sentence', sentence: "If you miss class, ___ you may fall behind", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" },
      { type: 'fault', pairs: [["AND", "∧"], ["OR", "∨"], ["NOT", "¬"], ["IMPLIES", "∨"]], answerWrongIndex: 3 },
      { type: 'sentence', sentence: "A ___ B ___ C (true if all are true)", choices: ["AND", "OR", "IMPLIES"], answer: "AND" }
    ],
    hard: [
      { type: 'sentence', sentence: "Either Alice OR Bob will present (but not both). Which operator fits?", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "OR" },
      { type: 'tt', op: "IMPLIES" },
      { type: 'fault', pairs: [["AND", "∨"], ["OR", "∨"], ["NOT", "¬"], ["IMPLIES", "→"]], answerWrongIndex: 0 },
      { type: 'sentence', sentence: "Light is ON if switch is ON ___ the switch is OFF", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" },
      { type: 'tt', op: "AND" }
    ]
  };

  const DIFFICULTY_COUNT = { easy: 5, medium: 5, hard: 5 };
  const TIME_LIMIT = { easy: 15, medium: 10, hard: 5 };

  // --- State
  const state = {
    difficulty: 'easy',
    mode: 'classic',
    questions: [],
    qindex: 0,
    score: 0,
    lives: 3,
    timer: null,
    timeLeft: 0,
    soundOn: true
  };

  // --- DOM refs
  const panels = document.querySelectorAll('.panel');
  const navButtons = document.querySelectorAll('.nav-link');
  const settingsCard = document.getElementById('settings-card');
  const gameArea = document.getElementById('game-area');
  const floatingUI = document.getElementById('floating-ui');
  const statLevel = document.getElementById('stat-level');
  const statScore = document.getElementById('stat-score');
  const statLives = document.getElementById('stat-lives');
  const floatingTimer = document.getElementById('floating-timer');
  const timerValue = document.getElementById('timer-value');
  const nameInput = document.getElementById('player-name');
  const leaderList = document.getElementById('leader-list');

  // --- Sound helper (WebAudio simple beeps)
  const audioCtx = window.AudioContext ? new AudioContext() : null;
  function playTone(freq, duration = 120, type = 'sine') {
    if (!audioCtx || !state.soundOn) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.02); o.stop(audioCtx.currentTime + 0.03); }, duration);
  }
  const playSuccess = () => playTone(880, 120, 'sine');
  const playError = () => playTone(220, 200, 'sawtooth');
  const playClick = () => playTone(660, 80, 'square');

  // --- Navigation behavior
  document.getElementById('hamburger').addEventListener('click', () => {
    const nav = document.getElementById('topnav');
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
    playClick();
  });

  navButtons.forEach(btn => btn.addEventListener('click', (e) => {
    const target = btn.dataset.target;
    goToPanel(target);
    playClick();
  }));

  function goToPanel(targetId) {
    panels.forEach(p => p.classList.remove('active-panel'));
    const panel = document.getElementById(targetId);
    if (!panel) return;
    panel.classList.add('active-panel');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // ensure settings visible if returning to home
    if (targetId === 'home') settingsCard.style.display = '';
  }

  // Tutorial button near quick start opens tutorial modal (pop-up)
  document.getElementById('quick-tutorial').addEventListener('click', () => {
    openTutorialModal();
    playClick();
  });

  // --- Settings interactivity
  function setupSettings() {
    document.querySelectorAll('#difficulty-select .settings-card').forEach(card => {
      card.onclick = function () {
        document.querySelectorAll('#difficulty-select .settings-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        state.difficulty = this.dataset.value;
      };
    });
    document.querySelectorAll('#mode-select .settings-card').forEach(card => {
      card.onclick = function () {
        document.querySelectorAll('#mode-select .settings-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        state.mode = this.dataset.value;
      };
    });
    document.getElementById('start-game').onclick = () => startRun();
    document.getElementById('quick-start').onclick = () => startRun();
    document.getElementById('open-leaderboard').onclick = () => goToPanel('leaderboard-panel');
    document.getElementById('clear-leader').onclick = () => { localStorage.removeItem('lr_leader'); renderLeaderboard(); playClick(); };
    document.getElementById('sound-toggle').onclick = () => { state.soundOn = !state.soundOn; document.getElementById('sound-toggle').querySelector('i').classList.toggle('fa-volume-mute', !state.soundOn); playClick(); };
    // floating controls
    document.getElementById('btn-quit').onclick = () => { quitToSettings(); playClick(); };
    document.getElementById('btn-retry').onclick = () => { retryRun(); playClick(); };

    // name input persistence
    if (nameInput) {
      const saved = localStorage.getItem('lr_name');
      if (saved) nameInput.value = saved;
      nameInput.addEventListener('input', () => localStorage.setItem('lr_name', nameInput.value || ''));
    }
  }

  // --- Leaderboard local storage
  function saveScore(score, name) {
    const key = 'lr_leader';
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.push({ name: name || (localStorage.getItem('lr_name') || 'Player'), score, ts: Date.now() });
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 20)));
    renderLeaderboard();
  }
  function renderLeaderboard() {
    const data = JSON.parse(localStorage.getItem('lr_leader') || '[]');
    leaderList.innerHTML = '';
    if (!data.length) { leaderList.innerHTML = '<li>No scores yet</li>'; return; }
    data.forEach((e, i) => {
      const li = document.createElement('li');
      li.textContent = `${i + 1}. ${e.name} — ${e.score} pts — ${new Date(e.ts).toLocaleString()}`;
      leaderList.appendChild(li);
    });
  }

  // --- Floating UI helpers
  function showFloating(show = true) {
    floatingUI.style.display = show ? 'block' : 'none';
    updateFloating();
  }
  function updateFloating() {
    statLevel.textContent = `${state.qindex + 1}/${state.questions.length || 1}`;
    statScore.textContent = state.score;
    statLives.textContent = state.lives;
    if (state.mode === 'timed' && state.timeLeft > 0) {
      floatingTimer.style.display = '';
      timerValue.textContent = state.timeLeft;
    } else {
      floatingTimer.style.display = 'none';
      timerValue.textContent = '';
    }
  }

  // --- Timer
  function startTimer(sec, onExpire) {
    stopTimer();
    state.timeLeft = sec;
    updateFloating();
    state.timer = setInterval(() => {
      state.timeLeft--;
      updateFloating();
      if (state.timeLeft <= 0) {
        stopTimer();
        onExpire();
      }
    }, 1000);
  }
  function stopTimer() {
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    state.timeLeft = 0;
    updateFloating();
  }

  // --- Game flow
  function startRun() {
    playClick();
    // Hide settings, show floating UI
    settingsCard.style.display = 'none';
    showFloating(true);

    state.score = 0;
    state.lives = 3;
    state.qindex = 0;

    // Build unique question list for this difficulty, randomized
    const pool = shuffle(POOLS[state.difficulty]).slice(0, DIFFICULTY_COUNT[state.difficulty]);
    state.questions = pool;
    renderQuestion();
  }

  function retryRun() {
    stopTimer();
    playClick();
    startRun();
  }

  function quitToSettings() {
    stopTimer();
    showFloating(false);
    settingsCard.style.display = '';
    gameArea.innerHTML = '';
    playClick();
  }

  // --- Render question by type
  function renderQuestion() {
    stopTimer();
    updateFloating();
    const q = state.questions[state.qindex];
    if (!q) { finishRun(); return; }

    // start timer for timed mode per question
    if (state.mode === 'timed') startTimer(TIME_LIMIT[state.difficulty], () => { loseLife("Time's up!"); advanceAfterDelay(); });

    // render
    if (q.type === 'match') renderMatch(q);
    else if (q.type === 'sentence') renderSentence(q);
    else if (q.type === 'tt') renderTruthTable(q);
    else if (q.type === 'fault') renderFault(q);
    else renderEmpty();
  }

  function renderEmpty() { gameArea.innerHTML = '<div class="card"><p>No question.</p></div>'; }

  // --- Match (drag names to symbols)
  function renderMatch(q) {
    const ops = q.ops.slice();
    const opPairs = Object.fromEntries(ops.map(n => [n, operators.find(o => o.name === n).symbol]));
    const left = shuffle(ops);
    const right = shuffle(Object.values(opPairs));
    gameArea.innerHTML = `
      <div class="card">
        <div class="game-section-title">Symbol Match</div>
        <p class="subtitle">Drag operator names to the correct symbols.</p>
        <div class="matching-container">
          <div class="game-column"><div class="column-title">Operators</div>${left.map(n => `<div class="draggable-item" draggable="true" data-op="${n}">${n}</div>`).join('')}</div>
          <div class="game-column"><div class="column-title">Symbols</div>${right.map(s => `<div class="drop-zone" data-sym="${s}"><span class="zone-label">${s}</span></div>`).join('')}</div>
        </div>
        <div style="margin-top:12px"><button id="check-btn" class="btn btn-primary">Check</button></div>
      </div>`;
    setupMatchDrag(opPairs);
  }

  function setupMatchDrag(correctPairs) {
    const draggables = gameArea.querySelectorAll('.draggable-item');
    const drops = gameArea.querySelectorAll('.drop-zone');
    let matched = 0;

    draggables.forEach(d => {
      d.ondragstart = (e) => { e.dataTransfer.setData('text/plain', d.dataset.op); d.classList.add('dragging'); };
      d.ondragend = () => d.classList.remove('dragging');
    });

    drops.forEach(zone => {
      zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('drag-over'); };
      zone.ondragleave = () => zone.classList.remove('drag-over');
      zone.ondrop = (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (zone.dataset.locked) return;
        const op = e.dataTransfer.getData('text/plain');
        if (correctPairs[op] === zone.dataset.sym) {
          zone.innerHTML = `<span class="zone-label">${zone.dataset.sym}</span><div class="match-content">${op}</div>`;
          zone.dataset.locked = '1';
          matched++;
          playSuccess();
        } else {
          zone.classList.add('incorrect'); setTimeout(() => zone.classList.remove('incorrect'), 700);
          loseLife();
          playError();
        }
      };
    });

    const checkBtn = document.getElementById('check-btn');
    checkBtn.onclick = () => {
      const locked = gameArea.querySelectorAll('.drop-zone[data-locked="1"]').length;
      if (locked === Object.keys(correctPairs).length) {
        state.score += 15 * locked;
        playSuccess();
        advanceAfterDelay();
      } else {
        showToast('Finish all matches first', 'warning');
        playError();
      }
    };
  }

  // --- Sentence (drag choice into blank)
  function renderSentence(q) {
    gameArea.innerHTML = `
      <div class="card">
        <div class="game-section-title">Statement Builder</div>
        <p class="subtitle">${q.sentence.replace('___', '____')}</p>
        <div id="sentence-choices" style="display:flex;gap:10px;margin-top:12px">${q.choices.map(c => `<div class="draggable-item" draggable="true" data-choice="${c}">${c}</div>`).join('')}</div>
        <div style="margin-top:12px"><div id="sentence-drop" class="drop-zone">Drop here</div></div>
        <div style="margin-top:12px"><button id="check-sentence" class="btn btn-primary">Check</button></div>
      </div>`;
    gameArea.querySelectorAll('#sentence-choices .draggable-item').forEach(d => d.ondragstart = e => e.dataTransfer.setData('text/plain', d.dataset.choice));
    const drop = document.getElementById('sentence-drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-over'); };
    drop.ondragleave = () => drop.classList.remove('drag-over');
    drop.ondrop = e => { e.preventDefault(); drop.textContent = e.dataTransfer.getData('text/plain'); drop.classList.remove('empty'); };

    document.getElementById('check-sentence').onclick = () => {
      const val = drop.textContent.trim();
      if (!val) { showToast('Drop a choice', 'warning'); playError(); return; }
      if (val === q.answer) {
        state.score += 25; playSuccess(); advanceAfterDelay();
      } else { loseLife(); playError(); }
    };
  }

  // --- Truth Table
  function renderTruthTable(q) {
    const op = operators.find(o => o.name === q.op);
    const combos = [[true, true], [true, false], [false, true], [false, false]];
    gameArea.innerHTML = `
      <div class="card">
        <div class="game-section-title">Truth Table: ${op.name} (${op.symbol})</div>
        <p class="subtitle">${op.desc}</p>
        <table style="width:100%;margin-top:10px">
          <tr><th>A</th><th>B</th><th>Result</th></tr>
          ${combos.map((c, i) => `<tr><td>${c[0] ? 'T' : 'F'}</td><td>${c[1] ? 'T' : 'F'}</td><td><div class="drop-zone tt-drop" data-idx="${i}"></div></td></tr>`).join('')}
        </table>
        <div style="margin-top:12px">${['T', 'F', 'T', 'F'].map(v => `<div class="draggable-item tt-chip" draggable="true" data-val="${v}">${v}</div>`).join('')}</div>
        <div style="margin-top:12px"><button id="check-tt" class="btn btn-primary">Check</button></div>
      </div>`;
    document.querySelectorAll('.tt-chip').forEach(c => c.ondragstart = e => e.dataTransfer.setData('text/plain', c.dataset.val));
    document.querySelectorAll('.tt-drop').forEach(d => {
      d.ondragover = e => { e.preventDefault(); d.classList.add('drag-over'); };
      d.ondrop = e => { e.preventDefault(); d.textContent = e.dataTransfer.getData('text/plain'); d.classList.remove('empty'); };
    });
    document.getElementById('check-tt').onclick = () => {
      const drops = gameArea.querySelectorAll('.tt-drop');
      const user = Array.from(drops).map(d => d.textContent.trim());
      if (user.some(x => !x)) { showToast('Fill every result', 'warning'); playError(); return; }
      const results = combos.map(c => {
        if (q.op === 'AND') return c[0] && c[1];
        if (q.op === 'OR') return c[0] || c[1];
        if (q.op === 'IMPLIES') return !c[0] || c[1];
        if (q.op === 'NOT') return !c[0];
      });
      const ok = user.every((v, i) => v === (results[i] ? 'T' : 'F'));
      if (ok) { state.score += 45; playSuccess(); advanceAfterDelay(); } else { loseLife(); playError(); }
    };
  }

  // --- Find the Fault
  function renderFault(q) {
    gameArea.innerHTML = `
      <div class="card">
        <div class="game-section-title">Find the Fault</div>
        <p class="subtitle">Drag the incorrect match to the box</p>
        <div style="display:flex;gap:18px">
          <div style="flex:1">${q.pairs.map((p, i) => `<div class="draggable-item fault-item" draggable="true" data-idx="${i}">${p[0]} <span class="zone-label">${p[1]}</span></div>`).join('')}</div>
          <div style="width:170px"><div class="drop-zone" id="fault-drop" style="height:48px;display:flex;align-items:center;justify-content:center">Drop</div></div>
        </div>
      </div>`;
    gameArea.querySelectorAll('.fault-item').forEach(d => d.ondragstart = e => e.dataTransfer.setData('text/plain', d.dataset.idx));
    const drop = document.getElementById('fault-drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-over'); };
    drop.ondrop = e => {
      e.preventDefault(); drop.classList.remove('drag-over');
      const idx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (idx === q.answerWrongIndex) { state.score += 30; playSuccess(); advanceAfterDelay(); } else { loseLife(); playError(); }
    };
  }

  // --- Progression, scoring, finish
  function advanceAfterDelay() {
    stopTimer();
    state.qindex++;
    if (state.qindex >= state.questions.length) finishRun();
    else { updateFloating(); setTimeout(renderQuestion, 600); }
  }

  function loseLife(msg) {
    if (msg) showToast(msg, 'error');
    state.lives--;
    updateFloating();
    if (state.lives <= 0) showGameOverModal();
  }

  function finishRun() {
    stopTimer();
    renderLeaderboard(); // refresh list
    // show submit name modal for leaderboard
    openSubmitScoreModal();
  }

  // --- Modals and UI utils
  function showToast(txt, type = 'info') {
    // remove existing toast
    const ex = document.querySelector('.game-message');
    if (ex) ex.remove();
    const t = document.createElement('div');
    t.className = 'game-message';
    t.textContent = txt;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 1800);
  }

  function openTutorialModal() {
    // single tutorial modal
    closeExistingModal();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-popup">
        <div class="card-title"><i class="fas fa-book"></i> Tutorial</div>
        <ol style="margin-top:10px">
          <li>Choose Difficulty & Mode, then press Start.</li>
          <li>Drag operator names to symbols or answers as prompted.</li>
          <li>In Timed mode, timer starts on the first question.</li>
        </ol>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
          <button id="tut-close" class="btn btn-secondary">Close</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#tut-close').onclick = () => { modal.remove(); };
  }

  function openSubmitScoreModal() {
    closeExistingModal();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const savedName = localStorage.getItem('lr_name') || '';
    modal.innerHTML = `
      <div class="modal-popup">
        <div class="card-title"><i class="fas fa-flag-checkered"></i> Run Complete</div>
        <p>Your score: <strong>${state.score}</strong></p>
        <div style="margin-top:8px;">
          <input id="modal-name" class="name-input" placeholder="Enter name" value="${savedName}" />
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
          <button id="save-score" class="btn btn-primary">Save</button>
          <button id="skip-score" class="btn btn-secondary">Skip</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#save-score').onclick = () => {
      const name = (modal.querySelector('#modal-name').value || 'Player').trim();
      localStorage.setItem('lr_name', name);
      saveScore(state.score, name);
      modal.remove();
      showToast('Score saved', 'success');
      goToPanel('leaderboard-panel');
      showFloating(false);
    };
    modal.querySelector('#skip-score').onclick = () => { modal.remove(); goToPanel('leaderboard-panel'); showFloating(false); };
  }

  function showGameOverModal() {
    closeExistingModal();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-popup">
        <div class="card-title"><i class="fas fa-heart-broken"></i> Game Over</div>
        <p>You ran out of lives. Try again?</p>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
          <button id="modal-retry" class="btn btn-primary">Retry</button>
          <button id="modal-quit" class="btn btn-secondary">Quit</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#modal-retry').onclick = () => { modal.remove(); retryRun(); };
    modal.querySelector('#modal-quit').onclick = () => { modal.remove(); quitToSettings(); };
  }

  function closeExistingModal() {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();
  }

  // --- Leaderboard render at init
  function renderLeaderboard() {
    const data = JSON.parse(localStorage.getItem('lr_leader') || '[]');
    leaderList.innerHTML = '';
    if (!data.length) { leaderList.innerHTML = '<li>No scores yet</li>'; return; }
    data.forEach((e, i) => {
      const li = document.createElement('li');
      li.textContent = `${i + 1}. ${e.name} — ${e.score} pts — ${new Date(e.ts).toLocaleString()}`;
      leaderList.appendChild(li);
    });
  }

  // --- Initialize and wire up
  function init() {
    setupSettings();
    renderLeaderboard();
    // wire tutorial nav button from top nav to open tutorial modal when clicked
    document.querySelectorAll('.nav-link').forEach(btn => {
      if (btn.dataset.target === 'tutorial-panel') {
        btn.addEventListener('click', (e) => { e.preventDefault(); openTutorialModal(); });
      }
    });
    // ensure "About" nav scrolls to about panel rather than modal
    document.querySelectorAll('.nav-link').forEach(btn => {
      if (btn.dataset.target === 'about-panel' || btn.dataset.target === 'leaderboard-panel' || btn.dataset.target === 'home') {
        btn.addEventListener('click', (e) => { e.preventDefault(); goToPanel(btn.dataset.target); });
      }
    });
    // ensure quick start shows floating and starts
    document.getElementById('quick-start').addEventListener('click', () => { startRun(); });
    showFloating(false);
  }

  // start
  init();
})();