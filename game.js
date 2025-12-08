/* Polished version of game.js — clean HUD, subtle animations, same gameplay */

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
    { op: "OR", label: "Inclusive OR (∨): true unless both are false.", columns: ["p", "q", "p∨q"], table: [{ p:true,q:true,r:true },{ p:true,q:false,r:true },{ p:false,q:true,r:true },{ p:false,q:false,r:false }] },
    { op: "XOR", label: "Exclusive OR (⊕): true if one is true, not both.", columns: ["p", "q", "p⊕q"], table: [{ p:true,q:true,r:false },{ p:true,q:false,r:true },{ p:false,q:true,r:true },{ p:false,q:false,r:false }] },
    { op: "NOT", label: "Negation (¬p): flips true/false", columns: ["p", "¬p"], table: [{ p:true,r:false },{ p:false,r:true }] },
    { op: "IMPLIES", label: "Implication (→): false only if true→false.", columns: ["p","q","p→q"], table: [{ p:true,q:true,r:true },{ p:true,q:false,r:false },{ p:false,q:true,r:true },{ p:false,q:false,r:true }] },
    { op: "AND", label: "AND (∧): only true if both are true.", columns: ["p","q","p∧q"], table: [{ p:true,q:true,r:true },{ p:true,q:false,r:false },{ p:false,q:true,r:false },{ p:false,q:false,r:false }] }
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

  // ---------- UTILS ----------
  const shuffle = arr => arr.slice().sort(()=>Math.random()-0.5);
  const pickRandom = arr => arr[Math.floor(Math.random()*arr.length)];

  // ---------- STATE ----------
  const state = { difficulty:'easy', mode:'classic', questions:[], qindex:0, score:0, lives:3, timer:null, timeLeft:0, soundOn:true };

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

  // ---------- Sound ----------
  const audioCtx = window.AudioContext ? new AudioContext() : null;
  const playTone = (f,d=110,type='sine')=>{ if(!audioCtx||!state.soundOn)return; const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type=type;o.frequency.value=f;g.gain.value=0.04;o.connect(g);g.connect(audioCtx.destination);o.start();setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.02);o.stop(audioCtx.currentTime+0.03) },d) };
  const soundSuccess = ()=>playTone(1000,120,'triangle');
  const soundError = ()=>playTone(200,160,'square');
  const soundClick = ()=>playTone(520,60,'sine');

  // ---------- HUD ----------
  function showFloating(show=true){ floatingUI.style.display = show?'flex':'none'; updateFloating(); }
  function updateFloating(){
    statLevel.textContent = `${state.qindex+1}/${state.questions.length||0}`;
    statScore.textContent = state.score;
    statLives.textContent = state.lives;
    floatingTimer.style.display = state.mode==='timed'?'flex':'none';
    timerValue.textContent = state.timeLeft;
  }

  function startTimer(sec,onExpire){ stopTimer(); state.timeLeft=sec; updateFloating(); state.timer=setInterval(()=>{ state.timeLeft--; updateFloating(); if(state.timeLeft<=0){ stopTimer(); onExpire(); } },1000); }
  function stopTimer(){ if(state.timer){ clearInterval(state.timer); state.timer=null; } state.timeLeft=0; updateFloating(); }

  // ---------- Settings ----------
  function setupSettings(){
    document.querySelectorAll('#difficulty-select .settings-card').forEach(c=>c.onclick=()=>{ document.querySelectorAll('#difficulty-select .settings-card').forEach(cc=>cc.classList.remove('active')); c.classList.add('active'); state.difficulty=c.dataset.value; soundClick(); });
    document.querySelectorAll('#mode-select .settings-card').forEach(c=>c.onclick=()=>{ document.querySelectorAll('#mode-select .settings-card').forEach(cc=>cc.classList.remove('active')); c.classList.add('active'); state.mode=c.dataset.value; soundClick(); });
    document.getElementById('start-game').onclick = startRun;
    document.getElementById('quick-start').onclick = startRun;
    document.getElementById('sound-toggle').onclick = ()=>{ state.soundOn=!state.soundOn; document.getElementById('sound-toggle').querySelector('i').classList.toggle('fa-volume-mute',!state.soundOn); soundClick(); };
    btnRetry.onclick = ()=>{ soundClick(); retryRun(); };
    btnQuit.onclick = ()=>{ soundClick(); quitToSettings(); };
  }

  // ---------- Flow ----------
  function startRun(){ soundClick(); settingsCard.style.display='none'; showFloating(true); focusGamePanel(true); state.score=0;state.lives=3;state.qindex=0; state.questions=buildQuestions(state.difficulty); renderQuestion(); }
  function retryRun(){ stopTimer(); startRun(); }
  function quitToSettings(){ stopTimer(); showFloating(false); settingsCard.style.display=''; gameArea.innerHTML=''; focusGamePanel(false); }
  function finishRun(){ stopTimer(); openSubmitScoreModal(); focusGamePanel(false); settingsCard.style.display=''; showFloating(false); }
  function advanceAfterDelay(){ stopTimer(); state.qindex++; if(state.qindex>=state.questions.length){ finishRun(); }else{ setTimeout(renderQuestion,700); } }
  function loseLife(msg){ if(msg) showToast(msg,'error'); state.lives--; updateFloating(); if(state.lives<=0) showGameOverModal(); }
  function focusGamePanel(on=true){ hero.classList.toggle('focus-hide',on); gameArea.classList.toggle('focused',on); }

  // ---------- Questions ----------
  function buildQuestions(diff){
    const matches=shuffle([{type:'match',ops:['AND','OR','NOT','IMPLIES']},{type:'match',ops:['AND','OR','IMPLIES','NOT']}]).slice(0,2);
    const sentences=shuffle(sentenceQs[diff]).slice(0,2);
    const tt=shuffle(diff==='easy'? [truthTableVariants[0],truthTableVariants[4],truthTableVariants[2]]:diff==='medium'?truthTableVariants:[truthTableVariants[1],truthTableVariants[3],truthTableVariants[4],truthTableVariants[2],truthTableVariants[0]])[0];
    return shuffle([...matches,...sentences,{...tt,type:'tt',presentation:pickRandom(['drag','mcq','partial','type','dropdown'])}]);
  }

  // ---------- Renderers ----------
  function renderQuestion(){
    stopTimer(); updateFloating();
    const q=state.questions[state.qindex]; if(!q){ finishRun(); return; }
    if(state.mode==='timed'){ const secs=state.difficulty==='easy'?20:state.difficulty==='medium'?14:10; startTimer(secs,()=>{ loseLife("Time's up!"); advanceAfterDelay(); }); }
    if(q.type==='match') renderMatch(q); else if(q.type==='sentence') renderSentence(q); else if(q.type==='tt') renderTruthTable(q); else renderEmpty();
  }
  function renderEmpty(){ gameArea.innerHTML='<div class="card"><p>No question available.</p></div>'; }

  // ---------- UI helpers ----------
  function showToast(txt,type='info'){ const ex=document.querySelector('.game-message'); if(ex) ex.remove(); const t=document.createElement('div'); t.className='game-message '+type; t.textContent=txt; document.body.appendChild(t); setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),350); },1600); }
  function openSubmitScoreModal(){ closeModal(); const modal=document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML=`<div class="modal-popup"><div class="card-title"><i class="fas fa-flag-checkered"></i> Run Complete</div><p>Your score: <strong>${state.score}</strong></p><div style="margin-top:8px;"><input id="modal-name" class="name-input" placeholder="Enter name"/></div><div style="margin-top:12px;display:flex;gap:11px;justify-content:flex-end"><button id="save-score" class="btn btn-primary">Save</button><button id="skip-score" class="btn btn-secondary">Skip</button></div></div>`; document.body.appendChild(modal); modal.querySelector('#save-score').onclick=()=>{ const name=(modal.querySelector('#modal-name').value||'Player').trim(); saveScore(state.score,name); modal.remove(); showToast('Score saved','success'); }; modal.querySelector('#skip-score').onclick=()=>{ modal.remove(); }; }
  function showGameOverModal(){ closeModal(); const modal=document.createElement('div'); modal.className='modal-overlay'; modal.innerHTML=`<div class="modal-popup"><div class="card-title"><i class="fas fa-heart-broken"></i> Game Over</div><p>You ran out of lives.</p><div style="margin-top:12px;display:flex;gap:11px;justify-content:center"><button id="modal-retry" class="btn btn-primary">Retry</button><button id="modal-quit" class="btn btn-secondary">Quit</button></div></div>`; document.body.appendChild(modal); modal.querySelector('#modal-retry').onclick=()=>{ modal.remove(); retryRun(); }; modal.querySelector('#modal-quit').onclick=()=>{ modal.remove(); quitToSettings(); }; }
  function closeModal(){ const ex=document.querySelector('.modal-overlay'); if(ex) ex.remove(); }

  // ---------- Init ----------
  function init(){ setupSettings(); showFloating(false); }
  init();

})();
