(() => {
  const operators = [
    { name: "AND", symbol: "∧" },
    { name: "OR", symbol: "∨" },
    { name: "IMPLIES", symbol: "→" },
    { name: "NOT", symbol: "¬" },
    { name: "XOR", symbol: "⊕" }
  ];

  /* --- NEW EXTRA QUESTIONS --- */
  const extraSentences = [
    { type: 'sentence', sentence: "A ___ (true only if exactly one is true)", choices: ["XOR", "AND"], answer: "XOR" },
    { type: 'sentence', sentence: "If A then B (false only when A is true and B is ___)", choices: ["false", "true"], answer: "false" }
  ];

  const sentenceQs = {
    easy: [
      { type: 'sentence', sentence: "A ___ B (true if both are true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "AND" },
      { type: 'sentence', sentence: "A ___ B (true if either is true)", choices: ["AND", "OR", "IMPLIES", "NOT"], answer: "OR" },
      ...extraSentences
    ],
    medium: [
      { type: 'sentence', sentence: "You enter if you have a ticket ___ your name is listed.", choices: ["AND","OR","IMPLIES"], answer: "OR" },
      ...extraSentences
    ],
    hard: [
      ...extraSentences,
      { type: 'sentence', sentence: "p∨q is false only if ___", choices: ["both false","both true"], answer: "both false" }
    ]
  };

  function shuffle(arr) {
    arr = arr.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const state = {
    difficulty: 'easy',
    mode: 'classic',
    questions: [],
    qindex: 0,
    score: 0,
    lives: 3,
    timer: null,
    timeLeft: 0
  };

  /* UI ELEMENTS */
  const gameArea = document.getElementById("game-area");

  function buildQuestions(diff) {
    const sentences = shuffle(sentenceQs[diff]).slice(0, 3);
    return [...sentences];
  }

  function renderSentence(q) {
    gameArea.innerHTML = `
      <div class="card">
        <div class="game-section-title">Statement Builder</div>
        <p>${q.sentence.replace("___","_____")}</p>
        <div style="display:flex;gap:12px;margin-top:15px" id="choices">
          ${q.choices.map(c => `<div class="draggable-item" draggable="true" data-choice="${c}">${c}</div>`).join("")}
        </div>
        <div style="margin-top:12px">
          <div id="drop" class="drop-zone">Drop here</div>
        </div>
        <button id="check" class="btn btn-primary" style="margin-top:14px;">Check</button>
      </div>
    `;

    const drop = document.getElementById("drop");
    const check = document.getElementById("check");

    gameArea.querySelectorAll(".draggable-item").forEach(d => {
      d.ondragstart = e => e.dataTransfer.setData("text/plain", d.dataset.choice);
    });

    drop.ondragover = e => { e.preventDefault(); drop.classList.add("drag-over"); };
    drop.ondragleave = () => drop.classList.remove("drag-over");
    drop.ondrop = e => {
      e.preventDefault();
      drop.textContent = e.dataTransfer.getData("text/plain");
      drop.classList.remove("drag-over");
    };

    check.onclick = () => {
      if (drop.textContent.trim() === q.answer) {
        state.score += 20;
        nextQuestion();
      } else {
        state.lives--;
        nextQuestion();
      }
    };
  }

  function nextQuestion() {
    state.qindex++;
    if (state.qindex >= state.questions.length) {
      gameArea.innerHTML = `<div class="card"><h2>Finished!</h2><p>Score: ${state.score}</p></div>`;
    } else {
      renderQuestion(state.questions[state.qindex]);
    }
  }

  function renderQuestion(q) {
    if (q.type === "sentence") renderSentence(q);
  }

  function startGame() {
    state.questions = buildQuestions(state.difficulty);
    state.qindex = 0;
    state.score = 0;
    state.lives = 3;
    renderQuestion(state.questions[0]);
  }

  document.getElementById("start-game").onclick = startGame;
  document.getElementById("quick-start").onclick = startGame;
})();
