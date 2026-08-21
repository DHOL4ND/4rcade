
const key = "croak";

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
  id: "croak",
  title: "CROAK HOP",
  name: "Croak Hop",
  description: "Hop through traffic. Ride the logs home.",
  category: "adventure",
  art: "CROAK",
  thumbnail: "",
  version: "1.0.0"
};

export function init() { croak(); }
export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}

function croak(){
  const COLS=9,ROWS=11,CELL=42;
  const W=COLS*CELL,H=ROWS*CELL;
  const PADS=[0,2,4,6,8];

  shell(`
    <div class="hud"><span>SCORE <b id="cs">0</b></span><span>LIVES <b id="cl">3</b></span><span>BEST <b>${readScore("croak")}</b></span></div>
    <div class="neon-wrap croak-wrap"><canvas id="ccv" class="game-canvas" width="${W}" height="${H}"></canvas>
      <div class="center-message" id="co">
        <div class="pixel-title small-title">CROAK<br>HOP</div>
        <div class="message-sub">HOP UP · RIDE LOGS · DODGE CARS</div>
        <button class="action-btn" id="cn">START HOP</button>
      </div>
    </div>
    <div class="touch"><button data-d="up">↑</button><button data-d="left">←</button><button data-d="down">↓</button><button data-d="right">→</button></div>
  `,`Controls: Arrow keys / WASD to hop one tile at a time. Cross the road, ride the logs across the river, and land on an open lily pad.`);

  const c=document.getElementById("ccv"),x=c.getContext("2d");
  const sEl=document.getElementById("cs"),lEl=document.getElementById("cl"),o=document.getElementById("co");

  const START_ROW=ROWS-1,START_COL=4;
  const RIVER_ROWS=[1,2,3,4];
  const ROAD_ROWS=[6,7,8,9];
  const GOAL_ROW=0;

  let run=false,raf,last=0,score=0,lives=3,bestRowThisLife=START_ROW;
  let frog={col:START_COL,row:START_ROW,dispX:0,dispY:0,hopT:0,dir:0};
  let pads=new Set();
  let cars=[],logs=[],moveT=0,hopCooldown=0,dead=false,deathT=0;

  function laneY(r){return r*CELL+CELL/2}
  function colX(cIdx){return cIdx*CELL+CELL/2}

  function initLanes(){
    cars=[];logs=[];
    ROAD_ROWS.forEach((r,i)=>{
      const dirSign=i%2===0?1:-1;
      const speed=(55+i*22)*dirSign;
      const count=3+ (i%2);
      const arr=[];
      for(let k=0;k<count;k++){
        arr.push({x:(k*(W/count))+Math.random()*40,w:46+ (i%2)*10});
      }
      cars.push({row:r,speed,items:arr,color:["#ff218c","#8d35ff","#ffd11a","#08d9ff"][i%4]});
    });
    RIVER_ROWS.forEach((r,i)=>{
      const dirSign=i%2===0?-1:1;
      const speed=(40+i*16)*dirSign;
      const count=2+ (i%2);
      const arr=[];
      for(let k=0;k<count;k++){
        arr.push({x:(k*(W/count))+Math.random()*30,w:96+ (i%2)*20});
      }
      logs.push({row:r,speed,items:arr});
    });
  }

  function reset(){
    score=0;lives=3;pads=new Set();
    frog={col:START_COL,row:START_ROW,dispX:0,dispY:0,hopT:0,dir:0};
    bestRowThisLife=START_ROW;
    initLanes();
    sEl.textContent="0";lEl.textContent="3";
  }

  function start(){
    cancelAnimationFrame(raf);
    reset();run=true;dead=false;o.classList.add("hidden");last=performance.now();
    raf=requestAnimationFrame(loop);
  }

  function tryMove(dc,dr){
    if(hopCooldown>0||dead)return;
    // Snap to the nearest whole column first — riding a log can leave frog.col
    // fractional, and pad/lane logic downstream assumes whole columns.
    const nc=Math.round(frog.col)+dc,nr=frog.row-dr; // dr positive means up on screen (row decreases)
    if(nc<0||nc>=COLS||nr<0||nr>=ROWS)return;
    frog.col=nc;frog.row=nr;frog.dir=dc<0?-1:(dc>0?1:frog.dir);
    hopCooldown=0.13;frog.hopT=1;

    if(nr<bestRowThisLife){
      score+=10;
      bestRowThisLife=nr;
    }

    if(nr===GOAL_ROW){
      if(pads.has(frog.col)){
        // occupied pad — bounce back, no death but no progress
        frog.row=START_ROW;frog.col=START_COL;bestRowThisLife=START_ROW;
      } else {
        pads.add(frog.col);
        score+=100;
        frog.row=START_ROW;frog.col=START_COL;bestRowThisLife=START_ROW;
        if(pads.size>=PADS.length){
          pads=new Set();
          score+=250;
        }
      }
    }
    sEl.textContent=score;
  }

  function loseLife(){
    if(dead)return;
    dead=true;deathT=0.6;
    lives--;lEl.textContent=Math.max(0,lives);
    if(lives<=0){
      endGame();
    }
  }

  function respawn(){
    frog.row=START_ROW;frog.col=START_COL;bestRowThisLife=START_ROW;dead=false;
  }

  function endGame(){
    run=false;
    const record=save(score);
    o.classList.remove("hidden");
    o.innerHTML=`<div class="pixel-title small-title">${record?"NEW RECORD!":"GAME OVER"}</div>
      <div class="final-score">${score}</div>
      <div class="message-sub">PADS FILLED THIS RUN COUNT TOO</div>
      <button class="action-btn" id="cagain">HOP AGAIN</button>`;
    document.getElementById("cagain").onclick=start;
  }

  function drawFrog(px,py,dir){
    x.save();x.translate(px,py);
    if(dir===-1)x.scale(-1,1);
    x.shadowBlur=14;x.shadowColor="#8cf126";
    x.fillStyle="#66c21a";
    x.beginPath();x.ellipse(0,4,15,12,0,0,Math.PI*2);x.fill();
    x.fillStyle="#8cf126";
    x.beginPath();x.ellipse(0,0,12,10,0,0,Math.PI*2);x.fill();
    // legs
    x.fillStyle="#4a9c12";
    x.beginPath();x.ellipse(-13,9,6,4,0.4,0,Math.PI*2);x.fill();
    x.beginPath();x.ellipse(13,9,6,4,-0.4,0,Math.PI*2);x.fill();
    // eyes
    x.fillStyle="#e9ffcf";
    x.beginPath();x.arc(-6,-9,5,0,Math.PI*2);x.fill();
    x.beginPath();x.arc(6,-9,5,0,Math.PI*2);x.fill();
    x.fillStyle="#111936";
    x.beginPath();x.arc(-6,-9,2.4,0,Math.PI*2);x.fill();
    x.beginPath();x.arc(6,-9,2.4,0,Math.PI*2);x.fill();
    x.shadowBlur=0;
    x.restore();
  }

  function drawCar(cx,cy,w,color){
    x.save();x.translate(cx,cy);
    x.shadowBlur=10;x.shadowColor=color;
    x.fillStyle=color;
    x.fillRect(-w/2,-14,w,28);
    x.fillStyle="#111936";
    x.fillRect(-w/2+8,-9,w-16,14);
    x.fillStyle="#ffd11a";
    x.fillRect(-w/2-2,-8,5,6);
    x.fillRect(w/2-3,-8,5,6);
    x.shadowBlur=0;
    x.restore();
  }

  function drawLog(cx,cy,w){
    x.save();x.translate(cx,cy);
    x.shadowBlur=6;x.shadowColor="#000a";
    x.fillStyle="#7a4a26";
    x.fillRect(-w/2,-13,w,26);
    x.fillStyle="#93672f";
    x.fillRect(-w/2,-13,w,5);
    x.shadowBlur=0;
    x.strokeStyle="#4a2c14";x.lineWidth=2;
    x.beginPath();x.moveTo(-w/2+6,-5);x.lineTo(w/2-6,-5);x.stroke();
    x.beginPath();x.moveTo(-w/2+6,5);x.lineTo(w/2-6,5);x.stroke();
    for(let i=-w/2+10;i<w/2-5;i+=18){
      x.strokeStyle="#5c3618";x.beginPath();x.arc(i,0,7,0,Math.PI*2);x.stroke();
    }
    x.restore();
  }

  function drawScene(t){
    x.fillStyle="#05081c";x.fillRect(0,0,W,H);

    // goal row (lily pads)
    x.fillStyle="#0d2b1f";x.fillRect(0,0,W,CELL);
    PADS.forEach(p=>{
      const cx=colX(p),cy=laneY(0);
      x.save();x.translate(cx,cy);
      x.fillStyle=pads.has(p)?"#1c4a2e":"#123a26";
      x.beginPath();x.arc(0,0,17,0,Math.PI*2);x.fill();
      x.strokeStyle="#8cf126";x.lineWidth=2;x.stroke();
      if(pads.has(p)){
        x.fillStyle="#ff218c";
        x.beginPath();x.arc(0,0,6,0,Math.PI*2);x.fill();
      }
      x.restore();
    });

    // river
    const riverTop=laneY(RIVER_ROWS[0])-CELL/2,riverH=RIVER_ROWS.length*CELL;
    const wgrad=x.createLinearGradient(0,riverTop,0,riverTop+riverH);
    wgrad.addColorStop(0,"#0b2c55");wgrad.addColorStop(1,"#0a2140");
    x.fillStyle=wgrad;x.fillRect(0,riverTop,W,riverH);
    x.strokeStyle="#ffffff11";x.lineWidth=1;
    for(let i=0;i<6;i++){
      const wy=riverTop+((i*23+t*0.03)%riverH);
      x.beginPath();x.moveTo(0,wy);x.lineTo(W,wy);x.stroke();
    }

    // median strip
    x.fillStyle="#122318";x.fillRect(0,laneY(5)-CELL/2,W,CELL);

    // road
    const roadTop=laneY(ROAD_ROWS[0])-CELL/2,roadH=ROAD_ROWS.length*CELL;
    x.fillStyle="#1b1d33";x.fillRect(0,roadTop,W,roadH);
    ROAD_ROWS.forEach(r=>{
      x.strokeStyle="#3a3d5e";x.setLineDash([16,14]);x.lineWidth=2;
      x.beginPath();x.moveTo(0,laneY(r)+CELL/2);x.lineTo(W,laneY(r)+CELL/2);x.stroke();
      x.setLineDash([]);
    });

    // start row
    x.fillStyle="#0d2b1f";x.fillRect(0,laneY(START_ROW)-CELL/2,W,CELL);

    // logs
    logs.forEach(lane=>{
      lane.items.forEach(it=>drawLog(it.x,laneY(lane.row),it.w));
    });

    // cars
    cars.forEach(lane=>{
      lane.items.forEach(it=>drawCar(it.x,laneY(lane.row),it.w,lane.color));
    });

    // frog
    if(!dead || Math.floor(deathT*10)%2===0){
      const ease=1-Math.pow(1-Math.min(1,frog.hopT),3);
      const drawY=laneY(frog.row)-Math.sin(Math.min(1,frog.hopT)*Math.PI)*10;
      drawFrog(colX(frog.col),drawY,frog.dir);
    }
  }

  function update(dt,t){
    if(hopCooldown>0)hopCooldown-=dt;
    if(frog.hopT<1)frog.hopT=Math.min(1,frog.hopT+dt*6);

    cars.forEach(lane=>{
      lane.items.forEach(it=>{
        it.x+=lane.speed*dt;
        if(lane.speed>0 && it.x-it.w/2>W) it.x=-it.w/2;
        if(lane.speed<0 && it.x+it.w/2<0) it.x=W+it.w/2;
      });
    });
    logs.forEach(lane=>{
      lane.items.forEach(it=>{
        it.x+=lane.speed*dt;
        if(lane.speed>0 && it.x-it.w/2>W) it.x=-it.w/2;
        if(lane.speed<0 && it.x+it.w/2<0) it.x=W+it.w/2;
      });
    });

    if(dead){
      deathT-=dt;
      if(deathT<=0 && run) respawn();
      return;
    }

    // road collision
    if(ROAD_ROWS.includes(frog.row)){
      const lane=cars.find(l=>l.row===frog.row);
      const fx=colX(frog.col);
      for(const it of lane.items){
        if(Math.abs(fx-it.x)<it.w/2+10){loseLife();break}
      }
    }

    // river logic
    if(RIVER_ROWS.includes(frog.row)){
      const lane=logs.find(l=>l.row===frog.row);
      const fx=colX(frog.col);
      let onLog=false;
      for(const it of lane.items){
        if(Math.abs(fx-it.x)<it.w/2){onLog=true;break}
      }
      if(!onLog){
        loseLife();
      } else {
        frog.col+=(lane.speed*dt)/CELL;
        if(frog.col<0||frog.col>COLS-1){loseLife();}
      }
    }
  }

  function loop(t){
    if(!run)return;
    const dt=Math.min(.032,(t-last)/1000);last=t;
    update(dt,t);
    drawScene(t);
    raf=requestAnimationFrame(loop);
  }

  document.onkeydown=e=>{
    const m={ArrowUp:"up",w:"up",ArrowDown:"down",s:"down",ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right"};
    const d=m[e.key]||m[e.key.toLowerCase()];
    if(d){
      e.preventDefault();
      if(!run){start();return}
      if(d==="up")tryMove(0,1);
      else if(d==="down")tryMove(0,-1);
      else if(d==="left")tryMove(-1,0);
      else if(d==="right")tryMove(1,0);
    }
  };
  document.querySelectorAll(".touch button").forEach(b=>b.onclick=()=>{
    if(!run){start();return}
    const d=b.dataset.d;
    if(d==="up")tryMove(0,1);
    else if(d==="down")tryMove(0,-1);
    else if(d==="left")tryMove(-1,0);
    else if(d==="right")tryMove(1,0);
  });
  document.getElementById("cn").onclick=start;

  reset();
  drawScene(0);
}
