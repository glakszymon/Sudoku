/* jigsaw.js — Jigsaw Sudoku */
const JigsawGame = (() => {
  const SIZE=9;
  const RCOLS=['#FFE4E1','#E1F0FF','#E1FFE8','#FFF0E1','#F0E1FF','#FFFFE1','#E1FFFF','#FFE1F4','#F4FFE1'];
  const BCOLS=['#E8604A','#4A80E8','#4AE860','#E8A04A','#8A4AE8','#E8D44A','#4AE8C8','#E84AA0','#98E84A'];
  let state={}, listenersAttached=false;

  function newState(d){ return{puzzle:[],solution:[],board:[],notes:[],regions:[],selected:null,notesMode:false,isComplete:false,difficulty:d||'medium'}; }

  function setGridSize(){ document.getElementById('jigsaw-grid')?.style.setProperty('--cell-size',App.calcCellSize(9,true)+'px'); }

  function borders(regions,r,c){
    const reg=regions[r][c];
    return{top:r===0||regions[r-1][c]!==reg,bottom:r===SIZE-1||regions[r+1][c]!==reg,left:c===0||regions[r][c-1]!==reg,right:c===SIZE-1||regions[r][c+1]!==reg};
  }

  function renderGrid(){
    const g=document.getElementById('jigsaw-grid');if(!g)return;
    g.innerHTML='';g.className='sudoku-grid size-9 jigsaw-grid';
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const el=document.createElement('div');el.className='cell jigsaw-cell';el.dataset.r=r;el.dataset.c=c;
      const reg=state.regions[r][c];
      el.style.backgroundColor=RCOLS[reg];
      const b=borders(state.regions,r,c),bc=BCOLS[reg];
      const thin='0.5px solid rgba(0,0,0,0.1)',thick=`2.5px solid ${bc}`;
      el.style.borderTop=b.top?thick:thin;el.style.borderBottom=b.bottom?thick:thin;
      el.style.borderLeft=b.left?thick:thin;el.style.borderRight=b.right?thick:thin;
      el.addEventListener('click',()=>selectCell(r,c));g.appendChild(el);
    }
    updateAll();
  }

  function cel(r,c){ return document.querySelector(`#jigsaw-grid .cell[data-r="${r}"][data-c="${c}"]`); }
  function updateAll(){ for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)updateCell(r,c);highlight(); }

  function updateCell(r,c){
    const el=cel(r,c);if(!el)return;
    const given=state.puzzle[r][c]!==0,val=state.board[r][c],ns=state.notes[r][c];
    el.classList.remove('given','user','has-notes');
    el.querySelectorAll('.note-grid').forEach(x=>x.remove());
    el.childNodes.forEach(n=>{if(n.nodeType===3)n.remove();});
    if(given){el.classList.add('given');el.appendChild(document.createTextNode(val));}
    else if(val){el.classList.add('user');el.appendChild(document.createTextNode(val));}
    else if(ns?.size){
      el.classList.add('has-notes');
      const ng=document.createElement('div');ng.className='note-grid';
      for(let n=1;n<=9;n++){const s=document.createElement('span');s.className='note-num';s.textContent=ns.has(n)?n:'';ng.appendChild(s);}
      el.appendChild(ng);
    }
  }

  function highlight(){
    document.querySelectorAll('#jigsaw-grid .cell').forEach(el=>el.classList.remove('selected','highlight','same-digit','error-cell','ok-cell'));
    if(!state.selected)return;
    const{r,c}=state.selected,val=state.board[r][c],reg=state.regions[r][c];
    document.querySelectorAll('#jigsaw-grid .cell').forEach(el=>{
      const cr=+el.dataset.r,cc=+el.dataset.c,cv=state.board[cr][cc];
      if(cr===r&&cc===c)el.classList.add('selected');
      else if(cr===r||cc===c||state.regions[cr][cc]===reg){el.classList.add('highlight');if(val&&cv===val)el.classList.add('same-digit');}
      else if(val&&cv===val)el.classList.add('same-digit');
    });
  }

  function selectCell(r,c){state.selected={r,c};highlight();}
  function inputValue(val){
    if(!state.selected)return;const{r,c}=state.selected;if(state.puzzle[r][c])return;
    if(state.notesMode&&val){const ns=state.notes[r][c];if(ns.has(val))ns.delete(val);else ns.add(val);state.board[r][c]=0;}
    else{state.board[r][c]=val;state.notes[r][c]=new Set();}
    updateCell(r,c);highlight();checkComplete();
  }
  function checkBoard(){
    document.querySelectorAll('#jigsaw-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){const v=state.board[r][c];if(!v)continue;cel(r,c)?.classList.add(v===state.solution[r][c]?'ok-cell':'error-cell');}
  }
  function checkComplete(){
    if(state.isComplete)return;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(state.board[r][c]!==state.solution[r][c])return;
    state.isComplete=true;const t=App.getTimer('jigsaw');t.stop();setTimeout(()=>App.showWin(t.getFormatted(),'jigsaw'),400);
  }
  function resetBoard(){
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(!state.puzzle[r][c]){state.board[r][c]=0;state.notes[r][c]=new Set();}
    state.selected=null;state.isComplete=false;
    document.querySelectorAll('#jigsaw-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));updateAll();
  }
  function toggleNotes(){
    state.notesMode=!state.notesMode;const btn=document.getElementById('jigsaw-notes');if(!btn)return;
    btn.classList.toggle('active',state.notesMode);btn.querySelector('.notes-badge').textContent=state.notesMode?'ON':'OFF';
    btn.querySelector('.notes-badge').className=`notes-badge ${state.notesMode?'on':'off'}`;
  }
  function buildNumpad(){
    const c=document.getElementById('jigsaw-numpad');if(!c)return;c.innerHTML='';
    for(let n=1;n<=9;n++){const b=document.createElement('button');b.className='numpad-btn';b.textContent=n;b.dataset.value=n;c.appendChild(b);}
    const d=document.createElement('button');d.className='numpad-btn numpad-del';d.textContent='⌫';d.dataset.value=0;c.appendChild(d);
  }
  function handleKey(e){
    if(!document.getElementById('sec-jigsaw')?.classList.contains('active'))return;
    if(!state.selected)return;const{r,c}=state.selected;
    if(e.key>='1'&&e.key<='9')inputValue(+e.key);
    else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')inputValue(0);
    else if(e.key==='ArrowUp'){selectCell(Math.max(0,r-1),c);e.preventDefault();}
    else if(e.key==='ArrowDown'){selectCell(Math.min(8,r+1),c);e.preventDefault();}
    else if(e.key==='ArrowLeft'){selectCell(r,Math.max(0,c-1));e.preventDefault();}
    else if(e.key==='ArrowRight'){selectCell(r,Math.min(8,c+1));e.preventDefault();}
    else if(e.key==='n'||e.key==='N')toggleNotes();
  }
  function getDiff(){ return document.querySelector('#sec-jigsaw .diff-btn.active')?.dataset.diff||'medium'; }
  function init(difficulty){
    App.showLoading();state=newState(difficulty||getDiff());
    setTimeout(()=>{
      const data=Engine.generateJigsaw(state.difficulty);
      state.puzzle=data.puzzle;state.solution=data.solution;state.regions=data.regions;
      state.board=data.puzzle.map(r=>[...r]);
      state.notes=Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>new Set()));
      setGridSize();buildNumpad();renderGrid();
      App.hideLoading();
      App.getTimer('jigsaw').start(document.getElementById('timer-jigsaw'));
      document.getElementById('jigsaw-numpad')?.querySelectorAll('.numpad-btn').forEach(b=>{b.onclick=()=>inputValue(+b.dataset.value);});
    },30);
  }
  function setup(){
    if(listenersAttached)return;listenersAttached=true;
    document.getElementById('jigsaw-new')?.addEventListener('click',()=>init());
    document.getElementById('jigsaw-check')?.addEventListener('click',checkBoard);
    document.getElementById('jigsaw-reset')?.addEventListener('click',resetBoard);
    document.getElementById('jigsaw-notes')?.addEventListener('click',toggleNotes);
    document.querySelectorAll('#sec-jigsaw .diff-btn').forEach(b=>b.addEventListener('click',()=>{
      document.querySelectorAll('#sec-jigsaw .diff-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');init(b.dataset.diff);
    }));
    document.addEventListener('keydown',handleKey);
    window.addEventListener('resize',()=>{ if(document.getElementById('sec-jigsaw')?.classList.contains('active'))setGridSize(); });
  }
  document.addEventListener('DOMContentLoaded',setup);
  return{init};
})();
