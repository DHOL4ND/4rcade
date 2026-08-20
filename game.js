const games={
neon:{title:"NEON INVADERS",desc:"Destroy the neon fleet. Survive every wave. Chase the high score.",type:"neon"},
forest:{title:"MYSTIC FOREST",desc:"Find the gems hidden in the forest grid before the timer ends.",type:"forest"},
color:{title:"COLOR SWAP",desc:"Click two tiles to swap them. Make rows of three matching colors.",type:"color"},
sky:{title:"SKYBOUND",desc:"Jump automatically between platforms. Don't fall.",type:"sky"},
turbo:{title:"TURBO DASH",desc:"Move between lanes and dodge traffic for as long as possible.",type:"turbo"},
snake:{title:"PIXEL SNAKE",desc:"Eat the glowing dots and grow. Arrow keys or WASD.",type:"snake"}};

const requestedKey=location.hash.replace("#","").toLowerCase();
const key=Object.prototype.hasOwnProperty.call(games,requestedKey)?requestedKey:"neon";
const g=games[key];
if(requestedKey!==key && location.hash) history.replaceState(null,"",location.pathname+location.search+"#neon");
document.getElementById("title").textContent=g.title;
document.getElementById("desc").textContent=g.desc;
document.getElementById("high").textContent=readScore(key);
const mount=document.getElementById("mount"),controls=document.getElementById("controls");

function readScore(id){
  try{return +localStorage.getItem("dhol_"+id)||0}catch(e){return 0}
}
function save(score){
  const old=readScore(key);
  if(score>old){
    try{localStorage.setItem("dhol_"+key,score)}catch(e){}
    document.getElementById("high").textContent=score;
    return true;
  }
  return false;
}
function shell(html,help){
  mount.innerHTML=`<div class="screen"><div class="play-ui">${html}</div></div>`;
  controls.textContent=help;
}

if(key==="neon") neon();
else if(key==="forest") forest();
else if(key==="color") color();
else if(key==="sky") sky();
else if(key==="turbo") turbo();
else snake();

/* =========================================================
   NEON INVADERS — polished benchmark game
   ========================================================= */
