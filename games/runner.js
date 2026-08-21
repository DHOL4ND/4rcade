
const key = "runner";

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
  id: "runner",
  title: "STAR RUNNER",
  name: "Star Runner",
  description: "Jump the gaps. Grab the stars. Outrun the void.",
  category: "arcade",
  art: "RUNNER",
  thumbnail: "",
  version: "1.0.0"
};

export function init() { runner(); }
export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}

function runner(){
  const W=640,H=320,GY=246;
  shell(`
    <div class="hud"><span>SCORE <b id="rs">0</b></span><span>COINS <b id="rc">0</b></span><span>BEST <b>${readScore("runner")}</b></span></div>
    <div class="neon-wrap runner-wrap"><canvas id="rcv" class="game-canvas" width="${W}" height="${H}"></canvas>
      <div class="center-message" id="ro">
        <div class="pixel-title small-title">STAR<br>RUNNER</div>
        <div class="message-sub">JUMP SPIKES · COLLECT STARS</div>
        <button class="action-btn" id="rn">START RUN</button>
      </div>
    </div>
    <div class="game-touch runner-touch"><button data-action="jump">▲ JUMP</button></div>
  `,`Controls: Space / Up / W to jump, or tap the screen / JUMP button. Time your jumps over the spikes and grab stars for bonus points.`);

  const c=document.getElementById("rcv"),x=c.getContext("2d");
  const s=document.getElementById("rs"),cc=document.getElementById("rc"),o=document.getElementById("ro");
  let run=false,raf,last=0,dist=0,coins=0,speed=300,vy=0,py=GY,onGround=true,jumpAnim=0,legPhase=0;
  let obstacles=[],stars=[],spawnGap=0,shake=0;
  const player={x:78,w:30,h:34};
  const GRAV=1900,JUMPV=-660;

  function reset(){
    dist=0;coins=0;speed=300;vy=0;py=GY;onGround=true;jumpAnim=0;
    obstacles=[];stars=[];spawnGap=1.1;shake=0;
    s.textContent="0";cc.textContent="0";
  }

  function jump(){
    if(!run){start();return}
    if(onGround){vy=JUMPV;onGround=false;jumpAnim=1}
  }

  function start(){
    cancelAnimationFrame(raf);
    reset();run=true;o.classList.add("hidden");last=performance.now();
    raf=requestAnimationFrame(loop);
  }

  function spawnObstacle(){
    const type=Math.random()<.72?"spike":"cluster";
    const width=type==="spike"?22:36+Math.random()*26;
    obstacles.push({x:W+40,w:width,h:type==="spike"?30:26,type});
  }

  function maybeSpawnStar(){
    if(Math.random()<.55){
      const high=Math.random()<.5;
      stars.push({x:W+60+Math.random()*40,y:high?GY-95:GY-40,r:9,taken:false});
    }
  }

  function drawBackground(t){
    // sky
    const grad=x.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,"#120a3a");grad.addColorStop(.6,"#1b1250");grad.addColorStop(1,"#05081c");
    x.fillStyle=grad;x.fillRect(0,0,W,H);

    // twinkling stars
    for(let i=0;i<26;i++){
      const sx=(i*57+ (t*0.01*(i%3+1))%W+W)%W;
      const sy=(i*41)%150+10;
      const tw=.4+Math.sin(t/300+i)*.4+.4;
      x.fillStyle=`rgba(255,255,255,${Math.max(.15,tw)})`;
      x.fillRect(sx,sy,2,2);
    }

    // parallax hills (two layers)
    x.fillStyle="#181a44";
    for(let i=0;i<6;i++){
      const hx=((i*160 - (dist*0.35)%160)+W)%(W+160)-80;
      x.beginPath();x.moveTo(hx,GY+4);x.quadraticCurveTo(hx+80,GY-70,hx+160,GY+4);x.fill();
    }
    x.fillStyle="#221f57";
    for(let i=0;i<7;i++){
      const hx=((i*135 - (dist*0.7)%135)+W)%(W+135)-70;
      x.beginPath();x.moveTo(hx,GY+4);x.quadraticCurveTo(hx+65,GY-38,hx+135,GY+4);x.fill();
    }

    // ground
    x.fillStyle="#0c0f2c";x.fillRect(0,GY+4,W,H-GY-4);
    x.strokeStyle="#2c3163";x.lineWidth=3;x.beginPath();x.moveTo(0,GY+4);x.lineTo(W,GY+4);x.stroke();

    // scrolling ground tick marks
    x.fillStyle="#232852";
    for(let i=-1;i<20;i++){
      const gx=(i*34 - (dist%34));
      x.fillRect(gx,GY+10,18,4);
    }
  }

  function drawPlayer(t){
    x.save();
    x.translate(player.x,py);
    const squish=jumpAnim>0?1-jumpAnim*.12:1;
    x.scale(1,squish);
    x.shadowBlur=16;x.shadowColor="#ffd11a";

    // tail
    x.fillStyle="#ff9e18";
    x.fillRect(-19,4,8,7);

    // body
    x.fillStyle="#ffd11a";
    x.fillRect(-13,-14,26,24);
    x.fillStyle="#fff4c2";
    x.fillRect(-13,-14,26,7);

    // belly
    x.fillStyle="#fff7de";
    x.fillRect(-8,-4,16,12);

    // ears
    x.fillStyle="#ffd11a";
    x.fillRect(-12,-24,7,10);
    x.fillRect(5,-24,7,10);
    x.fillStyle="#ff218c";
    x.fillRect(-10,-21,3,4);
    x.fillRect(7,-21,3,4);

    // eyes
    x.fillStyle="#111936";
    x.fillRect(-6,-9,4,4);
    x.fillRect(3,-9,4,4);

    // nose
    x.fillStyle="#111936";
    x.fillRect(-2,-2,5,3);

    x.shadowBlur=0;

    // legs (running cycle, only visible while grounded)
    if(onGround){
      const phase=Math.sin(legPhase);
      x.fillStyle="#e0a010";
      x.fillRect(-10,10+phase*3,7,10-phase*4);
      x.fillRect(3,10-phase*3,7,10+phase*4);
    } else {
      x.fillStyle="#e0a010";
      x.fillRect(-11,12,7,9);
      x.fillRect(4,12,7,9);
    }
    x.restore();
  }

  function drawObstacle(ob){
    const bx=ob.x;
    x.save();x.translate(bx,GY+4);
    x.shadowBlur=14;x.shadowColor="#ff218c";
    if(ob.type==="spike"){
      x.fillStyle="#ff218c";
      x.beginPath();x.moveTo(0,0);x.lineTo(ob.w/2,-ob.h);x.lineTo(ob.w,0);x.closePath();x.fill();
      x.fillStyle="#ff77b7";
      x.beginPath();x.moveTo(ob.w*0.3,-ob.h*0.2);x.lineTo(ob.w/2,-ob.h);x.lineTo(ob.w*0.62,-ob.h*0.2);x.closePath();x.fill();
    } else {
      const n=Math.max(2,Math.round(ob.w/20));
      for(let i=0;i<n;i++){
        const sw=ob.w/n;
        x.fillStyle=i%2===0?"#ff218c":"#c4176f";
        x.beginPath();x.moveTo(i*sw,0);x.lineTo(i*sw+sw/2,-ob.h);x.lineTo(i*sw+sw,0);x.closePath();x.fill();
      }
    }
    x.restore();
  }

  function drawStar(st,t){
    if(st.taken)return;
    const pulse=1+Math.sin(t/150+st.x)*.15;
    x.save();x.translate(st.x,st.y);x.scale(pulse,pulse);
    x.shadowBlur=18;x.shadowColor="#08d9ff";
    x.fillStyle="#08d9ff";
    x.beginPath();
    for(let i=0;i<5;i++){
      const a=(-Math.PI/2)+i*(Math.PI*2/5);
      const a2=a+Math.PI/5;
      x.lineTo(Math.cos(a)*st.r,Math.sin(a)*st.r);
      x.lineTo(Math.cos(a2)*st.r*0.42,Math.sin(a2)*st.r*0.42);
    }
    x.closePath();x.fill();
    x.restore();
  }

  function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
  }

  function endRun(){
    run=false;
    const finalScore=Math.floor(dist/10)+coins*50;
    const record=save(finalScore);
    o.classList.remove("hidden");
    o.innerHTML=`<div class="pixel-title small-title">${record?"NEW RECORD!":"GAME OVER"}</div>
      <div class="final-score">${finalScore}</div>
      <div class="message-sub">STARS COLLECTED: ${coins}</div>
      <button class="action-btn" id="ragain">RUN AGAIN</button>`;
    document.getElementById("ragain").onclick=start;
  }

  function loop(t){
    if(!run)return;
    const dt=Math.min(.032,(t-last)/1000);last=t;
    speed=Math.min(680,300+dist*0.03);
    dist+=dt*speed;
    legPhase+=dt*(onGround?14:0);
    if(jumpAnim>0)jumpAnim=Math.max(0,jumpAnim-dt*3);
    shake=Math.max(0,shake-dt*30);

    // physics
    vy+=GRAV*dt;py+=vy*dt;
    if(py>=GY){py=GY;vy=0;onGround=true}

    // spawn
    spawnGap-=dt*(speed/300);
    if(spawnGap<=0){
      spawnObstacle();maybeSpawnStar();
      spawnGap=0.85+Math.random()*0.65;
    }

    obstacles.forEach(ob=>ob.x-=speed*dt);
    obstacles=obstacles.filter(ob=>ob.x>-60);
    stars.forEach(st=>st.x-=speed*dt);
    stars=stars.filter(st=>st.x>-30);

    drawBackground(t);

    const sx=shake?(Math.random()-.5)*shake:0;
    x.save();x.translate(sx,0);

    obstacles.forEach(ob=>drawObstacle(ob));
    stars.forEach(st=>drawStar(st,t));
    drawPlayer(t);

    // collisions
    const pl={x:player.x-13,y:py-14,w:26,h:24+ (py>=GY?10:0)};
    for(const ob of obstacles){
      if(rectsOverlap(pl.x,pl.y,pl.w,pl.h,ob.x,GY+4-ob.h,ob.w,ob.h)){
        shake=10;x.restore();endRun();return;
      }
    }
    for(const st of stars){
      if(!st.taken && Math.abs((player.x)-st.x)<24 && Math.abs(py-14-st.y)<26){
        st.taken=true;coins++;cc.textContent=coins;
      }
    }

    x.restore();

    s.textContent=Math.floor(dist/10)+coins*50;
    raf=requestAnimationFrame(loop);
  }

  document.getElementById("rn").onclick=start;
  document.onkeydown=e=>{
    if(e.key===" "||e.key==="ArrowUp"||e.key.toLowerCase()==="w"){e.preventDefault();jump()}
  };
  c.addEventListener("pointerdown",jump);
  document.querySelectorAll(".runner-touch button").forEach(b=>b.onclick=jump);

  drawBackground(0);drawPlayer(0);
}
