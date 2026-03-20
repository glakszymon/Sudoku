/* classic.js — Classic 9×9 */
const ClassicGame = (() => {
  let state={}, listenersAttached=false;

  function newState(d){ return{puzzle:[],solution:[],board:[],notes:[],selected:null,notesMode:false,isComplete:false,difficulty:d||'medium'}; }

  function setGridSize(){
    const cs=App.calcCellSize(9,true);
    document.getElementById('classic-grid')?.style.setProperty('--cell-size',cs+'px');
  }

  function buildNumpad(){
    const c=document.getElementById('classic-numpad'); if(!c)return; c.innerHTML='';
    for(let n=1;n<=9;n++){const b=document.createElement('button');b.className='numpad-btn';b.textContent=n;b.dataset.value=n;c.appendChild(b);}
    const d=document.createElement('button');d.className='numpad-btn numpad-del';d.textContent='⌫';d.dataset.value=0;c.appendChild(d);
  }

  function renderGrid(){
    const g=document.getElementById('classic-grid'); if(!g)return;
    g.innerHTML=''; g.className='sudoku-grid size-9';
    for(let r=0;r<9;r++)for(let c=0;c<9;c++){
      const el=document.createElement('div');
      el.className='cell'; el.dataset.r=r; el.dataset.c=c;
      if(r%3===0)el.classList.add('box-top'); if(r%3===2)el.classList.add('box-bottom');
      if(c%3===0)el.classList.add('box-left'); if(c%3===2)el.classList.add('box-right');
      el.addEventListener('click',()=>selectCell(r,c)); g.appendChild(el);
    }
    updateAll();
  }

  function cel(r,c){ return document.querySelector(`#classic-grid .cell[data-r="${r}"][data-c="${c}"]`); }
  function updateAll(){ for(let r=0;r<9;r++)for(let c=0;c<9;c++)updateCell(r,c); highlight(); }

  function updateCell(r,c){
    const el=cel(r,c); if(!el)return;
    const given=state.puzzle[r][c]!==0, val=state.board[r][c], ns=state.notes[r][c];
    el.innerHTML=''; el.className='cell';
    if(r%3===0)el.classList.add('box-top'); if(r%3===2)el.classList.add('box-bottom');
    if(c%3===0)el.classList.add('box-left'); if(c%3===2)el.classList.add('box-right');
    if(given){el.classList.add('given');el.textContent=val;}
    else if(val){el.classList.add('user');el.textContent=val;}
    else if(ns?.size){
      el.classList.add('has-notes');
      const ng=document.createElement('div');ng.className='note-grid';
      for(let n=1;n<=9;n++){const s=document.createElement('span');s.className='note-num';s.textContent=ns.has(n)?n:'';ng.appendChild(s);}
      el.appendChild(ng);
    }
  }

  function highlight(){
    document.querySelectorAll('#classic-grid .cell').forEach(el=>el.classList.remove('selected','highlight','same-digit','error-cell','ok-cell'));
    if(!state.selected)return;
    const{r,c}=state.selected,val=state.board[r][c],br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
    document.querySelectorAll('#classic-grid .cell').forEach(el=>{
      const cr=+el.dataset.r,cc=+el.dataset.c,cv=state.board[cr][cc];
      if(cr===r&&cc===c)el.classList.add('selected');
      else if(cr===r||cc===c||(cr>=br&&cr<br+3&&cc>=bc&&cc<bc+3)){el.classList.add('highlight');if(val&&cv===val)el.classList.add('same-digit');}
      else if(val&&cv===val)el.classList.add('same-digit');
    });
  }

  function selectCell(r,c){state.selected={r,c};highlight();}

  function inputValue(val){
    if(!state.selected)return;
    const{r,c}=state.selected; if(state.puzzle[r][c])return;
    if(state.notesMode&&val){const ns=state.notes[r][c];if(ns.has(val))ns.delete(val);else ns.add(val);state.board[r][c]=0;}
    else{state.board[r][c]=val;state.notes[r][c]=new Set();}
    updateCell(r,c);highlight();checkComplete();
  }

  function checkBoard(){
    document.querySelectorAll('#classic-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));
    for(let r=0;r<9;r++)for(let c=0;c<9;c++){const v=state.board[r][c];if(!v)continue;cel(r,c)?.classList.add(v===state.solution[r][c]?'ok-cell':'error-cell');}
  }

  function checkComplete(){
    if(state.isComplete)return;
    for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(state.board[r][c]!==state.solution[r][c])return;
    state.isComplete=true;const t=App.getTimer('classic');t.stop();setTimeout(()=>App.showWin(t.getFormatted(),'classic'),400);
  }

  function resetBoard(){
    for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!state.puzzle[r][c]){state.board[r][c]=0;state.notes[r][c]=new Set();}
    state.selected=null;state.isComplete=false;
    document.querySelectorAll('#classic-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));
    updateAll();
  }

  function toggleNotes(){
    state.notesMode=!state.notesMode;
    const btn=document.getElementById('classic-notes');if(!btn)return;
    btn.classList.toggle('active',state.notesMode);
    btn.querySelector('.notes-badge').textContent=state.notesMode?'ON':'OFF';
    btn.querySelector('.notes-badge').className=`notes-badge ${state.notesMode?'on':'off'}`;
  }

  function handleKey(e){
    if(!document.getElementById('sec-classic')?.classList.contains('active'))return;
    if(!state.selected)return;
    const{r,c}=state.selected;
    if(e.key>='1'&&e.key<='9')inputValue(+e.key);
    else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')inputValue(0);
    else if(e.key==='ArrowUp'){selectCell(Math.max(0,r-1),c);e.preventDefault();}
    else if(e.key==='ArrowDown'){selectCell(Math.min(8,r+1),c);e.preventDefault();}
    else if(e.key==='ArrowLeft'){selectCell(r,Math.max(0,c-1));e.preventDefault();}
    else if(e.key==='ArrowRight'){selectCell(r,Math.min(8,c+1));e.preventDefault();}
    else if(e.key==='n'||e.key==='N')toggleNotes();
  }

  function getDiff(){ return document.querySelector('#sec-classic .diff-btn.active')?.dataset.diff||'medium'; }

  function init(difficulty){
    state=newState(difficulty||getDiff());
    const data=Engine.generateClassic(state.difficulty);
    state.puzzle=data.puzzle;state.solution=data.solution;
    state.board=data.puzzle.map(r=>[...r]);
    state.notes=Array.from({length:9},()=>Array.from({length:9},()=>new Set()));
    setGridSize(); buildNumpad(); renderGrid();
    App.getTimer('classic').start(document.getElementById('timer-classic'));
    document.getElementById('classic-numpad')?.querySelectorAll('.numpad-btn').forEach(b=>{b.onclick=()=>inputValue(+b.dataset.value);});
  }

  function setup(){
    if(listenersAttached)return; listenersAttached=true;
    document.getElementById('classic-new')?.addEventListener('click',()=>init());
    document.getElementById('classic-check')?.addEventListener('click',checkBoard);
    document.getElementById('classic-reset')?.addEventListener('click',resetBoard);
    document.getElementById('classic-notes')?.addEventListener('click',toggleNotes);
    document.querySelectorAll('#sec-classic .diff-btn').forEach(b=>b.addEventListener('click',()=>{
      document.querySelectorAll('#sec-classic .diff-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');init(b.dataset.diff);
    }));
    document.addEventListener('keydown',handleKey);
    window.addEventListener('resize',()=>{ if(document.getElementById('sec-classic')?.classList.contains('active'))setGridSize(); });
  }
  document.addEventListener('DOMContentLoaded',setup);
  return{init};
})();
