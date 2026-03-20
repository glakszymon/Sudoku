/* inequality.js — Inequality Sudoku
   Signs are placed as absolute children of cells, sitting ON the border lines */
const InequalityGame = (() => {
  const SIZE=9;
  let state={}, listenersAttached=false;

  function newState(d){ return{puzzle:[],solution:[],board:[],notes:[],hc:[],vc:[],selected:null,notesMode:false,isComplete:false,difficulty:d||'medium'}; }

  function setGridSize(){ document.getElementById('ineq-grid')?.style.setProperty('--cell-size',App.calcCellSize(9,true)+'px'); }

  /* Build a standard 9×9 grid, then inject sign spans as absolute children */
  function renderGrid(){
    const g=document.getElementById('ineq-grid');if(!g)return;
    g.innerHTML='';g.className='sudoku-grid size-9';
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const el=document.createElement('div');el.className='cell';el.dataset.r=r;el.dataset.c=c;
      if(r%3===0)el.classList.add('box-top');if(r%3===2)el.classList.add('box-bottom');
      if(c%3===0)el.classList.add('box-left');if(c%3===2)el.classList.add('box-right');
      el.addEventListener('click',()=>selectCell(r,c));

      // Horizontal sign: right edge of cell (not last column)
      if(c<SIZE-1){
        const hs=document.createElement('span');
        hs.className='ineq-h-sign';
        hs.dataset.hr=r;hs.dataset.hc=c;
        hs.textContent=state.hc[r][c]==='<'?'‹':'›';
        el.appendChild(hs);
      }
      // Vertical sign: bottom edge of cell (not last row)
      if(r<SIZE-1){
        const vs=document.createElement('span');
        vs.className='ineq-v-sign';
        vs.dataset.vr=r;vs.dataset.vc=c;
        vs.textContent=state.vc[r][c]==='^'?'∧':'∨';
        el.appendChild(vs);
      }

      g.appendChild(el);
    }
    updateAll();
  }

  function cel(r,c){ return document.querySelector(`#ineq-grid .cell[data-r="${r}"][data-c="${c}"]`); }
  function hSign(r,c){ return document.querySelector(`#ineq-grid .ineq-h-sign[data-hr="${r}"][data-hc="${c}"]`); }
  function vSign(r,c){ return document.querySelector(`#ineq-grid .ineq-v-sign[data-vr="${r}"][data-vc="${c}"]`); }

  function updateAll(){ for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)updateCell(r,c);highlight();updateSigns(); }

  function updateCell(r,c){
    const el=cel(r,c);if(!el)return;
    const given=state.puzzle[r][c]!==0,val=state.board[r][c],ns=state.notes[r][c];
    // Remove text/note content but keep sign spans
    el.querySelectorAll('.note-grid').forEach(x=>x.remove());
    el.childNodes.forEach(n=>{if(n.nodeType===3)n.remove();});
    el.classList.remove('given','user','has-notes');
    if(given){el.classList.add('given');el.insertBefore(document.createTextNode(val),el.firstChild);}
    else if(val){el.classList.add('user');el.insertBefore(document.createTextNode(val),el.firstChild);}
    else if(ns?.size){
      el.classList.add('has-notes');
      const ng=document.createElement('div');ng.className='note-grid';
      for(let n=1;n<=9;n++){const s=document.createElement('span');s.className='note-num';s.textContent=ns.has(n)?n:'';ng.appendChild(s);}
      el.insertBefore(ng,el.firstChild);
    }
  }

  function updateSigns(){
    for(let r=0;r<SIZE;r++){
      for(let c=0;c<SIZE-1;c++){
        const hs=hSign(r,c);if(!hs)continue;
        const v1=state.board[r][c],v2=state.board[r][c+1];
        hs.classList.remove('ineq-ok','ineq-err');
        if(v1&&v2){const ok=state.hc[r][c]==='<'?v1<v2:v1>v2;hs.classList.add(ok?'ineq-ok':'ineq-err');}
      }
      for(let c=0;c<SIZE;c++){
        if(r>=SIZE-1)continue;
        const vs=vSign(r,c);if(!vs)continue;
        const v1=state.board[r][c],v2=state.board[r+1][c];
        vs.classList.remove('ineq-ok','ineq-err');
        if(v1&&v2){const ok=state.vc[r][c]==='^'?v1>v2:v1<v2;vs.classList.add(ok?'ineq-ok':'ineq-err');}
      }
    }
  }

  function highlight(){
    document.querySelectorAll('#ineq-grid .cell').forEach(el=>el.classList.remove('selected','highlight','same-digit','error-cell','ok-cell'));
    if(!state.selected)return;
    const{r,c}=state.selected,val=state.board[r][c],br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
    document.querySelectorAll('#ineq-grid .cell').forEach(el=>{
      const cr=+el.dataset.r,cc=+el.dataset.c,cv=state.board[cr][cc];
      if(cr===r&&cc===c)el.classList.add('selected');
      else if(cr===r||cc===c||(cr>=br&&cr<br+3&&cc>=bc&&cc<bc+3)){el.classList.add('highlight');if(val&&cv===val)el.classList.add('same-digit');}
      else if(val&&cv===val)el.classList.add('same-digit');
    });
  }
  function selectCell(r,c){state.selected={r,c};highlight();}
  function inputValue(val){
    if(!state.selected)return;const{r,c}=state.selected;if(state.puzzle[r][c])return;
    if(state.notesMode&&val){const ns=state.notes[r][c];if(ns.has(val))ns.delete(val);else ns.add(val);state.board[r][c]=0;}
    else{state.board[r][c]=val;state.notes[r][c]=new Set();}
    updateCell(r,c);highlight();updateSigns();checkComplete();
  }
  function checkBoard(){
    document.querySelectorAll('#ineq-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){const v=state.board[r][c];if(!v)continue;cel(r,c)?.classList.add(v===state.solution[r][c]?'ok-cell':'error-cell');}
  }
  function checkComplete(){
    if(state.isComplete)return;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(state.board[r][c]!==state.solution[r][c])return;
    state.isComplete=true;const t=App.getTimer('inequality');t.stop();setTimeout(()=>App.showWin(t.getFormatted(),'inequality'),400);
  }
  function resetBoard(){
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(!state.puzzle[r][c]){state.board[r][c]=0;state.notes[r][c]=new Set();}
    state.selected=null;state.isComplete=false;
    document.querySelectorAll('#ineq-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));updateAll();
  }
  function toggleNotes(){
    state.notesMode=!state.notesMode;const btn=document.getElementById('ineq-notes');if(!btn)return;
    btn.classList.toggle('active',state.notesMode);btn.querySelector('.notes-badge').textContent=state.notesMode?'ON':'OFF';
    btn.querySelector('.notes-badge').className=`notes-badge ${state.notesMode?'on':'off'}`;
  }
  function buildNumpad(){
    const c=document.getElementById('ineq-numpad');if(!c)return;c.innerHTML='';
    for(let n=1;n<=9;n++){const b=document.createElement('button');b.className='numpad-btn';b.textContent=n;b.dataset.value=n;c.appendChild(b);}
    const d=document.createElement('button');d.className='numpad-btn numpad-del';d.textContent='⌫';d.dataset.value=0;c.appendChild(d);
  }
  function handleKey(e){
    if(!document.getElementById('sec-inequality')?.classList.contains('active'))return;
    if(!state.selected)return;const{r,c}=state.selected;
    if(e.key>='1'&&e.key<='9')inputValue(+e.key);
    else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')inputValue(0);
    else if(e.key==='ArrowUp'){selectCell(Math.max(0,r-1),c);e.preventDefault();}
    else if(e.key==='ArrowDown'){selectCell(Math.min(8,r+1),c);e.preventDefault();}
    else if(e.key==='ArrowLeft'){selectCell(r,Math.max(0,c-1));e.preventDefault();}
    else if(e.key==='ArrowRight'){selectCell(r,Math.min(8,c+1));e.preventDefault();}
    else if(e.key==='n'||e.key==='N')toggleNotes();
  }
  function getDiff(){ return document.querySelector('#sec-inequality .diff-btn.active')?.dataset.diff||'medium'; }
  function init(difficulty){
    state=newState(difficulty||getDiff());
    const data=Engine.generateInequality(state.difficulty);
    state.puzzle=data.puzzle;state.solution=data.solution;state.hc=data.hc;state.vc=data.vc;
    state.board=data.puzzle.map(r=>[...r]);
    state.notes=Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>new Set()));
    setGridSize();buildNumpad();renderGrid();
    App.getTimer('inequality').start(document.getElementById('timer-inequality'));
    document.getElementById('ineq-numpad')?.querySelectorAll('.numpad-btn').forEach(b=>{b.onclick=()=>inputValue(+b.dataset.value);});
  }
  function setup(){
    if(listenersAttached)return;listenersAttached=true;
    document.getElementById('ineq-new')?.addEventListener('click',()=>init());
    document.getElementById('ineq-check')?.addEventListener('click',checkBoard);
    document.getElementById('ineq-reset')?.addEventListener('click',resetBoard);
    document.getElementById('ineq-notes')?.addEventListener('click',toggleNotes);
    document.querySelectorAll('#sec-inequality .diff-btn').forEach(b=>b.addEventListener('click',()=>{
      document.querySelectorAll('#sec-inequality .diff-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');init(b.dataset.diff);
    }));
    document.addEventListener('keydown',handleKey);
    window.addEventListener('resize',()=>{ if(document.getElementById('sec-inequality')?.classList.contains('active'))setGridSize(); });
  }
  document.addEventListener('DOMContentLoaded',setup);
  return{init};
})();
