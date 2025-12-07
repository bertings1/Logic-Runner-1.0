// Logic operators: ONLY core, no NOR/NAND.
const operatorsArr = [
    { name: "AND", symbol: "∧", description: "True if both are true" },
    { name: "OR", symbol: "∨", description: "True if either is true" },
    { name: "NOT", symbol: "¬", description: "Inverts truth" },
    { name: "IMPLIES", symbol: "→", description: "If A is true, B is true" }
];
function shuffle(arr) {
    arr = arr.slice();
    for (let i = arr.length-1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i+1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ---- QUESTION POOLS: These are hand-designed and NO repeat across beginner/inter/expert ----
const POOLS = {
    easy: [
        // Simple match and symbol logic
        { type:'match', ops:['AND','OR','NOT','IMPLIES'] }, // Classic, any order
        { type:'sentence', sentence:"A ___ B (true if both are true)", choices:["AND","OR","IMPLIES","NOT"], answer:"AND" },
        { type:'sentence', sentence:"A ___ B (true if either is true)", choices:["AND","OR","IMPLIES","NOT"], answer:"OR" },
        { type:'sentence', sentence:"___ A (true if A is false)", choices:["AND","OR","IMPLIES","NOT"], answer:"NOT" },
        { type:'sentence', sentence:"If rain ___ umbrella, you stay dry. (umbrella because rain)", choices:["IMPLIES","AND","OR","NOT"], answer:"IMPLIES" }
    ],
    medium: [
        // NO duplication of above, add chaining, real life, truth table
        { type:'sentence', sentence:"A ___ B ___ C (true if all are true)", choices:["AND","OR","IMPLIES"], answer:"AND" },
        { type:'sentence', sentence:"You can enter if you have a ticket ___ your name is on the list.", choices:["AND","OR","IMPLIES"], answer:"OR" },
        { type:'tt', op:"AND" },
        { type:'sentence', sentence:"If you do NOT complete your homework, ___ you get a bad grade.", choices:["IMPLIES","AND","OR"], answer:"IMPLIES" },
        { type:'fault', pairs:[["AND","∧"],["OR","∨"],["NOT","¬"],["IMPLIES","∨"]], answerWrongIndex:3 }
    ],
    hard: [
        // Real-world deductive, multi-step, hard logic
        { type:'sentence', sentence:"If you study, you will pass. You studied. Therefore ___ ?", choices:["You will pass","Nothing follows","You did not pass"], answer:"You will pass" },
        { type:'sentence', sentence:"Either Alice OR Bob will present, but not both.", choices:["AND","OR","IMPLIES","NOT"], answer:"OR" },
        { type:'tt', op:"IMPLIES" },
        { type:'fault', pairs:[["AND","∨"],["OR","∨"],["NOT","¬"],["IMPLIES","→"]], answerWrongIndex:0 },
        { type:'sentence', sentence:"Light will be ON if the switch is ON ___ the switch is OFF.", choices:["AND","OR","IMPLIES"], answer:"IMPLIES" }
    ]
};
const LEVELS = [
    {title:'Logic Mastery',pool:'easy'},
    {title:'Logic Sprint',pool:'medium'},
    {title:'Logic Deduction',pool:'hard'},
    {title:'Truth Test',pool:'hard'}
];

// --- Settings, State, UI refs
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
const DIFFICULTY = {
    easy: 5,
    medium: 6,
    hard: 5
};
const TIME_LIMIT = {
    easy: 15,
    medium: 10,
    hard: 5
};
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// --- Setup: Game Settings ---
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
    $("#start-game").onclick = ()=>{
        document.getElementById("settings-card").style.display = "none";
        showFloatingUI(true);
        startGame();
    };
}
function showFloatingUI(on) {
    $("#floating-ui").style.display = on ? "flex":"none";
    updateFloatingUI();
}
function updateFloatingUI() {
    $("#stat-level").textContent = `${gameState.level+1}/${LEVELS.length}`;
    $("#stat-score").textContent = gameState.score;
    $("#stat-lives").textContent = gameState.lives;
    // Timer: Only in timed mode, only during question
    let isTimed = (gameState.mode==="timed" && typeof gameState.timeLeft==="number" && gameState.timeLeft > 0);
    if(isTimed){
        $("#floating-timer").style.display = "";
        $("#timer-value").textContent = gameState.timeLeft;
        $("#floating-timer").style.borderColor = gameState.timeLeft<4 ? "#ef4746":"#f45223";
    }else{
        $("#floating-timer").style.display = "none";
    }
}
function startGame() {
    // Difficulty/Mode already selected
    gameState.level = 0;
    gameState.score = 0;
    gameState.lives = 3;
    // Build Q set for this game, no repeats between difficulties
    const diff = gameState.difficulty;
    let pool = shuffle(POOLS[diff]).slice(0, DIFFICULTY[diff]);
    gameState.questions = pool;
    gameState.question = 0;
    showQuestion();
}

// ---- Controls: quit, retry
$("#btn-quit").onclick = ()=>{
    stopTimer();
    showFloatingUI(false);
    $("#settings-card").style.display = "";
    $("#game-area").innerHTML = "";
};
$("#btn-retry").onclick = ()=>{
    stopTimer();
    showFloatingUI(true);
    startGame();
};
// ------ Timer
function startTimer(seconds, onExpire) {
    gameState.timeLeft = seconds;
    updateFloatingUI();
    if(gameState.timer)clearInterval(gameState.timer);
    gameState.timer = setInterval(()=>{
        gameState.timeLeft--;
        updateFloatingUI();
        if(gameState.timeLeft<=0){
            clearInterval(gameState.timer);
            $("#floating-timer").style.display = "none";
            onExpire();
        }
    },1000);
}
function stopTimer() {
    if(gameState.timer) clearInterval(gameState.timer);
    gameState.timeLeft = 0;
    updateFloatingUI();
}
// ---- Gameplay
function showQuestion() {
    stopTimer();
    updateFloatingUI();
    let qdata = gameState.questions[gameState.question];
    let idx = gameState.question;
    // Timed mode
    if(gameState.mode==="timed" && qdata.type!=="match") {
        startTimer(TIME_LIMIT[gameState.difficulty], ()=>{loseLife("Time's up!");});
    }
    // Render Q
    if(qdata.type==="match") renderMatch(qdata, idx);
    else if(qdata.type==="sentence") renderSentence(qdata, idx);
    else if(qdata.type==="tt") renderTT(qdata, idx);
    else if(qdata.type==="fault") renderFault(qdata, idx);
}
function nextQuestion() {
    stopTimer();
    gameState.question++;
    if(gameState.question < gameState.questions.length && gameState.lives > 0){
        showQuestion();
    } else if(gameState.lives > 0){
        // Next "level" = pick next set of questions (if any). Here we just end for demo.
        showEndModal();
    } else {
        showRetryModal();
    }
}
function renderMatch(q,idx){
    let ops = q.ops.map(n=>operatorsArr.find(o=>o.name===n));
    let opPairs = Object.fromEntries(ops.map(o=>[o.name,o.symbol]));
    let left = shuffle(ops.map(o=>o.name));
    let right = shuffle(ops.map(o=>o.symbol));
    $("#game-area").innerHTML = `
        <div class="game-section-title">Symbol Match</div>
        <div class="subtitle">Match each logic name to its symbol.<br><span style="font-size:1.03em;color:#555;">Question ${idx+1} of ${gameState.questions.length}</span></div>
        <div class="matching-container">
            <div class="game-column">
                <div class="column-title">OPERATORS</div>
                ${left.map(n=>`<div class="draggable-item" draggable="true" data-operator="${n}">${n}</div>`).join("")}
            </div>
            <div class="game-column">
                <div class="column-title">SYMBOLS</div>
                ${right.map(sym=>`<div class="drop-zone empty" data-symbol="${sym}"><span class="zone-label">${sym}</span></div>`).join("")}
            </div>
        </div>
        <div class="game-controls">
            <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answers</button>
        </div>
    `;
    dragDropMultiMatch(opPairs, ()=>advanceMatchScore(left.length));
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
                let item = $(`.draggable-item[data-operator="${opName}"]`);
                item.classList.add("disabled");item.setAttribute("draggable","false");
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
function renderSentence(q,idx){
    // Check: special text response (for expert); otherwise drag-drop
    if(q.choices && q.answer){
        $("#game-area").innerHTML = `
            <div class="game-section-title">Logic Sentence</div>
            <div class="subtitle">${q.sentence}<br><span style="font-size:1.03em;color:#555;">Question ${idx+1} of ${gameState.questions.length}</span></div>
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
            drop.textContent = val; droppedChoice = val; drop.classList.remove("empty");
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
    } else if(q.answer){ // Text-driven "make correct deduction"
        $("#game-area").innerHTML = `
            <div class="game-section-title">Logic Reasoning</div>
            <div class="subtitle">${q.sentence}<br><span style="font-size:1.03em;color:#555;">Question ${idx+1} of ${gameState.questions.length}</span></div>
            <div>
                <input type="text" id="logic-input" class="draggable-item" placeholder="Type your answer..." style="width:222px;margin-bottom:1.2em;">
            </div>
            <div class="game-controls">
                <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answer</button>
            </div>
        `;
        $("#check-btn").onclick = ()=>{
            let user = ($("#logic-input").value+"").trim().toLowerCase();
            if(user && user === (q.answer+"").toLowerCase()){
                showMessage("That's correct!","success");
                gameState.score+=45;nextQuestion();
            }else{
                showMessage("Incorrect, try again!","error");loseLife();
            }
        }
    }
}
function renderFault(q,idx){
    $("#game-area").innerHTML = `
        <div class="game-section-title">Spot the Faulty</div>
        <div class="subtitle">Drag the incorrect match to the zone.<br><span style="font-size:1.03em;color:#555;">Question ${idx+1} of ${gameState.questions.length}</span></div>
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
function renderTT(q,idx){
    let combos = [[true,true],[true,false],[false,true],[false,false]];
    let op = operatorsArr.find(o=>o.name===q.op);
    let results = combos.map(c=>{
        if(op.name==="AND") return c[0]&&c[1];
        if(op.name==="OR") return c[0]||c[1];
        if(op.name==="IMPLIES") return !c[0]||c[1];
        if(op.name==="NOT") return !c[0];
    });
    $("#game-area").innerHTML = `
        <div class="game-section-title">Truth Table</div>
        <div class="subtitle">${op.name} (${op.symbol}): ${op.description}
            <br><span style="font-size:1.03em;color:#555;">Question ${idx+1} of ${gameState.questions.length}</span>
        </div>
        <div class="tt-grid" style="margin-top:1.1em;margin-bottom:1.2em;">
            <table style="font-family:'IBM Plex Mono',monospace;font-size:1.09em;">
                <tr>
                    <th>A</th><th>B</th><th>Result</th>
                </tr>
                ${combos.map((c,i)=>
                    `<tr>
                        <td>${c[0] ? "T" : "F"}</td>
                        <td>${c[1] ? "T" : "F"}</td>
                        <td><div class="drop-zone tt-drop empty" data-ttidx="${i}" style="width:55px;height:31px;"></div></td>
                    </tr>`
                ).join("")}
            </table>
        </div>
        <div class="column-title" style="margin-bottom:.65em;">Drag T/F chips below:</div>
        <div class="tt-chips" style="display:flex;gap:.7em;">
            ${["T","F","T","F"].map(ret=>`
                <div class="draggable-item tt-chip" draggable="true" data-value="${ret}">${ret}</div>
            `).join("")}
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
            let correct = userSolution.every((v,idx)=>((results[idx] ? "T" : "F") === v));
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

// --- Feedback, Game Over, etc
function loseLife(msg){
    gameState.lives--;
    updateFloatingUI();
    if(gameState.lives <= 0) showRetryModal();
    else if(msg) { showMessage(msg, "error"); setTimeout(nextQuestion,1200);}
}
function showMessage(msg,type){
    let existing = document.querySelector(".game-message");
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
        <button class="btn btn-primary modal-btn modal-tryagain"><i class="fas fa-redo"></i> Retry</button>
        <button class="btn btn-secondary modal-btn modal-quit"><i class="fas fa-sign-out-alt"></i> Quit</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector(".modal-tryagain").onclick = ()=>{
        modal.remove(); showFloatingUI(true); startGame();
    };
    modal.querySelector(".modal-quit").onclick = ()=>{
        modal.remove();
        showFloatingUI(false);
        document.getElementById("settings-card").style.display = "";
        document.getElementById("game-area").innerHTML = "";
    };
}
function showEndModal(){
    stopTimer();
    showFloatingUI(false);
    $("#game-area").innerHTML = `
        <div class="card">
            <div class="card-title"><i class="fas fa-trophy"></i><h3>Game Complete!</h3></div>
            <p>You scored <strong>${gameState.score}</strong> points.<br>
            Refresh or <span class='retry-link' style='text-decoration:underline;color:#f45223;cursor:pointer;'>play again!</span></p>
        </div>
    `;
    document.querySelector(".retry-link").onclick = ()=>{
        document.getElementById("settings-card").style.display = "";
        document.getElementById("game-area").innerHTML = "";
        showFloatingUI(false);
    };
    showMessage('Congratulations! You finished all levels!', 'success');
    updateFloatingUI();
}
// Init on load
window.addEventListener("DOMContentLoaded",()=>{
    settingsSetup();
    showFloatingUI(false);
});