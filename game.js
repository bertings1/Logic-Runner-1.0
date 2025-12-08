/* game.js — game logic + UI glue
   - Keeps the same creative levels / timed/classic logic
   - Adds navigation control, tutorial, about, leaderboard hooks
   - Floating UI / Quit / Retry wired here
*/

/* --- Operators (core only) */
const operatorsArr = [
  { name: "AND", symbol: "∧", description: "True if both are true" },
  { name: "OR", symbol: "∨", description: "True if either is true" },
  { name: "NOT", symbol: "¬", description: "Inverts truth" },
  { name: "IMPLIES", symbol: "→", description: "If A is true, B is true" }
];

function shuffle(arr){ arr = arr.slice(); for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr }

/* --- Simple question pools (unique by difficulty) ---
   Each pool only contains questions for that difficulty.
   Pools are intentionally larger than your run length so questions don't repeat.
*/
const POOLS = {
  easy: [
    {type:'match', ops:['AND','OR','NOT','IMPLIES']},
    {type:'sentence', sentence:"A ___ B (true if both are true)", choices:["AND","OR","IMPLIES","NOT"], answer:"AND"},
    {type:'sentence', sentence:"A ___ B (true if either is true)", choices:["AND","OR","IMPLIES","NOT"], answer:"OR"},
    {type:'sentence', sentence:"___ A (true if A is false)", choices:["AND","OR","IMPLIES","NOT"], answer:"NOT"},
    {type:'sentence', sentence:"If it rains ___ you use an umbrella", choices:["AND","OR","IMPLIES","NOT"], answer:"IMPLIES"}
  ],
  medium: [
    {type:'sentence', sentence:"You can enter if you have a ticket ___ your name is on the list.", choices:["AND","OR","IMPLIES"], answer:"OR"},
    {type:'tt', op:"AND"},
    {type:'sentence', sentence:"If you miss class, ___ you may fall behind", choices:["IMPLIES","AND","OR"], answer:"IMPLIES"},
    {type:'fault', pairs:[["AND","∧"],["OR","∨"],["NOT","¬"],["IMPLIES","∨"]], answerWrongIndex:3},
    {type:'sentence', sentence:"A ___ B ___ C (true if all are true)", choices:["AND","OR","IMPLIES"], answer:"AND"}
  ],
  hard: [
    {type:'sentenceText', sentence:"If you study, you will pass. You studied. Therefore, what follows?", answer:"you will pass"},
    {type:'tt', op:"IMPLIES"},
    {type:'fault', pairs:[["AND","∨"],["OR","∨"],["NOT","¬"],["IMPLIES","→"]], answerWrongIndex:0},
    {type:'sentence', sentence:"Either Alice OR Bob will present (but not both). Which operator?", choices:["AND","OR","IMPLIES","NOT"], answer:"OR"},
    {type:'sentence', sentence:"Light is ON if switch is ON ___ the switch is OFF", choices:["IMPLIES","AND","OR"], answer:"IMPLIES"}
  ]
};

/* --- Game config & state --- */
const DIFFICULTY_COUNT = { easy:5, medium:6, hard:6 }
const TIME_LIMIT = { easy:15, medium:10, hard:5 }

let state = {
  difficulty:'easy',
  mode:'classic',
  questions:[],
  qindex:0,
  score:0,
  lives:3,
  timer:null,
  timeLeft:0
};

/* --- UI refs --- */
const panels = document.querySelectorAll('.panel');
const navLinks = document.querySelectorAll('.nav-link');
const settingsCard = document.getElementById('settings-card');
const gameArea = document.getElementById('game-area');
const floating = document.getElementById('floating-ui');
const statLevel = document.getElementById('stat-level');
const statScore = document.getElementById('stat-score');
const statLives = document.getElementById('stat-lives');
const floatingTimer = document.getElementById('floating-timer');
const timerValue = document.getElementById('timer-value');

