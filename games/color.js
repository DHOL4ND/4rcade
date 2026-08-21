
const key = "color";

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
  id: "color",
  title: "COLOR SWAP",
  name: "Color Swap",
  description: "Match colors and clear the board.",
  category: "puzzle",
  art: "COLOR",
  thumbnail: "",
  version: "1.1.0"
};

export function init() {
  color();
}

export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}


function color(){
  shell(`
    <div class="color-head">
      <div>
        <div class="game-kicker">PUZZLE / 001</div>
        <div class="color-instructions">
          <span class="step"><b>1</b> PICK</span>
          <span class="arrow">→</span>
          <span class="step"><b>2</b> SWAP</span>
          <span class="arrow">→</span>
          <span class="step"><b>3</b> MATCH 3</span>
        </div>
      </div>
      <div class="color-legend">
        <span><i class="legend-dot pink"></i>PINK</span>
        <span><i class="legend-dot cyan"></i>CYAN</span>
        <span><i class="legend-dot lime"></i>LIME</span>
        <span><i class="legend-dot yellow"></i>GOLD</span>
      </div>
    </div>

    <div class="color-status">
      <div><small>SCORE</small><b id="cs">0</b></div>
      <div class="combo-box"><small>COMBO</small><b id="combo">x1</b></div>
      <div><small>MOVES</small><b id="moves">30</b></div>
    </div>

    <div class="neon-wrap color-wrap">
      <div class="color-board" id="cg"></div>
      <div class="color-toast" id="ct">MAKE A MATCH</div>
      <div class="center-message" id="co">
        <div class="pixel-title small-title">COLOR<br>SWAP</div>
        <div class="message-sub">MATCH 3 OR MORE COLORS</div>
        <div class="mini-help"><span>CLICK A TILE</span><span>THEN AN ADJACENT TILE</span></div>
        <button class="action-btn" id="cstart">START PUZZLE</button>
      </div>
    </div>

    <div class="color-footer">
      <div class="goal-card"><span class="goal-icon">✦</span><div><b>YOUR GOAL</b><small>Build combos to beat your high score.</small></div></div>
      <button class="action-btn small" id="crestart">RESTART</button>
    </div>
  `,`Controls: click one tile, then an adjacent tile. Match 3 or more of the same color. Invalid swaps do not cost a move.`);

  const colors=["#ff218c","#08d9ff","#8cf126","#ffd11a"];
  const names=["PINK","CYAN","LIME","GOLD"];
  const symbols=["◆","●","▲","■"];
  let board=[],sel=null,score=0,combo=1,moves=30,running=false,locked=false;

  const el=id=>document.getElementById(id);

  function start(){
    board=makeBoard();
    sel=null;score=0;combo=1;moves=30;running=true;locked=false;
    el("cs").textContent=0;el("combo").textContent="x1";el("moves").textContent=30;
    el("ct").textContent="MAKE A MATCH";
    el("ct").className="color-toast";
    el("co").classList.add("hidden");
    render();
  }

  function makeBoard(){
    for(let attempt=0;attempt<500;attempt++){
      const b=Array.from({length:36},()=>Math.floor(Math.random()*4));
      if(!findMatches(b).length && hasLegalMove(b)) return b;
    }
    // Deterministic safe fallback: build a board while avoiding immediate rows.
    const b=Array(36).fill(0);
    for(let i=0;i<36;i++){
      const choices=[0,1,2,3].filter(v=>{
        const r=Math.floor(i/6),c=i%6;
        return !(c>=2 && b[i-1]===v && b[i-2]===v) &&
               !(r>=2 && b[i-6]===v && b[i-12]===v);
      });
      b[i]=choices[Math.floor(Math.random()*choices.length)];
    }
    return hasLegalMove(b)?b:Array.from({length:36},(_,i)=>(i*7)%4);
  }


  function hasLegalMove(b){
    for(let i=0;i<36;i++){
      const r=Math.floor(i/6),c=i%6;
      const swaps=[];
      if(c<5)swaps.push(i+1);
      if(r<5)swaps.push(i+6);
      for(const j of swaps){
        [b[i],b[j]]=[b[j],b[i]];
        const ok=findMatches(b).length>0;
        [b[i],b[j]]=[b[j],b[i]];
        if(ok)return true;
      }
    }
    return false;
  }

  function render(){
    el("cg").innerHTML=board.map((v,i)=>`
      <button class="color-tile" data-i="${i}" style="--tile:${colors[v]};--tile-rgb:${hexRgb(colors[v])}">
        <span class="tile-shape">${symbols[v]}</span>
        <small>${names[v]}</small>
      </button>
    `).join("");
    document.querySelectorAll(".color-tile").forEach(b=>{
      b.onclick=()=>pick(+b.dataset.i);
    });
    updateSelection();
  }

  function updateSelection(){
    document.querySelectorAll(".color-tile").forEach(b=>{
      const i=+b.dataset.i;
      b.classList.toggle("selected",i===sel);
      b.classList.toggle("possible",sel!==null&&isAdjacent(sel,i));
    });
  }

  function isAdjacent(a,b){
    if(a===null||b===null)return false;
    const ar=Math.floor(a/6),ac=a%6,br=Math.floor(b/6),bc=b%6;
    return Math.abs(ar-br)+Math.abs(ac-bc)===1;
  }

  function pick(i){
    if(!running||locked)return;
    if(sel===null){
      sel=i;
      showToast("NOW PICK AN ADJACENT TILE","info");
      updateSelection();
      return;
    }
    if(i===sel){
      sel=null;showToast("SELECTION CLEARED","info");updateSelection();return;
    }
    if(!isAdjacent(sel,i)){
      showToast("PICK A TILE NEXT TO IT","bad");
      return;
    }

    const a=sel,b=i;sel=null;locked=true;
    [board[a],board[b]]=[board[b],board[a]];
    const matched=findMatches(board);

    if(!matched.length){
      [board[a],board[b]]=[board[b],board[a]];
      locked=false;
      showToast("NO MATCH — TRY ANOTHER SWAP","bad");
      render();
      return;
    }

    moves--;
    combo=1;
    resolveMatches(matched,()=>{
      el("moves").textContent=moves;
      if(moves<=0)end(false);
      else if(!hasLegalMove(board)){
        showToast("NO MOVES — NEW BOARD","info");
        board=makeBoard();
        locked=false;render();
      }else{locked=false;render();}
    });
  }

  function resolveMatches(matched,done){
    if(!matched.length){done();return}
    const gained=matched.length*30*combo;
    score+=gained;
    el("cs").textContent=score;
    el("combo").textContent="x"+combo;
    matched.forEach(i=>{
      const tile=document.querySelector(`[data-i="${i}"]`);
      if(tile)tile.classList.add("clearing");
    });
    showToast("+"+gained+" POINTS","good");
    setTimeout(()=>{
      matched.forEach(i=>board[i]=null);
      collapse();
      const next=findMatches(board);
      combo=Math.min(9,combo+1);
      if(next.length){
        el("combo").textContent="x"+combo;
        render();
        resolveMatches(next,done);
      }else{
        el("combo").textContent="x"+Math.max(1,combo-1);
        render();
        done();
      }
    },230);
  }

  function findMatches(b=board){
    const m=new Set();
    for(let r=0;r<6;r++){
      for(let c=0;c<6;c++){
        const k=r*6+c,v=b[k];
        if(v===null||v===undefined)continue;
        if(c<=3&&b[k+1]===v&&b[k+2]===v){
          m.add(k);m.add(k+1);m.add(k+2);
          if(c<=2&&b[k+3]===v)m.add(k+3);
        }
        if(r<=3&&b[k+6]===v&&b[k+12]===v){
          m.add(k);m.add(k+6);m.add(k+12);
          if(r<=2&&b[k+18]===v)m.add(k+18);
        }
      }
    }
    return [...m];
  }

  function collapse(){
    for(let c=0;c<6;c++){
      const vals=[];
      for(let r=5;r>=0;r--){
        const v=board[r*6+c];
        if(v!==null&&v!==undefined)vals.push(v);
      }
      for(let r=5;r>=0;r--){
        board[r*6+c]=vals[5-r]??Math.floor(Math.random()*4);
      }
    }
  }

  function showToast(text,type){
    const t=el("ct");t.textContent=text;t.className="color-toast "+type;
    clearTimeout(showToast.timer);
    showToast.timer=setTimeout(()=>{t.textContent="MAKE A MATCH";t.className="color-toast"},1100);
  }

  function hexRgb(hex){
    const n=hex.replace("#","");
    return `${parseInt(n.slice(0,2),16)},${parseInt(n.slice(2,4),16)},${parseInt(n.slice(4,6),16)}`;
  }

  function end(win=true){
    running=false;locked=false;
    const record=save(score);
    el("co").classList.remove("hidden");
    el("co").innerHTML=`
      <div class="pixel-title small-title">${record?"NEW RECORD!":(win?"PUZZLE COMPLETE":"OUT OF MOVES")}</div>
      <div class="final-score">${score}</div>
      <div class="message-sub">${win?"BEST COMBO x"+combo:"NO MOVES LEFT — TRY AGAIN"}</div>
      <button class="action-btn" id="cagain">PLAY AGAIN</button>`;
    el("cagain").onclick=start;
  }

  el("cstart").onclick=start;
  el("crestart").onclick=start;
}
