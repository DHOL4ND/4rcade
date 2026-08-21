
const key = "bubble";

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
  id: "bubble",
  title: "BUBBLE BURST",
  name: "Bubble Burst",
  description: "Aim, fire, match 3+. Don't let the ceiling fall.",
  category: "puzzle",
  art: "BUBBLE",
  thumbnail: "",
  version: "1.0.0"
};

export function init() { bubble(); }
export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}

function bubble(){
  const COLS=8,ROWS=9,CELL=44,ROWH=CELL*0.87,MX=22,MY=22;
  const W=Math.round(COLS*CELL+CELL/2+MX*2-CELL*0.2),H=Math.round(MY+ROWS*ROWH+150);
  const PALETTE=[
    {c:"#ff218c",g:"#ff77b7"},
    {c:"#08d9ff",g:"#8ef2ff"},
    {c:"#8cf126",g:"#c8ff8c"},
    {c:"#ffd11a",g:"#fff0a0"}
  ];
  const DANGER_ROW=ROWS-3;
  const SHOTS_PER_ROW=6;

  shell(`
    <div class="hud"><span>SCORE <b id="bs">0</b></span><span>NEXT ROW <b id="bnr">${SHOTS_PER_ROW}</b></span><span>BEST <b>${readScore("bubble")}</b></span></div>
    <div class="neon-wrap bubble-wrap"><canvas id="bcv" class="game-canvas" width="${W}" height="${H}"></canvas>
      <div class="center-message" id="bo">
        <div class="pixel-title small-title">BUBBLE<br>BURST</div>
        <div class="message-sub">MATCH 3+ · CLEAR THE CEILING</div>
        <button class="action-btn" id="bn">START</button>
      </div>
    </div>
    <div class="game-touch bubble-touch"><button data-a="left">◀ AIM</button><button data-a="fire">● FIRE</button><button data-a="right">AIM ▶</button></div>
  `,`Controls: move the mouse (or ← →) to aim the launcher, Space / tap FIRE to shoot. Match 3 or more same-colored bubbles to pop them — anything left floating falls too.`);

  const c=document.getElementById("bcv"),x=c.getContext("2d");
  const sEl=document.getElementById("bs"),nrEl=document.getElementById("bnr"),o=document.getElementById("bo");

  let grid={}; // "r,c" -> colorIndex
  let run=false,raf,last=0,score=0,shotsLeft=SHOTS_PER_ROW;
  let aim=0; // radians from vertical, negative=left
  let shooterX=W/2, shooterY=H-70;
  let current=0,next=0;
  let proj=null; // {x,y,vx,vy,color}
  let popFx=[]; // {x,y,color,life}

  function cellPos(r,cIdx){
    const offset=(r%2)?CELL/2:0;
    return { x: MX+cIdx*CELL+offset+CELL/2, y: MY+r*ROWH+CELL/2 };
  }
  function nearestCell(px,py){
    let r=Math.round((py-MY-CELL/2)/ROWH);
    r=Math.max(0,Math.min(ROWS-1,r));
    const offset=(r%2)?CELL/2:0;
    let cIdx=Math.round((px-MX-offset-CELL/2)/CELL);
    cIdx=Math.max(0,Math.min(COLS-1,cIdx));
    return [r,cIdx];
  }
  function neighbors(r,cIdx){
    if(r%2===0){
      return [[r,cIdx-1],[r,cIdx+1],[r-1,cIdx-1],[r-1,cIdx],[r+1,cIdx-1],[r+1,cIdx]];
    }
    return [[r,cIdx-1],[r,cIdx+1],[r-1,cIdx],[r-1,cIdx+1],[r+1,cIdx],[r+1,cIdx+1]];
  }
  function key2(r,cIdx){return r+","+cIdx}
  function inBounds(r,cIdx){return r>=0&&r<ROWS&&cIdx>=0&&cIdx<COLS}

  function colorsInPlay(){
    const set=new Set();
    for(const k in grid) set.add(grid[k]);
    return set.size?[...set]:[0,1,2,3];
  }
  function randomColor(){
    const pool=colorsInPlay();
    return pool[Math.floor(Math.random()*pool.length)];
  }

  function fillInitial(){
    grid={};
    for(let r=0;r<4;r++){
      for(let cIdx=0;cIdx<COLS-(r%2?1:0);cIdx++){
        grid[key2(r,cIdx)]=Math.floor(Math.random()*4);
      }
    }
  }

  function reset(){
    fillInitial();score=0;shotsLeft=SHOTS_PER_ROW;proj=null;popFx=[];
    current=randomColor();next=randomColor();aim=0;
    sEl.textContent="0";nrEl.textContent=SHOTS_PER_ROW;
  }

  function start(){
    cancelAnimationFrame(raf);
    reset();run=true;o.classList.add("hidden");last=performance.now();
    raf=requestAnimationFrame(loop);
  }

  function shiftRowsDown(){
    const newGrid={};
    for(const k in grid){
      const [r,cIdx]=k.split(",").map(Number);
      newGrid[(r+1)+","+cIdx]=grid[k];
    }
    for(let cIdx=0;cIdx<COLS;cIdx++){
      if(Math.random()<0.78) newGrid["0,"+cIdx]=Math.floor(Math.random()*4);
    }
    grid=newGrid;
  }

  function checkDanger(){
    for(const k in grid){
      const r=+k.split(",")[0];
      if(r>=DANGER_ROW) return true;
    }
    return false;
  }

  function floodSameColor(r,cIdx,color){
    const seen=new Set(),stack=[[r,cIdx]],out=[];
    seen.add(key2(r,cIdx));
    while(stack.length){
      const [cr,cc2]=stack.pop();
      out.push([cr,cc2]);
      for(const [nr,nc] of neighbors(cr,cc2)){
        const nk=key2(nr,nc);
        if(inBounds(nr,nc)&&!seen.has(nk)&&grid[nk]===color){
          seen.add(nk);stack.push([nr,nc]);
        }
      }
    }
    return out;
  }

  function removeFloating(){
    const connected=new Set();
    const stack=[];
    for(let cIdx=0;cIdx<COLS;cIdx++){
      const k=key2(0,cIdx);
      if(grid[k]!==undefined){connected.add(k);stack.push([0,cIdx])}
    }
    while(stack.length){
      const [cr,cc2]=stack.pop();
      for(const [nr,nc] of neighbors(cr,cc2)){
        const nk=key2(nr,nc);
        if(inBounds(nr,nc)&&grid[nk]!==undefined&&!connected.has(nk)){
          connected.add(nk);stack.push([nr,nc]);
        }
      }
    }
    let dropped=0;
    for(const k in grid){
      if(!connected.has(k)){
        const [r,cIdx]=k.split(",").map(Number);
        const p=cellPos(r,cIdx);
        popFx.push({x:p.x,y:p.y,color:grid[k],life:1,fall:true});
        delete grid[k];dropped++;
      }
    }
    return dropped;
  }

  function placeProjectile(){
    const [r,cIdx]=nearestCell(proj.x,proj.y);
    let target=null;
    if(grid[key2(r,cIdx)]===undefined){
      target=[r,cIdx];
    } else {
      // BFS ring search for nearest empty neighbor-of-neighbor
      const seen=new Set([key2(r,cIdx)]);
      const stack=[[r,cIdx]];
      outer:
      while(stack.length){
        const [cr,cc2]=stack.shift();
        for(const [nr,nc] of neighbors(cr,cc2)){
          const nk=key2(nr,nc);
          if(!inBounds(nr,nc)||seen.has(nk))continue;
          seen.add(nk);
          if(grid[nk]===undefined){target=[nr,nc];break outer}
          stack.push([nr,nc]);
        }
        if(seen.size>40)break;
      }
    }
    if(!target){ // grid completely full near shot, treat as danger
      grid[key2(r,cIdx)]=proj.color;
      proj=null;
      return true;
    }
    const [tr,tc]=target;
    grid[key2(tr,tc)]=proj.color;
    proj=null;

    const group=floodSameColor(tr,tc,grid[key2(tr,tc)] !== undefined ? grid[key2(tr,tc)] : 0);
    const sameColorGroup=group.filter(([gr,gc])=>grid[key2(gr,gc)]===grid[key2(tr,tc)]);
    if(sameColorGroup.length>=3){
      sameColorGroup.forEach(([gr,gc])=>{
        const p=cellPos(gr,gc);
        popFx.push({x:p.x,y:p.y,color:grid[key2(gr,gc)],life:1,fall:false});
        delete grid[key2(gr,gc)];
      });
      score+=sameColorGroup.length*15;
      const dropped=removeFloating();
      score+=dropped*25;
    }
    return checkDanger();
  }

  function endGame(){
    run=false;
    const record=save(score);
    o.classList.remove("hidden");
    o.innerHTML=`<div class="pixel-title small-title">${record?"NEW RECORD!":"CEILING FELL!"}</div>
      <div class="final-score">${score}</div>
      <div class="message-sub">TRY A TIGHTER AIM NEXT TIME</div>
      <button class="action-btn" id="bagain">PLAY AGAIN</button>`;
    document.getElementById("bagain").onclick=start;
  }

  function fire(){
    if(!run){start();return}
    if(proj)return;
    const dx=Math.sin(aim),dy=-Math.cos(aim);
    const speed=620;
    proj={x:shooterX,y:shooterY,vx:dx*speed,vy:dy*speed,color:current};
  }

  function drawBubble(px,py,colorIdx,scale=1,alpha=1){
    const col=PALETTE[colorIdx%PALETTE.length];
    x.save();x.globalAlpha=alpha;x.translate(px,py);x.scale(scale,scale);
    x.shadowBlur=10;x.shadowColor=col.c;
    x.fillStyle=col.c;
    x.beginPath();x.arc(0,0,CELL*0.42,0,Math.PI*2);x.fill();
    x.shadowBlur=0;
    x.fillStyle=col.g;x.globalAlpha=alpha*0.85;
    x.beginPath();x.arc(-CELL*0.12,-CELL*0.14,CELL*0.14,0,Math.PI*2);x.fill();
    x.restore();
  }

  function drawShooter(t){
    x.save();x.translate(shooterX,shooterY);
    // turret body (little launcher character)
    x.fillStyle="#141943";x.strokeStyle="#343b68";x.lineWidth=2;
    x.beginPath();x.arc(0,10,26,Math.PI,0);x.fill();x.stroke();
    x.fillStyle="#0d102c";x.fillRect(-26,8,52,16);

    // eyes that track aim
    const ex=Math.sin(aim)*6;
    x.fillStyle="#dfe5f4";
    x.beginPath();x.arc(-8,-2,6,0,Math.PI*2);x.fill();
    x.beginPath();x.arc(8,-2,6,0,Math.PI*2);x.fill();
    x.fillStyle="#111936";
    x.beginPath();x.arc(-8+ex*0.5,-2,3,0,Math.PI*2);x.fill();
    x.beginPath();x.arc(8+ex*0.5,-2,3,0,Math.PI*2);x.fill();

    // barrel
    x.save();x.rotate(aim);
    x.fillStyle="#252b55";x.fillRect(-9,-52,18,40);
    x.fillStyle="#3a4176";x.fillRect(-9,-52,18,8);
    x.restore();

    // loaded bubble in barrel tip
    const bx=Math.sin(aim)*46,by=-Math.cos(aim)*46;
    x.restore();
    drawBubble(shooterX+bx,shooterY+by,current);

    // trajectory preview
    x.save();
    x.setLineDash([5,6]);x.strokeStyle="#ffffff33";x.lineWidth=2;
    let tx=shooterX,ty=shooterY,vx=Math.sin(aim)*9,vy=-Math.cos(aim)*9;
    x.beginPath();x.moveTo(tx,ty);
    for(let i=0;i<60;i++){
      tx+=vx;ty+=vy;
      if(tx<CELL*0.3||tx>W-CELL*0.3)vx*=-1;
      if(ty<MY)break;
      x.lineTo(tx,ty);
    }
    x.stroke();x.setLineDash([]);
    x.restore();

    // next-up preview
    x.save();x.translate(shooterX+70,shooterY+2);
    x.font="8px 'DM Mono'";x.fillStyle="#7e86a7";x.textAlign="center";x.fillText("NEXT",0,-20);
    x.restore();
    drawBubble(shooterX+70,shooterY+2,next,0.65);
  }

  function loop(t){
    if(!run)return;
    const dt=Math.min(.032,(t-last)/1000);last=t;

    x.fillStyle="#070a20";x.fillRect(0,0,W,H);
    // subtle backdrop grid
    x.strokeStyle="#101538";x.lineWidth=1;
    for(let i=0;i<W;i+=CELL){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}

    x.fillStyle="#ff218c22";x.fillRect(0,MY+DANGER_ROW*ROWH,W,4);

    for(const k in grid){
      const [r,cIdx]=k.split(",").map(Number);
      const p=cellPos(r,cIdx);
      drawBubble(p.x,p.y,grid[k]);
    }

    popFx=popFx.filter(f=>f.life>0);
    popFx.forEach(f=>{
      f.life-=dt*2.2;
      if(f.fall)f.y+=dt*260;
      drawBubble(f.x,f.y,f.color,1+(1-f.life)*0.6,Math.max(0,f.life));
    });

    if(proj){
      proj.x+=proj.vx*dt;proj.y+=proj.vy*dt;
      if(proj.x<CELL*0.42){proj.x=CELL*0.42;proj.vx*=-1}
      if(proj.x>W-CELL*0.42){proj.x=W-CELL*0.42;proj.vx*=-1}

      let hit=proj.y<=MY+CELL*0.42;
      if(!hit){
        for(const k in grid){
          const [r,cIdx]=k.split(",").map(Number);
          const p=cellPos(r,cIdx);
          const dx=p.x-proj.x,dy=p.y-proj.y;
          if(dx*dx+dy*dy < (CELL*0.82)*(CELL*0.82)){hit=true;break}
        }
      }
      if(hit){
        const danger=placeProjectile();
        shotsLeft--;
        if(shotsLeft<=0){shiftRowsDown();shotsLeft=SHOTS_PER_ROW}
        nrEl.textContent=shotsLeft;
        current=next;next=randomColor();
        sEl.textContent=score;
        if(danger||checkDanger()){endGame();return}
      } else {
        drawBubble(proj.x,proj.y,proj.color);
      }
    }

    drawShooter(t);

    raf=requestAnimationFrame(loop);
  }

  function setAimFromPointer(clientX){
    const rect=c.getBoundingClientRect();
    const scale=c.width/rect.width;
    const px=(clientX-rect.left)*scale;
    let a=Math.atan2(px-shooterX,shooterY-MY);
    aim=Math.max(-1.15,Math.min(1.15,a*0.55));
  }

  c.addEventListener("pointermove",e=>setAimFromPointer(e.clientX));
  c.addEventListener("pointerdown",e=>{setAimFromPointer(e.clientX);fire()});
  document.onkeydown=e=>{
    if(e.key==="ArrowLeft"){aim=Math.max(-1.15,aim-0.08)}
    if(e.key==="ArrowRight"){aim=Math.min(1.15,aim+0.08)}
    if(e.key===" "){e.preventDefault();fire()}
  };
  document.querySelectorAll(".bubble-touch button").forEach(b=>b.onclick=()=>{
    const a=b.dataset.a;
    if(a==="left")aim=Math.max(-1.15,aim-0.15);
    else if(a==="right")aim=Math.min(1.15,aim+0.15);
    else fire();
  });
  document.getElementById("bn").onclick=start;

  reset();
  x.fillStyle="#070a20";x.fillRect(0,0,W,H);
  for(const k in grid){
    const [r,cIdx]=k.split(",").map(Number);
    const p=cellPos(r,cIdx);
    drawBubble(p.x,p.y,grid[k]);
  }
  drawShooter(0);
}