function neon(){
  shell(`
    <div class="hud">
      <span>SCORE <b id="s">0</b></span>
      <span>WAVE <b id="wave">1</b></span>
      <span>LIVES <b id="lives">♥ ♥ ♥</b></span>
    </div>
    <div class="neon-wrap">
      <canvas id="c" class="game-canvas" width="720" height="480"></canvas>
      <div class="center-message" id="message">
        <div class="pixel-title">NEON<br>INVADERS</div>
        <div class="message-sub">DESTROY THE FLEET</div>
        <button class="action-btn" id="start">INSERT COIN / START</button>
      </div>
    </div>
    <div class="game-touch neon-touch"><button data-neon="left">←</button><button data-neon="fire">FIRE</button><button data-neon="right">→</button></div>
    <div class="game-actions">
      <button class="action-btn small" id="pause">PAUSE</button>
      <button class="action-btn small ghost" id="restart">RESTART</button>
    </div>
  `,`Controls: ← → or A/D to move · SPACE to shoot · P to pause · ENTER to start/restart.`);

  const canvas=document.getElementById("c");
  const ctx=canvas.getContext("2d");
  const scoreEl=document.getElementById("s");
  const waveEl=document.getElementById("wave");
  const livesEl=document.getElementById("lives");
  const message=document.getElementById("message");
  const startBtn=document.getElementById("start");
  const pauseBtn=document.getElementById("pause");
  const restartBtn=document.getElementById("restart");

  const W=canvas.width,H=canvas.height;
  let ship,bullets,enemies,particles,stars,score,wave,lives,state="menu";
  let keys={},last=0,enemyDir=1,enemyTimer=0,enemyFire=0,shotCooldown=0;
  let shake=0,flash=0,levelBanner=0;
  let raf,countdownId=0;

  function reset(){
    cancelAnimationFrame(raf);
    score=0;wave=1;lives=3;enemyDir=1;enemyTimer=0;enemyFire=0;
    stars=Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,s:.4+Math.random()*1.8,v:10+Math.random()*28}));
    particles=[];
    bullets=[];
    ship={x:W/2-22,y:H-62,w:44,h:22,speed:390,invuln:0};
    buildWave();
    state="countdown";
    message.classList.add("hidden");
    levelBanner=1.7;
    const token=++countdownId;
    countdown(3,token);
    last=performance.now();
    raf=requestAnimationFrame(loop);
  }

  function buildWave(){
    enemies=[];
    const rows=Math.min(3+Math.floor(wave/2),6);
    const cols=8;
    const gapX=72,gapY=43;
    const startX=(W-(cols-1)*gapX-34)/2;
    const startY=65;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        enemies.push({
          x:startX+c*gapX,y:startY+r*gapY,w:34,h:22,
          row:r,alive:true,
          hp:wave>=4 && r===0?2:1,
          pulse:Math.random()*Math.PI*2
        });
      }
    }
    enemyDir=1;
    enemyTimer=0;
    enemyFire=0;
  }

  function countdown(n,token){
    if(token!==countdownId || state!=="countdown")return;
    if(n<=0){
      message.innerHTML=`<div class="go-text">GO!</div>`;
      setTimeout(()=>{if(token===countdownId&&state==="countdown"){message.classList.add("hidden");state="playing"}},420);
      return;
    }
    message.innerHTML=`<div class="count-number">${n}</div>`;
    setTimeout(()=>countdown(n-1,token),650);
  }

  function startGame(){reset()}
  startBtn.onclick=startGame;
  restartBtn.onclick=startGame;
  pauseBtn.onclick=togglePause;
  document.querySelectorAll(".neon-touch button").forEach(b=>{
    const set=(down)=>{if(b.dataset.neon==="left")keys.arrowleft=down;else if(b.dataset.neon==="right")keys.arrowright=down;else keys[" "]=down};
    b.onpointerdown=()=>set(true); b.onpointerup=()=>set(false); b.onpointercancel=()=>set(false); b.onpointerleave=()=>set(false);
  });

  document.onkeydown=e=>{
    const k=e.key.toLowerCase();
    keys[k]=true;
    if(["arrowleft","arrowright"," ","w","a","d","p","enter"].includes(k)) e.preventDefault();
    if(k==="p") togglePause();
    if(k==="enter" && (state==="menu"||state==="gameover")) reset();
  };
  document.onkeyup=e=>{keys[e.key.toLowerCase()]=false};

  function togglePause(){
    if(state==="playing"){state="paused";pauseBtn.textContent="RESUME";message.classList.remove("hidden");message.innerHTML='<div class="pixel-title small-title">PAUSED</div><div class="message-sub">PRESS P TO CONTINUE</div>'}
    else if(state==="paused"){state="playing";pauseBtn.textContent="PAUSE";message.classList.add("hidden");last=performance.now()}
  }

  function shoot(){
    if(shotCooldown>0 || state!=="playing") return;
    bullets.push({x:ship.x+ship.w/2-2,y:ship.y-12,w:4,h:16,vy:-610,enemy:false});
    shotCooldown=.18;
    burst(ship.x+ship.w/2,ship.y,3,"#08d9ff",.6);
  }

  function enemyShoot(){
    const alive=enemies.filter(e=>e.alive);
    if(!alive.length)return;
    const e=alive[Math.floor(Math.random()*alive.length)];
    bullets.push({x:e.x+e.w/2-2,y:e.y+e.h,w:4,h:13,vy:240+wave*15,enemy:true});
  }

  function burst(x,y,count,color,power=1){
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2;
      const sp=(40+Math.random()*160)*power;
      particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.35+Math.random()*.45,max:.8,color,size:2+Math.random()*3});
    }
  }

  function hitPlayer(){
    if(ship.invuln>0 || state!=="playing")return;
    lives--;
    ship.invuln=2;
    shake=10;flash=.18;
    burst(ship.x+22,ship.y+10,30,"#ff218c",1.3);
    updateHud();
    if(lives<=0) gameOver();
  }

  function gameOver(){
    state="gameover";
    const record=save(score);
    message.classList.remove("hidden");
    message.innerHTML=`
      <div class="pixel-title">${record?"NEW RECORD!":"GAME OVER"}</div>
      <div class="final-score">${String(score).padStart(6,"0")}</div>
      <div class="message-sub">WAVE ${wave} · ${record?"HIGH SCORE SAVED":"TRY AGAIN"}</div>
      <button class="action-btn" id="again">PLAY AGAIN</button>`;
    document.getElementById("again").onclick=reset;
    pauseBtn.textContent="PAUSE";
  }

  function nextWave(){
    wave++;
    score+=100;
    save(score);
    buildWave();
    levelBanner=1.7;
    flash=.12;
    burst(W/2,120,35,"#8d35ff",1.2);
    updateHud();
  }

  function updateHud(){
    scoreEl.textContent=score;
    waveEl.textContent=wave;
    livesEl.textContent="♥ ".repeat(Math.max(0,lives)).trim()||"—";
  }

  function update(dt){
    if(state!=="playing") return;
    if(ship.invuln>0)ship.invuln-=dt;
    shotCooldown=Math.max(0,shotCooldown-dt);
    enemyTimer+=dt;
    enemyFire+=dt;
    levelBanner=Math.max(0,levelBanner-dt);
    shake=Math.max(0,shake-dt*30);
    flash=Math.max(0,flash-dt);

    if(keys.arrowleft||keys.a)ship.x-=ship.speed*dt;
    if(keys.arrowright||keys.d)ship.x+=ship.speed*dt;
    ship.x=Math.max(10,Math.min(W-ship.w-10,ship.x));
    if(keys[" "]||keys.w){shoot();keys[" "]=false;keys.w=false}

    stars.forEach(s=>{s.y+=s.v*dt;if(s.y>H)s.y=-2});

    const alive=enemies.filter(e=>e.alive);
    const moveSpeed=22+wave*4+Math.max(0,(1-alive.length/40))*25;
    if(enemyTimer>.48){
      enemyTimer=0;
      let minX=Infinity,maxX=-Infinity;
      alive.forEach(e=>{minX=Math.min(minX,e.x);maxX=Math.max(maxX,e.x+e.w)});
      if(minX<22 && enemyDir<0 || maxX>W-22 && enemyDir>0){
        enemyDir*=-1;
        alive.forEach(e=>e.y+=18);
      }
      alive.forEach(e=>e.x+=enemyDir*moveSpeed*.48);
    }
    if(enemyFire>Math.max(.35,1.15-wave*.05)){enemyFire=0;enemyShoot()}

    bullets.forEach(b=>b.y+=b.vy*dt);
    bullets=bullets.filter(b=>b.y>-30&&b.y<H+30);

    for(const b of bullets){
      if(b.enemy){
        if(b.x<ship.x+ship.w&&b.x+b.w>ship.x&&b.y<ship.y+ship.h&&b.y+b.h>ship.y){
          b.y=H+50;hitPlayer();
        }
      }else{
        for(const e of alive){
          if(b.x<e.x+e.w&&b.x+b.w>e.x&&b.y<e.y+e.h&&b.y+b.h>e.y){
            b.y=-50;e.hp--;shake=3;burst(e.x+17,e.y+11,e.hp<=0?18:7,e.hp<=0?"#ff218c":"#ffd11a",1);
            if(e.hp<=0){e.alive=false;score+=20+wave*5}
            break;
          }
        }
      }
    }

    if(alive.some(e=>e.y+e.h>ship.y-5 || (e.x<ship.x+ship.w&&e.x+e.w>ship.x&&e.y+e.h>ship.y))){
      lives=0;gameOver();
    }
    if(enemies.every(e=>!e.alive)) nextWave();
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=50*dt;p.life-=dt});
    particles=particles.filter(p=>p.life>0);
    updateHud();
  }

  function draw(){
    ctx.save();
    const sx=shake?(Math.random()-.5)*shake:0,sy=shake?(Math.random()-.5)*shake:0;
    ctx.translate(sx,sy);
    ctx.fillStyle="#05081c";ctx.fillRect(-20,-20,W+40,H+40);

    stars.forEach(s=>{
      ctx.globalAlpha=.25+s.s/3;
      ctx.fillStyle=s.s>1.5?"#08d9ff":"#ffffff";
      ctx.fillRect(s.x,s.y,s.s,s.s);
    });
    ctx.globalAlpha=1;

    // subtle horizon grid
    ctx.strokeStyle="#151a40";ctx.lineWidth=1;
    for(let y=H-110;y<H;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    for(let x=0;x<W;x+=45){ctx.beginPath();ctx.moveTo(x,H-110);ctx.lineTo(W/2+(x-W/2)*.25,H-20);ctx.stroke()}

    enemies.filter(e=>e.alive).forEach(e=>{
      const glow=e.hp>1?"#ffd11a":"#ff218c";
      ctx.shadowBlur=14;ctx.shadowColor=glow;ctx.fillStyle=glow;
      const px=4, py=3;
      const rows=["01111110","11111111","11011011","11111111","10100101"];
      rows.forEach((row,ry)=>[...row].forEach((v,c)=>{if(v==="1")ctx.fillRect(e.x+c*px,e.y+ry*py,px-0.5,py-0.5)}));
      ctx.fillStyle="#f7f7fb";ctx.fillRect(e.x+8,e.y+7,3,3);ctx.fillRect(e.x+24,e.y+7,3,3);
      ctx.shadowBlur=0;
    });

    bullets.forEach(b=>{
      ctx.shadowBlur=14;ctx.shadowColor=b.enemy?"#ff218c":"#08d9ff";
      ctx.fillStyle=b.enemy?"#ff218c":"#08d9ff";
      ctx.fillRect(b.x,b.y,b.w,b.h);ctx.shadowBlur=0;
    });

    if(ship && lives>0 && state!=="gameover"){
      if(ship.invuln<=0 || Math.floor(ship.invuln*12)%2===0){
        ctx.shadowBlur=20;ctx.shadowColor="#08d9ff";ctx.fillStyle="#08d9ff";
        const ox=ship.x,oy=ship.y;
        const shipRows=["001100","011110","111111","110011","100001"];
        shipRows.forEach((row,ry)=>[...row].forEach((v,c)=>{if(v==="1")ctx.fillRect(ox+c*7,oy+ry*5,7,5)}));
        ctx.fillStyle="#ffffff";ctx.fillRect(ox+17,oy+8,8,5);
        ctx.fillStyle="#ff218c";ctx.fillRect(ox+14,oy+25,5,7);ctx.fillRect(ox+25,oy+25,5,7);
        ctx.shadowBlur=0;
      }
    }

    particles.forEach(p=>{
      ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowBlur=8;ctx.shadowColor=p.color;
      ctx.fillRect(p.x,p.y,p.size,p.size);
    });
    ctx.globalAlpha=1;ctx.shadowBlur=0;

    if(levelBanner>0 && state==="playing"){
      ctx.globalAlpha=Math.min(1,levelBanner);
      ctx.textAlign="center";ctx.font='14px "Press Start 2P"';ctx.fillStyle="#ffd11a";
      ctx.fillText(`WAVE ${wave}`,W/2,42);ctx.globalAlpha=1;
    }
    if(flash>0){ctx.fillStyle=`rgba(255,255,255,${flash})`;ctx.fillRect(0,0,W,H)}
    ctx.restore();
  }

  function loop(t){
    const dt=Math.min(.033,(t-last)/1000);last=t;
    update(dt);draw();
    raf=requestAnimationFrame(loop);
  }

  updateHud();
  draw();
}

