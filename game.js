// --- Logic Data
const operatorsArr = [
    { name: "AND", symbol: "∧", description: "True if both are true" },
    { name: "OR", symbol: "∨", description: "True if either is true" },
    { name: "NOT", symbol: "¬", description: "Inverts truth" },
    { name: "IMPLIES", symbol: "→", description: "If A is true, B is true" },
    { name: "NOR", symbol: "↓", description: "True if both are false" },
    { name: "NAND", symbol: "⊼", description: "False if both are true" },
];
function shuffle(arr) {
    arr = arr.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
const DIFFICULTY = {
    easy: 5,
    medium: 7,
    hard: 10
};
const TIME_LIMIT = {
    easy: 15,
    medium: 10,
    hard: 5
};
const LEVELS = [
    {
        title: "Symbol Match",
        instructions: "Drag each logic operator to its correct symbol. Order is always randomized!",
        generateQuestions: qCount => {
            let questions = [];
            for(let i=0;i<qCount;i++) {
                let ops = shuffle(operatorsArr).slice(0,4);
                let opPairs = Object.fromEntries(ops.map(o=>[o.name,o.symbol]));
                let left = shuffle(ops.map(o=>o.name));
                let right = shuffle(ops.map(o=>o.symbol));
                questions.push({
                    opPairs, left, right
                });
            }
            return questions;
        },
        type: "match"
    },
    {
        title: "Statement Builder",
        instructions: "Drag the correct logic connector into the blank in the statement.",
        generateQuestions: qCount => {
            const sentences = [
                { template: "A ___ B (true if both are true)", answer: "AND" },
                { template: "A ___ B (true if either is true)", answer: "OR" },
                { template: "A ___ B (true if A is true, B must be true)", answer: "IMPLIES" },
                { template: "___ A (true if A is false)", answer: "NOT" }
            ];
            let questions = [];
            for(let i=0;i<qCount;i++) {
                let chosen = sentences[Math.floor(Math.random() * sentences.length)];
                let choices = shuffle(["AND","OR","IMPLIES","NOT"]);
                questions.push({
                    sentence: chosen.template,
                    choices,
                    answer: chosen.answer
                });
            }
            return questions;
        },
        type: "sentence"
    },
    {
        title: "Find the Fault",
        instructions: "Drag the incorrect operator-symbol match to the orange zone.",
        generateQuestions: qCount => {
            let questions = [];
            for(let i=0;i<qCount;i++) {
                let ops = shuffle(operatorsArr).slice(0,4);
                let pairs = ops.map(o=>[o.name,o.symbol]);
                let wrongIndex = Math.floor(Math.random() * pairs.length);
                let wrongSymbol = shuffle(operatorsArr.filter(o=>o.name !== pairs[wrongIndex][0]))[0].symbol;
                pairs[wrongIndex][1] = wrongSymbol;
                questions.push({
                    pairs, answerWrongIndex: wrongIndex
                });
            }
            return questions;
        },
        type: "fault"
    },
    {
        title: "Truth Table Builder",
        instructions: "Drag T/F chips to fill in the operator's truth table.",
        generateQuestions: qCount => {
            let questions = [];
            for(let i=0;i<qCount;i++){
                let op = operatorsArr[Math.floor(Math.random()*operatorsArr.length)];
                let combos = [[true,true],[true,false],[false,true],[false,false]];
                let results = combos.map(c=>{
                    if(op.name==="AND") return c[0]&&c[1];
                    if(op.name==="OR") return c[0]||c[1];
                    if(op.name==="IMPLIES") return !c[0]||c[1];
                    if(op.name==="NOT") return !c[0];
                    if(op.name==="NAND") return !(c[0]&&c[1]);
                    if(op.name==="NOR") return !(c[0]||c[1]);
                    return null;
                });
                questions.push({op,combos,results});
            }
            return questions;
        },
        type: "tt"
    }
];
// --- State & UI refs
let gameState = {
    difficulty: "easy",
    mode: "classic",
    level: 0,
    score: 0,
    lives: 3,
    questions: [],
    question: 0,
    timer: null,
    timeLeft: 0
};
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function updateStats() {
    $("#current-level").textContent = gameState.level+1;
    $("#level-total").textContent = LEVELS.length;
    $("#score-value").textContent = gameState.score;
    $("#lives-value").textContent = gameState.lives;
}
// --- Settings UI ---
function settingsSetup() {
    $$("#difficulty-select .settings-card").forEach(card=>{
        card.onclick = function() {
            $$("#difficulty-select .settings-card").forEach(c=>c.classList.remove("active"));
            this.classList.add("active");
            gameState.difficulty = this.dataset.value;
        };
    });
    $$("#mode-select .settings-card").forEach(card=>{
        card.onclick = function() {
            $$("#mode-select .settings-card").forEach(c=>c.classList.remove("active"));
            this.classList.add("active");
            gameState.mode = this.dataset.value;
        };
    });
    $("#start-game").onclick = startGame;
}
// --- Game Start!
function startGame() {
    $("#settings-card").style.display = "none";
    gameState.level = 0;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.question = 0;
    gameState.questions = LEVELS[gameState.level].generateQuestions(DIFFICULTY[gameState.difficulty]);
    updateStats();
    showQuestion();
}
// --- Timer Logic
function startTimer(seconds,onExpire) {
    gameState.timeLeft = seconds;
    updateTimerUI();
    $("#floating-timer").style.display = "block";
    if(gameState.timer)clearInterval(gameState.timer);
    gameState.timer = setInterval(()=>{
        gameState.timeLeft--;
        updateTimerUI();
        if(gameState.timeLeft<=0){
            clearInterval(gameState.timer);
            $("#floating-timer").style.display = "none";
            onExpire();
        }
    },1000);
}
function stopTimer() {
    if(gameState.timer) clearInterval(gameState.timer);
    $("#floating-timer").style.display = "none";
}
function updateTimerUI() {
    $("#timer-value").textContent = gameState.timeLeft;
    $("#floating-timer").style.borderColor = gameState.timeLeft<4 ? "#ef4746" : "#f45223";
}
// --- Show Question
function showQuestion() {
    const level = LEVELS[gameState.level];
    const q = gameState.questions[gameState.question];
    let idx = gameState.question;
    // Floats/timers
    stopTimer();
    // Based on mode, show timer!
    if(gameState.mode === "timed") {
        startTimer(TIME_LIMIT[gameState.difficulty], ()=>{loseLife("Time's up!");});
    }
    // Match
    if(level.type === "match") renderMatch(q, idx, level);
    if(level.type === "sentence") renderSentence(q, idx, level);
    if(level.type === "fault") renderFault(q, idx, level);
    if(level.type === "tt") renderTT(q, idx, level);
    updateStats();
}
function nextQuestion() {
    if(gameState.mode === "timed") stopTimer();
    gameState.question++;
    if(gameState.question < gameState.questions.length && gameState.lives > 0){
        showQuestion();
    } else if(gameState.lives > 0){
        // Next level!
        if(gameState.level < LEVELS.length-1){
            gameState.level++;
            gameState.questions = LEVELS[gameState.level].generateQuestions(DIFFICULTY[gameState.difficulty]);
            gameState.question=0;
            showMessage("Next level!", "success");
            setTimeout(()=>showQuestion(),500);
        }else{
            showEndModal();
        }
    } else {
        showRetryModal();
    }
}
// --- Levels ---
function renderMatch(q, idx, level) {
    $("#game-area").innerHTML = `
        <div class="game-section-title">Level ${gameState.level+1}: ${level.title}</div>
        <div class="subtitle">${level.instructions}<br><span style="font-size:1.03em;color:#555;">Question ${idx+1} of ${gameState.questions.length}</span></div>
        <div class="matching-container">
            <div class="game-column">
                <div class="column-title">OPERATORS</div>
                ${q.left.map(n=>`<div class="draggable-item" draggable="true" data-operator="${n}">${n}</div>`).join("")}
            </div>
            <div class="game-column">
                <div class="column-title">SYMBOLS</div>
                ${q.right.map(sym=>`<div class="drop-zone empty" data-symbol="${sym}"><span class="zone-label">${sym}</span></div>`).join("")}
            </div>
        </div>
        <div class="game-controls">
            <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answers</button>
        </div>
    `;
    dragDropMultiMatch(q.opPairs, ()=>advanceMatchScore(q.opPairs.length));
}
function dragDropMultiMatch(correctPairs, onWin){
    const draggables = $$(".draggable-item");
    const dropZones = $$(".drop-zone");
    let matched = 0;
    draggables.forEach(item=>{
        item.ondragstart = function(e){
            e.dataTransfer.setData("text/plain", this.dataset.operator);
            item.classList.add("dragging");
        };
        item.ondragend = function(){item.classList.remove("dragging");};
    });
    dropZones.forEach(zone=>{
        zone.ondragover = e=>{e.preventDefault();zone.classList.add("drag-over");};
        zone.ondragleave = ()=>zone.classList.remove("drag-over");
        zone.ondrop = function(e){
            e.preventDefault();
            zone.classList.remove("drag-over");
            if(zone.classList.contains("correct"))return;
            const opName = e.dataTransfer.getData("text/plain");
            if(correctPairs[opName] === zone.dataset.symbol){
                zone.innerHTML = `<span class="zone-label">${zone.dataset.symbol}</span>
                    <div class="match-content">${opName}</div>`;
                zone.classList.add("correct");zone.classList.remove("empty");
                item = $(`.draggable-item[data-operator="${opName}"]`);
                item.classList.add("disabled");
                item.setAttribute("draggable","false");
                matched++;
                showMessage(`${opName} → ${zone.dataset.symbol} is correct!`,"success");
            }else{
                zone.classList.add("incorrect");
                setTimeout(()=>zone.classList.remove("incorrect"),900);
                showMessage(`${opName} → ${zone.dataset.symbol} is WRONG!`,"error");
                loseLife();
            }
        };
    });
    $("#check-btn").onclick = function(){
        if(matched === Object.keys(correctPairs).length){
            showMessage(`Good! All pairs matched.`, "success");
            onWin();
        }else{
            showMessage(`You need to finish all matches`, "warning");
        }
    }
}
function advanceMatchScore(n){
    gameState.score+=n*15;
    nextQuestion();
}
function renderSentence(q,idx,level){
    $("#game-area").innerHTML = `
        <div class="game-section-title">Level ${gameState.level+1}: ${level.title}</div>
        <div class="subtitle">${level.instructions}<br><span style="font-size:1.03em;color:#555;">Question ${idx+1} of ${gameState.questions.length}</span></div>
        <div class="sentence-area" style="background:#fff;padding:1.2em;border-radius:8px;margin-bottom:.7em;letter-spacing:.07em;">
            <span style="color:#c76300;font-weight:700;">${q.sentence.replace("___",`<span id="sentence-drop" class="drop-zone empty" style="display:inline-block;width:90px"></span>`)}</span>
        </div>
        <div class="sentence-choices" style="display:flex;gap:1.1em;">
            ${q.choices.map(choice=>`
                <div class="draggable-item sentence-choice" draggable="true" data-choice="${choice}">${choice}</div>
            `).join("")}
        </div>
        <div class="game-controls">
            <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answer</button>
        </div>
    `;
    let droppedChoice = "";
    const drop = $("#sentence-drop");
    $$(".sentence-choice").forEach(item=>{
        item.ondragstart = e=>{
            e.dataTransfer.setData("text/plain", item.dataset.choice);
        };
    });
    drop.ondragover = e=>{e.preventDefault();drop.classList.add("drag-over");};
    drop.ondragleave = ()=>drop.classList.remove("drag-over");
    drop.ondrop = e=>{
        e.preventDefault();
        drop.classList.remove("drag-over");
        let val = e.dataTransfer.getData("text/plain");
        drop.textContent = val; droppedChoice = val;
        drop.classList.remove("empty");
    };
    $("#check-btn").onclick = ()=>{
        if(droppedChoice){
            if(droppedChoice === q.answer){
                showMessage("You filled the sentence correctly!","success");
                gameState.score+=25;nextQuestion();
            }else{
                showMessage("Incorrect logic connector.","error");loseLife();
            }
        }else{
            showMessage("Drag one of the choices to the blank.","warning");
        }
    };
}
// Fault
function renderFault(q,idx,level){
    $("#game-area").innerHTML = `
        <div class="game-section-title">Level ${gameState.level+1}: ${level.title}</div>
        <div class="subtitle">${level.instructions}<br><span style="font-size:1.03em;color:#555;">Question ${idx+1} of ${gameState.questions.length}</span></div>
        <div style="display:flex;gap:3em;">
            <div>
                <div class="column-title">Matches</div>
                <div style="display:flex;flex-direction:column;gap:.8em;">
                    ${q.pairs.map((pair,i)=>
                        `<div class="draggable-item fault-item" draggable="true" data-faultidx="${i}">${pair[0]} <span class="zone-label">${pair[1]}</span></div>`
                    ).join("")}
                </div>
            </div>
            <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;">
                <div class="column-title">Drag the FALSE match here!</div>
                <div id="fault-drop" class="drop-zone empty" style="width:170px;height:54px;line-height:54px;text-align:center;justify-content:center;">
                    <span style="color:#f45223;font-weight:700;font-size:1.25em;">🚫</span>
                </div>
            </div>
        </div>
        <div class="game-controls">
            <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answer</button>
        </div>
    `;
    $$(".fault-item").forEach(item=>{
        item.ondragstart = e=>{e.dataTransfer.setData("text/plain", item.dataset.faultidx);}
    });
    const drop = $("#fault-drop");
    drop.ondragover = e=>{e.preventDefault();drop.classList.add("drag-over");};
    drop.ondragleave = ()=>drop.classList.remove("drag-over");
    drop.ondrop = e=>{
        e.preventDefault(); drop.classList.remove("drag-over");
        let idxDrop = parseInt(e.dataTransfer.getData("text/plain"));
        if(idxDrop === q.answerWrongIndex){
            drop.innerHTML = `<span style="color:#25b185;font-weight:700;font-size:1.25em;">Correct!</span>`;
            showMessage("Well spotted!","success");
            gameState.score+=35;nextQuestion();
        }else{
            showMessage("That's not the wrong match.","error");loseLife();
        }
    };
    $("#check-btn").onclick = ()=>showMessage("Drag the wrong match to the zone first.","warning");
}
// TT
function renderTT(q,idx,level){
    $("#game-area").innerHTML = `
        <div class="game-section-title">Level ${gameState.level+1}: ${level.title}</div>
        <div class="subtitle">Operator: <strong>${q.op.name}</strong> (${q.op.symbol}) — ${q.op.description}
            <br><span style="font-size:1.03em;color:#555;">Question ${idx+1} of ${gameState.questions.length}</span>
        </div>
        <div class="tt-grid" style="margin-top:1.1em;margin-bottom:1.2em;">
            <table style="font-family:'IBM Plex Mono',monospace;font-size:1.09em;">
                <tr>
                    <th>A</th><th>B</th><th>Result</th>
                </tr>
                ${q.combos.map((c,i)=>
                    `<tr>
                        <td>${c[0] ? "T" : "F"}</td>
                        <td>${c[1] ? "T" : "F"}</td>
                        <td><div class="drop-zone tt-drop empty" data-ttidx="${i}" style="width:55px;height:31px;"></div></td>
                    </tr>`
                ).join("")}
            </table>
        </div>
        <div style="margin-bottom:1.3em;">
            <div class="column-title" style="margin-bottom:.65em;">Drag T/F chips below:</div>
            <div class="tt-chips" style="display:flex;gap:.7em;">
                ${["T","F","T","F"].map(ret=>`
                    <div class="draggable-item tt-chip" draggable="true" data-value="${ret}">${ret}</div>
                `).join("")}
            </div>
        </div>
        <div class="game-controls">
            <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answers</button>
        </div>
    `;
    let drops = $$(".tt-drop");
    let chips = $$(".tt-chip");
    let userSolution = Array(drops.length).fill(null);
    chips.forEach(item=>{
        item.ondragstart = e=>{e.dataTransfer.setData("text/plain",item.dataset.value);}
    });
    drops.forEach((drop,i)=>{
        drop.ondragover = e=>{e.preventDefault();drop.classList.add("drag-over");};
        drop.ondragleave = ()=>drop.classList.remove("drag-over");
        drop.ondrop = e=>{
            e.preventDefault();drop.classList.remove("drag-over");
            let val = e.dataTransfer.getData("text/plain");
            drop.textContent = val;userSolution[i]=val;
            drop.classList.remove("empty");
        };
    });
    $("#check-btn").onclick = ()=>{
        if(userSolution.every(x=>x)){
            let correct = userSolution.every(
                (v,idx)=>((q.results[idx] ? "T" : "F") === v)
            );
            if(correct){
                showMessage("You completed the table correctly!","success");
                gameState.score+=45;nextQuestion();
            }else{
                showMessage("Incorrect table! Try again.","error");
                loseLife();
            }
        }else{
            showMessage("Please fill every result cell.","warning");
        }
    };
}

function loseLife(msg){
    gameState.lives--;
    updateStats();
    if(gameState.lives <= 0) {
        showRetryModal();
    } else if(msg) {
        showMessage(msg, "error");
        setTimeout(()=>nextQuestion(),1200);
    }
}
function showMessage(msg,type){
    let existing = $(".game-message");
    if(existing)existing.remove();
    let div = document.createElement("div");
    div.className = `game-message ${type}`;
    div.textContent = msg;
    div.style.background = type==="success" ? "#25b185"
        : type==="error" ? "#ef4746"
        : type==="warning" ? "#f49b23"
        : "#232325e0";
    document.body.appendChild(div);
    setTimeout(()=>{div.style.opacity="0";setTimeout(()=>div.remove(),500);},2300);
}
function showRetryModal(){
    stopTimer();
    let modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-popup">
        <div class="modal-title"><i class="fas fa-heart-broken"></i> Game Over</div>
        <div class="modal-content">Your lives ran out.<br>Would you like to try again?</div>
        <button class="btn btn-primary modal-btn modal-tryagain"><i class="fas fa-redo"></i> Try Again</button>
      </div>
    `;
    document.body.appendChild(modal);
    $(".modal-tryagain").onclick = ()=>{
        modal.remove();
        $("#settings-card").style.display = "";
        $("#game-area").innerHTML = "";
        stopTimer();
    };
}
function showEndModal(){
    stopTimer();
    $("#game-area").innerHTML = `
        <div class="card">
            <div class="card-title"><i class="fas fa-trophy"></i><h3>Game Complete!</h3></div>
            <p>You scored <strong>${gameState.score}</strong> points.<br>
            Refresh or <span class='retry-link' style='text-decoration:underline;color:#f45223;cursor:pointer;'>play again!</span></p>
        </div>
    `;
    $(".retry-link").onclick = ()=>{
        $("#settings-card").style.display = "";
        $("#game-area").innerHTML = "";
        stopTimer();
    };
    showMessage('Congratulations! You finished all levels!', 'success');
    updateStats();
}

// Start on load
window.addEventListener("DOMContentLoaded",()=>{
    settingsSetup();
    updateStats();
});