
const key = "forest";

function readScore(id) {
  try { return +localStorage.getItem("dhol_"+id)||0 } catch(e) { return 0 }
}

function save(score) {
  const old = readScore(key);
  if (score > old) {
    try { localStorage.setItem("dhol_"+key, score) } catch(e) {}
    const high = document.getElementById("high");
    if (high) high.textContent = score;
    return true;
  }
  return false;
}

function shell(html, help) {
  const mount = document.getElementById("mount");
  const controls = document.getElementById("controls");
  mount.innerHTML = `<div class="screen"><div class="play-ui">${html}</div></div>`;
  controls.textContent = help;
}

export const gameInfo = {
  id: "forest",
  title: "MYSTIC FOREST",
  name: "Mystic Forest",
  description: "Find the hidden gems before time runs out.",
  category: "adventure",
  art: "FOREST",
  thumbnail: "",
  version: "1.1.0"
};

export function init() {
  forest();
}

export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}


function forest(){
  shell(`
    <div class="forest-game-shell clean-forest">
      <div class="forest-game-hud">
        <div><small>GEMS</small><b id="g">0/6</b></div>
        <div><small>TIME</small><b id="t">45</b></div>
        <div><small>STATUS</small><b id="fstatus">FIND 6</b></div>
      </div>

      <div class="forest-board-wrap">
        <div class="forest-scene" id="fg"></div>
        <div class="forest-overlay" id="fo">
          <div class="forest-character big">✦</div>
          <div class="pixel-title small-title">READY?</div>
          <div class="message-sub">COLLECT 6 GEMS<br>THEN REACH THE EXIT</div>
          <button class="action-btn" id="fstart">ENTER FOREST</button>
        </div>
      </div>

      <div class="forest-mobile-controls" aria-label="Movement controls">
        <button data-move="up">▲</button>
        <div>
          <button data-move="left">◀</button>
          <button data-move="down">▼</button>
          <button data-move="right">▶</button>
        </div>
      </div>

      <div class="forest-controls-note">WASD / ARROWS TO MOVE</div>
      <div class="forest-mini-tip">✦ COLLECT ALL 6 GEMS — THEN REACH THE EXIT</div>
    </div>
  `,`Controls: use WASD or arrow keys. Collect all 6 gems, then reach the exit.`);

  const boardEl=document.getElementById("fg"),overlay=document.getElementById("fo");
  let player={x:0,y:0},gems=[],exit={x:5,y:5},time=45,score=0,run=false,timer;
  const W=6,H=6;

  function start(){
    clearInterval(timer);
    time=45;score=0;run=true;player={x:0,y:0};exit={x:5,y:5};gems=[];
    const taken=new Set(["0,0","5,5"]);
    while(gems.length<6){
      const x=Math.floor(Math.random()*W),y=Math.floor(Math.random()*H),k=x+","+y;
      if(!taken.has(k)){taken.add(k);gems.push({x,y,got:false});}
    }
    overlay.classList.add("hidden");
    render();updateHUD();
    timer=setInterval(()=>{time--;updateHUD();if(time<=0)finish(false);},1000);
  }

  function render(){
    boardEl.innerHTML="";
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const isP=x===player.x&&y===player.y,isExit=x===exit.x&&y===exit.y;
      const gem=gems.find(g=>g.x===x&&g.y===y&&!g.got);
      const cell=document.createElement("button");
      cell.className=`forest-cell ${isP?"player-cell":""} ${isExit?"exit-cell":""} ${gem?"gem-cell":""}`;
      cell.dataset.x=x;cell.dataset.y=y;
      cell.innerHTML=`<span class="forest-ground"></span>${gem?'<span class="forest-gem">✦</span>':""}${isExit?'<span class="forest-portal">◉</span>':""}${isP?'<span class="forest-player"><i></i><b></b></span>':""}`;
      boardEl.appendChild(cell);
    }
  }

  function updateHUD(){
    const got=gems.filter(g=>g.got).length;
    document.getElementById("g").textContent=got+"/6";
    document.getElementById("t").textContent=time;
    document.getElementById("fstatus").textContent=got===6?"EXIT OPEN":"FIND "+(6-got);
  }

  function move(dx,dy){
    if(!run)return;
    const nx=Math.max(0,Math.min(W-1,player.x+dx)),ny=Math.max(0,Math.min(H-1,player.y+dy));
    if(nx===player.x&&ny===player.y)return;
    player.x=nx;player.y=ny;

    const gem=gems.find(g=>g.x===nx&&g.y===ny&&!g.got);
    if(gem){gem.got=true;score+=150;popup("+150 GEM",nx,ny);}

    render();updateHUD();

    const got=gems.filter(g=>g.got).length;
    if(got===6&&nx===exit.x&&ny===exit.y)finish(true);
    else if(got===6)popup("EXIT OPEN",exit.x,exit.y);
  }

  function popup(text,x,y){
    const el=document.createElement("div");
    el.className="forest-popup";
    el.textContent=text;
    el.style.left=((x+.5)*100/6)+"%";
    el.style.top=((y+.45)*100/6)+"%";
    boardEl.appendChild(el);
    setTimeout(()=>el.remove(),700);
  }

  function finish(win){
    if(!run)return;
    run=false;clearInterval(timer);
    const got=gems.filter(g=>g.got).length;
    const final=win?score+time*10:got*150;
    const record=save(final);

    overlay.classList.remove("hidden");
    overlay.innerHTML=`
      <div class="forest-character big">${win?"✦":"×"}</div>
      <div class="pixel-title small-title">${win?(record?"NEW RECORD!":"FOREST CLEARED"):"TIME'S UP"}</div>
      <div class="final-score">${final}</div>
      <div class="message-sub">${win?"EXIT REACHED":"YOU FOUND "+got+" / 6 GEMS"}</div>
      <button class="action-btn" id="fagain">${win?"PLAY AGAIN":"TRY AGAIN"}</button>
    `;
    document.getElementById("fagain").onclick=start;
  }

  document.onkeydown=e=>{
    const k=e.key.toLowerCase();
    const m={
      arrowup:[0,-1],w:[0,-1],
      arrowdown:[0,1],s:[0,1],
      arrowleft:[-1,0],a:[-1,0],
      arrowright:[1,0],d:[1,0]
    }[k];
    if(m){e.preventDefault();move(...m);}
  };

  document.getElementById("fstart").onclick=start;

  document.querySelectorAll(".forest-mobile-controls button").forEach(b=>{
    b.onclick=()=>{
      const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[b.dataset.move];
      move(...m);
    };
  });
}
