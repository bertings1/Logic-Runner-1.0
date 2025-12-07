// ----- Data Sets -----
const operatorsArr = [
    { name: "AND", symbol: "∧", description: "True if both are true" },
    { name: "OR", symbol: "∨", description: "True if either is true" },
    { name: "NOT", symbol: "¬", description: "Inverts truth" },
    { name: "IMPLIES", symbol: "→", description: "If A is true, B is true" },
    { name: "NOR", symbol: "↓", description: "True if both are false" },
    { name: "NAND", symbol: "⊼", description: "False if both are true" },
];

function shuffle(arr) {
    arr = arr.slice(); // Don't mutate original
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ----- Creative Levels -----
const levels = [
    // Classic Randomized Symbol-Match
    {
        title: "Level 1: Symbol Match",
        instructions: "Drag each logic operator to its correct symbol. The order is different each time!",
        setup: () => {
            let ops = shuffle(operatorsArr).slice(0, 4);
            return { opsLeft: ops.map(o=>o.name), opsRight: shuffle(ops.map(o=>o.symbol)), opPairs: Object.fromEntries(ops.map(o=>[o.name,o.symbol])) };
        },
        render: matchRender
    },
    // Logic Sentence Build
    {
        title: "Level 2: Statement Builder",
        instructions: `Drag the correct logic connector ("AND", "OR", "IMPLIES", "NOT") into the blank in the statement below.`,
        setup: () => {
            // Pick a random sentence template
            const sentences = [
                { template: "A ___ B (true if both are true)", answer: "AND" },
                { template: "A ___ B (true if either is true)", answer: "OR" },
                { template: "___ A (true if A is false)", answer: "NOT" },
                { template: "A ___ B (true if A is true, B must be true)", answer: "IMPLIES" }
            ];
            let chosen = sentences[Math.floor(Math.random() * sentences.length)];
            let choices = shuffle(["AND","OR","IMPLIES","NOT"]);
            return { sentence: chosen.template, choices, answer: chosen.answer };
        },
        render: sentenceBuildRender
    },
    // Find the Fault
    {
        title: "Level 3: Find the Fault",
        instructions: `Identify the incorrect match below. Drag the false match to the orange drop zone.`,
        setup: () => {
            let ops = shuffle(operatorsArr).slice(0, 4);
            let pairs = ops.map(o=>[o.name,o.symbol]);
            // Make one pair incorrect
            let wrongIndex = Math.floor(Math.random() * pairs.length);
            let wrongSymbol = shuffle(operatorsArr.filter(o=>o.name !== pairs[wrongIndex][0]))[0].symbol;
            pairs[wrongIndex][1] = wrongSymbol;
            return { pairs, answerWrongIndex: wrongIndex };
        },
        render: findFaultRender
    },
    // Truth Table Builder
    {
        title: "Level 4: Truth Table Builder",
        instructions: `Drag T/F chips to fill in the operator's truth table.`,
        setup: () => {
            let op = operatorsArr[Math.floor(Math.random()*operatorsArr.length)];
            // 2-input table positions and correct results
            let combos = [[true,true],[true,false],[false,true],[false,false]];
            let results = combos.map(c => {
                if(op.name==="AND") return c[0]&&c[1];
                if(op.name==="OR") return c[0]||c[1];
                if(op.name==="IMPLIES") return !c[0]||c[1];
                if(op.name==="NOT") return !c[0];
                if(op.name==="NAND") return !(c[0]&&c[1]);
                if(op.name==="NOR") return !(c[0]||c[1]);
                return null;
            });
            return { op, combos, results };
        },
        render: truthTableRender
    }
];

// ----- State -----
let gameState = {
    currentLevel: 0,
    score: 0,
    lives: 3,
    matchedPairs: 0,
    difficulty: "easy",
    mode: "classic"
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const gameArea = $("#game-area");
const statElems = {
    level: $("#current-level"),
    score: $("#score-value"),
    lives: $("#lives-value")
};

// ----- Game Settings UI -----
function settingsSetup() {
    // Difficulty
    $$("#difficulty-select .settings-card").forEach(card=>{
        card.onclick = function() {
            $$("#difficulty-select .settings-card").forEach(c=>c.classList.remove("active"));
            this.classList.add("active");
            gameState.difficulty = this.dataset.value;
        };
    });
    // Mode
    $$("#mode-select .settings-card").forEach(card=>{
        card.onclick = function() {
            $$("#mode-select .settings-card").forEach(c=>c.classList.remove("active"));
            this.classList.add("active");
            gameState.mode = this.dataset.value;
        };
    });
}

// ----- Game Progress/Stats -----
function updateStats() {
    statElems.level.textContent = gameState.currentLevel+1;
    statElems.score.textContent = gameState.score;
    statElems.lives.textContent = gameState.lives;
}

// ----- Level Loader -----
function loadLevel(idx) {
    gameState.currentSetup = levels[idx].setup();
    gameState.matchedPairs = 0;
    updateStats();
    renderLevel(idx);
}
function nextLevel() {
    if(gameState.currentLevel < levels.length-1){
        gameState.currentLevel+=1;
        loadLevel(gameState.currentLevel);
    }else{
        showEndModal();
    }
}

// ----- Level Renderers -----

// 1. Symbol Match
function matchRender(level, setup) {
    // Drag names to shuffled symbols
    gameArea.innerHTML = `
        <div class="game-section-title">${level.title}</div>
        <div class="subtitle">${level.instructions}</div>
        <div class="matching-container">
            <div class="game-column">
                <div class="column-title">OPERATORS</div>
                ${setup.opsLeft.map(n=>`<div class="draggable-item" draggable="true" data-operator="${n}">${n}</div>`).join("")}
            </div>
            <div class="game-column">
                <div class="column-title">SYMBOLS</div>
                ${setup.opsRight.map(sym=>`<div class="drop-zone empty" data-symbol="${sym}"><span class="zone-label">${sym}</span></div>`).join("")}
            </div>
        </div>
        <div class="game-controls">
            <button id="hint-btn" class="btn btn-secondary"><i class="fas fa-lightbulb"></i> Get Hint</button>
            <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answers</button>
            <button id="next-btn" class="btn btn-primary btn-disabled" disabled><i class="fas fa-arrow-right"></i> Next Level</button>
        </div>
    `;
    dragDropMatch(setup.opPairs, ()=>winLevel(), ()=>loseLife());
    setupControls(()=>"Match the operators to their correct symbols. Example: AND → ∧");
}
function dragDropMatch(correctPairs, win, lose){
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
                gameState.score+=25;
                updateStats();
                showMessage(`${opName} → ${zone.dataset.symbol} is correct!`,"success");
                if(matched===Object.keys(correctPairs).length){
                    enableNext();
                }
            }else{
                zone.classList.add("incorrect");
                setTimeout(()=>zone.classList.remove("incorrect"),900);
                showMessage(`${opName} → ${zone.dataset.symbol} is WRONG!`,"error");
                lose();
            }
        };
    });
}
// 2. Sentence Builder
function sentenceBuildRender(level, setup){
    gameArea.innerHTML = `
        <div class="game-section-title">${level.title}</div>
        <div class="subtitle">${level.instructions}</div>
        <div class="sentence-area" style="background:#fff;padding:1.2em;border-radius:8px;margin-bottom:.7em;letter-spacing:.07em;">
            <span style="color:#c76300;font-weight:700;">${setup.sentence.replace("___",`<span id="sentence-drop" class="drop-zone empty" style="display:inline-block;width:90px"></span>`)}</span>
        </div>
        <div class="sentence-choices" style="display:flex;gap:1.1em;">
            ${setup.choices.map(choice=>`
                <div class="draggable-item sentence-choice" draggable="true" data-choice="${choice}">${choice}</div>
            `).join("")}
        </div>
        <div class="game-controls">
            <button id="hint-btn" class="btn btn-secondary"><i class="fas fa-lightbulb"></i> Get Hint</button>
            <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answer</button>
            <button id="next-btn" class="btn btn-primary btn-disabled" disabled><i class="fas fa-arrow-right"></i> Next Level</button>
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
    setupControls(()=>"Drag the operator into the blank. Example: AND for 'A ___ B (true if both are true)'");
    $("#check-btn").onclick = ()=>{
        if(droppedChoice){
            if(droppedChoice === setup.answer){
                showMessage("You filled the sentence correctly!","success");
                gameState.score+=40;updateStats();enableNext();
            }else{
                showMessage("Incorrect logic connector.","error");loseLife();
            }
        }else{
            showMessage("Drag one of the choices to the blank.","warning");
        }
    };
}
// 3. Find the Fault (identify the false match and drag to target)
function findFaultRender(level, setup){
    gameArea.innerHTML = `
        <div class="game-section-title">${level.title}</div>
        <div class="subtitle">${level.instructions}</div>
        <div style="display:flex;gap:3em;">
            <div>
                <div class="column-title">Matches</div>
                <div style="display:flex;flex-direction:column;gap:.8em;">
                    ${setup.pairs.map((pair,i)=>
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
            <button id="hint-btn" class="btn btn-secondary"><i class="fas fa-lightbulb"></i> Get Hint</button>
            <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answer</button>
            <button id="next-btn" class="btn btn-primary btn-disabled" disabled><i class="fas fa-arrow-right"></i> Next Level</button>
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
        let idx = parseInt(e.dataTransfer.getData("text/plain"));
        if(idx === setup.answerWrongIndex){
            drop.innerHTML = `<span style="color:#25b185;font-weight:700;font-size:1.25em;">Correct!</span>`;
            showMessage("Well spotted!","success");
            gameState.score+=50;updateStats();enableNext();
        }else{
            showMessage("That's not the wrong match.","error");loseLife();
        }
    };
    setupControls(()=>"Look carefully! Drag the single incorrect match to the 🚫 zone.");
    $("#check-btn").onclick = ()=>showMessage("Drag the wrong match to the orange zone first.","warning");
}
// 4. Truth Table Builder
function truthTableRender(level,setup){
    gameArea.innerHTML = `
        <div class="game-section-title">${level.title}</div>
        <div class="subtitle">Operator: <strong>${setup.op.name}</strong> (${setup.op.symbol}) — ${setup.op.description}</div>
        <div class="tt-grid" style="margin-top:1.1em;margin-bottom:1.2em;">
            <table style="font-family:'IBM Plex Mono',monospace;font-size:1.09em;">
                <tr>
                    <th>A</th><th>B</th><th>Result</th>
                </tr>
                ${setup.combos.map((c,i)=>
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
            <button id="hint-btn" class="btn btn-secondary"><i class="fas fa-lightbulb"></i> Get Hint</button>
            <button id="check-btn" class="btn btn-primary"><i class="fas fa-check-circle"></i> Check Answers</button>
            <button id="next-btn" class="btn btn-primary btn-disabled" disabled><i class="fas fa-arrow-right"></i> Next Level</button>
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
    setupControls(()=>"Fill the results for each input pair. Drag T or F into the boxes.");
    $("#check-btn").onclick = ()=>{
        if(userSolution.every(x=>x)){
            let correct = userSolution.every(
                (v,idx)=>((setup.results[idx] ? "T" : "F") === v)
            );
            if(correct){
                showMessage("You completed the table correctly!","success");
                gameState.score+=70;updateStats();
                enableNext();
            }else{
                showMessage("Incorrect table! Try again.","error");
                loseLife();
            }
        }else{
            showMessage("Please fill every result cell.","warning");
        }
    };
}

// ----- Helpers -----
function renderLevel(idx){
    let level = levels[idx];
    updateStats();
    level.render(level, gameState.currentSetup);
}
function setupControls(hintText){
    $("#hint-btn").onclick = ()=>showMessage(hintText(),"info");
    $("#next-btn").disabled = true;
}
function winLevel(){
    showMessage("Level complete!","success");
    $("#next-btn").disabled = false;
    $("#next-btn").classList.remove("btn-disabled");
    $("#next-btn").onclick = nextLevel;
}
function enableNext(){
    $("#next-btn").disabled = false;
    $("#next-btn").classList.remove("btn-disabled");
    $("#next-btn").onclick = nextLevel;
}
function loseLife(){
    gameState.lives -= 1;updateStats();
    if(gameState.lives <= 0) showRetryModal();
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
        gameState.currentLevel = 0;
        gameState.score = 0;
        gameState.lives = 3;
        loadLevel(gameState.currentLevel);
    };
}
function showEndModal(){
    gameArea.innerHTML = `
        <div class="card">
            <div class="card-title"><i class="fas fa-trophy"></i><h3>Game Complete!</h3></div>
            <p>You scored <strong>${gameState.score}</strong> points.<br>
            Refresh or click <span class='retry-link' style='text-decoration:underline;color:#f45223;cursor:pointer;'>here</span> to play again!</p>
        </div>
    `;
    $(".retry-link").onclick = ()=>{
        gameState.currentLevel = 0;
        gameState.score = 0;
        gameState.lives = 3;
        loadLevel(gameState.currentLevel);
    };
    showMessage('Congratulations! You finished all levels!', 'success');
    updateStats();
}

// On page load
window.addEventListener("DOMContentLoaded",()=>{
    settingsSetup();
    gameState.currentLevel = 0;
    gameState.score = 0;
    gameState.lives = 3;
    loadLevel(gameState.currentLevel);
});