/* =========================================================
   OTHER DHØL GAMES — polished pass
   ========================================================= */
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

function sky(){
  shell(`
    <div class="hud"><span>ALTITUDE <b id="ys">0</b>m</span><span>JET FUEL <b id="fuel">100</b>%</span><span>BEST <b>${readScore("sky")}</b>m</span></div>
    <div class="neon-wrap sky-wrap">
      <canvas id="yc" class="game-canvas" width="520" height="560"></canvas>
      <div class="center-message" id="yo">
        <div class="pixel-title small-title">SKYBOUND</div>
        <div class="message-sub">REACH THE NEON STARS</div>
        <button class="action-btn" id="yst">LAUNCH</button>
      </div>
    </div>
    <div class="game-touch sky-touch"><button data-sky="left">←</button><button data-sky="jet">JET</button><button data-sky="right">→</button></div>
  `,`Controls: ← → or A/D to steer. SPACE/W/↑ activates the jetpack. Land on platforms and climb.`);

  const c=document.getElementById("yc"),x=c.getContext("2d");
  const s=document.getElementById("ys"),fuelEl=document.getElementById("fuel"),o=document.getElementById("yo");
  let p,plats,stars,keys={},run=false,score=0,fuel=100,raf,last=0,scroll=0,particles=[];

  document.onkeydown=e=>{
    const k=e.key.toLowerCase();keys[k]=true;
    if(["arrowleft","arrowright"," ","w","a","d"].includes(k))e.preventDefault();
  };
  document.onkeyup=e=>keys[e.key.toLowerCase()]=false;

  function start(){
    cancelAnimationFrame(raf);
    score=0;fuel=100;scroll=0;particles=[];
    p={x:250,y:450,vy:0,w:38,h:52,landed:false};
    plats=[];
    for(let i=0;i<18;i++){
      plats.push({x:30+Math.random()*380,y:520-i*68,w:95+Math.random()*55,h:9,pulse:Math.random()*6});
    }
    stars=Array.from({length:90},()=>({x:Math.random()*520,y:Math.random()*560,s:1+Math.random()*2,v:.2+Math.random()*.7}));
    run=true;o.classList.add("hidden");last=performance.now();loop(last);
  }

  function burst(xp,yp,n,color){
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,sp=20+Math.random()*70;
      particles.push({x:xp,y:yp,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.35+Math.random()*.35,color});
    }
  }

  // Pixel astronaut drawn directly on canvas.
  function drawAstronaut(cx,cy,jet){
    x.save();x.translate(cx,cy);
    x.shadowBlur=16;x.shadowColor="#08d9ff";

    // jetpack
    x.fillStyle="#303858";x.fillRect(-21,-4,9,29);x.fillRect(12,-4,9,29);
    x.fillStyle="#8d35ff";x.fillRect(-20,1,7,18);x.fillRect(13,1,7,18);

    // helmet
    x.fillStyle="#f4f5ff";x.fillRect(-15,-27,30,25);
    x.fillStyle="#c7d0e8";x.fillRect(-11,-32,22,7);
    x.fillStyle="#101936";x.fillRect(-11,-22,22,14);
    x.fillStyle="#08d9ff";x.fillRect(-8,-19,16,4);
    x.fillStyle="#ff218c";x.fillRect(6,-15,5,4);

    // body
    x.fillStyle="#dfe5f4";x.fillRect(-13,-2,26,28);
    x.fillStyle="#8d35ff";x.fillRect(-13,5,6,16);x.fillRect(7,5,6,16);
    x.fillStyle="#08d9ff";x.fillRect(-5,2,10,7);
    x.fillStyle="#101936";x.fillRect(-4,12,8,8);

    // arms
    x.fillStyle="#f4f5ff";x.fillRect(-21,1,8,20);x.fillRect(13,1,8,20);
    x.fillStyle="#08d9ff";x.fillRect(-22,18,9,6);x.fillRect(13,18,9,6);

    // legs
    x.fillStyle="#c7d0e8";x.fillRect(-11,24,9,17);x.fillRect(2,24,9,17);
    x.fillStyle="#8d35ff";x.fillRect(-12,38,10,6);x.fillRect(2,38,10,6);

    // jetpack flame
    if(jet){
      x.shadowBlur=22;x.shadowColor="#08d9ff";
      x.fillStyle="#08d9ff";x.fillRect(-18,25,7,19);x.fillRect(11,25,7,19);
      x.fillStyle="#ff218c";x.fillRect(-16,34,4,16);x.fillRect(12,34,4,16);
      x.fillStyle="#ffd11a";x.fillRect(-15,43,3,8);x.fillRect(12,43,3,8);
    }
    x.shadowBlur=0;x.restore();
  }

  function draw(){
    x.fillStyle="#05081c";x.fillRect(0,0,520,560);

    // deep space
    stars.forEach(st=>{
      st.y+=st.v;
      if(st.y>560)st.y=-5;
      x.globalAlpha=.25+st.s/3;
      x.fillStyle=st.s>2?"#08d9ff":"#dfe5f4";
      x.fillRect(st.x,st.y,st.s,st.s);
    });
    x.globalAlpha=1;

    // distant nebula bands
    const grad=x.createLinearGradient(0,0,520,0);
    grad.addColorStop(0,"#8d35ff00");grad.addColorStop(.5,"#8d35ff0d");grad.addColorStop(1,"#08d9ff00");
    x.fillStyle=grad;x.fillRect(0,0,520,560);

    // platforms
    plats.forEach(q=>{
      x.shadowBlur=14;x.shadowColor="#8d35ff";x.fillStyle="#8d35ff";
      x.fillRect(q.x,q.y,q.w,q.h);
      x.fillStyle="#c46cff";x.fillRect(q.x,q.y,q.w,3);
      x.shadowBlur=0;
      x.fillStyle="#08d9ff44";x.fillRect(q.x+8,q.y+q.h,q.w-16,3);
    });

    particles.forEach(pt=>{
      x.globalAlpha=Math.max(0,pt.life/.7);x.fillStyle=pt.color;
      x.fillRect(pt.x,pt.y,3,3);
    });
    x.globalAlpha=1;

    drawAstronaut(p.x+19,p.y+24,keys[" "]||keys.w||keys.arrowup||p.vy<0);

    if(score>0){
      x.font='9px "DM Mono"';x.fillStyle="#08d9ff";x.textAlign="center";
      x.fillText("ALTITUDE "+Math.floor(score)+"m",260,28);
    }
  }

  function loop(t){
    if(!run)return;
    const dt=Math.min(.033,(t-last)/1000);last=t;
    const jet=keys[" "]||keys.w||keys.arrowup;

    // Horizontal steering
    if(keys.a||keys.arrowleft)p.x-=190*dt;
    if(keys.d||keys.arrowright)p.x+=190*dt;
    p.x=Math.max(12,Math.min(470,p.x));

    // Jetpack / gravity
    if(jet&&fuel>0){
      p.vy-=430*dt;
      fuel=Math.max(0,fuel-30*dt);
      burst(p.x+19,p.y+48,2,Math.random()>.5?"#08d9ff":"#ff218c");
    }else{
      p.vy+=350*dt;
      fuel=Math.min(100,fuel+10*dt);
    }
    p.vy=Math.max(-260,Math.min(330,p.vy));
    p.y+=p.vy*dt;

    // Camera scroll when astronaut reaches upper zone
    if(p.y<210){
      const dy=210-p.y;p.y=210;
      plats.forEach(q=>q.y+=dy);
      score+=dy*.12;
    }

    // Platform landing
    if(p.vy>0){
      for(const q of plats){
        if(p.x+28>q.x&&p.x+8<q.x+q.w&&p.y+p.h>q.y&&p.y+p.h<q.y+18){
          p.y=q.y-p.h;p.vy=-235;p.landed=true;fuel=Math.min(100,fuel+18);
          burst(p.x+19,q.y,8,"#8d35ff");
          break;
        }
      }
    }

    plats.forEach(q=>{
      if(q.y>560){
        q.y=Math.min(...plats.map(v=>v.y))-68;
        q.x=25+Math.random()*390;
        q.w=95+Math.random()*55;
      }
    });

    particles.forEach(pt=>{pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.life-=dt});
    particles=particles.filter(pt=>pt.life>0);

    if(p.y>580){
      run=false;
      const final=Math.floor(score);
      const record=save(final);
      o.classList.remove("hidden");
      o.innerHTML=`<div class="pixel-title small-title">${record?"NEW RECORD!":"LOST IN SPACE"}</div>
        <div class="final-score">${final}m</div>
        <div class="message-sub">JET FUEL ${Math.floor(fuel)}%</div>
        <button class="action-btn" id="ya">LAUNCH AGAIN</button>`;
      document.getElementById("ya").onclick=start;
      return;
    }

    s.textContent=Math.floor(score);
    fuelEl.textContent=Math.floor(fuel);
    draw();
    raf=requestAnimationFrame(loop);
  }

  document.getElementById("yst").onclick=start;
  document.querySelectorAll(".sky-touch button").forEach(b=>{
    const set=(down)=>{if(b.dataset.sky==="left")keys.arrowleft=down;else if(b.dataset.sky==="right")keys.arrowright=down;else keys[" "]=down};
    b.onpointerdown=()=>set(true); b.onpointerup=()=>set(false); b.onpointercancel=()=>set(false); b.onpointerleave=()=>set(false);
  });
  draw();
}

