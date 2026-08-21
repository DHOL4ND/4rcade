
const key = "neon";

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
  id: "neon",
  title: "NEON INVADERS",
  name: "Neon Invaders",
  description: "Destroy the incoming neon fleet.",
  category: "arcade",
  art: "NEON",
  thumbnail: "",
  version: "2.0.1"
};

export function init() {
  neon();
}

export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}



function neon(){
  shell(`
    <div class="hud">
      <span>SCORE <b id="s">0</b></span>
      <span>LEVEL <b id="wave">1</b></span>
      <span>LIVES <b id="lives">♥ ♥ ♥</b></span>
    </div>
    <div class="neon-wrap">
      <canvas id="c" class="game-canvas" width="720" height="480"></canvas>
      <div class="center-message" id="message">
        <div class="pixel-title">NEON<br>INVADERS</div>
        <div class="message-sub">100 LEVEL CAMPAIGN</div>
        <button class="action-btn" id="start">INSERT COIN / START</button>
      </div>
    </div>
    <div class="game-touch neon-touch">
      <button data-neon="left">←</button><button data-neon="fire">FIRE</button><button data-neon="right">→</button>
    </div>
    <div class="game-actions">
      <button class="action-btn small" id="pause">PAUSE</button>
      <button class="action-btn small ghost" id="restart">RESTART</button>
    </div>
  `,`Controls: ← → or A/D to move · SPACE to shoot · P to pause · ENTER to start/restart.`);

  const canvas=document.getElementById("c");
  const ctx=canvas.getContext("2d");
  const scoreEl=document.getElementById("s");
  const levelEl=document.getElementById("wave");
  const livesEl=document.getElementById("lives");
  const message=document.getElementById("message");
  const startBtn=document.getElementById("start");
  const pauseBtn=document.getElementById("pause");
  const restartBtn=document.getElementById("restart");

  const W=canvas.width,H=canvas.height;
  let ship,bullets,enemies,particles,stars,score,level,lives,state="menu";
  let keys={},last=0,enemyDir=1,enemyTimer=0,enemyFire=0,shotCooldown=0;
  let shake=0,flash=0,levelBanner=0,boss=null,chapter=1;
  let raf,countdownId=0,levelClearTimer=0,endingTimer=0;

  const CHAPTERS=[
    "AWAKENING","INVASION","OVERDRIVE","CHAOS","COLLAPSE",
    "ASCENSION","NIGHTMARE","OVERLOAD","EXTINCTION","FINAL ASSAULT"
  ];

  const ENEMY_TYPES={
    basic:{hp:1,speed:1,fire:1,score:20,color:"#ff218c",size:1},
    fast:{hp:1,speed:1.9,fire:1.25,score:30,color:"#08d9ff",size:.85},
    shooter:{hp:2,speed:.8,fire:.7,score:45,color:"#ffd11a",size:1},
    tank:{hp:4,speed:.55,fire:.8,score:70,color:"#8d35ff",size:1.25},
    kamikaze:{hp:1,speed:1.7,fire:0,score:55,color:"#ff6b35",size:.9},
    elite:{hp:5,speed:1.15,fire:.65,score:100,color:"#ffffff",size:1.15}
  };

  // Hidden developer debug mode.
  // Normal players never see this. Use:
  // ?game=neon&debug=boss10
  // ?game=neon&debug=boss20
  // ...
  // ?game=neon&debug=boss100
  const debugParam = new URLSearchParams(window.location.search).get("debug");
  const debugBossMatch = debugParam && /^boss(10|20|30|40|50|60|70|80|90|100)$/.exec(debugParam);
  const debugBossLevel = debugBossMatch ? Number(debugBossMatch[1]) : 0;

  function applyDebugBoss(){
    if (!debugBossLevel) return;
    level = debugBossLevel;
    score = 0;
    lives = 3;
    boss = null;
    buildLevel();
    state = "playing";
    message.classList.add("hidden");
    updateHud();
  }

  function reset(){
    cancelAnimationFrame(raf);
    score=0;level=1;lives=3;boss=null;chapter=1;
    stars=Array.from({length:80},()=>({x:Math.random()*W,y:Math.random()*H,s:.4+Math.random()*1.8,v:10+Math.random()*28}));
    particles=[];bullets=[];
    ship={x:W/2-22,y:H-62,w:44,h:22,speed:390,invuln:0};
    state="countdown";message.classList.add("hidden");
    buildLevel();
    updateHud();
    const token=++countdownId;
    countdown(3,token);
    last=performance.now();
    raf=requestAnimationFrame(loop);
    applyDebugBoss();
  }

  function levelConfig(lvl){
    const bossLevel=lvl%10===0;
    if(bossLevel) return {boss:true, chapter:Math.ceil(lvl/10), type:null};
    const pool=
      lvl<=5 ? ["basic"] :
      lvl<=9 ? ["basic","fast"] :
      lvl<=15 ? ["basic","fast","shooter"] :
      lvl<=20 ? ["basic","fast","shooter"] :
      lvl<=29 ? ["basic","fast","shooter","tank"] :
      lvl<=39 ? ["fast","shooter","tank","kamikaze"] :
      lvl<=49 ? ["basic","shooter","tank","kamikaze","elite"] :
      lvl<=59 ? ["fast","shooter","tank","kamikaze","elite"] :
      lvl<=69 ? ["shooter","tank","kamikaze","elite"] :
      lvl<=79 ? ["fast","tank","kamikaze","elite"] :
      lvl<=89 ? ["shooter","tank","kamikaze","elite"] :
      ["fast","shooter","tank","kamikaze","elite"];
    return {boss:false,chapter:Math.ceil(lvl/10),pool};
  }

  function buildLevel(){
    enemies=[];
    boss=null;
    chapter=Math.ceil(level/10);
    const cfg=levelConfig(level);
    if(cfg.boss){
      spawnBoss(level);
      enemyDir=1;enemyTimer=0;enemyFire=0;
      levelBanner=2;
      return;
    }

    const rows=Math.min(3+Math.floor(level/7),6);
    const cols=8;
    const gapX=72,gapY=43;
    const startX=(W-(cols-1)*gapX-34)/2;
    const startY=65;

    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const type=cfg.pool[(r+c+level)%cfg.pool.length];
        const base=ENEMY_TYPES[type];
        const hp=base.hp + Math.floor(Math.max(0,level-30)/20);
        enemies.push({
          x:startX+c*gapX,y:startY+r*gapY,w:34*base.size,h:22*base.size,
          row:r,alive:true,type,hp,maxHp:hp,
          pulse:Math.random()*Math.PI*2,
          targetX:0
        });
      }
    }
    enemyDir=1;enemyTimer=0;enemyFire=0;levelBanner=2;
  }

  function spawnBoss(lvl){
    const n=lvl/10;
    const hp=180+n*55;
    const bossTypes=["MOTHER SHIP","HUNTER","CORE","OVERLORD","VOID QUEEN","NEON TITAN","NIGHTMARE","OVERLOAD","EXTINCTION","THE NEON"];
    boss={
      type:n,
      name:bossTypes[n-1],
      x:W/2-75,y:52,w:150,h:70,
      hp,maxHp:hp,dir:1,fire:0,timer:0,phase:1,
      pulse:0,hitFlash:0
    };
    enemies=[];
  }

  function countdown(n,token){
    if(token!==countdownId || state!=="countdown")return;
    if(n<=0){
      message.innerHTML=`<div class="go-text">LEVEL ${level}</div>`;
      setTimeout(()=>{
        if(token===countdownId&&state==="countdown"){
          message.classList.add("hidden");state="playing";
        }
      },550);
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
    const set=down=>{
      if(b.dataset.neon==="left")keys.arrowleft=down;
      else if(b.dataset.neon==="right")keys.arrowright=down;
      else keys[" "]=down;
    };
    b.onpointerdown=()=>set(true);
    b.onpointerup=()=>set(false);
    b.onpointercancel=()=>set(false);
    b.onpointerleave=()=>set(false);
  });

  document.onkeydown=e=>{
    const k=e.key.toLowerCase();
    keys[k]=true;
    if(["arrowleft","arrowright"," ","w","a","d","p","enter"].includes(k))e.preventDefault();
    if(k==="p")togglePause();
    if(k==="enter"&&(state==="menu"||state==="gameover"||state==="victory"))reset();
  };
  document.onkeyup=e=>{keys[e.key.toLowerCase()]=false};

  function togglePause(){
    if(state==="playing"){
      state="paused";pauseBtn.textContent="RESUME";
      message.classList.remove("hidden");
      message.innerHTML='<div class="pixel-title small-title">PAUSED</div><div class="message-sub">PRESS P TO CONTINUE</div>';
    }else if(state==="paused"){
      state="playing";pauseBtn.textContent="PAUSE";message.classList.add("hidden");last=performance.now();
    }
  }

  function shoot(){
    if(shotCooldown>0||state!=="playing")return;
    bullets.push({x:ship.x+ship.w/2-2,y:ship.y-12,w:4,h:16,vy:-610,enemy:false});
    shotCooldown=.16;
    burst(ship.x+ship.w/2,ship.y,3,"#08d9ff",.6);
  }

  function enemyShoot(){
    if(state!=="playing")return;
    const alive=enemies.filter(e=>e.alive);
    if(alive.length){
      const e=alive[Math.floor(Math.random()*alive.length)];
      const base=ENEMY_TYPES[e.type];
      if(base.fire>0)bullets.push({
        x:e.x+e.w/2-2,y:e.y+e.h,w:4,h:13,
        vy:240+level*5,enemy:true,color:base.color
      });
    }
  }

  function bossShoot(){
    if(!boss||state!=="playing")return;
    const b=boss;
    const patterns=[
      ()=>bullets.push({x:b.x+b.w/2-3,y:b.y+b.h,w:6,h:18,vy:300,enemy:true,color:"#ff218c"}),
      ()=>[-1,0,1].forEach(dx=>bullets.push({x:b.x+b.w/2-3,y:b.y+b.h,w:6,h:18,vy:260,dx:dx*90,enemy:true,color:"#ffd11a"})),
      ()=>{for(let i=0;i<6;i++){const dx=(i-2.5)*55;bullets.push({x:b.x+b.w/2-3,y:b.y+b.h,w:6,h:18,vy:270,dx,enemy:true,color:"#8d35ff"})}},
    ];
    patterns[(b.type-1)%patterns.length]();
  }

  function burst(x,y,count,color,power=1){
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2,sp=(40+Math.random()*160)*power;
      particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.35+Math.random()*.45,max:.8,color,size:2+Math.random()*3});
    }
  }

  function hitPlayer(){
    if(ship.invuln>0||state!=="playing")return;
    lives--;ship.invuln=2;shake=10;flash=.18;
    burst(ship.x+22,ship.y+10,30,"#ff218c",1.3);
    updateHud();
    if(lives<=0)gameOver();
  }

  function gameOver(){
    state="gameover";
    const record=save(score);
    message.classList.remove("hidden");
    message.innerHTML=`
      <div class="pixel-title">${record?"NEW RECORD!":"GAME OVER"}</div>
      <div class="final-score">${String(score).padStart(6,"0")}</div>
      <div class="message-sub">LEVEL ${level} · ${record?"HIGH SCORE SAVED":"TRY AGAIN"}</div>
      <button class="action-btn" id="again">PLAY AGAIN</button>`;
    document.getElementById("again").onclick=reset;
    pauseBtn.textContent="PAUSE";
  }

  function victory(){
    state="victory";
    save(score);
    endingTimer=0;
    message.classList.remove("hidden");
    message.innerHTML=`
      <div class="pixel-title">VICTORY!</div>
      <div class="message-sub">THE NEON IS DEFEATED</div>
      <div class="final-score">${String(score).padStart(6,"0")}</div>
      <div class="message-sub">CAMPAIGN COMPLETE · LEVEL 100</div>
      <div class="mascot-row"><span>BIT</span><span>GLOW</span><span>SPARK</span><span>REX</span></div>
      <button class="action-btn" id="again">PLAY AGAIN</button>`;
    document.getElementById("again").onclick=reset;
  }

  function nextLevel(){
    if(level>=100){victory();return;}
    level++;
    score+=100+level*10;
    buildLevel();
    state="countdown";
    message.classList.remove("hidden");
    const token=++countdownId;
    countdown(3,token);
    updateHud();
    flash=.12;
    burst(W/2,120,35,"#8d35ff",1.2);
  }

  function updateHud(){
    scoreEl.textContent=score;
    levelEl.textContent=level;
    livesEl.textContent="♥ ".repeat(Math.max(0,lives)).trim()||"—";
  }

  function updateBoss(dt){
    if(!boss)return;
    boss.timer+=dt;boss.fire+=dt;boss.pulse+=dt;
    const speed=35+boss.type*4;
    boss.x+=boss.dir*speed*dt;
    if(boss.x<20){boss.x=20;boss.dir=1}
    if(boss.x>W-boss.w-20){boss.x=W-boss.w-20;boss.dir=-1}

    const hpRatio=boss.hp/boss.maxHp;
    boss.phase=hpRatio>.66?1:hpRatio>.33?2:3;

    const interval=Math.max(.28,1.0-boss.type*.035-boss.phase*.08);
    if(boss.fire>interval){boss.fire=0;bossShoot()}
  }

  function update(dt){
    if(state!=="playing")return;
    if(ship.invuln>0)ship.invuln-=dt;
    shotCooldown=Math.max(0,shotCooldown-dt);
    enemyTimer+=dt;enemyFire+=dt;levelBanner=Math.max(0,levelBanner-dt);
    shake=Math.max(0,shake-dt*30);flash=Math.max(0,flash-dt);

    if(keys.arrowleft||keys.a)ship.x-=ship.speed*dt;
    if(keys.arrowright||keys.d)ship.x+=ship.speed*dt;
    ship.x=Math.max(10,Math.min(W-ship.w-10,ship.x));
    if(keys[" "]||keys.w){shoot();keys[" "]=false;keys.w=false}

    stars.forEach(s=>{s.y+=s.v*dt;if(s.y>H)s.y=-2});

    if(boss){
      updateBoss(dt);
    }else{
      const alive=enemies.filter(e=>e.alive);
      const moveSpeed=22+level*2+Math.max(0,(1-alive.length/40))*30;
      if(enemyTimer>.48){
        enemyTimer=0;
        let minX=Infinity,maxX=-Infinity;
        alive.forEach(e=>{minX=Math.min(minX,e.x);maxX=Math.max(maxX,e.x+e.w)});
        if((minX<22&&enemyDir<0)||(maxX>W-22&&enemyDir>0)){
          enemyDir*=-1;alive.forEach(e=>e.y+=18);
        }
        alive.forEach(e=>{
          const t=ENEMY_TYPES[e.type];
          e.x+=enemyDir*moveSpeed*.48*t.speed;
          if(e.type==="kamikaze")e.x+=(ship.x-e.x)*.035;
        });
      }
      if(enemyFire>Math.max(.28,1.15-level*.018)){enemyFire=0;enemyShoot()}
    }

    bullets.forEach(b=>{
      b.y+=b.vy*dt;
      if(b.dx)b.x+=b.dx*dt;
    });
    bullets=bullets.filter(b=>b.y>-40&&b.y<H+40&&b.x>-40&&b.x<W+40);

    for(const b of bullets){
      if(b.enemy){
        if(b.x<ship.x+ship.w&&b.x+b.w>ship.x&&b.y<ship.y+ship.h&&b.y+b.h>ship.y){
          b.y=H+50;hitPlayer();
        }
      }else if(boss){
        if(b.x<boss.x+boss.w&&b.x+b.w>boss.x&&b.y<boss.y+boss.h&&b.y+b.h>boss.y){
          b.y=-50;
          boss.hp-=1;
          boss.hitFlash=.12;
          shake=3;
          burst(b.x,b.y,7,boss.phase===3?"#ff218c":"#08d9ff",1);
          if(boss.hp<=0){
            score+=1000+level*30;
            burst(boss.x+boss.w/2,boss.y+boss.h/2,100,"#ffd11a",2.2);
            if(level>=100)victory();
            else nextLevel();
          }
        }
      }else{
        const alive=enemies.filter(e=>e.alive);
        for(const e of alive){
          if(b.x<e.x+e.w&&b.x+b.w>e.x&&b.y<e.y+e.h&&b.y+b.h>e.y){
            b.y=-50;e.hp--;shake=3;
            const t=ENEMY_TYPES[e.type];
            burst(e.x+e.w/2,e.y+e.h/2,e.hp<=0?18:7,e.hp<=0?t.color:"#ffd11a",1);
            if(e.hp<=0){e.alive=false;score+=t.score+level*3}
            break;
          }
        }
      }
    }

    if(!boss){
      const alive=enemies.filter(e=>e.alive);
      if(alive.some(e=>e.y+e.h>ship.y-5||(e.x<ship.x+ship.w&&e.x+e.w>ship.x&&e.y+e.h>ship.y))){
        lives=0;gameOver();
      }
      if(enemies.every(e=>!e.alive))nextLevel();
    }

    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=50*dt;p.life-=dt});
    particles=particles.filter(p=>p.life>0);
    updateHud();
  }

  function drawEnemy(e){
    const t=ENEMY_TYPES[e.type],glow=t.color;
    ctx.save();
    ctx.shadowBlur=14;ctx.shadowColor=glow;ctx.fillStyle=glow;
    const px=4*t.size,py=3*t.size;
    const rows=["01111110","11111111","11011011","11111111","10100101"];
    rows.forEach((row,ry)=>[...row].forEach((v,c)=>{
      if(v==="1")ctx.fillRect(e.x+c*px,e.y+ry*py,px-.5,py-.5);
    }));
    ctx.fillStyle="#f7f7fb";
    ctx.fillRect(e.x+8*t.size,e.y+7*t.size,3*t.size,3*t.size);
    ctx.fillRect(e.x+24*t.size,e.y+7*t.size,3*t.size,3*t.size);
    ctx.shadowBlur=0;
    ctx.restore();
  }

  function drawBoss(){
    if(!boss)return;
    const b=boss;
    const glow=b.phase===3?"#ff218c":b.phase===2?"#ffd11a":"#8d35ff";
    ctx.save();
    ctx.shadowBlur=28;ctx.shadowColor=glow;ctx.fillStyle=glow;
    ctx.fillRect(b.x+15,b.y+20,b.w-30,b.h-20);
    ctx.fillRect(b.x+35,b.y+5,b.w-70,20);
    ctx.fillStyle="#05081c";
    ctx.fillRect(b.x+30,b.y+35,22,16);ctx.fillRect(b.x+b.w-52,b.y+35,22,16);
    ctx.fillStyle="#ffffff";
    ctx.fillRect(b.x+36,b.y+39,10,8);ctx.fillRect(b.x+b.w-46,b.y+39,10,8);
    ctx.fillStyle="#ff218c";
    ctx.fillRect(b.x+b.w/2-18,b.y+b.h-12,36,7);
    ctx.shadowBlur=0;

    const barW=220,barX=W/2-barW/2,barY=18;
    ctx.fillStyle="#151a40";ctx.fillRect(barX,barY,barW,8);
    ctx.fillStyle=glow;ctx.fillRect(barX,barY,barW*Math.max(0,b.hp/b.maxHp),8);
    ctx.fillStyle="#f7f7fb";ctx.font='10px "Press Start 2P"';ctx.textAlign="center";
    ctx.fillText(`${b.name} · ${b.phase===3?"FINAL PHASE":"BOSS"}`,W/2,12);
    ctx.restore();
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

    ctx.strokeStyle="#151a40";ctx.lineWidth=1;
    for(let y=H-110;y<H;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    for(let x=0;x<W;x+=45){ctx.beginPath();ctx.moveTo(x,H-110);ctx.lineTo(W/2+(x-W/2)*.25,H-20);ctx.stroke()}

    enemies.filter(e=>e.alive).forEach(drawEnemy);
    drawBoss();

    bullets.forEach(b=>{
      ctx.shadowBlur=14;ctx.shadowColor=b.enemy?(b.color||"#ff218c"):"#08d9ff";
      ctx.fillStyle=b.enemy?(b.color||"#ff218c"):"#08d9ff";
      ctx.fillRect(b.x,b.y,b.w,b.h);ctx.shadowBlur=0;
    });

    if(ship&&lives>0&&state!=="gameover"&&state!=="victory"){
      if(ship.invuln<=0||Math.floor(ship.invuln*12)%2===0){
        ctx.shadowBlur=20;ctx.shadowColor="#08d9ff";ctx.fillStyle="#08d9ff";
        const ox=ship.x,oy=ship.y;
        const shipRows=["001100","011110","111111","110011","100001"];
        shipRows.forEach((row,ry)=>[...row].forEach((v,c)=>{
          if(v==="1")ctx.fillRect(ox+c*7,oy+ry*5,7,5);
        }));
        ctx.fillStyle="#ffffff";ctx.fillRect(ox+17,oy+8,8,5);
        ctx.fillStyle="#ff218c";ctx.fillRect(ox+14,oy+25,5,7);ctx.fillRect(ox+25,oy+25,5,7);
        ctx.shadowBlur=0;
      }
    }

    particles.forEach(p=>{
      ctx.globalAlpha=Math.max(0,p.life/p.max);
      ctx.fillStyle=p.color;ctx.shadowBlur=8;ctx.shadowColor=p.color;
      ctx.fillRect(p.x,p.y,p.size,p.size);
    });
    ctx.globalAlpha=1;ctx.shadowBlur=0;

    if(levelBanner>0&&state==="playing"){
      ctx.globalAlpha=Math.min(1,levelBanner);
      ctx.textAlign="center";ctx.font='14px "Press Start 2P"';ctx.fillStyle="#ffd11a";
      ctx.fillText(boss?`BOSS ${level}`:`LEVEL ${level} · ${CHAPTERS[chapter-1]}`,W/2,42);
      ctx.globalAlpha=1;
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
