(() => {
  // ==== DATA ====
  const operators = [
    { name: "AND", symbol: "∧" },
    { name: "OR", symbol: "∨" },
    { name: "IMPLIES", symbol: "→" },
    { name: "NOT", symbol: "¬" }
  ];
  const truthTableVariants = [
    {
      op: "OR", label: "Inclusive OR (∨)", columns: ["p", "q", "p∨q"],
      table: [
        { p: true, q: true, r: true }, { p: true, q: false, r: true },
        { p: false, q: true, r: true }, { p: false, q: false, r: false }
      ]
    },
    {
      op: "XOR", label: "Exclusive OR (⊕)", columns: ["p", "q", "p⊕q"],
      table: [
        { p: true, q: true, r: false }, { p: true, q: false, r: true },
        { p: false, q: true, r: true }, { p: false, q: false, r: false }
      ]
    },
    {
      op: "NOT", label: "Negation (¬p)", columns: ["p", "¬p"],
      table: [
        { p: true, r: false }, { p: false, r: true }
      ]
    },
    {
      op: "IMPLIES", label: "Implication (→)", columns: ["p", "q", "p→q"],
      table: [
        { p: true, q: true, r: true }, { p: true, q: false, r: false },
        { p: false, q: true, r: true }, { p: false, q: false, r: true }
      ]
    },
    {
      op: "AND", label: "AND (∧)", columns: ["p", "q", "p∧q"],
      table: [
        { p: true, q: true, r: true }, { p: true, q: false, r: false },
        { p: false, q: true, r: false }, { p: false, q: false, r: false }
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
  function shuffle(arr) { arr=arr.slice(); for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]} return arr }
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

  // ===== GAME STATE + UI
  const state = {difficulty:'easy',mode:'classic',questions:[],qindex:0,score:0,lives:3,timer:null,timeLeft:0,soundOn:true};
  // DOM
  const hero = document.getElementById('hero-section');
  const gameArea = document.getElementById('game-area');
  const settingsCard = document.getElementById('settings-card');
  const floatingUI = document.getElementById('floating-ui');
  const statLevel = document.getElementById('stat-level');
  const statScore = document.getElementById('stat-score');
  const statLives = document.getElementById('stat-lives');
  const floatingTimer = document.getElementById('floating-timer');
  const timerValue = document.getElementById('timer-value');
  const navMobile = document.getElementById('mobile-nav');
  const navHamburger = document.getElementById('hamburger');
  const closeMobileNav = document.getElementById('close-mobile-nav');

  // SOUND (basic, muted on mobile by default browsers)
  const audioCtx = window.AudioContext ? new AudioContext() : null;
  function playTone(f, d=120, type='sine') {
    if (!audioCtx || !state.soundOn) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type=type; o.frequency.value=f; g.gain.value=0.035;
    o.connect(g); g.connect(audioCtx.destination); o.start();
    setTimeout(()=>{g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.02);o.stop(audioCtx.currentTime+0.03)}, d);
  }
  const soundSuccess = ()=>playTone(900,110,'triangle');
  const soundError = ()=>playTone(180,170,'square');
  const soundClick = ()=>playTone(520,60,'sine');

  // NAVIGATION: desktop & mobile
  navHamburger.onclick = () => {navMobile.classList.add('open');};
  closeMobileNav.onclick = () => {navMobile.classList.remove('open');};
  navMobile.querySelectorAll('button[data-target]').forEach(btn=>{
    btn.onclick=()=>{goToPanel(btn.getAttribute('data-target'));navMobile.classList.remove('open');};
  });
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.onclick=(ev)=>{ev.preventDefault();goToPanel(btn.dataset.target);soundClick();});

  // SETTINGS & CARDS
  document.querySelectorAll('#difficulty-select .settings-card').forEach(card=>{
    card.onclick = () => {
      document.querySelectorAll('#difficulty-select .settings-card').forEach(c=>c.classList.remove('active'));
      card.classList.add('active'); state.difficulty = card.dataset.value;
      soundClick();
    };
  });
  document.querySelectorAll('#mode-select .settings-card').forEach(card=>{
    card.onclick = () => {
      document.querySelectorAll('#mode-select .settings-card').forEach(c=>c.classList.remove('active'));
      card.classList.add('active'); state.mode = card.dataset.value;
      soundClick();
    };
  });
  document.getElementById('start-game').onclick = startRun;
  document.getElementById('btn-quit').onclick = ()=>{quitToSettings();soundClick();}
  document.getElementById('btn-retry').onclick = ()=>{retryRun();soundClick();}
  document.getElementById('sound-toggle').onclick = () => {
    state.soundOn = !state.soundOn; document.getElementById('sound-toggle').querySelector('i').classList.toggle('fa-volume-mute', !state.soundOn);
    soundClick();
  };
  document.getElementById('clear-leader').onclick = () => { localStorage.removeItem('lr_leader'); renderLeaderboard();soundClick();}
  if (document.getElementById('player-name')) {
    const saved = localStorage.getItem('lr_name'); if (saved) document.getElementById('player-name').value = saved;
    document.getElementById('player-name').oninput = () => localStorage.setItem('lr_name', document.getElementById('player-name').value || '');
  }

  // FLOATING GAME INFO
  function showFloating(show=true) { floatingUI.style.display = show ? 'block' : 'none'; updateFloating();}
  function updateFloating() {
    statLevel.textContent = `${state.qindex+1}/${state.questions.length}`;
    statScore.textContent = state.score;