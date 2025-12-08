// --- LOGIC RUNNER UI & GAME v3 ---
(() => {
  const operators = [
    { name: "AND", symbol: "∧" },
    { name: "OR", symbol: "∨" },
    { name: "IMPLIES", symbol: "→" },
    { name: "NOT", symbol: "¬" }
  ];
  const truthTableVariants = [
    {
      op: "OR", label: "Inclusive OR (∨): true unless both are false.",
      columns: ["p", "q", "p∨q"],
      table: [
        { p: true, q: true, r: true },
        { p: true, q: false, r: true },
        { p: false, q: true, r: true },
        { p: false, q: false, r: false }
      ]
    },
    {
      op: "XOR", label: "Exclusive OR (⊕): true if one is true, not both.",
      columns: ["p", "q", "p⊕q"],
      table: [
        { p: true, q: true, r: false },
        { p: true, q: false, r: true },
        { p: false, q: true, r: true },
        { p: false, q: false, r: false }
      ]
    },
    {
      op: "NOT", label: "Negation (¬p): flips true/false", columns: ["p", "¬p"],
      table: [
        { p: true, r: false },
        { p: false, r: true }
      ]
    },
    {
      op: "IMPLIES", label: "Implication (→): false only if true→false.",
      columns: ["p", "q", "p→q"],
      table: [
        { p: true, q: true, r: true },
        { p: true, q: false, r: false },
        { p: false, q: true, r: true },
        { p: false, q: false, r: true }
      ]
    },
    {
      op: "AND", label: "AND (∧): only true if both are true.",
      columns: ["p", "q", "p∧q"],
      table: [
        { p: true, q: true, r: true },
        { p: true, q: false, r: false },
        { p: false, q: true, r: false },
        { p: false, q: false, r: false }
      ]
    }
  ];
  const sentenceQs = {
    easy: [
      { type: 'sentence', sentence: "A ___ B (true if both are true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "AND" },
      { type: 'sentence', sentence: "A ___ B (true if either is true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "OR" },
      { type: 'sentence', sentence: "___ A (true if A is false)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "NOT" },
      { type: 'sentence', sentence: "If it rains ___ you use an umbrella", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "IMPLIES" },
      { type: 'sentence', sentence: "If John is a programmer ___ Mary is a lawyer", choices: ["AND", "OR", "IMPLIES"], answer: "OR" }
    ],
    medium: [
      { type: 'sentence', sentence: "You can enter if you have a ticket ___ your name is on the list.", choices: ["AND", "OR", "IMPLIES"], answer: "OR" },
      { type: 'sentence', sentence: "If you miss class, ___ you may fall behind", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" },
      { type: 'sentence', sentence: "A ___ B ___ C (true if all are true)", choices: ["AND", "OR", "IMPLIES"], answer: "AND" },
      { type: 'sentence', sentence: "Either John is a programmer or Mary is a lawyer", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "OR" },
      { type: 'sentence', sentence: "Negation (¬): 'It is not the case that A'", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "NOT" }
    ],
    hard: [
      { type: 'sentence', sentence: "Light is ON if switch is ON ___ switch is OFF", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" },
      { type: 'sentence', sentence: "Either Alice OR Bob will present (but not both). Operator?", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "OR" },
      { type: 'sentence', sentence: "p∨q is only false if ___", choices: ["both are false", "both are true"], answer: "both are false" },
      { type: 'sentence', sentence: "p⊕q is only true if ___", choices: ["one of them is true", "both are true"], answer: "one of them is true" },
      { type: 'sentence', sentence: "Negation of p: true if p is ___", choices: ["false", "true"], answer: "false" }
    ]
  };
  function shuffle(arr) { arr = arr.slice(); for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]} return arr }
  function buildMatchQuestions() {return shuffle([{ type:'match', ops:['AND','OR','NOT','IMPLIES'] },{ type:'match', ops:['AND','OR','IMPLIES','NOT'] },{ type:'match', ops:['OR','NOT','AND','IMPLIES'] }]);}
  function buildTruthTableQuestions(diff){
    let pool=diff==="easy"? [truthTableVariants[0],truthTableVariants[4],truthTableVariants[2]] :
      diff==="medium"? [truthTableVariants[0],truthTableVariants[1],truthTableVariants[2],truthTableVariants[3],truthTableVariants[4]] :
      [truthTableVariants[1],truthTableVariants[3],truthTableVariants[4],truthTableVariants[2],truthTableVariants[0]];
    return shuffle(pool);
  }
  function buildQuestions(diff) {
    const matches = buildMatchQuestions().slice(0,2);
    const sentences = shuffle(sentenceQs[diff]).slice(0,2);
    const tt = buildTruthTableQuestions(diff)[0];
    return shuffle([...matches, ...sentences, {...tt, type:'tt'}]);
  }
  // ==== STATE
  const state = {difficulty:'easy',mode:'classic',questions:[],qindex:0,score:0,lives:3,timer:null,timeLeft:0,soundOn:true};
  // ==== DOM
  const hero = document.getElementById('hero-section');
  const gameArea = document.getElementById('game-area');
  const settingsCard = document.getElementById('settings-card');
  const floatingUI = document.getElementById('floating-ui');
  const statLevel = document.getElementById('stat-level');
  const statScore = document.getElementById('stat-score');
  const statLives = document.getElementById('stat-lives');
  const floatingTimer = document.getElementById('floating-timer');
  const timerValue = document.getElementById('timer-value');
  // ==== ANIM SOUND
  const audioCtx = window.AudioContext ? new AudioContext() : null;
  function playTone(f, d = 130, type = 'sine') { if (!audioCtx || !state.soundOn) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = type; o.frequency.value = f; g.gain.value = 0.06; o.connect(g); g.connect(audioCtx.destination); o.start(); setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.02); o.stop(audioCtx.currentTime + 0.03); }, d)}
  const soundSuccess =()=>playTone(1032,110,'triangle');
  const soundError =()=>playTone(180,170,'square');
  const soundClick =()=>playTone(530,60,'sine');
  // ==== NAV / MOBILE
  function navSetup(){
    let mobBtn=document.getElementById('hamburger'),topnav=document.getElementById('topnav'),mnav=document.getElementById('mobile-nav'),closeNav=document.getElementById('close-mobile-nav');
    mobBtn.onclick=()=>{mnav.classList.add('open');};
    closeNav.onclick=()=>{mnav.classList.remove('open');};
    mnav.querySelectorAll('button[data-target]').forEach(btn=>btn.onclick=()=>{
      goToPanel(btn.getAttribute('data-target'));
      mnav.classList.remove('open');
    });
    document.querySelectorAll('.nav-btn').forEach(btn=>btn.onclick=(ev)=>{ev.preventDefault();goToPanel(btn.dataset.target);soundClick();});
  }
  function showFloating(show=true){floatingUI.style.display=show?'block':'none';updateFloating()}
  function updateFloating(){
    statLevel.textContent = `${state.qindex + 1}/${state.questions.length}`;
    statScore.textContent = state.score;
    statLives.textContent = state.lives;
    if (state.mode === 'timed' && state.timeLeft > 0) { floatingTimer.style.display = ''; timerValue.textContent = state.timeLeft; } else { floatingTimer.style.display = 'none'; timerValue.textContent = ''; }
  }
  function focusGamePanel(on = true) { if (on) { hero.classList.add('focus-hide'); gameArea.classList.add('focused'); } else { hero.classList.remove('focus-hide'); gameArea.classList.remove('focused'); } }
  function startTimer(sec, onExpire) { stopTimer(); state.timeLeft = sec; updateFloating(); state.timer = setInterval(() => { state.timeLeft--; updateFloating(); if (state.timeLeft <= 0) { stopTimer(); onExpire(); } }, 1000); }
  function stopTimer() { if (state.timer) { clearInterval(state.timer); state.timer = null; } state.timeLeft = 0; updateFloating() }
  function goToPanel(target) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-panel'));
    const panel = document.getElementById(target); if (panel) panel.classList.add('active-panel');
    settingsCard.style.display = (target === 'home') ? '' : 'none';
    focusGamePanel(false); showFloating(false);
  }
  function setupSettings() {
    document.querySelectorAll('#difficulty-select .settings-card').forEach(card => {
      card.onclick = () => { document.querySelectorAll('#difficulty-select .settings-card').forEach(c => c.classList.remove('active')); card.classList.add('active'); state.difficulty = card.dataset.value; soundClick() }
    });
    document.querySelectorAll('#mode-select .settings-card').forEach(card => {
      card.onclick = () => { document.querySelectorAll('#mode-select .settings-card').forEach(c => c.classList.remove('active')); card.classList.add('active'); state.mode = card.dataset.value; soundClick() }
    });
    document.getElementById('start-game').onclick = startRun;
    document.getElementById('quick-start').onclick = startRun;
    document.getElementById('btn-quit').onclick = () => { quitToSettings(); soundClick() }
    document.getElementById('btn-retry').onclick = () => { retryRun(); soundClick() }
    document.getElementById('sound-toggle').onclick = () => { state.soundOn = !state.soundOn; document.getElementById('sound-toggle').querySelector('i').classList.toggle('fa-volume-mute', !state.soundOn); soundClick() }
    document.getElementById('quick-tutorial').onclick = openTutorialModal;
    document.getElementById('clear-leader').onclick = () => { localStorage.removeItem('lr_leader'); renderLeaderboard(); soundClick() }
    document.getElementById('open-leaderboard').onclick = () => { goToPanel('leaderboard-panel') }
    if (document.getElementById('player-name')) {
      const saved = localStorage.getItem('lr_name'); if (saved) document.getElementById('player-name').value = saved;
      document.getElementById('player-name').oninput = () => localStorage.setItem('lr_name', document.getElementById('player-name').value || '');
    }
  }
  function startRun() {
    soundClick();
    settingsCard.style.display = 'none';
    showFloating(true); focusGamePanel(true);
    state.score = 0; state.lives = 3; state.qindex = 0;
    state.questions = buildQuestions(state.difficulty);
    renderQuestion();
  }
  function retryRun() { stopTimer(); startRun() }
  function quitToSettings() { stopTimer(); showFloating(false); settingsCard.style.display = ''; gameArea.innerHTML = ''; focusGamePanel(false) }
  function advanceAfterDelay() { stopTimer(); state.qindex++; if (state.qindex >= state.questions.length) { finishRun() } else { setTimeout(renderQuestion, 650) } }
  function loseLife(msg) { if (msg) showToast(msg, 'error'); state.lives--; updateFloating(); if (state.lives <= 0) showGameOverModal() }
  function finishRun() { stopTimer(); renderLeaderboard(); openSubmitScoreModal(); focusGamePanel(false); settingsCard.style.display = ''; showFloating(false); }
  // Question types
  function renderQuestion() {
    stopTimer(); updateFloating();
    const q = state.questions[state.qindex];
    if (!q) { finishRun(); return }
    if (state.mode === 'timed') startTimer(state.difficulty === "easy" ? 15 : state.difficulty === "medium" ? 10 : 7, () => { loseLife("Time's up!"); advanceAfterDelay() });
    if (q.type === 'match') renderMatch(q);
    else if (q.type === 'sentence') renderSentence(q);
    else if (q.type === 'tt') renderTruthTable(q);
    else renderEmpty();
  }
  function renderEmpty() { gameArea.innerHTML = '<div class="card"><p>No question.</p></div>' }
  function renderMatch(q) {
    const opPairs = Object.fromEntries(q.ops.map(n => [n, operators.find(o => o.name === n).symbol]));
    const left = shuffle(q.ops); const right = shuffle(Object.values(opPairs));
    gameArea.innerHTML = `<div class="card" style="animation:cardIn .47s;"><div class="game-section-title">Symbol Match</div>
      <div class="subtitle">Drag operator names to correct symbols.</div>
      <div class="matching-container">
        <div class="game-column"><div class="column-title">Operators</div>${left.map(n => `<div class="draggable-item" draggable="true" data-op="${n}">${n}</div>`).join('')}</div>
        <div class="game-column"><div class="column-title">Symbols</div>${right.map(s => `<div class="drop-zone" data-sym="${s}"><span class="zone-label">${s}</span></div>`).join('')}</div>
      </div>
      <div style="margin-top:18px"><button id="check-btn" class="btn btn-primary">Check</button></div>
    </div>`;
    setupMatchDrag(opPairs);
  }
  function setupMatchDrag(correctPairs) {
    const draggables = gameArea.querySelectorAll('.draggable-item'), drops = gameArea.querySelectorAll('.drop-zone'); let matched = 0;
    draggables.forEach(d => { d.ondragstart = e => { e.dataTransfer.setData('text/plain', d.dataset.op); d.classList.add('dragging') }; d.ondragend = () => d.classList.remove('dragging') });
    drops.forEach(zone => {
      zone.ondragover = e => { e.preventDefault(); zone.classList.add('drag-over') };
      zone.ondragleave = () => zone.classList.remove('drag-over');
      zone.ondrop = e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        if (zone.dataset.locked) return;
        const op = e.dataTransfer.getData('text/plain');
        if (correctPairs[op] === zone.dataset.sym) {
          zone.innerHTML = `<span class="zone-label">${zone.dataset.sym}</span><div class="match-content">${op}</div>`; zone.dataset.locked = '1'; matched++; soundSuccess();
        } else { zone.classList.add('incorrect'); setTimeout(() => zone.classList.remove('incorrect'), 600); loseLife(); soundError(); }
      }
    });
    gameArea.querySelector('#check-btn').onclick = () => {
      const locked = gameArea.querySelectorAll('.drop-zone[data-locked="1"]').length;
      if (locked === Object.keys(correctPairs).length) { state.score += 16 * locked; soundSuccess(); advanceAfterDelay(); }
      else { showToast('Finish all matches first', 'warning'); soundError(); }
    }
  }
  function renderSentence(q) {
    gameArea.innerHTML = `<div class="card" style="animation:cardIn .57s;">
      <div class="game-section-title">Sentence Builder</div>
      <div class="subtitle">${q.sentence.replace('___', '____')}</div>
      <div style="display:flex;gap:12px;margin-top:15px" id="sentence-choices">${q.choices.map(c => `<div class="draggable-item" draggable="true" data-choice="${c}">${c}</div>`).join('')}</div>
      <div style="margin-top:12px"><div id="sentence-drop" class="drop-zone">Drop here</div></div>
      <div style="margin-top:14px"><button id="check-sentence" class="btn btn-primary">Check</button></div>
    </div>`;
    gameArea.querySelectorAll('#sentence-choices .draggable-item').forEach(d => d.ondragstart = e => e.dataTransfer.setData('text/plain', d.dataset.choice));
    const drop = gameArea.querySelector('#sentence-drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-over') }; drop.ondragleave = () => drop.classList.remove('drag-over'); drop.ondrop = e => { e.preventDefault(); drop.textContent = e.dataTransfer.getData('text/plain'); drop.classList.remove('empty') }
    gameArea.querySelector('#check-sentence').onclick = () => {
      const val = drop.textContent.trim();
      if (!val) { showToast('Drop a choice', 'warning'); soundError(); return; }
      if (val === q.answer) { state.score += 24; soundSuccess(); advanceAfterDelay() } else { loseLife(); soundError(); }
    }
  }
  function renderTruthTable(q){
    const cols = q.columns;
    let table = q.table;
    gameArea.innerHTML = `<div class="card" style="animation:cardIn .61s;">
      <div class="game-section-title">Truth Table Task</div>
      <div class="subtitle">${q.label}</div>
      <table class="tt-table" style="width:100%;margin-top:13px">
        <tr>${cols.map(c=>`<th>${c.toUpperCase()}</th>`).join('')}</tr>
        ${table.map((row,i)=>`<tr>${
            cols.slice(0,-1).map(k=>`<td>${row[k]===undefined?'':row[k]===true?'T':'F'}</td>`).join('')
          }<td><div class="drop-zone tt-drop" data-idx="${i}"></div></td></tr>`).join('')}
      </table>
      <div style="margin-top:13px">${['T','F','T','F'].map(v=>`<div class="draggable-item tt-chip" draggable="true" data-val="${v}">${v}</div>`).join('')}</div>
      <div style="margin-top:14px"><button id="check-tt" class="btn btn-primary">Check</button></div>
    </div>`;
    gameArea.querySelectorAll('.tt-chip').forEach(c => c.ondragstart = e => e.dataTransfer.setData('text/plain', c.dataset.val));
    gameArea.querySelectorAll('.tt-drop').forEach(d => {
      d.ondragover = e => { e.preventDefault(); d.classList.add('drag-over') };
      d.ondrop = e => { e.preventDefault(); d.textContent = e.dataTransfer.getData('text/plain'); d.classList.remove('empty') }
    });
    gameArea.querySelector('#check-tt').onclick = () => {
      const drops = gameArea.querySelectorAll('.tt-drop'), user = Array.from(drops).map(d => d.textContent.trim());
      if (user.some(x => !x)) { showToast('Fill every result', 'warning'); soundError(); return; }
      const ok = user.every((v, i) => v === (table[i].r ? 'T' : 'F'));
      if (ok) { state.score += 40; soundSuccess(); advanceAfterDelay() } else { loseLife(); soundError(); }
    }
  }
  // UI helpers/modals
  function showToast(txt, type = 'info') { const ex = document.querySelector('.game-message'); if (ex) ex.remove(); const t = document.createElement('div'); t.className = 'game-message'; t.textContent = txt; document.body.appendChild(t); setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 350) }, 1500); }
  function openTutorialModal() { closeModal(); const modal = document.createElement('div'); modal.className = 'modal-overlay'; modal.innerHTML = `<div class="modal-popup">
      <div class="card-title"><i class="fas fa-book"></i> Tutorial</div>
      <ol style="margin-top:10px"><li>Logic and math-based questions for AND, OR, IMPLIES, NOT, XOR.<li>Drag/drop, fill, or select correct answers and tables.<li>Score and compete!</ol>
      <div style="margin-top:12px;display:flex;gap:11px;justify-content:flex-end"><button id="tut-close" class="btn btn-secondary">Close</button></div>
    </div>`; document.body.appendChild(modal); modal.querySelector('#tut-close').onclick = () => modal.remove(); }
  function openSubmitScoreModal() { closeModal(); const modal = document.createElement('div'); modal.className = 'modal-overlay'; const savedName = localStorage.getItem('lr_name') || ''; modal.innerHTML = `<div class="modal-popup">
      <div class="card-title"><i class="fas fa-flag-checkered"></i> Run Complete</div>
      <p>Your score: <strong>${state.score}</strong></p>
      <div style="margin-top:8px;">
        <input id="modal-name" class="name-input" placeholder="Enter name" value="${savedName}" />
      </div>
      <div style="margin-top:12px;display:flex;gap:11px;justify-content:flex-end">
        <button id="save-score" class="btn btn-primary">Save</button>
        <button id="skip-score" class="btn btn-secondary">Skip</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#save-score').onclick = () => {
      const name = (modal.querySelector('#modal-name').value || 'Player').trim();
      localStorage.setItem('lr_name', name);
      saveScore(state.score, name); modal.remove();
      showToast('Score saved', 'success'); goToPanel('leaderboard-panel'); showFloating(false);
    }
    modal.querySelector('#skip-score').onclick = () => { modal.remove(); goToPanel('leaderboard-panel'); showFloating(false); }
  }
  function showGameOverModal() { closeModal(); const modal = document.createElement('div'); modal.className = 'modal-overlay'; modal.innerHTML = `<div class="modal-popup">
      <div class="card-title"><i class="fas fa-heart-broken"></i> Game Over</div>
      <p>You ran out of lives. Try again?</p>
      <div style="margin-top:12px;display:flex;gap:11px;justify-content:center">
        <button id="modal-retry" class="btn btn-primary">Retry</button>
        <button id="modal-quit" class="btn btn-secondary">Quit</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#modal-retry').onclick = () => { modal.remove(); retryRun(); };
    modal.querySelector('#modal-quit').onclick = () => { modal.remove(); quitToSettings(); };
  }
  function closeModal() { const ex = document.querySelector('.modal-overlay'); if (ex) ex.remove(); }
  function saveScore(score, name) {
    const key = 'lr_leader'; const data = JSON.parse(localStorage.getItem(key) || '[]'); data.push({ name: name || 'Player', score, ts: Date.now() }); data.sort((a, b) => b.score - a.score); localStorage.setItem(key, JSON.stringify(data.slice(0, 20))); renderLeaderboard();
  }
  function renderLeaderboard() {
    const list = document.getElementById('leader-list'); const data = JSON.parse(localStorage.getItem('lr_leader') || '[]');
    list.innerHTML = ''; if (!data.length) { list.innerHTML = '<li>No scores yet</li>'; return; }
    data.forEach((e, i) => { const li = document.createElement('li'); li.textContent = `${i + 1}. ${e.name} — ${e.score} pts — ${new Date(e.ts).toLocaleString()}`; list.appendChild(li) });
  }
  function init() { navSetup(); setupSettings(); renderLeaderboard(); goToPanel('home'); showFloating(false); }
  init();
})();