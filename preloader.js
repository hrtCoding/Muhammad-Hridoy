document.addEventListener('DOMContentLoaded', () => {

  /* ---------- matrix rain ---------- */
  const canvas = document.getElementById('hc-matrix');
  const ctx = canvas.getContext('2d');
  function resize(){ canvas.width = innerWidth; canvas.height = innerHeight; }
  resize(); addEventListener('resize', resize);

  const chars = "01アイウエオカキクケコサシスセソ$#&%@+-<>/\\".split("");
  const fontSize = 15;
  let drops = Array(Math.floor(canvas.width / fontSize)).fill(1);

  function drawMatrix(){
    ctx.fillStyle = "rgba(3,7,18,0.08)";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#4ade80";
    ctx.font = fontSize + "px 'Fira Code', monospace";
    drops.forEach((y,i)=>{
      ctx.fillText(chars[Math.floor(Math.random()*chars.length)], i*fontSize, y*fontSize);
      if(y*fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    });
  }
  let matrixInterval = setInterval(drawMatrix, 45);

  /* ---------- boot typing sequence ---------- */
  const bootEl = document.getElementById('hc-bootlines');
  const lines = [
    { t: "> initializing environment ...", cls: "" },
    { t: "> bypassing firewall ............. [ OK ]", cls: "ok" },
    { t: "> loading kernel modules ......... [ OK ]", cls: "ok" },
    { t: "> decrypting credentials ......... [ OK ]", cls: "ok" },
    { t: "> scanning biometric signature ...", cls: "" },
    { t: "> identity confirmed: HRIDOY", cls: "ok" },
    { t: "> access level: ROOT", cls: "warn" },
    { t: "> ready.", cls: "ok" },
  ];

  function typeLine(text, cls, speed){
    return new Promise(resolve=>{
      const div = document.createElement('div');
      if(cls) div.className = cls;
      bootEl.appendChild(div);
      let i = 0;
      const id = setInterval(()=>{
        div.textContent = text.slice(0, i+1);
        i++;
        if(i >= text.length){ clearInterval(id); resolve(); }
      }, speed);
    });
  }

  async function runBoot(){
    for(const line of lines){
      await typeLine(line.t, line.cls, 16 + Math.random()*10);
      await new Promise(r=>setTimeout(r, 160));
    }
    const cur = document.createElement('span');
    cur.className = 'hc-cursor';
    bootEl.appendChild(cur);
    document.getElementById('hc-enter').classList.add('hc-show');
  }
  runBoot();

  /* ---------- your own audio file ---------- */
  function playWelcomeAudio(){
    const audio = document.getElementById('hc-voice');
    if(!audio) return;
    audio.currentTime = 0;
    audio.play().catch(()=>console.log("Audio blocked or file path wrong — check hc-voice src."));
  }

  /* ---------- enter system ---------- */
  document.getElementById('hc-enter').addEventListener('click', ()=>{
    const flash = document.getElementById('hc-flash');
    flash.classList.add('hc-fire');
    playWelcomeAudio();

    setTimeout(()=>{
      document.getElementById('hc-intro').classList.add('hc-hidden');
      document.body.style.overflow = 'auto';
      clearInterval(matrixInterval);
      matrixInterval = setInterval(drawMatrix, 100); // slow down once in background
    }, 250);
  });

  // lock scroll while intro shows
  document.body.style.overflow = 'hidden';
});