/* --- Navigation --- */
document.getElementById('hamburger').addEventListener('click', e=>{
  const nav = document.getElementById('topnav');
  nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
});
navLinks.forEach(a=>{
  a.addEventListener('click', ev=>{
    ev.preventDefault();
    const target = a.dataset.target;
    panels.forEach(p=>p.classList.remove('active-panel'));
    document.getElementById(target).classList.add('active-panel');
    navLinks.forEach(n=>n.classList.remove('active'));
    a.classList.add('active');
    // ensure settings visible if returning to play
    if(target==='home'){ document.getElementById('settings-card').style.display='' }
  });
});
document.getElementById('open-tutorial').addEventListener('click', ()=>{ document.querySelector('[data-target="tutorial"]').click() })

/* --- Settings interactivity --- */
function setupSettings(){
  document.querySelectorAll('#difficulty-select .settings-card').forEach(card=>{
    card.onclick = function(){ document.querySelectorAll('#difficulty-select .settings-card').forEach(c=>c.classList.remove('active')); this.classList.add('active'); state.difficulty = this.dataset.value }
  });
  document.querySelectorAll('#mode-select .settings-card').forEach(card=>{
    card.onclick = function(){ document.querySelectorAll('#mode-select .settings-card').forEach(c=>c.classList.remove('active')); this.classList.add('active'); state.mode = this.dataset.value }
  });
  document.getElementById('start-game').onclick = ()=> startRun();
  document.getElementById('quick-start').onclick = ()=> { document.querySelector('[data-target="home"]').click(); startRun() }
  // leaderboard open
  document.getElementById('open-leaderboard').onclick = ()=> document.querySelector('[data-target="leaderboard"]').click();
  document.getElementById('clear-leader').onclick = ()=> { localStorage.removeItem('lr_leader'); renderLeaderboard(); }
}

/* --- Floating UI controls --- */
document.getElementById('btn-quit').onclick = ()=>{ quitToSettings() }
document.getElementById('btn-retry').onclick = ()=>{ retryRun() }

/* --- Leaderboard (local) --- */
function saveScore(score){
  const key = 'lr_leader';
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  data.push({score:score, ts:Date.now()});
  data.sort((a,b)=>b.score-a.score);
  localStorage.setItem(key, JSON.stringify(data.slice(0,10)));
}
function renderLeaderboard(){
  const list = document.getElementById('leader-list');
  const data = JSON.parse(localStorage.getItem('lr_leader') || '[]');
  list.innerHTML = '';
  if(!data.length) { list.innerHTML = '<li>No scores yet</li>'; return; }
  data.forEach(entry=>{
    const li = document.createElement('li');
    const d = new Date(entry.ts);
    li.textContent = `${entry.score} pts — ${d.toLocaleString()}`;
    list.appendChild(li);
  });
}
renderLeaderboard();

/* --- Start / run helpers --- */
function startRun(){
  // hide settings, show floating UI
  settingsCard.style.display = 'none';
  floating.style.display = 'flex';
  // reset state and build questions unique for this difficulty
  state.score = 0; state.lives = 3; state.qindex = 0;
  // take shuffled subset of pool for this difficulty
  const pool = shuffle(POOLS[state.difficulty]).slice(0, DIFFICULTY_COUNT[state.difficulty]);
  state.questions = pool;
  updateFloating();
  showQuestion();
}

function quitToSettings(){
  stopTimer();
  settingsCard.style.display = '';
  floating.style.display = 'none';
  gameArea.innerHTML = '';
}
function retryRun(){
  stopTimer();
  startRun();
}

/* --- Timer --- */
function startTimer(seconds, onExpire){
  stopTimer();
  state.timeLeft = seconds;
  updateFloating();
  floatingTimer.style.display = '';
  timerValue.textContent = state.timeLeft;
  state.timer = setInterval(()=>{
    state.timeLeft--;
    timerValue.textContent = state.timeLeft;
    if(state.timeLeft <= 0){
      clearInterval(state.timer);
      state.timer = null;
      floatingTimer.style.display = 'none';
      onExpire();
    }
  }, 1000);
}
function stopTimer(){ if(state.timer) clearInterval(state.timer); state.timer=null; floatingTimer.style.display='none'; state.timeLeft=0 }