function turbo(){
  shell(`
    <div class="hud"><span>DISTANCE <b id="ds">0</b>m</span><span>SPEED <b id="spd">1.0x</b></span><span>BEST <b>${readScore("turbo")}m</b></span></div>
    <div class="neon-wrap turbo-wrap">
      <canvas id="tc" class="game-canvas" width="520" height="560"></canvas>
      <div class="center-message" id="to">
        <div class="pixel-title small-title">TURBO<br>DASH</div>
        <div class="message-sub">DODGE. DRIFT. SURVIVE.</div>
        <button class="action-btn" id="ts">START ENGINE</button>
      </div>
    </div>
    <div class="game-touch turbo-touch"><button data-lane="left">←</button><button data-lane="right">→</button></div>
  `,`Controls: ← → or A/D to switch lanes. Dodge traffic. Speed increases as distance grows.`);

  const c=document.getElementById("tc"),x=c.getContext("2d");
  const d=document.getElementById("ds"),spd=document.getElementById("spd"),o=document.getElementById("to");
  let lane=1,traffic=[],dist=0,run=false,last=0,raf,spawn=0,roadOffset=0,shake=0,crashFlash=0;
  const player={x:0,y:465,w:58,h:94};

  document.onkeydown=e=>{
    if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a"){lane=Math.max(0,lane-1);e.preventDefault()}
    if(e.key==="ArrowRight"||e.key.toLowerCase()==="d"){lane=Math.min(2,lane+1);e.preventDefault()}
  };

  function laneX(l){return 65+l*130+65}
  function start(){
    cancelAnimationFrame(raf);
    lane=1;traffic=[];dist=0;roadOffset=0;spawn=0;shake=0;crashFlash=0;
    run=true;o.classList.add("hidden");last=performance.now();
    raf=requestAnimationFrame(loop);
  }

  // Pixel-art car sprite drawn directly to canvas — no external image required.
  function drawCar(cx,cy,scale,color,accent,playerCar=false){
    x.save();
    x.translate(cx,cy);
    x.scale(scale,scale);

    // shadow
    x.fillStyle="#0008";x.fillRect(-22,40,44,9);

    // neon glow
    x.shadowBlur=playerCar?20:10;x.shadowColor=color;

    // wheels
    x.fillStyle="#090b18";
    x.fillRect(-29,-27,9,27);x.fillRect(20,-27,9,27);
    x.fillRect(-29,13,9,27);x.fillRect(20,13,9,27);
    x.fillStyle="#30354f";
    x.fillRect(-27,-20,5,13);x.fillRect(22,-20,5,13);
    x.fillRect(-27,20,5,13);x.fillRect(22,20,5,13);

    // body silhouette
    x.fillStyle=color;
    x.beginPath();
    x.moveTo(-19,-45);x.lineTo(19,-45);x.lineTo(27,-26);x.lineTo(23,37);
    x.lineTo(13,46);x.lineTo(-13,46);x.lineTo(-23,37);x.lineTo(-27,-26);x.closePath();x.fill();

    // body highlight
    x.fillStyle=accent;
    x.fillRect(-16,-40,32,7);
    x.fillRect(-21,25,42,6);

    // windshield
    x.fillStyle="#111a38";
    x.beginPath();
    x.moveTo(-15,-28);x.lineTo(15,-28);x.lineTo(19,-6);x.lineTo(-19,-6);x.closePath();x.fill();
    x.fillStyle="#52658f";x.fillRect(-13,-25,26,4);

    // center stripe
    x.fillStyle="#f4f5ff";
    x.globalAlpha=.8;x.fillRect(-3,-4,6,30);x.globalAlpha=1;

    // headlights / taillights
    x.fillStyle=playerCar?"#ffd11a":"#08d9ff";
    x.fillRect(-20,-20,7,8);x.fillRect(13,-20,7,8);
    x.fillStyle="#ff218c";x.fillRect(-18,32,9,5);x.fillRect(9,32,9,5);

    // player cockpit accent
    if(playerCar){
      x.fillStyle="#ff218c";x.fillRect(-8,-38,16,5);
      x.fillStyle="#08d9ff";x.fillRect(-2,8,4,17);
      x.shadowBlur=0;
      // nitro flames
      x.fillStyle="#08d9ff";x.fillRect(-13,45,8,18);x.fillRect(5,45,8,18);
      x.fillStyle="#ff218c";x.fillRect(-10,50,4,12);x.fillRect(6,50,4,12);
    }
    x.shadowBlur=0;x.restore();
  }

  function drawRoad(dt){
    x.fillStyle="#070a20";x.fillRect(0,0,520,560);

    // skyline / neon ambience
    for(let i=0;i<18;i++){
      const bx=i*32+(i%2)*7;
      const bh=35+(i*17)%75;
      x.fillStyle=i%3===0?"#12163a":"#0d1230";
      x.fillRect(bx,125-bh,24,bh);
      if(i%2===0){x.fillStyle="#08d9ff55";x.fillRect(bx+5,130-bh,3,3);x.fillRect(bx+14,145-bh,3,3)}
    }

    // road
    x.fillStyle="#191d3b";x.fillRect(65,0,390,560);
    x.fillStyle="#252a4b";x.fillRect(65,0,8,560);x.fillRect(447,0,8,560);

    // neon road edges
    x.fillStyle="#ff218c";x.fillRect(62,0,3,560);x.fillStyle="#08d9ff";x.fillRect(455,0,3,560);

    // lane dividers
    x.strokeStyle="#e8eaf2";x.lineWidth=5;x.setLineDash([34,28]);x.lineDashOffset=-roadOffset;
    [195,325].forEach(v=>{x.beginPath();x.moveTo(v,0);x.lineTo(v,560);x.stroke()});
    x.setLineDash([]);

    // moving neon road arrows
    for(let i=0;i<5;i++){
      const yy=((i*145+roadOffset*1.5)%650)-80;
      x.fillStyle=i%2?"#08d9ff55":"#ff218c55";
      x.beginPath();x.moveTo(105,yy);x.lineTo(120,yy+18);x.lineTo(105,yy+18);x.lineTo(105,yy+31);x.lineTo(92,yy+15);x.lineTo(105,yy+15);x.closePath();x.fill();
    }
  }

  function loop(t){
    if(!run)return;
    const dt=Math.min(.035,(t-last)/1000);last=t;
    const speed=18+dist*.045;
    dist+=dt*speed;
    roadOffset+=dt*(180+dist*2.4);
    spawn-=dt;
    shake=Math.max(0,shake-dt*30);
    crashFlash=Math.max(0,crashFlash-dt*2.5);

    drawRoad(dt);

    // traffic spawning
    if(spawn<=0){
      const free=[0,1,2].filter(l=>!traffic.some(a=>a.lane===l&&a.y<130));
      if(free.length){
        const tl=free[Math.floor(Math.random()*free.length)];
        const type=Math.floor(Math.random()*3);
        traffic.push({lane:tl,y:-110,w:52,h:82,type,speed:105+Math.random()*70+dist*.12});
      }
      spawn=Math.max(.45,1.05-dist*.0015);
    }

    traffic.forEach(a=>a.y+=a.speed*dt);
    traffic=traffic.filter(a=>a.y<650);

    // player
    player.x=laneX(lane);
    const sx=shake?(Math.random()-.5)*shake:0,sy=shake?(Math.random()-.5)*shake:0;
    x.save();x.translate(sx,sy);

    traffic.forEach(a=>{
      const colors=[
        ["#08d9ff","#ffffff"],
        ["#ffd11a","#ff218c"],
        ["#8d35ff","#08d9ff"]
      ][a.type];
      drawCar(laneX(a.lane),a.y,a.w/58,colors[0],colors[1],false);
    });

    drawCar(player.x,player.y,1,"#ff218c","#08d9ff",true);

    // collision using sprite bounds
    for(const a of traffic){
      if(Math.abs(player.x-laneX(a.lane))<42 && Math.abs(player.y-a.y)<72){
        run=false;shake=15;crashFlash=1;
        const record=save(Math.floor(dist));
        o.classList.remove("hidden");
        o.innerHTML=`<div class="pixel-title small-title">${record?"NEW RECORD!":"CRASH!"}</div>
          <div class="final-score">${Math.floor(dist)}m</div>
          <div class="message-sub">SPEED ${(1+dist/180).toFixed(1)}x</div>
          <button class="action-btn" id="ta">DRIVE AGAIN</button>`;
        document.getElementById("ta").onclick=start;
        break;
      }
    }

    x.restore();

    if(crashFlash>0){
      x.fillStyle=`rgba(255,33,140,${crashFlash*.22})`;x.fillRect(0,0,520,560);
    }

    d.textContent=Math.floor(dist);
    spd.textContent=(1+dist/180).toFixed(1)+"x";
    raf=requestAnimationFrame(loop);
  }

  document.getElementById("ts").onclick=start;
  document.querySelectorAll(".turbo-touch button").forEach(b=>b.onclick=()=>{
    if(b.dataset.lane==="left")lane=Math.max(0,lane-1);
    else lane=Math.min(2,lane+1);
  });
}

