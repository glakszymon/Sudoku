/* killer.js — Killer Sudoku */
const KillerGame = (() => {
  const SIZE=9;
  const CCOLS=['#FFE8E1','#E1EEFF','#E1FFE9','#FFE1E1','#EFE1FF','#FFFFE1','#E1FFFF','#FFE1F0','#EFFE1E','#E1F4FF','#FFE8F0','#E1FFF0','#F0FFE1','#FFE1FF','#E1ECFF','#FFF4E1','#E1FFF8','#F4E1FF','#FFECE1','#E1ECEE'];
  let state={}, listenersAttached=false;

  function newState(d){ return{puzzle:[],solution:[],board:[],notes:[],cages:[],cageMap:[],selected:null,notesMode:false,isComplete:false,difficulty:d||'easy'}; }

  function setGridSize(){ document.getElementById('killer-grid')?.style.setProperty('--cell-size',App.calcCellSize(9,true)+'px'); }

  function buildCageMap(cages){
    const map=Array.from({length:SIZE},()=>new Array(SIZE).fill(-1));
    for(const cage of cages)for(const[r,c] of cage.cells)map[r][c]=cage.id;
    return map;
  }
  function getCageTL(cage){
    let mr=SIZE,mc=SIZE;
    for(const[r,c] of cage.cells)if(r<mr||(r===mr&&c<mc)){mr=r;mc=c;}
    return[mr,mc];
  }
  function cageBorders(cageMap,r,c){
    const id=cageMap[r][c];
    return{top:r===0||cageMap[r-1][c]!==id,bottom:r===SIZE-1||cageMap[r+1][c]!==id,left:c===0||cageMap[r][c-1]!==id,right:c===SIZE-1||cageMap[r][c+1]!==id};
  }

  function renderGrid(){
    const g=document.getElementById('killer-grid');if(!g)return;
    g.innerHTML='';g.className='sudoku-grid size-9 killer-grid';
    const tlMap={};
    for(const cage of state.cages){const[r,c]=getCageTL(cage);tlMap[`${r},${c}`]=cage.sum;}
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const el=document.createElement('div');el.className='cell killer-cell';el.dataset.r=r;el.dataset.c=c;
      const cid=state.cageMap[r][c];
      el.style.backgroundColor=CCOLS[cid%CCOLS.length];
      const b=cageBorders(state.cageMap,r,c);
      const bT=r%3===0,bB=r%3===2,bL=c%3===0,bR=c%3===2;
      el.style.borderTop   =bT?'1.5px solid rgba(40,20,80,0.7)':(b.top   ?'1.5px dashed rgba(80,60,160,0.5)':'0.5px solid rgba(0,0,0,0.08)');
      el.style.borderBottom=bB?'1.5px solid rgba(40,20,80,0.7)':(b.bottom?'1.5px dashed rgba(80,60,160,0.5)':'0.5px solid rgba(0,0,0,0.08)');
      el.style.borderLeft  =bL?'1.5px solid rgba(40,20,80,0.7)':(b.left  ?'1.5px dashed rgba(80,60,160,0.5)':'0.5px solid rgba(0,0,0,0.08)');
      el.style.borderRight =bR?'1.5px solid rgba(40,20,80,0.7)':(b.right ?'1.5px dashed rgba(80,60,160,0.5)':'0.5px solid rgba(0,0,0,0.08)');
      if(tlMap[`${r},${c}`]!==undefined){
        const lbl=document.createElement('span');lbl.className='cage-sum';lbl.textContent=tlMap[`${r},${c}`];el.appendChild(lbl);
      }
      el.addEventListener('click',()=>selectCell(r,c));g.appendChild(el);
    }
    updateAll();
  }

  function cel(r,c){ return document.querySelector(`#killer-grid .cell[data-r="${r}"][data-c="${c}"]`); }
  function updateAll(){ for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)updateCell(r,c);highlight(); }

  function updateCell(r,c){
    const el=cel(r,c);if(!el)return;
    const val=state.board[r][c],ns=state.notes[r][c];
    el.querySelectorAll('.note-grid,.cell-val').forEach(x=>x.remove());
    el.childNodes.forEach(n=>{if(n.nodeType===3)n.remove();});
    el.classList.remove('user','has-notes');
    if(val){el.classList.add('user');const s=document.createElement('span');s.className='cell-val';s.textContent=val;el.appendChild(s);}
    else if(ns?.size){
      el.classList.add('has-notes');
      const ng=document.createElement('div');ng.className='note-grid';
      for(let n=1;n<=9;n++){const s=document.createElement('span');s.className='note-num';s.textContent=ns.has(n)?n:'';ng.appendChild(s);}
      el.appendChild(ng);
    }
  }

  function highlight(){
    document.querySelectorAll('#killer-grid .cell').forEach(el=>el.classList.remove('selected','highlight','same-digit','error-cell','ok-cell'));
    if(!state.selected)return;
    const{r,c}=state.selected,val=state.board[r][c],br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3,cid=state.cageMap[r][c];
    document.querySelectorAll('#killer-grid .cell').forEach(el=>{
      const cr=+el.dataset.r,cc=+el.dataset.c,cv=state.board[cr][cc];
      if(cr===r&&cc===c)el.classList.add('selected');
      else if(cr===r||cc===c||(cr>=br&&cr<br+3&&cc>=bc&&cc<bc+3)||state.cageMap[cr][cc]===cid){el.classList.add('highlight');if(val&&cv===val)el.classList.add('same-digit');}
      else if(val&&cv===val)el.classList.add('same-digit');
    });
  }
  function selectCell(r,c){state.selected={r,c};highlight();}
  function inputValue(val){
    if(!state.selected)return;const{r,c}=state.selected;
    if(state.notesMode&&val){const ns=state.notes[r][c];if(ns.has(val))ns.delete(val);else ns.add(val);state.board[r][c]=0;}
    else{state.board[r][c]=val;state.notes[r][c]=new Set();}
    updateCell(r,c);highlight();checkComplete();
  }
  function checkBoard(){
    document.querySelectorAll('#killer-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){const v=state.board[r][c];if(!v)continue;cel(r,c)?.classList.add(v===state.solution[r][c]?'ok-cell':'error-cell');}
  }
  function checkComplete(){
    if(state.isComplete)return;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(state.board[r][c]!==state.solution[r][c])return;
    state.isComplete=true;const t=App.getTimer('killer');t.stop();setTimeout(()=>App.showWin(t.getFormatted(),'killer'),400);
  }
  function resetBoard(){
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){state.board[r][c]=0;state.notes[r][c]=new Set();}
    state.selected=null;state.isComplete=false;
    document.querySelectorAll('#killer-grid .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));updateAll();
  }
  function toggleNotes(){
    state.notesMode=!state.notesMode;const btn=document.getElementById('killer-notes');if(!btn)return;
    btn.classList.toggle('active',state.notesMode);btn.querySelector('.notes-badge').textContent=state.notesMode?'ON':'OFF';
    btn.querySelector('.notes-badge').className=`notes-badge ${state.notesMode?'on':'off'}`;
  }
  function buildNumpad(){
    const c=document.getElementById('killer-numpad');if(!c)return;c.innerHTML='';
    for(let n=1;n<=9;n++){const b=document.createElement('button');b.className='numpad-btn';b.textContent=n;b.dataset.value=n;c.appendChild(b);}
    const d=document.createElement('button');d.className='numpad-btn numpad-del';d.textContent='⌫';d.dataset.value=0;c.appendChild(d);
  }
  function handleKey(e){
    if(!document.getElementById('sec-killer')?.classList.contains('active'))return;
    if(!state.selected)return;const{r,c}=state.selected;
    if(e.key>='1'&&e.key<='9')inputValue(+e.key);
    else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')inputValue(0);
    else if(e.key==='ArrowUp'){selectCell(Math.max(0,r-1),c);e.preventDefault();}
    else if(e.key==='ArrowDown'){selectCell(Math.min(8,r+1),c);e.preventDefault();}
    else if(e.key==='ArrowLeft'){selectCell(r,Math.max(0,c-1));e.preventDefault();}
    else if(e.key==='ArrowRight'){selectCell(r,Math.min(8,c+1));e.preventDefault();}
    else if(e.key==='n'||e.key==='N')toggleNotes();
  }
  function getDiff(){ return document.querySelector('#sec-killer .diff-btn.active')?.dataset.diff||'easy'; }
  function init(difficulty){
    state=newState(difficulty||getDiff());
    const data=Engine.generateKiller(state.difficulty);
    state.puzzle=data.puzzle;state.solution=data.solution;state.cages=data.cages;state.cageMap=buildCageMap(data.cages);
    state.board=Engine.createGrid(SIZE);
    state.notes=Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>new Set()));
    setGridSize();buildNumpad();renderGrid();
    App.getTimer('killer').start(document.getElementById('timer-killer'));
    document.getElementById('killer-numpad')?.querySelectorAll('.numpad-btn').forEach(b=>{b.onclick=()=>inputValue(+b.dataset.value);});
  }
  function setup(){
    if(listenersAttached)return;listenersAttached=true;
    document.getElementById('killer-new')?.addEventListener('click',()=>init());
    document.getElementById('killer-check')?.addEventListener('click',checkBoard);
    document.getElementById('killer-reset')?.addEventListener('click',resetBoard);
    document.getElementById('killer-notes')?.addEventListener('click',toggleNotes);
    document.querySelectorAll('#sec-killer .diff-btn').forEach(b=>b.addEventListener('click',()=>{
      document.querySelectorAll('#sec-killer .diff-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');init(b.dataset.diff);
    }));
    document.addEventListener('keydown',handleKey);
    window.addEventListener('resize',()=>{ if(document.getElementById('sec-killer')?.classList.contains('active'))setGridSize(); });
  }
  document.addEventListener('DOMContentLoaded',setup);
  return{init};
})();