/* --- UI update --- */
function updateFloating(){
  statLevel.textContent = `${state.qindex+1}/${state.questions.length || 1}`;
  statScore.textContent = state.score;
  statLives.textContent = state.lives;
  if(state.mode === 'timed' && state.timeLeft>0){
    floatingTimer.style.display = ''; timerValue.textContent = state.timeLeft;
  } else {
    timerValue.textContent = '';
    floatingTimer.style.display = 'none';
  }
}

/* --- Question rendering --- */
function showQuestion(){
  stopTimer();
  updateFloating();
  const q = state.questions[state.qindex];
  if(!q){ // end
    finishRun();
    return;
  }
  // timed mode: start timer only when question shown
  if(state.mode === 'timed'){
    startTimer(TIME_LIMIT[state.difficulty], ()=>{ loseLife("Time's up!"); nextOrRetry(); });
  }
  // render according to type
  if(q.type === 'match') renderMatchQuestion(q);
  else if(q.type === 'sentence') renderSentence(q);
  else if(q.type === 'sentenceText') renderSentenceText(q);
  else if(q.type === 'tt') renderTruthTable(q);
  else if(q.type === 'fault') renderFault(q);
  updateFloating();
}

/* -- render helpers for question types -- */
function renderMatchQuestion(q){
  // choose 4 operators (from q.ops) and shuffle
  const ops = q.ops.slice();
  const opPairs = Object.fromEntries(ops.map(n=>[n, operatorsArr.find(x=>x.name===n).symbol]));
  const left = shuffle(ops);
  const right = shuffle(Object.values(opPairs));
  gameArea.innerHTML = `
    <div class="card">
      <div class="game-section-title">Symbol Match</div>
      <p class="subtitle">Drag operator names to the correct symbols.</p>
      <div class="matching-container">
        <div class="game-column"><div class="column-title">Operators</div>${left.map(n=>`<div class="draggable-item" draggable="true" data-op="${n}">${n}</div>`).join('')}</div>
        <div class="game-column"><div class="column-title">Symbols</div>${right.map(s=>`<div class="drop-zone" data-sym="${s}"><span class="zone-label">${s}</span></div>`).join('')}</div>
      </div>
      <div style="margin-top:12px"><button id="check-btn" class="btn btn-primary">Check Answers</button></div>
    </div>`;
  setupDragDrop(opPairs);
}

function setupDragDrop(correctPairs){
  const draggables = document.querySelectorAll('.draggable-item');
  const drops = document.querySelectorAll('.drop-zone');
  let matched = 0;
  draggables.forEach(d=>{
    d.ondragstart = ev => { ev.dataTransfer.setData('text/plain', d.dataset.op); d.classList.add('dragging') }
    d.ondragend = ()=> d.classList.remove('dragging')
  });
  drops.forEach(zone=>{
    zone.ondragover = e => { e.preventDefault(); zone.classList.add('drag-over') }
    zone.ondragleave = ()=> zone.classList.remove('drag-over')
    zone.ondrop = e => {
      e.preventDefault(); zone.classList.remove('drag-over')
      if(zone.dataset.locked) return;
      const op = e.dataTransfer.getData('text/plain');
      if(correctPairs[op] === zone.dataset.sym){
        zone.innerHTML = `<span class="zone-label">${zone.dataset.sym}</span><div class="match-content">${op}</div>`;
        zone.dataset.locked = '1';
        matched++;
      } else {
        zone.classList.add('incorrect'); setTimeout(()=>zone.classList.remove('incorrect'),900);
        loseLife(); // wrong answer
      }
    }
  });
  document.getElementById('check-btn').onclick = ()=>{
    // count locked
    const locks = document.querySelectorAll('.drop-zone[data-locked="1"]').length;
    if(locks === Object.keys(correctPairs).length){
      state.score += 15 * locks;
      nextOrRetry();
    } else {
      showToast('Complete all matches first', 'warning');
    }
  }
}

