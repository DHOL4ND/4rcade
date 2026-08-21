
const key = "snake";

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
  id: "snake",
  title: "PIXEL SNAKE",
  name: "Pixel Snake",
  description: "Grow longer. Chase the high score.",
  category: "arcade",
  art: "SNAKE",
  thumbnail: "",
  version: "1.1.0"
};

export function init() {
  snake();
}

export function update() {}
export function draw() {}
export function input() {}
export function destroy() {}


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
