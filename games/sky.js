
const key = "sky";

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
  id: "sky",
  title: "SKYBOUND",
  name: "Skybound",
  description: "Jump across platforms and stay alive.",
  category: "arcade",
  art: "SKY",
  thumbnail: "",
  version: "1.1.0"
};

export function init() {
  sky();
}

export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}


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