function renderSentence(q){
  gameArea.innerHTML = `
    <div class="card">
      <div class="game-section-title">Statement Builder</div>
      <p class="subtitle">${q.sentence.replace('___','____')}</p>
      <div style="margin-top:12px" id="sentence-choices">${q.choices.map(c=>`<div class="draggable-item" draggable="true" data-choice="${c}">${c}</div>`).join('')}</div>
      <div style="margin-top:12px">
        <div class="drop-zone" id="sentence-drop">Drop here</div>
      </div>
      <div style="margin-top:12px"><button id="check-btn" class="btn btn-primary">Check Answer</button></div>
    </div>`;
  document.querySelectorAll('#sentence-choices .draggable-item').forEach(d=>{
    d.ondragstart = e => e.dataTransfer.setData('text/plain', d.dataset.choice)
  });
  const drop = document.getElementById('sentence-drop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-over') }
  drop.ondragleave = ()=> drop.classList.remove('drag-over')
  drop.ondrop = e => { e.preventDefault(); drop.textContent = e.dataTransfer.getData('text/plain'); drop.classList.remove('empty'); }
  document.getElementById('check-btn').onclick = ()=>{
    const val = drop.textContent.trim();
    if(!val){ showToast('Please drop a choice', 'warning'); return; }
    if(val === q.answer){ state.score += 25; nextOrRetry() } else { loseLife() }
  }
}

function renderSentenceText(q){
  // expect typed answer (expert)
  gameArea.innerHTML = `
    <div class="card">
      <div class="game-section-title">Logic Reasoning</div>
      <p class="subtitle">${q.sentence}</p>
      <div style="margin-top:12px"><input id="ans-input" class="draggable-item" placeholder="Type your answer..."></div>
      <div style="margin-top:12px"><button id="check-btn" class="btn btn-primary">Check Answer</button></div>
    </div>`;
  document.getElementById('check-btn').onclick = ()=>{
    const val = (document.getElementById('ans-input').value || '').trim().toLowerCase();
    if(!val) { showToast('Type an answer', 'warning'); return; }
    if(val === q.answer.toLowerCase()){ state.score += 40; nextOrRetry() } else { loseLife() }
  }
}

function renderTruthTable(q){
  const op = operatorsArr.find(o=>o.name===q.op);
  const combos = [[true,true],[true,false],[false,true],[false,false]];
  gameArea.innerHTML = `
    <div class="card">
      <div class="game-section-title">Truth Table: ${op.name} (${op.symbol})</div>
      <p class="subtitle">${op.description}</p>
      <table style="width:100%;margin-top:10px">
        <tr><th>A</th><th>B</th><th>Result</th></tr>
        ${combos.map((c,i)=>`<tr><td>${c[0]?'T':'F'}</td><td>${c[1]?'T':'F'}</td><td><div class="drop-zone tt-drop" data-idx="${i}"></div></td></tr>`).join('')}
      </table>
      <div style="margin-top:12px">${['T','F','T','F'].map(v=>`<div class="draggable-item tt-chip" draggable="true" data-val="${v}">${v}</div>`).join('')}</div>
      <div style="margin-top:12px"><button id="check-btn" class="btn btn-primary">Check Answers</button></div>
    </div>`;
  document.querySelectorAll('.tt-chip').forEach(c=> c.ondragstart = e => e.dataTransfer.setData('text/plain', c.dataset.val));
  document.querySelectorAll('.tt-drop').forEach(d=>{
    d.ondragover = e => { e.preventDefault(); d.classList.add('drag-over') };
    d.ondrop = e => { e.preventDefault(); d.textContent = e.dataTransfer.getData('text/plain'); d.classList.remove('empty'); }
  });
  document.getElementById('check-btn').onclick = ()=>{
    const drops = document.querySelectorAll('.tt-drop'); let user = Array.from(drops).map(d=>d.textContent.trim());
    if(user.some(x=>!x)){ showToast('Fill every result', 'warning'); return; }
    const results = combos.map(c=>{
      if(q.op==='AND') return c[0]&&c[1];
      if(q.op==='OR') return c[0]||c[1];
      if(q.op==='IMPLIES') return !c[0]||c[1];
      if(q.op==='NOT') return !c[0];
    });
    const ok = user.every((v,i)=> v === (results[i] ? 'T' : 'F'));
    if(ok){ state.score += 45; nextOrRetry() } else { loseLife() }
  }
}

