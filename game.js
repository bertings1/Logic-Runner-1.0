/* Full working game.js — fixed navigation and preserved panels */

(() => {
  // ---------- DATA ----------
  const operators = [
    { name: "AND", symbol: "∧" },
    { name: "OR", symbol: "∨" },
    { name: "IMPLIES", symbol: "→" },
    { name: "NOT", symbol: "¬" },
    { name: "XOR", symbol: "⊕" }
  ];

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
    },
    {
      op: "XOR",
      label: "XOR (⊕): true when exactly one is true.",
      columns: ["p", "q", "p⊕q"],
      table: [
        { p: true, q: true, r: false },
        { p: true, q: false, r: true },
        { p: false, q: true, r: true },
        { p: false, q: false, r: false }
      ]
    }
  ];

  const sentenceBank = {
    easy: [
      { type: 'sentence', sentence: "A ___ B (true if both are true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "AND" },
      { type: 'sentence', sentence: "A ___ B (true if either is true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "OR" },
      { type: 'sentence', sentence: "___ A (true if A is false)", choices: ["NOT", "AND", "OR", "IMPLIES"], answer: "NOT" },
      { type: 'sentence', sentence: "If it rains ___ you use an umbrella", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" },
      { type: 'sentence', sentence: "Either A ___ B (one or both)", choices: ["OR", "AND", "XOR"], answer: "OR" },
      { type: 'sentence', sentence: "A and B is written as A ___ B", choices: ["AND", "OR", "IMPLIES"], answer: "AND" },
      { type: 'sentence', sentence: "If p then q is written p ___ q", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" }
    ],
    medium: [
      { type: 'sentence', sentence: "p∨q is false only when ___", choices: ["both are false", "both are true"], answer: "both are false" },
      { type: 'sentence', sentence: "p⊕q is true when ___", choices: ["one is true", "both true"], answer: "one is true" },
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

  const matchPools = {
    easy: ['AND','OR','NOT'],
    medium: ['AND','OR','IMPLIES','XOR'],
    hard: ['AND','OR','IMPLIES','XOR','NOT']
  };

  // ---------- UTIL ----------
  const shuffle = arr => { const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a; }
  const pickRandom = arr => arr[Math.floor(Math.random()*arr.length)];

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

  // ---------- DOM ----------
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
  const navLinks = document.querySelectorAll('.nav-link');
  const bigCards = document.querySelectorAll('.big-card');
  const hamburger = document.getElementById('hamburger');
  const topnav = document.getElementById('topnav');

  // ---------- SOUND ----------
  const audioCtx = window.AudioContext ? new AudioContext() : null;
  const playTone = (f,d=110,type='sine')=>{ if(!audioCtx||!state.soundOn) return; const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type=type;o.frequency.value=f;g.gain.value=0.04;o.connect(g);g.connect(audioCtx.destination);o.start();setTimeout(()=>{g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.02);o.stop(audioCtx.currentTime+0.03)},d); }
  const soundSuccess = ()=>playTone(1000,120,'triangle');
  const soundError = ()=>playTone(200,160,'square');
  const soundClick = ()=>playTone(520,60,'sine');

  // ---------- HUD ----------
  function showFloating(show=true){ floatingUI.style.display=show?'block':'none'; updateFloating(); }
  function updateFloating(){
    statLevel.textContent = `${state.qindex+1}/${state.questions.length||0}`;
    statScore.textContent = state.score;
    statLives.textContent = state.lives;
    if(state.mode==='timed'){ floatingTimer.style.display=''; timerValue.textContent=state.timeLeft; } else floatingTimer.style.display='none';
  }
  function startTimer(sec,onExpire){ stopTimer(); state.timeLeft=sec; updateFloating(); state.timer=setInterval(()=>{ state.timeLeft--; updateFloating(); if(state.timeLeft<=0){ stopTimer(); onExpire(); } },1000); }
  function stopTimer(){ if(state.timer){ clearInterval(state.timer); state.timer=null; } state.timeLeft=0; updateFloating(); }

  // ---------- SETTINGS / NAV ----------
  function setupSettings(){
    document.querySelectorAll('#difficulty-select .settings-card').forEach(card=>{ card.onclick=()=>{ document.querySelectorAll('#difficulty-select .settings-card').forEach(c=>c.classList.remove('active')); card.classList.add('active'); state.difficulty=card.dataset.value; soundClick(); }});
    document.querySelectorAll('#mode-select .settings-card').forEach(card=>{ card.onclick=()=>{ document.querySelectorAll('#mode-select .settings-card').forEach(c=>c.classList.remove('active')); card.classList.add('active'); state.mode=card.dataset.value; soundClick(); }});
    const startBtns=[document.getElementById('start-game'),document.getElementById('card-play')];
    startBtns.forEach(b=>{ if(b) b.onclick=startRun; });
    const st=document.getElementById('sound-toggle'); if(st) st.onclick=()=>{ state.soundOn=!state.soundOn; st.querySelector('i').classList.toggle('fa-volume-mute',!state.soundOn); soundClick(); };
    const clearLeader=document.getElementById('clear-leader'); if(clearLeader) clearLeader.onclick=()=>{ localStorage.removeItem('lr_leader'); renderLeaderboard(); soundClick(); };
    const openLeader=document.getElementById('open-leaderboard'); if(openLeader) openLeader.onclick=()=>{ scrollToPanel('leaderboard-panel'); };
    if(hamburger) hamburger.onclick=()=>{ topnav.style.display=topnav.style.display==='flex'?'none':'flex'; };
    navLinks.forEach(btn=>{ btn.onclick=ev=>{ ev.preventDefault(); const t=btn.dataset.target; scrollToPanel(t); if(window.innerWidth<=560) topnav.style.display='none'; soundClick(); }; });
    bigCards.forEach(card=>{ card.onclick=()=>{ scrollToPanel(card.dataset.target); soundClick(); }; });
    if(btnRetry) btnRetry.onclick=()=>{ soundClick(); retryRun(); };
    if(btnQuit) btnQuit.onclick=()=>{ soundClick(); quitToSettings(); };
    const pn=document.getElementById('player-name'); if(pn){ const saved=localStorage.getItem('lr_name'); if(saved) pn.value=saved; pn.oninput=()=> localStorage.setItem('lr_name',pn.value||''); }
  }

  function scrollToPanel(id){
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active-panel'));
    const panel=document.getElementById(id);
    if(panel){ panel.classList.add('active-panel'); panel.scrollIntoView({ behavior:'smooth', block:'start' }); }
    // settings card only on home
    settingsCard.style.display=(id==='home')?'':'none';
    const menuCards=document.getElementById('menu-cards');
    if(menuCards) menuCards.style.display=(id==='home')?'':'none';
    if(id!=='home'&&id!=='play') showFloating(false);
    document.querySelectorAll('.topnav .nav-link').forEach(n=> n.classList.toggle('active',n.dataset.target===id));
  }

  // ---------- GAME FLOW ----------
  function startRun(){
    soundClick();
    // hide panels during gameplay
    document.querySelectorAll('.panel').forEach(p=>p.style.display='none');
    gameArea.style.display='block';
    showFloating(true);
    focusGamePanel(true);
    state.score=0; state.lives=3; state.qindex=0; state.usedIds=new Set();
    state.questions=buildQuestions(state.difficulty,6);
    renderQuestion();
  }

  function retryRun(){ stopTimer(); startRun(); }

  function quitToSettings(){
    stopTimer();
    showFloating(false);
    focusGamePanel(false);
    gameArea.innerHTML='';
    gameArea.style.display='none';
    // restore panels
    document.querySelectorAll('.panel').forEach(p=>p.style.display='');
    settingsCard.style.display='';
    showFloating(false);
  }

  function finishRun(){ stopTimer(); renderLeaderboard(); openSubmitScoreModal(); focusGamePanel(false); settingsCard.style.display=''; showFloating(false);
    document.querySelectorAll('.panel').forEach(p=>p.style.display='');
  }

  function advanceAfterDelay(){ stopTimer(); state.qindex++; if(state.qindex>=state.questions.length){ finishRun(); } else setTimeout(renderQuestion,700); }

  function loseLife(msg){ if(msg) showToast(msg,'error'); state.lives--; updateFloating(); if(state.lives<=0) showGameOverModal(); }

  function focusGamePanel(on=true){ if(on){ hero.classList.add('focus-hide'); gameArea.classList.add('focused'); } else { hero.classList.remove('focus-hide'); gameArea.classList.remove('focused'); } }

  // ---------- QUESTION BUILDERS ----------
  function buildMatchQuestions(count,diff){ const pool=(matchPools[diff]||matchPools['easy']).slice(); const out=[]; for(let i=0;i<count;i++){ const ops=shuffle(pool).slice(0,Math.min(4,pool.length)); out.push({ type:'match', ops }); } return out; }
  function buildSentenceQuestions(count,diff){ const bank=(sentenceBank[diff]||sentenceBank['easy']).slice(); const out=[]; while(out.length<count&&bank.length){ const idx=Math.floor(Math.random()*bank.length); out.push(bank.splice(idx,1)[0]); } return out; }
  function buildTruthTableQuestions(diff){ return shuffle(truthTableVariants.slice()); }
  function buildQuestions(diff,total){
    total=total||6;
    const matches=buildMatchQuestions(Math.ceil(total*0.35),diff);
    const sentences=buildSentenceQuestions(Math.ceil(total*0.35),diff);
    const ttVariants=buildTruthTableQuestions(diff);
    const ttCount=Math.max(1,total-matches.length-sentences.length);
    const ttQuestions=ttVariants.slice(0,ttCount).map(t=>({...t,type:'tt',presentation:pickRandom(['drag','mcq','partial','type','dropdown'])}));
    return shuffle([...matches,...sentences,...ttQuestions]).slice(0,total);
  }

  // ---------- INIT ----------
  function init(){ setupSettings(); renderLeaderboard(); scrollToPanel('home'); showFloating(false); gameArea.style.display='none'; }
  init();

})();
