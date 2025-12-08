/* Full working game.js
   - Navigation fixed (cards, nav links, hamburger)
   - HUD shows only in-game
   - Hides other sections when running
   - Larger question banks per difficulty
*/

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
      { sentence: "A ___ B (true if both are true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "AND" },
      { sentence: "A ___ B (true if either is true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "OR" },
      { sentence: "___ A (true if A is false)", choices: ["NOT", "AND", "OR", "IMPLIES"], answer: "NOT" },
      { sentence: "If it rains ___ you use an umbrella", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" },
      { sentence: "Either A ___ B (one or both)", choices: ["OR", "AND", "XOR"], answer: "OR" }
    ],
    medium: [
      { sentence: "p∨q is false only when ___", choices: ["both are false", "both are true"], answer: "both are false" },
      { sentence: "p⊕q is true when ___", choices: ["one is true", "both true"], answer: "one is true" },
      { sentence: "Negation ¬ distributes over OR: ¬(p∨q) = ___", choices: ["¬p∧¬q", "p∨q"], answer: "¬p∧¬q" },
      { sentence: "If you pass the test ___ you get a certificate", choices: ["IMPLIES", "AND", "OR"], answer: "IMPLIES" }
    ],
    hard: [
      { sentence: "When is p→q false? ___", choices: ["p true and q false", "p false and q true"], answer: "p true and q false" },
      { sentence: "Bi-conditional p↔q is true when ___", choices: ["p and q same truth", "always true"], answer: "p and q same truth" },
      { sentence: "Contrapositive of p→q is ___", choices: ["¬q→¬p", "q→p"], answer: "¬q→¬p" }
    ]
  };

  const matchPools = {
    easy: ["AND","OR","NOT"],
    medium: ["AND","OR","IMPLIES","XOR"],
    hard: ["AND","OR","IMPLIES","XOR","NOT"]
  };

  // ---------- UTIL ----------
  const shuffle = arr => arr.slice().sort(() => Math.random() - 0.5);
  const pickRandom = arr => arr[Math.floor(Math.random() * arr.length)];

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
  const playTone = (f, d = 110, type = 'sine') => {
    if (!audioCtx || !state.soundOn) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    setTimeout(() => {
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.02);
      o.stop(audioCtx.currentTime + 0.03);
    }, d);
  };
  const soundSuccess = () => playTone(1000, 120, 'triangle');
  const soundError = () => playTone(200, 160, 'square');
  const soundClick = () => playTone(520, 60, 'sine');

  // ---------- HUD ----------
  const showFloating = show => {
    floatingUI.style.display = show ? 'block' : 'none';
    updateFloating();
  };

  const updateFloating = () => {
    statLevel.textContent = `${state.qindex + 1}/${state.questions.length || 0}`;
    statScore.textContent = state.score;
    statLives.textContent = state.lives;
    if (state.mode === 'timed') {
      floatingTimer.style.display = '';
      timerValue.textContent = state.timeLeft;
    } else floatingTimer.style.display = 'none';
  };

  const startTimer = (sec, onExpire) => {
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
  };

  const stopTimer = () => {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    state.timeLeft = 0;
    updateFloating();
  };

  // ---------- NAV & SETTINGS ----------
  function setupSettings() {
    document.querySelectorAll('#difficulty-select .settings-card').forEach(c => {
      c.onclick = () => {
        document.querySelectorAll('#difficulty-select .settings-card').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        state.difficulty = c.dataset.value;
        soundClick();
      };
    });

    document.querySelectorAll('#mode-select .settings-card').forEach(c => {
      c.onclick = () => {
        document.querySelectorAll('#mode-select .settings-card').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        state.mode = c.dataset.value;
        soundClick();
      };
    });

    document.getElementById('start-game').onclick = startRun;
    document.getElementById('card-play').onclick = startRun;

    const st = document.getElementById('sound-toggle');
    if (st) st.onclick = () => {
      state.soundOn = !state.soundOn;
      st.querySelector('i').classList.toggle('fa-volume-mute', !state.soundOn);
      soundClick();
    };

    const clearLeader = document.getElementById('clear-leader');
    if (clearLeader) clearLeader.onclick = () => { localStorage.removeItem('lr_leader'); renderLeaderboard(); soundClick(); };

    const openLeader = document.getElementById('open-leaderboard');
    if (openLeader) openLeader.onclick = () => scrollToPanel('leaderboard-panel');

    if (hamburger) hamburger.onclick = () => { topnav.style.display = topnav.style.display === 'flex' ? 'none' : 'flex'; };
    navLinks.forEach(btn => btn.onclick = e => { e.preventDefault(); scrollToPanel(btn.dataset.target); if (window.innerWidth <= 560) topnav.style.display = 'none'; soundClick(); });
    bigCards.forEach(c => c.onclick = () => { scrollToPanel(c.dataset.target); soundClick(); });

    if (btnRetry) btnRetry.onclick = retryRun;
    if (btnQuit) btnQuit.onclick = quitToSettings;

    const pn = document.getElementById('player-name');
    if (pn) {
      const saved = localStorage.getItem('lr_name');
      if (saved) pn.value = saved;
      pn.oninput = () => localStorage.setItem('lr_name', pn.value || '');
    }
  }

  const scrollToPanel = id => {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-panel'));
    const panel = document.getElementById(id);
    if (panel) panel.classList.add('active-panel');
    settingsCard.style.display = id === 'home' ? '' : 'none';
    const menuCards = document.getElementById('menu-cards');
    if (menuCards) menuCards.style.display = id === 'home' ? '' : 'none';
    showFloating(id === 'play');
    document.querySelectorAll('.topnav .nav-link').forEach(n => n.classList.toggle('active', n.dataset.target === id));
  };

  // ---------- GAME FLOW ----------
  const startRun = () => {
    soundClick();
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active-panel'));
    const menuCards = document.getElementById('menu-cards');
    if (menuCards) menuCards.style.display = 'none';
    document.getElementById('tutorial-panel').style.display = 'none';
    document.getElementById('about-panel').style.display = 'none';
    document.getElementById('leaderboard-panel').style.display = 'none';
    showFloating(true);
    focusGamePanel(true);
    state.score = 0;
    state.lives = 3;
    state.qindex = 0;
    state.usedIds = new Set();
    state.questions = buildQuestions(state.difficulty, 6);
    renderQuestion();
  };

  const retryRun = () => { stopTimer(); startRun(); };
  const quitToSettings = () => {
    stopTimer();
    showFloating(false);
    settingsCard.style.display = '';
    gameArea.innerHTML = '';
    focusGamePanel(false);
    document.getElementById('tutorial-panel').style.display = '';
    document.getElementById('about-panel').style.display = '';
    document.getElementById('leaderboard-panel').style.display = '';
    const menuCards = document.getElementById('menu-cards');
    if (menuCards) menuCards.style.display = '';
  };

  const finishRun = () => {
    stopTimer();
    renderLeaderboard();
    openSubmitScoreModal();
    focusGamePanel(false);
    settingsCard.style.display = '';
    showFloating(false);
    document.getElementById('tutorial-panel').style.display = '';
    document.getElementById('about-panel').style.display = '';
    document.getElementById('leaderboard-panel').style.display = '';
    const menuCards = document.getElementById('menu-cards');
    if (menuCards) menuCards.style.display = '';
  };

  const advanceAfterDelay = () => {
    stopTimer();
    state.qindex++;
    if (state.qindex >= state.questions.length) finishRun();
    else setTimeout(renderQuestion, 700);
  };

  const loseLife = msg => {
    if (msg) showToast(msg, 'error');
    state.lives--;
    updateFloating();
    if (state.lives <= 0) showGameOverModal();
  };

  const focusGamePanel = on => {
    hero.classList.toggle('focus-hide', on);
    gameArea.classList.toggle('focused', on);
  };

  // ---------- BUILD QUESTIONS ----------
  const buildQuestions = (diff, total = 6) => {
    const matches = buildMatchQuestions(Math.ceil(total * 0.35), diff);
    const sentences = buildSentenceQuestions(Math.ceil(total * 0.35), diff);
    const ttVariants = shuffle(truthTableVariants.slice());
    const ttCount = Math.max(1, total - matches.length - sentences.length);
    const ttQuestions = ttVariants.slice(0, ttCount).map(t => ({ ...t, type: 'tt', presentation: pickRandom(['drag', 'mcq', 'partial', 'type', 'dropdown']) }));
    return shuffle([...matches, ...sentences, ...ttQuestions]).slice(0, total);
  };

  const buildMatchQuestions = (count, diff) => {
    const pool = [...(matchPools[diff] || matchPools['easy'])];
    return Array.from({ length: count }, () => {
      const ops = shuffle(pool).slice(0, Math.min(4, pool.length));
      return { type: 'match', ops };
    });
  };

  const buildSentenceQuestions = (count, diff) => {
    const bank = [...(sentenceBank[diff] || sentenceBank['easy'])];
    const out = [];
    while (out.length < count && bank.length) {
      const idx = Math.floor(Math.random() * bank.length);
      out.push(bank.splice(idx, 1)[0]);
    }
    return out;
  };

  // ---------- INIT ----------
  const init = () => { setupSettings(); renderLeaderboard(); scrollToPanel('home'); showFloating(false); };
  init();

})();
