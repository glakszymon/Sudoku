/* giant.js — Giant 16×16 */
const GiantGame = (() => {
  const SIZE=16;
  let state={}, listenersAttached=false, cellSize=32;

  function lbl(n){ return n<=9?String(n):String.fromCharCode(55+n); }
  function newState(d){ return{puzzle:[],solution:[],board:[],notes:[],selected:null,notesMode:false,isComplete:false,difficulty:d||'easy'}; }

  function calcSize(){
    const cs=App.calcCellSize(16,true);
    cellSize=Math.max(22,Math.min(46,cs));
    document.getElementById('giant-grid')?.style.setProperty('--cell-size',cellSize+'px');
    updateZoom();
  }

  function buildNumpad(){
    const c=document.getElementById('giant-numpad');if(!c)return;c.innerHTML='';
    for(let n=1;n<=SIZE;n++){const b=document.createElement('button');b.className='numpad-btn giant-pad-btn';b.textContent=lbl(n);b.dataset.value=n;c.appendChild(b);}
    const d=document.createElement('button');d.className='numpad-btn numpad-del giant-pad-btn';d.textContent='⌫';d.dataset.value=0;c.appendChild(d);
  }

  function renderGrid(){
    const g=document.getElementById('giant-grid');if(!g)return;
    g.innerHTML='';g.className='sudoku-grid size-16';g.style.setProperty('--cell-size',cellSize+'px');
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const el=document.createElement('div');el.className='cell';el.dataset.r=r;el.dataset.c=c;
      if(r%4===0)el.classList.add('box-top');if(r%4===3)el.classList.add('box-bottom');
      if(c%4===0)el.classList.add('box-left');if(c%4===3)el.classList.add('box-right');
      el.addEventListener('click',()=>selectCell(r,c));g.appendChild(el);
    }
    updateAll();updateZoom();
  }

  function cel(r,c){ return document.querySelector(`#giant-grid .cell[data-r="${r}"][data-c="${c}"]`); }
  function updateAll(){ for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)updateCell(r,c);highlight(); }

  function updateCell(r,c){
    const el=cel(r,c);if(!el)return;
    const given=state.puzzle[r][c]!==0,val=state.board[r][c],ns=state.notes[r][c];
    el.innerHTML='';el.className='cell';
    if(r%4===0)el.classList.add('box-top');if(r%4===3)el.classList.add('box-bottom');
    if(c%4===0)el.classList.add('box-left');if(c%4===3)el.classList.add('box-right');
    if(given){el.classList.add('given');el.textContent=lbl(val);}
    else if(val){el.classList.add('user');el.textContent=lbl(val);}
    else if(ns?.size){
      el.classList.add('has-notes');
      const ng=document.createElement('div');ng.className='note-grid-16';
      for(let n=1;n<=SIZE;n++){const s=document.createElement('span');s.className='note-num-sm';s.textContent=ns.has(n)?lbl(n):'';ng.appendChild(s);}
      el.appendChild(ng);
    }
  }

  function highlight(){
    document.querySelectorAll('#giant-grid .cell').forEach(el=>el.classList.remove('selected','highlight','same-digit','error-cell','ok-cell'));
    if(!state.selected)return;
    const{r,c}=state.selected,val=state.board[r][c],br=Math.floor(r/4)*4,bc=Math.floor(c/4)*4;
    document.querySelectorAll('#giant-grid .cell').forEach(el=>{
      const cr=+el.dataset.r,cc=+el.dataset.c,cv=state.board[cr][cc];
      if(cr===r&&cc===c)el.classList.add('selected');
      else if(cr===r||cc===c||(cr>=br&&cr<br+4&&cc>=bc&&cc<bc+4)){el.classList.add('highlight');if(val&&cv===val)el.classList.add('same-digit');}
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
    document.querySelectorAll('#giant-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){const v=state.board[r][c];if(!v)continue;cel(r,c)?.classList.add(v===state.solution[r][c]?'ok-cell':'error-cell');}
  }
  function checkComplete(){
    if(state.isComplete)return;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(state.board[r][c]!==state.solution[r][c])return;
    state.isComplete=true;const t=App.getTimer('giant');t.stop();setTimeout(()=>App.showWin(t.getFormatted(),'giant'),400);
  }
  function resetBoard(){
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(!state.puzzle[r][c]){state.board[r][c]=0;state.notes[r][c]=new Set();}
    state.selected=null;state.isComplete=false;
    document.querySelectorAll('#giant-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));updateAll();
  }
  function toggleNotes(){
    state.notesMode=!state.notesMode;const btn=document.getElementById('giant-notes');if(!btn)return;
    btn.classList.toggle('active',state.notesMode);btn.querySelector('.notes-badge').textContent=state.notesMode?'ON':'OFF';
    btn.querySelector('.notes-badge').className=`notes-badge ${state.notesMode?'on':'off'}`;
  }
  function updateZoom(){
    const pct=Math.round((cellSize/32)*100);
    const el=document.getElementById('giant-zoom-pct');if(el)el.textContent=pct+'%';
  }
  function handleKey(e){
    if(!document.getElementById('sec-giant')?.classList.contains('active'))return;
    if(!state.selected)return;const{r,c}=state.selected;
    if(e.key>='1'&&e.key<='9')inputValue(+e.key);
    else if(e.key.toUpperCase()>='A'&&e.key.toUpperCase()<='G')inputValue(e.key.toUpperCase().charCodeAt(0)-55);
    else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')inputValue(0);
    else if(e.key==='ArrowUp'){selectCell(Math.max(0,r-1),c);e.preventDefault();}
    else if(e.key==='ArrowDown'){selectCell(Math.min(SIZE-1,r+1),c);e.preventDefault();}
    else if(e.key==='ArrowLeft'){selectCell(r,Math.max(0,c-1));e.preventDefault();}
    else if(e.key==='ArrowRight'){selectCell(r,Math.min(SIZE-1,c+1));e.preventDefault();}
    else if(e.key==='n'||e.key==='N')toggleNotes();
  }
  function getDiff(){ return document.querySelector('#sec-giant .diff-btn.active')?.dataset.diff||'easy'; }
  function init(difficulty){
    state=newState(difficulty||getDiff());
    const data=Engine.generateGiant(state.difficulty);
    state.puzzle=data.puzzle;state.solution=data.solution;
    state.board=data.puzzle.map(r=>[...r]);
    state.notes=Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>new Set()));
    calcSize();buildNumpad();renderGrid();
    App.getTimer('giant').start(document.getElementById('timer-giant'));
    document.getElementById('giant-numpad')?.querySelectorAll('.numpad-btn').forEach(b=>{b.onclick=()=>inputValue(+b.dataset.value);});
  }
  function setup(){
    if(listenersAttached)return;listenersAttached=true;
    document.getElementById('giant-new')?.addEventListener('click',()=>init());
    document.getElementById('giant-check')?.addEventListener('click',checkBoard);
    document.getElementById('giant-reset')?.addEventListener('click',resetBoard);
    document.getElementById('giant-notes')?.addEventListener('click',toggleNotes);
    document.getElementById('giant-zoom-in')?.addEventListener('click',()=>{cellSize=Math.min(46,cellSize+3);document.getElementById('giant-grid')?.style.setProperty('--cell-size',cellSize+'px');updateZoom();});
    document.getElementById('giant-zoom-out')?.addEventListener('click',()=>{cellSize=Math.max(18,cellSize-3);document.getElementById('giant-grid')?.style.setProperty('--cell-size',cellSize+'px');updateZoom();});
    document.querySelectorAll('#sec-giant .diff-btn').forEach(b=>b.addEventListener('click',()=>{
      document.querySelectorAll('#sec-giant .diff-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');init(b.dataset.diff);
    }));
    document.addEventListener('keydown',handleKey);
    window.addEventListener('resize',()=>{ if(document.getElementById('sec-giant')?.classList.contains('active'))calcSize(); });
  }
  document.addEventListener('DOMContentLoaded',setup);
  return{init};
})();
