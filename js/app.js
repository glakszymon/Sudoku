/* app.js — Navigation, Timer, Modal */

const App = (() => {
  const timers = {};

  function createTimer() {
    return {
      seconds:0, interval:null, el:null,
      start(el){ this.el=el; this.seconds=0; this.render(); clearInterval(this.interval); this.interval=setInterval(()=>{this.seconds++;this.render();},1000); },
      stop(){ clearInterval(this.interval); this.interval=null; },
      reset(){ this.stop(); this.seconds=0; this.render(); },
      render(){ if(!this.el)return; const m=String(Math.floor(this.seconds/60)).padStart(2,'0'),s=String(this.seconds%60).padStart(2,'0'); this.el.textContent=`${m}:${s}`; },
      getFormatted(){ const m=String(Math.floor(this.seconds/60)).padStart(2,'0'),s=String(this.seconds%60).padStart(2,'0'); return `${m}:${s}`; }
    };
  }
  function getTimer(id){ if(!timers[id])timers[id]=createTimer(); return timers[id]; }

  /* --- Dynamic cell size --- */
  function calcCellSize(n, hasSidebar) {
    const navH = 52;
    const controlsH = 115; // header + diff + actions approx
    const pad = 20;
    const sideW = hasSidebar ? 200 : 0;
    const availH = window.innerHeight - navH - controlsH - pad;
    const availW = window.innerWidth - sideW - pad * 2;
    const sz = Math.floor(Math.min(availH, availW) / n);
    return Math.max(28, Math.min(72, sz));
  }

  const modes = ['classic','giant','jigsaw','skyscraper','killer','inequality','pdf'];
  let currentMode = 'classic';
  let initialized = {};

  function switchMode(mode) {
    if(!modes.includes(mode))return;
    if(timers[currentMode])timers[currentMode].stop();
    document.querySelectorAll('.game-section').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById(`sec-${mode}`)?.classList.add('active');
    document.querySelector(`.nav-btn[data-mode="${mode}"]`)?.classList.add('active');
    currentMode = mode;
    if(!initialized[mode]||mode==='pdf'){ initMode(mode); initialized[mode]=true; }
  }

  function initMode(mode){
    switch(mode){
      case 'classic':    ClassicGame?.init(); break;
      case 'giant':      GiantGame?.init(); break;
      case 'jigsaw':     JigsawGame?.init(); break;
      case 'skyscraper': SkyGame?.init(); break;
      case 'killer':     KillerGame?.init(); break;
      case 'inequality': InequalityGame?.init(); break;
      case 'pdf':        PdfSection?.init(); break;
    }
  }

  function showWin(timeStr, mode){
    const modal=document.getElementById('win-modal');if(!modal)return;
    document.getElementById('win-time').textContent=`Czas: ${timeStr}`;
    modal.classList.remove('hidden'); modal.classList.add('visible');
    document.getElementById('win-new').onclick=()=>{ hideWin(); initMode(mode||currentMode); };
  }
  function hideWin(){
    const modal=document.getElementById('win-modal');if(!modal)return;
    modal.classList.remove('visible'); modal.classList.add('hidden');
  }

  function showLoading(){ document.getElementById('loading-overlay')?.classList.remove('hidden'); }
  function hideLoading(){ document.getElementById('loading-overlay')?.classList.add('hidden'); }

  function setupInfoPanels(){
    document.querySelectorAll('.info-toggle').forEach(btn=>{
      const panel=document.getElementById(btn.dataset.panel); if(!panel)return;
      btn.addEventListener('click',()=>{
        const open=panel.classList.toggle('open');
        btn.classList.toggle('active',open);
        btn.querySelector('.toggle-arrow').textContent=open?'↑':'↓';
      });
    });
  }

  function init(){
    document.querySelectorAll('.nav-btn[data-mode]').forEach(btn=>btn.addEventListener('click',()=>switchMode(btn.dataset.mode)));
    document.getElementById('win-modal')?.addEventListener('click',e=>{ if(e.target.id==='win-modal')hideWin(); });
    setupInfoPanels();
    setTimeout(()=>switchMode('classic'),50);
  }

  return { getTimer, calcCellSize, switchMode, showWin, hideWin, showLoading, hideLoading, init };
})();

document.addEventListener('DOMContentLoaded',()=>App.init());
