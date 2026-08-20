const games=[
{id:"neon",title:"NEON INVADERS",name:"Neon Invaders",cat:"arcade",desc:"Destroy the incoming neon fleet.",art:"NEON",link:"game.html#neon"},
{id:"forest",title:"MYSTIC FOREST",name:"Mystic Forest",cat:"adventure",desc:"Find the hidden gems before time runs out.",art:"FOREST",link:"game.html#forest"},
{id:"color",title:"COLOR SWAP",name:"Color Swap",cat:"puzzle",desc:"Match colors and clear the board.",art:"COLOR",link:"game.html#color"},
{id:"sky",title:"SKYBOUND",name:"Skybound",cat:"arcade",desc:"Jump across platforms and stay alive.",art:"SKY",link:"game.html#sky"},
{id:"turbo",title:"TURBO DASH",name:"Turbo Dash",cat:"racing",desc:"Dodge traffic and beat your best distance.",art:"TURBO",link:"game.html#turbo"},
{id:"snake",title:"PIXEL SNAKE",name:"Pixel Snake",cat:"arcade",desc:"Grow longer. Chase the high score.",art:"SNAKE",link:"game.html#snake"}
];
const lib=document.getElementById("library");
const validFilters=new Set(["all",...games.map(g=>g.cat)]);
function currentFilter(){const f=location.hash.replace("#","").toLowerCase();return validFilters.has(f)?f:"all"}
function render(filter="all"){
  lib.innerHTML=games.filter(g=>filter==="all"||g.cat===filter).map(g=>`<article class="play-card" data-game="${g.id}"><div class="play-art"><span class="mini-score">DHØL / ${g.cat.toUpperCase()}</span><div><h2>${g.art}</h2><div class="game-dots">•••</div></div></div><div class="play-meta"><div><h3>${g.name}</h3><p>${g.cat.toUpperCase()} · PLAYABLE</p></div><a class="launch" href="${g.link}">PLAY →</a></div></article>`).join("");
  document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
}
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{
  const f=b.dataset.filter;history.replaceState(null,"",location.pathname+location.search+(f==="all"?"":"#"+f));render(f);
}));
render(currentFilter());
