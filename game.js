document.querySelectorAll('[data-target]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
    document.querySelector('#menu-cards').classList.add('hidden');
    document.querySelector('#'+btn.dataset.target).classList.remove('hidden');
  });
});

document.getElementById('start-game').addEventListener('click',startGame);

const questions_easy=[
  "P AND Q is true when?",
  "NOT P means?",
  "P OR Q is false when?"
];

const questions_medium=[
  "Implication P → Q is false only when?",
  "XOR is true when?",
  "Negation distributes over OR how?"
];

const questions_hard=[
  "Give a truth table for (P ∧ ¬Q) → (Q ∨ ¬P)",
  "Explain when (P ↔ Q) is true.",
  "Define logical equivalence."
];

function startGame(){
  const area=document.getElementById('game-area');
  area.innerHTML='';
  const all=[...questions_easy,...questions_medium,...questions_hard];
  const q=all[Math.floor(Math.random()*all.length)];
  area.innerHTML='<div class="card">'+q+'</div>';
}