function snake(){
  shell(`
    <div class="hud"><span>SCORE <b id="ss">0</b></span><span>LENGTH <b id="len">1</b></span><span>BEST <b>${readScore("snake")}</b></span></div>
    <div class="neon-wrap"><canvas id="sc" class="game-canvas" width="420" height="420"></canvas><div class="center-message" id="so"><div class="pixel-title small-title">PIXEL<br>SNAKE</div><div class="message-sub">GROW. DON'T BITE.</div><div class="snake-hint">◆ EAT PINK · GROW CYAN · SURVIVE</div><button class="action-btn" id="sn">START</button></div></div>
    <div class="touch"><button data-d="up">↑</button><button data-d="left">←</button><button data-d="down">↓</button><button data-d="right">→</button></div>
  `,`Controls: Arrow keys / WASD. Mobile players can use the direction buttons.`);
  const c=document.getElementById("sc"),x=c.getContext("2d"),s=document.getElementById("ss"),len=document.getElementById("len"),o=document.getElementById("so");let snake,dir,next,food,score,timer,run=false;
  function start(){clearInterval(timer);snake=[[10,10],[9,10],[8,10]];dir=[1,0];next=[1,0];food=randomFood();score=0;run=true;o.classList.add("hidden");timer=setInterval(step,105);draw()}
  function randomFood(){let f;do f=[Math.floor(Math.random()*21),Math.floor(Math.random()*21)];while(snake&&snake.some(p=>p[0]===f[0]&&p[1]===f[1]));return f}
  function step(){dir=next;const h=[snake[0][0]+dir[0],snake[0][1]+dir[1]];if(h[0]<0||h[0]>=21||h[1]<0||h[1]>=21||snake.some(p=>p[0]===h[0]&&p[1]===h[1]))return end();snake.unshift(h);if(h[0]===food[0]&&h[1]===food[1]){score+=100;food=randomFood()}else snake.pop();s.textContent=score;len.textContent=snake.length;draw()}
  function draw(){
    const t=performance.now();
    x.fillStyle="#05081c";x.fillRect(0,0,420,420);

    // Subtle arcade grid
    x.strokeStyle="#101538";x.lineWidth=1;
    for(let i=0;i<=420;i+=20){
      x.beginPath();x.moveTo(i,0);x.lineTo(i,420);x.stroke();
      x.beginPath();x.moveTo(0,i);x.lineTo(420,i);x.stroke();
    }

    // Glowing food — pixel berry
    const pulse=1+Math.sin(t/180)*.12;
    const fx=food[0]*20+10,fy=food[1]*20+10;
    x.save();x.translate(fx,fy);x.scale(pulse,pulse);
    x.shadowBlur=20;x.shadowColor="#ff218c";
    x.fillStyle="#ff218c";x.fillRect(-7,-7,14,14);
    x.fillStyle="#ff77b7";x.fillRect(-4,-4,4,4);
    x.fillStyle="#8cf126";x.fillRect(3,-9,4,4);
    x.fillStyle="#162044";x.fillRect(3,2,3,3);
    x.restore();

    // Snake body: distinct pixel creature instead of plain blocks.
    snake.forEach((p,i)=>{
      const px=p[0]*20+2,py=p[1]*20+2;
      const isHead=i===0;
      x.save();
      x.shadowBlur=isHead?16:8;
      x.shadowColor=isHead?"#8cf126":"#08d9ff";

      // dark pixel outline
      x.fillStyle="#071020";
      x.fillRect(px,py,16,16);

      if(isHead){
        // helmet-like head
        x.fillStyle="#8cf126";
        x.fillRect(px+2,py+2,12,12);
        x.fillStyle="#b7ff55";
        x.fillRect(px+3,py+3,5,3);

        // Eyes point toward movement direction
        let e1=[px+5,py+5],e2=[px+10,py+5];
        if(dir[0]===1){e1=[px+10,py+4];e2=[px+10,py+10]}
        if(dir[0]===-1){e1=[px+3,py+4];e2=[px+3,py+10]}
        if(dir[1]===1){e1=[px+4,py+10];e2=[px+10,py+10]}
        if(dir[1]===-1){e1=[px+4,py+3];e2=[px+10,py+3]}
        x.fillStyle="#08101f";x.fillRect(e1[0],e1[1],3,3);x.fillRect(e2[0],e2[1],3,3);

        // Tiny pixel tongue for personality
        x.fillStyle="#ff218c";
        if(dir[0]===1){x.fillRect(px+14,py+7,4,2);x.fillRect(px+18,py+5,2,2);x.fillRect(px+18,py+9,2,2)}
        else if(dir[0]===-1){x.fillRect(px-4,py+7,4,2);x.fillRect(px-6,py+5,2,2);x.fillRect(px-6,py+9,2,2)}
        else if(dir[1]===1){x.fillRect(px+7,py+14,2,4);x.fillRect(px+5,py+18,2,2);x.fillRect(px+9,py+18,2,2)}
        else{x.fillRect(px+7,py-4,2,4);x.fillRect(px+5,py-6,2,2);x.fillRect(px+9,py-6,2,2)}
      }else{
        const hue=i%2===0?"#08d9ff":"#00b8e6";
        x.fillStyle=hue;x.fillRect(px+3,py+3,10,10);
        x.fillStyle="#74efff";x.fillRect(px+4,py+4,4,3);
        // connector pixel makes the body read as one creature
        x.fillStyle="#087e9b";x.fillRect(px+7,py+13,3,3);
      }
      x.restore();
    });
  }
  function end(){clearInterval(timer);run=false;const record=save(score);o.classList.remove("hidden");o.innerHTML=`<div class="pixel-title small-title">${record?"NEW RECORD!":"GAME OVER"}</div><div class="final-score">${score}</div><div class="message-sub">LENGTH ${snake.length}</div><button class="action-btn" id="sagain">PLAY AGAIN</button>`;document.getElementById("sagain").onclick=start}
  function setDir(d){
    const m={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},n=m[d];
    if(n[0]!==-next[0]||n[1]!==-next[1]) next=n;
  }
  document.onkeydown=e=>{const m={ArrowUp:"up",w:"up",ArrowDown:"down",s:"down",ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right"};if(m[e.key])setDir(m[e.key])};document.querySelectorAll(".touch button").forEach(b=>b.onclick=()=>setDir(b.dataset.d));document.getElementById("sn").onclick=start;draw()
}
function scorePopup(el,text){const s=document.createElement("b");s.className="score-pop";s.textContent=text;el.appendChild(s);setTimeout(()=>s.remove(),650)}
