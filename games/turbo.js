
const key = "turbo";

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
  id: "turbo",
  title: "TURBO DASH",
  name: "Turbo Dash",
  description: "Dodge traffic and beat your best distance.",
  category: "racing",
  art: "TURBO",
  thumbnail: "",
  version: "1.1.0"
};

export function init() {
  turbo();
}

export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}


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