function renderFault(q){
  gameArea.innerHTML = `
    <div class="card">
      <div class="game-section-title">Find the Fault</div>
      <p class="subtitle">Drag the faulty match to the box</p>
      <div style="display:flex;gap:18px">
        <div style="flex:1">${q.pairs.map((p,i)=>`<div class="draggable-item fault-item" draggable="true" data-idx="${i}">${p[0]} <span class="zone-label">${p[1]}</span></div>`).join('')}</div>
        <div style="width:170px"><div class="drop-zone" id="fault-drop" style="height:48px;display:flex;align-items:center;justify-content:center">Drop</div></div>
      </div>
    </div>`;
  document.querySelectorAll('.fault-item').forEach(d=> d.ondragstart = e => e.dataTransfer.setData('text/plain', d.dataset.idx));
  const drop = document.getElementById('fault-drop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-over') };
  drop.ondrop = e => {
    e.preventDefault(); drop.classList.remove('drag-over');
    const idx = parseInt(e.dataTransfer.getData('text/plain'));
    if(idx === q.answerWrongIndex){ state.score += 30; nextOrRetry() } else { loseLife() }
  }
}

/* --- progression helpers --- */
function nextOrRetry(){
  stopTimer();
  state.qindex++;
  if(state.qindex >= state.questions.length){ finishRun(); }
  else showQuestion();
}

function loseLife(msg){
  if(msg) showToast(msg || 'Wrong', 'error');
  state.lives--;
  updateFloating();
  if(state.lives <= 0){ showRetryPrompt() }
}

function finishRun(){
  stopTimer();
  saveScore(state.score);
  renderLeaderboard();
  showToast('Run complete! Score saved', 'success');
  // show leaderboard panel
  document.querySelector('[data-target="leaderboard"]').click();
  // hide floating UI
  floating.style.display = 'none';
}

/* --- modals & utilities --- */
function showToast(txt, type='info'){
  const t = document.createElement('div'); t.className='game-message'; t.textContent = txt;
  document.body.appendChild(t); setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),400) },2000);
}
function showRetryPrompt(){
  stopTimer();
  const modal = document.createElement('div'); modal.className='modal-overlay';
  modal.innerHTML = `<div class="modal-popup"><div class="modal-title"><i class="fas fa-heart-broken"></i> Game Over</div>
    <div class="modal-content">You ran out of lives. Try again?</div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:12px">
      <button id="modal-retry" class="btn btn-primary">Retry</button>
      <button id="modal-quit" class="btn btn-secondary">Quit</button>
    </div></div>`;
  document.body.appendChild(modal);
  modal.querySelector('#modal-retry').onclick = ()=>{ modal.remove(); retryRun() };
  modal.querySelector('#modal-quit').onclick = ()=>{ modal.remove(); quitToSettings() };
}

/* --- render leaderboard initially --- */
function renderLeaderboard(){ const list = document.getElementById('leader-list'); list.innerHTML=''; const data = JSON.parse(localStorage.getItem('lr_leader')||'[]'); if(!data.length) list.innerHTML='<li>No scores yet</li>'; else data.forEach(d=>{ const li=document.createElement('li'); li.textContent=`${d.score} pts — ${new Date(d.ts).toLocaleString()}`; list.appendChild(li) }) }

/* --- initialize on load --- */
window.addEventListener('DOMContentLoaded', ()=>{
  setupSettings();
  setupSettings = setupSettings; // no-op keep console quiet
  // wire quick navigation (show home on load)
  document.querySelector('[data-target="home"]').click();
});