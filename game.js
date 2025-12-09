/* Full working game.js
   - Navigation fixed (hamburger dropdown)
   - HUD shows only in-game
   - Hides other sections when running
   - Removed XOR from banks
   - Check buttons use .btn-check
*/

(() => {
  // ---------- DATA ----------
  const operators = [
    { name: "AND", symbol: "∧" },
    { name: "OR", symbol: "∨" },
    { name: "IMPLIES", symbol: "→" },
    { name: "NOT", symbol: "¬" }
  ];

  // truth tables (no XOR)
  const truthTableVariants = [
    {
      op: "AND",
      label: "AND (∧): true only if both are true.",
      columns: ["p", "q", "p∧q"],
      table: [
        { p: true, q: true, r: true },
        { p: true, q: false, r: false },
        { p: false, q: true, r: false },
        { p: false, q: false, r: false }
      ]
    },
    {
      op: "OR",
      label: "OR (∨): true if at least one is true.",
      columns: ["p", "q", "p∨q"],
      table: [
        { p: true, q: true, r: true },
        { p: true, q: false, r: true },
        { p: false, q: true, r: true },
        { p: false, q: false, r: false }
      ]
    },
    {
      op: "IMPLIES",
      label: "IMPLIES (→): false only when p true and q false.",
      columns: ["p", "q", "p→q"],
      table: [
        { p: true, q: true, r: true },
        { p: true, q: false, r: false },
        { p: false, q: true, r: true },
        { p: false, q: false, r: true }
      ]
    },
    {
      op: "NOT",
      label: "NOT (¬p): flips true/false.",
      columns: ["p", "¬p"],
      table: [
        { p: true, r: false },
        { p: false, r: true }
      ]
    }
  ];

  // rich sentence bank per difficulty (no XOR)
  const sentenceBank = {
    easy: [
      { type: 'sentence', sentence: "A ___ B (true if both are true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "AND" },
      { type: 'sentence', sentence: "A ___ B (true if either is true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "OR" },
      { type: 'sentence', sentence: "___ A (true if A is false)", choices: ["NOT", "AND", "OR", "IMPLIES"], answer: "NOT" },
      { type: 'sentence', sentence: "If it rains ___ you use an umbrella", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" },
      { type: 'sentence', sentence: "A and B is written as A ___ B", choices: ["AND", "OR", "IMPLIES"], answer: "AND" },
      { type: 'sentence', sentence: "If p then q is written p ___ q", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" }
    ],
    medium: [
      { type: 'sentence', sentence: "p∨q is false only when ___", choices: ["both are false", "both are true"], answer: "both are false" },
      { type: 'sentence', sentence: "Negation ¬ distributes over OR: ¬(p∨q) = ___", choices: ["¬p∧¬q", "p∨q"], answer: "¬p∧¬q" },
      { type: 'sentence', sentence: "If you pass the test ___ you get a certificate", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" },
      { type: 'sentence', sentence: "A ___ B ___ C (true if all are true)", choices: ["AND", "OR", "IMPLIES"], answer: "AND" }
    ],
    hard: [
      { type: 'sentence', sentence: "When is p→q false? ___", choices: ["p true and q false", "p false and q true"], answer: "p true and q false" },
      { type: 'sentence', sentence: "Bi-conditional p↔q is true when ___", choices: ["p and q same truth", "always true"], answer: "p and q same truth" },
      { type: 'sentence', sentence: "Contrapositive of p→q is ___", choices: ["¬q→¬p", "q→p"], answer: "¬q→¬p" },
      { type: 'sentence', sentence: "Express 'not (p and q)' as ___", choices: ["¬p or ¬q", "p and q"], answer: "¬p or ¬q" }
    ]
  };

  // match pool per difficulty (no XOR)
  const matchPools = {
    easy: ['AND','OR','NOT'],
    medium: ['AND','OR','IMPLIES'],
    hard: ['AND','OR','IMPLIES','NOT']
  };

  // ---------- UTIL ----------
  function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }
  function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  // ---------- STATE ----------
  const state = {
    difficulty: 'easy',
    mode: 'classic',
    questions: [],
    qindex: 0,
    score: 0,
    lives: 3,
    timer: null,
    timeLeft: 0,
    soundOn: true,
    usedIds: new Set()
  };

  // ---------- DOM refs ----------
  const hero = document.getElementById('hero-section');
  const gameArea = document.getElementById('game-area');
  const settingsCard = document.getElementById('settings-card');
  const floatingUI = document.getElementById('floating-ui');
  const statLevel = document.getElementById('stat-level');
  const statScore = document.getElementById('stat-score');
  const statLives = document.getElementById('stat-lives');
  const floatingTimer = document.getElementById('floating-timer');
  const timerValue = document.getElementById('timer-value');
  const btnRetry = document.getElementById('btn-retry');
  const btnQuit = document.getElementById('btn-quit');

  const bigCards = document.querySelectorAll('.big-card');
  const hamburger = document.getElementById('hamburger');
  const hamburgerMenu = document.getElementById('hamburger-menu');

  // ---------- SOUND ----------
  const audioCtx = window.AudioContext ? new AudioContext() : null;
  function playTone(f, d=110, type='sine'){ if(!audioCtx || !state.soundOn) return; const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.type=type; o.frequency.value=f; g.gain.value=0.04; o[...]
  const soundSuccess = ()=>playTone(1000,120,'triangle');
  const soundError = ()=>playTone(200,160,'square');
  const soundClick = ()=>playTone(520,60,'sine');

  // ---------- HUD / Timer ----------
  function showFloating(show=true){ floatingUI.style.display = show ? 'block' : 'none'; updateFloating(); }
  function updateFloating(){
    statLevel.textContent = `${state.qindex + 1}/${state.questions.length || 0}`;
    statScore.textContent = state.score;
    statLives.textContent = state.lives;
    if(state.mode === 'timed'){
      floatingTimer.style.display = '';
      timerValue.textContent = state.timeLeft;
    } else { floatingTimer.style.display = 'none'; }
  }
  function startTimer(sec, onExpire){
    stopTimer();
    state.timeLeft = sec;
    updateFloating();
    state.timer = setInterval(()=>{ state.timeLeft--; updateFloating(); if(state.timeLeft<=0){ stopTimer(); onExpire(); } },1000);
  }
  function stopTimer(){ if(state.timer){ clearInterval(state.timer); state.timer = null; } state.timeLeft = 0; updateFloating(); }

  // ---------- SETTINGS & NAV ----------
  function setupSettings(){
    // difficulty selectors
    document.querySelectorAll('#difficulty-select .settings-card').forEach(card=>{
      card.onclick = ()=>{ document.querySelectorAll('#difficulty-select .settings-card').forEach(c=>c.classList.remove('active')); card.classList.add('active'); state.difficulty = card.dataset.value;[...]
    });
    // mode selectors
    document.querySelectorAll('#mode-select .settings-card').forEach(card=>{
      card.onclick = ()=>{ document.querySelectorAll('#mode-select .settings-card').forEach(c=>c.classList.remove('active')); card.classList.add('active'); state.mode = card.dataset.value; soundClick([...]
    });

    // start / play card
    const startBtn = document.getElementById('start-game');
    if(startBtn) startBtn.onclick = startRun;
    const cardPlay = document.getElementById('card-play');
    if(cardPlay) cardPlay.onclick = startRun;

    // sound toggle
    const st = document.getElementById('sound-toggle');
    if(st) st.onclick = ()=>{ state.soundOn = !state.soundOn; st.querySelector('i').classList.toggle('fa-volume-mute', !state.soundOn); soundClick(); };

    // clear leaderboard
    const clearLeader = document.getElementById('clear-leader');
    if(clearLeader) clearLeader.onclick = ()=>{ localStorage.removeItem('lr_leader'); renderLeaderboard(); soundClick(); };

    // open leaderboard icon
    const openLeader = document.getElementById('open-leaderboard');
    if(openLeader) openLeader.onclick = ()=>{ scrollToPanel('leaderboard-panel'); };

    // hamburger dropdown toggle
    if(hamburger){
      hamburger.onclick = (ev) => {
        ev.stopPropagation();
        const show = hamburgerMenu.style.display !== 'flex' && hamburgerMenu.style.display !== 'block';
        hamburgerMenu.style.display = show ? 'flex' : 'none';
      };
    }

    // menu items inside hamburger
    document.querySelectorAll('#hamburger-menu .menu-item').forEach(btn=>{
      btn.onclick = (e) => {
        e.stopPropagation();
        const t = btn.dataset.target;
        scrollToPanel(t);
        hamburgerMenu.style.display = 'none';
        soundClick();
      };
    });

    // big cards
    bigCards.forEach(card => card.onclick = ()=>{ const t = card.dataset.target; if(t === 'play') startRun(); else scrollToPanel(t); soundClick(); });

    // HUD buttons
    if(btnRetry) btnRetry.onclick = ()=>{ soundClick(); retryRun(); };
    if(btnQuit) btnQuit.onclick = ()=>{ soundClick(); quitToSettings(); };

    // persist player name
    const pn = document.getElementById('player-name');
    if(pn){ const saved = localStorage.getItem('lr_name'); if(saved) pn.value = saved; pn.oninput = ()=> localStorage.setItem('lr_name', pn.value || ''); }

    // close hamburger when clicking outside
    document.addEventListener('click', ()=>{ if(hamburgerMenu) hamburgerMenu.style.display = 'none'; });
    // prevent menu clicks from bubbling
    hamburgerMenu.addEventListener('click', (e)=> e.stopPropagation());
  }

  // navigation and showing/hiding panels
  function scrollToPanel(id){
    // clear active class on panels
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active-panel'));
    // show the requested one
    const panel = document.getElementById(id);
    if(panel){
      panel.classList.add('active-panel');
      panel.scrollIntoView({ behavior:'smooth', block:'start' });
    }
    // ensure settings card only visible on home
    settingsCard.style.display = (id === 'home') ? '' : 'none';
    // if going to home, show menu-cards
    const menuCards = document.getElementById('menu-cards');
    if(menuCards) menuCards.style.display = (id === 'home') ? '' : '';
    // hide floating HUD unless in game
    if(id !== 'home' && id !== 'play') showFloating(false);
  }

  // ---------- FLOW ----------
  function startRun(){
    soundClick();
    // hide other panels/cards
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-panel'));
    document.getElementById('home').classList.add('active-panel');
    const menuCards = document.getElementById('menu-cards');
    if(menuCards) menuCards.style.display = 'none';
    // hide meta panels for distraction
    document.getElementById('tutorial-panel').style.display = 'none';
    document.getElementById('about-panel').style.display = 'none';
    document.getElementById('leaderboard-panel').style.display = 'none';
    // hide credits panel as well (save previous display to restore later)
    const creditsPanel = document.getElementById('credits-panel');
    if(creditsPanel){
      creditsPanel.dataset._prevDisplay = creditsPanel.style.display || getComputedStyle(creditsPanel).display;
      creditsPanel.style.display = 'none';
    }
    // show game area and HUD
    showFloating(true);
    focusGamePanel(true);
    // reset state
    state.score = 0; state.lives = 3; state.qindex = 0; state.usedIds = new Set();
    state.questions = buildQuestions(state.difficulty, 6);
    renderQuestion();
  }

  function retryRun(){ stopTimer(); startRun(); }
  function quitToSettings(){ stopTimer(); showFloating(false); settingsCard.style.display = ''; gameArea.innerHTML = ''; focusGamePanel(false);
    // restore panels
    document.getElementById('tutorial-panel').style.display = '';
    document.getElementById('about-panel').style.display = '';
    document.getElementById('leaderboard-panel').style.display = '';
    // restore credits panel display if we hid it
    const creditsPanel = document.getElementById('credits-panel');
    if(creditsPanel){
      creditsPanel.style.display = creditsPanel.dataset._prevDisplay ?? '';
      delete creditsPanel.dataset._prevDisplay;
    }
    const menuCards = document.getElementById('menu-cards'); if(menuCards) menuCards.style.display = '';
  }
  function finishRun(){ stopTimer(); renderLeaderboard(); openSubmitScoreModal(); focusGamePanel(false); settingsCard.style.display = ''; showFloating(false);
    // restore panels
    document.getElementById('tutorial-panel').style.display = '';
    document.getElementById('about-panel').style.display = '';
    document.getElementById('leaderboard-panel').style.display = '';
    // restore credits panel display if we hid it
    const creditsPanel = document.getElementById('credits-panel');
    if(creditsPanel){
      creditsPanel.style.display = creditsPanel.dataset._prevDisplay ?? '';
      delete creditsPanel.dataset._prevDisplay;
    }
    const menuCards = document.getElementById('menu-cards'); if(menuCards) menuCards.style.display = '';
  }
  function advanceAfterDelay(){ stopTimer(); state.qindex++; if(state.qindex >= state.questions.length){ finishRun(); } else { setTimeout(renderQuestion, 700); } }
  function loseLife(msg){ if(msg) showToast(msg,'error'); state.lives--; updateFloating(); if(state.lives <= 0) showGameOverModal(); }

  function focusGamePanel(on=true){ if(on){ hero.classList.add('focus-hide'); gameArea.classList.add('focused'); } else { hero.classList.remove('focus-hide'); gameArea.classList.remove('focused'); } }

  // ---------- BUILD QUESTIONS ----------
  function buildMatchQuestions(count, diff){
    const pool = (matchPools[diff] || matchPools['easy']).slice();
    const out = [];
    for(let i=0;i<count;i++){
      const ops = shuffle(pool).slice(0, Math.min(4, pool.length));
      out.push({ type:'match', ops });
    }
    return out;
  }

  function buildSentenceQuestions(count, diff){
    const bank = (sentenceBank[diff] || sentenceBank['easy']).slice();
    const out = [];
    while(out.length < count && bank.length){
      const idx = Math.floor(Math.random()*bank.length);
      out.push(bank.splice(idx,1)[0]);
    }
    return out;
  }

  function buildTruthTableQuestions(diff){
    return shuffle(truthTableVariants.slice());
  }

  function buildQuestions(diff, total){
    total = total || 6;
    const matches = buildMatchQuestions(Math.ceil(total*0.35), diff);
    const sentences = buildSentenceQuestions(Math.ceil(total*0.35), diff);
    const ttVariants = buildTruthTableQuestions(diff);
    const ttCount = Math.max(1, total - matches.length - sentences.length);
    const ttQuestions = ttVariants.slice(0, ttCount).map(t=> ({ ...t, type:'tt', presentation: pickRandom(['drag','mcq','partial','type','dropdown']) }));
    const all = shuffle([ ...matches, ...sentences, ...ttQuestions ]).slice(0,total);
    return all;
  }

  // ---------- RENDER ----------
  function renderQuestion(){
    stopTimer();
    updateFloating();
    const q = state.questions[state.qindex];
    if(!q){ finishRun(); return; }
    if(state.mode === 'timed'){
      const secs = state.difficulty === "easy" ? 20 : state.difficulty === "medium" ? 16 : 12;
      startTimer(secs, ()=>{ loseLife("Time's up!"); advanceAfterDelay(); });
    }
    if(q.type === 'match') renderMatch(q);
    else if(q.type === 'sentence') renderSentence(q);
    else if(q.type === 'tt') renderTruthTable(q);
    else renderEmpty();
  }

  function renderEmpty(){ gameArea.innerHTML = '<div class="card"><p>No question available.</p></div>'; }

  // ---- MATCH ----
  function renderMatch(q){
    const opPairs = Object.fromEntries(q.ops.map(n=>[n, (operators.find(o=>o.name===n)||{symbol:n}).symbol]));
    const left = shuffle(q.ops);
    const right = shuffle(Object.values(opPairs));
    gameArea.innerHTML = `<div class="card">
      <div class="game-section-title">Symbol Match</div>
      <div class="subtitle">Drag operator names to correct symbols.</div>
      <div class="matching-container">
        <div class="game-column"><div class="column-title">Operators</div>${left.map(n=>`<div class="draggable-item" draggable="true" data-op="${n}">${n}</div>`).join('')}</div>
        <div class="game-column"><div class="column-title">Symbols</div>${right.map(s=>`<div class="drop-zone" data-sym="${s}"><span class="zone-label">${s}</span></div>`).join('')}</div>
      </div>
      <div style="margin-top:16px"><button id="check-btn" class="btn-check" type="button">Check</button></div>
    </div>`;
    setupMatchDrag(opPairs);
  }

  function setupMatchDrag(correctPairs){
    const draggables = gameArea.querySelectorAll('.draggable-item'), drops = gameArea.querySelectorAll('.drop-zone');
    draggables.forEach(d=>{ d.ondragstart = e => { e.dataTransfer.setData('text/plain', d.dataset.op); d.classList.add('dragging'); }; d.ondragend = ()=> d.classList.remove('dragging'); });
    drops.forEach(zone=>{
      zone.ondragover = e => { e.preventDefault(); zone.classList.add('drag-over'); };
      zone.ondragleave = () => zone.classList.remove('drag-over');
      zone.ondrop = e => {
        e.preventDefault(); zone.classList.remove('drag-over');
        if(zone.dataset.locked) return;
        const op = e.dataTransfer.getData('text/plain');
        if(correctPairs[op] === zone.dataset.sym){
          zone.innerHTML = `<span class="zone-label">${zone.dataset.sym}</span><div class="match-content">${op}</div>`; zone.dataset.locked = '1'; soundSuccess();
        } else { zone.classList.add('incorrect'); setTimeout(()=>zone.classList.remove('incorrect'),600); loseLife(); soundError(); }
      }
    });
    const check = document.getElementById('check-btn');
    if(check) check.onclick = ()=> {
      const locked = gameArea.querySelectorAll('.drop-zone[data-locked="1"]').length;
      if(locked === Object.keys(correctPairs).length){ state.score += 16 * locked; soundSuccess(); advanceAfterDelay(); }
      else{ showToast('Finish all matches first','warning'); soundError(); }
    };
  }

  // ---- SENTENCE ----
  function renderSentence(q){
    gameArea.innerHTML = `<div class="card">
      <div class="game-section-title">Statement Builder</div>
      <div class="subtitle">${q.sentence.replace('___','____')}</div>
      <div style="display:flex;gap:10px;margin-top:12px" id="sentence-choices">
        ${q.choices.map(c=>`<div class="draggable-item" draggable="true" data-choice="${c}">${c}</div>`).join('')}
      </div>
      <div style="margin-top:12px"><div id="sentence-drop" class="drop-zone">Drop here</div></div>
      <div style="margin-top:14px"><button id="check-sentence" class="btn-check" type="button">Check</button></div>
    </div>`;
    gameArea.querySelectorAll('#sentence-choices .draggable-item').forEach(d=> d.ondragstart = e => e.dataTransfer.setData('text/plain', d.dataset.choice));
    const drop = document.getElementById('sentence-drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-over'); };
    drop.ondragleave = () => drop.classList.remove('drag-over');
    drop.ondrop = e => { e.preventDefault(); drop.textContent = e.dataTransfer.getData('text/plain'); drop.classList.remove('empty'); };
    const checkBtn = document.getElementById('check-sentence');
    if(checkBtn) checkBtn.onclick = ()=>{
      const val = drop.textContent.trim();
      if(!val){ showToast('Drop a choice','warning'); soundError(); return; }
      if(val === q.answer){ state.score += 24; soundSuccess(); advanceAfterDelay(); } else { loseLife(); soundError(); }
    };
  }

  // ---- TRUTH TABLE (MIXED) ----
  function renderTruthTable(q){
    const mode = q.presentation || pickRandom(['drag','mcq','partial','type','dropdown']);
    const cols = q.columns;
    const table = q.table;

    if(mode === 'drag'){
      gameArea.innerHTML = `<div class="card">
        <div class="game-section-title">Truth Table — Drag</div>
        <div class="subtitle">${q.label}</div>
        <div style="margin-top:12px">
          <table class="tt-table" style="width:100%"><tr>${cols.map(c=>`<th>${c.toUpperCase()}</th>`).join('')}</tr>
            ${table.map((row,i)=>`<tr>${
              cols.slice(0,-1).map(k=>`<td>${row[k]===true ? 'T' : (row[k]===false ? 'F' : '')}</td>`).join('')
            }<td><div class="drop-zone tt-drop" data-idx="${i}"></div></td></tr>`).join('')}
          </table>
        </div>
        <div style="margin-top:12px">${['T','F','T','F'].map(v=>`<div class="draggable-item tt-chip" draggable="true" data-val="${v}">${v}</div>`).join('')}</div>
        <div style="margin-top:14px"><button id="check-tt" class="btn-check" type="button">Check</button></div>
      </div>`;

      gameArea.querySelectorAll('.tt-chip').forEach(c => c.ondragstart = e => e.dataTransfer.setData('text/plain', c.dataset.val));
      gameArea.querySelectorAll('.tt-drop').forEach(d => {
        d.ondragover = e => { e.preventDefault(); d.classList.add('drag-over'); };
        d.ondragleave = () => d.classList.remove('drag-over');
        d.ondrop = e => { e.preventDefault(); d.textContent = e.dataTransfer.getData('text/plain'); d.classList.remove('empty'); };
      });
      const btn = document.getElementById('check-tt');
      if(btn) btn.onclick = ()=> {
        const drops = Array.from(gameArea.querySelectorAll('.tt-drop'));
        if(drops.some(d => !d.textContent.trim())){ showToast('Fill every result','warning'); soundError(); return; }
        const ok = drops.every((d,i)=> d.textContent.trim() === (table[i].r ? 'T' : 'F'));
        if(ok){ state.score += 40; soundSuccess(); advanceAfterDelay(); } else { loseLife(); soundError(); }
      };
      return;
    }

    if(mode === 'mcq'){
      gameArea.innerHTML = `<div class="card">
        <div class="game-section-title">Truth Table — Multiple Choice</div>
        <div class="subtitle">${q.label}</div>
        <table class="tt-table" style="width:100%"><tr>${cols.map(c=>`<th>${c.toUpperCase()}</th>`).join('')}<th>Answer</th></tr>
          ${table.map((row,i)=>`<tr>${
            cols.slice(0,-1).map(k=>`<td>${row[k]===true?'T':(row[k]===false?'F':'')}</td>`).join('')
          }<td><div class="mcq-row" data-idx="${i}"><button class="btn mcq-btn" data-val="T" type="button">T</button><button class="btn mcq-btn" data-val="F" type="button">F</button></div></td></tr>`)[...]
        </table>
        <div style="margin-top:14px"><button id="check-tt-mcq" class="btn-check" type="button">Check</button></div>
      </div>`;
      gameArea.querySelectorAll('.mcq-row .mcq-btn').forEach(b=>{
        b.onclick = ()=>{ const parent = b.closest('.mcq-row'); parent.querySelectorAll('.mcq-btn').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); };
      });
      const mcqBtn = document.getElementById('check-tt-mcq');
      if(mcqBtn) mcqBtn.onclick = ()=>{
        const rows = Array.from(gameArea.querySelectorAll('.mcq-row'));
        const user = rows.map(r => { const sel = r.querySelector('.mcq-btn.selected'); return sel ? sel.dataset.val : ''; });
        if(user.some(x=>!x)){ showToast('Select every row answer','warning'); soundError(); return; }
        const truth = table.map(r => r.r ? 'T' : 'F');
        const ok = user.every((v,i)=> v===truth[i]);
        if(ok){ state.score += 40; soundSuccess(); advanceAfterDelay(); } else { loseLife(); soundError(); }
      };
      return;
    }

    if(mode === 'partial'){
      const blanks = Math.max(1, Math.floor(table.length/2));
      const blankIdx = shuffle(Array.from(table.keys())).slice(0,blanks);
      gameArea.innerHTML = `<div class="card">
        <div class="game-section-title">Truth Table — Partial</div>
        <div class="subtitle">${q.label} — fill the missing cells</div>
        <table class="tt-table" style="width:100%"><tr>${cols.map(c=>`<th>${c.toUpperCase()}</th>`).join('')}</tr>
          ${table.map((row,i)=>`<tr>${
            cols.slice(0,-1).map(k=>`<td>${row[k]===true?'T':(row[k]===false?'F':'')}</td>`).join('')
          }<td>${ blankIdx.includes(i) ? `<div class="drop-zone tt-drop" data-idx="${i}"></div>` : `<div class="filled">${row.r ? 'T' : 'F'}</div>` }</td></tr>`).join('')}
        </table>
        <div style="margin-top:12px">${['T','F'].map(v=>`<div class="draggable-item tt-chip" draggable="true" data-val="${v}">${v}</div>`).join('')}</div>
        <div style="margin-top:14px"><button id="check-tt-partial" class="btn-check" type="button">Check</button></div>
      </div>`;
      gameArea.querySelectorAll('.tt-chip').forEach(c => c.ondragstart = e => e.dataTransfer.setData('text/plain', c.dataset.val));
      gameArea.querySelectorAll('.tt-drop').forEach(d => {
        d.ondragover = e => { e.preventDefault(); d.classList.add('drag-over'); };
        d.ondragleave = () => d.classList.remove('drag-over');
        d.ondrop = e => { e.preventDefault(); d.textContent = e.dataTransfer.getData('text/plain'); d.classList.remove('empty'); };
      });
      const partBtn = document.getElementById('check-tt-partial');
      if(partBtn) partBtn.onclick = ()=>{
        const drops = Array.from(gameArea.querySelectorAll('.tt-drop'));
        if(drops.some(d => !d.textContent.trim())){ showToast('Fill all missing cells','warning'); soundError(); return; }
        const ok = drops.every(d => {
          const idx = Number(d.dataset.idx);
          return d.textContent.trim() === (table[idx].r ? 'T' : 'F');
        });
        if(ok){ state.score += 30; soundSuccess(); advanceAfterDelay(); } else { loseLife(); soundError(); }
      };
      return;
    }

    if(mode === 'type'){
      gameArea.innerHTML = `<div class="card">
        <div class="game-section-title">Truth Table — Type answers</div>
        <div class="subtitle">${q.label}</div>
        <table class="tt-table" style="width:100%"><tr>${cols.map(c=>`<th>${c.toUpperCase()}</th>`).join('')}<th>Answer</th></tr>
          ${table.map((row,i)=>`<tr>${
            cols.slice(0,-1).map(k=>`<td>${row[k]===true?'T':(row[k]===false?'F':'')}</td>`).join('')
          }<td><input class="tt-input" data-idx="${i}" maxlength="1" /></td></tr>`).join('')}
        </table>
        <div style="margin-top:14px"><button id="check-tt-type" class="btn-check" type="button">Check</button></div>
      </div>`;
      const typeBtn = document.getElementById('check-tt-type');
      if(typeBtn) typeBtn.onclick = ()=>{
        const inputs = Array.from(gameArea.querySelectorAll('.tt-input'));
        const user = inputs.map(inp => inp.value.trim().toUpperCase());
        if(user.some(x=>!x || (x!=='T' && x!=='F'))){ showToast('Enter T or F for every row','warning'); soundError(); return; }
        const truth = table.map(r => r.r ? 'T' : 'F');
        const ok = user.every((v,i)=> v===truth[i]);
        if(ok){ state.score += 40; soundSuccess(); advanceAfterDelay(); } else { loseLife(); soundError(); }
      };
      return;
    }

    // dropdown
    if(mode === 'dropdown'){
      gameArea.innerHTML = `<div class="card">
        <div class="game-section-title">Truth Table — Dropdown</div>
        <div class="subtitle">${q.label}</div>
        <table class="tt-table" style="width:100%"><tr>${cols.map(c=>`<th>${c.toUpperCase()}</th>`).join('')}<th>Answer</th></tr>
          ${table.map((row,i)=>`<tr>${
            cols.slice(0,-1).map(k=>`<td>${row[k]===true?'T':(row[k]===false?'F':'')}</td>`).join('')
          }<td><select class="tt-select" data-idx="${i}"><option value="">--</option><option value="T">T</option><option value="F">F</option></select></td></tr>`).join('')}
        </table>
        <div style="margin-top:14px"><button id="check-tt-drop" class="btn-check" type="button">Check</button></div>
      </div>`;
      const dropBtn = document.getElementById('check-tt-drop');
      if(dropBtn) dropBtn.onclick = ()=>{
        const sel = Array.from(gameArea.querySelectorAll('.tt-select'));
        const user = sel.map(s => s.value);
        if(user.some(x=>!x)){ showToast('Choose every row answer','warning'); soundError(); return; }
        const truth = table.map(r => r.r ? 'T' : 'F');
        const ok = user.every((v,i) => v === truth[i]);
        if(ok){ state.score += 40; soundSuccess(); advanceAfterDelay(); } else { loseLife(); soundError(); }
      };
      return;
    }
  }

  // ---------- UI helpers ----------
  function showToast(txt, type='info'){
    const ex = document.querySelector('.game-message'); if(ex) ex.remove();
    const t = document.createElement('div'); t.className = 'game-message'; t.textContent = txt; document.body.appendChild(t);
    setTimeout(()=>{ t.style.opacity = '0'; setTimeout(()=>t.remove(), 350) }, 1600);
  }

  function openSubmitScoreModal(){
    closeModal();
    const modal = document.createElement('div'); modal.className = 'modal-overlay';
    const savedName = localStorage.getItem('lr_name') || '';
    modal.innerHTML = `<div class="modal-popup">
      <div class="card-title"><i class="fas fa-flag-checkered"></i> Run Complete</div>
      <p>Your score: <strong>${state.score}</strong></p>
      <div style="margin-top:8px;">
        <input id="modal-name" class="name-input" placeholder="Enter name" value="${savedName}" />
      </div>
      <div style="margin-top:12px;display:flex;gap:11px;justify-content:flex-end">
        <button id="save-score" class="btn btn-primary" type="button">Save</button>
        <button id="skip-score" class="btn btn-secondary" type="button">Skip</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#save-score').onclick = ()=>{
      const name = (modal.querySelector('#modal-name').value || 'Player').trim();
      localStorage.setItem('lr_name', name);
      saveScore(state.score, name);
      modal.remove();
      showToast('Score saved','success');
      scrollToPanel('leaderboard-panel');
    };
    modal.querySelector('#skip-score').onclick = ()=>{ modal.remove(); scrollToPanel('leaderboard-panel'); };
  }

  function showGameOverModal(){
    closeModal();
    const modal = document.createElement('div'); modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-popup">
      <div class="card-title"><i class="fas fa-heart-broken"></i> Game Over</div>
      <p>You ran out of lives. Try again?</p>
      <div style="margin-top:12px;display:flex;gap:11px;justify-content:center">
        <button id="modal-retry" class="btn btn-primary" type="button">Retry</button>
        <button id="modal-quit" class="btn btn-secondary" type="button">Quit</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#modal-retry').onclick = ()=>{ modal.remove(); retryRun(); };
    modal.querySelector('#modal-quit').onclick = ()=>{ modal.remove(); quitToSettings(); };
  }

  function closeModal(){ const ex = document.querySelector('.modal-overlay'); if(ex) ex.remove(); }

  // ---------- Leaderboard ----------
  function saveScore(score, name){
    const key = 'lr_leader';
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    data.push({ name: name || 'Player', score, ts: Date.now() });
    data.sort((a,b)=> b.score - a.score);
    localStorage.setItem(key, JSON.stringify(data.slice(0,20)));
    renderLeaderboard();
  }

  function renderLeaderboard(){
    const list = document.getElementById('leader-list');
    if(!list) return;
    const data = JSON.parse(localStorage.getItem('lr_leader') || '[]');
    list.innerHTML = '';
    if(!data.length){ list.innerHTML = '<li>No scores yet</li>'; return; }
    data.forEach((e,i)=> { const li = document.createElement('li'); li.textContent = `${i+1}. ${e.name} — ${e.score} pts — ${new Date(e.ts).toLocaleString()}`; list.appendChild(li); });
  }

  // ---------- INIT ----------
  function init(){ setupSettings(); renderLeaderboard(); scrollToPanel('home'); showFloating(false); }
  init();

})();