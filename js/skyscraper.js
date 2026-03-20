/* skyscraper.js — Skyscraper Sudoku */
const SkyGame = (() => {
  const SIZE=9;
  let state={}, listenersAttached=false;

  function newState(d){ return{puzzle:[],solution:[],board:[],notes:[],allClues:null,revealedClues:null,selected:null,notesMode:false,isComplete:false,difficulty:d||'medium'}; }

  function setGridSize(){ document.querySelector('#sky-grid-wrapper .cell')?.closest('.sky-table')?.style.setProperty('--cell-size',App.calcCellSize(11,true)+'px'); }

  function renderGrid(){
    const wrapper=document.getElementById('sky-grid-wrapper');if(!wrapper)return;
    wrapper.innerHTML='';
    const cs=App.calcCellSize(11,true);
    const table=document.createElement('div');table.className='sky-table';table.style.setProperty('--cell-size',cs+'px');
    for(let row=0;row<SIZE+2;row++){
      const tr=document.createElement('div');tr.className='sky-row';
      for(let col=0;col<SIZE+2;col++){
        const td=document.createElement('div'),r=row-1,c=col-1;
        if(row===0&&col>=1&&col<=SIZE){
          td.className='sky-clue';td.dataset.dir='top';td.dataset.idx=c;
          const v=state.revealedClues.top[c];td.textContent=v!==null?v:'';
        }else if(row===SIZE+1&&col>=1&&col<=SIZE){
          td.className='sky-clue';td.dataset.dir='bottom';td.dataset.idx=c;
          const v=state.revealedClues.bottom[c];td.textContent=v!==null?v:'';
        }else if(col===0&&row>=1&&row<=SIZE){
          td.className='sky-clue';td.dataset.dir='left';td.dataset.idx=r;
          const v=state.revealedClues.left[r];td.textContent=v!==null?v:'';
        }else if(col===SIZE+1&&row>=1&&row<=SIZE){
          td.className='sky-clue';td.dataset.dir='right';td.dataset.idx=r;
          const v=state.revealedClues.right[r];td.textContent=v!==null?v:'';
        }else if(row>=1&&row<=SIZE&&col>=1&&col<=SIZE){
          td.className='cell';td.dataset.r=r;td.dataset.c=c;
          if(r%3===0)td.classList.add('box-top');if(r%3===2)td.classList.add('box-bottom');
          if(c%3===0)td.classList.add('box-left');if(c%3===2)td.classList.add('box-right');
          td.addEventListener('click',()=>selectCell(r,c));
        }else td.className='sky-corner';
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    wrapper.appendChild(table);updateAll();
  }

  function cel(r,c){ return document.querySelector(`#sky-grid-wrapper .cell[data-r="${r}"][data-c="${c}"]`); }
  function clue(dir,idx){ return document.querySelector(`#sky-grid-wrapper .sky-clue[data-dir="${dir}"][data-idx="${idx}"]`); }
  function updateAll(){ for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)updateCell(r,c);highlight(); }

  function updateCell(r,c){
    const el=cel(r,c);if(!el)return;
    const given=state.puzzle[r][c]!==0,val=state.board[r][c],ns=state.notes[r][c];
    el.innerHTML='';el.classList.remove('given','user','has-notes');
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
    document.querySelectorAll('#sky-grid-wrapper .cell').forEach(el=>el.classList.remove('selected','highlight','same-digit','error-cell','ok-cell'));
    document.querySelectorAll('#sky-grid-wrapper .sky-clue').forEach(el=>el.classList.remove('clue-active','clue-error'));
    if(!state.selected)return;
    const{r,c}=state.selected,val=state.board[r][c],br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
    document.querySelectorAll('#sky-grid-wrapper .cell').forEach(el=>{
      const cr=+el.dataset.r,cc=+el.dataset.c,cv=state.board[cr][cc];
      if(cr===r&&cc===c)el.classList.add('selected');
      else if(cr===r||cc===c||(cr>=br&&cr<br+3&&cc>=bc&&cc<bc+3)){el.classList.add('highlight');if(val&&cv===val)el.classList.add('same-digit');}
      else if(val&&cv===val)el.classList.add('same-digit');
    });
    clue('top',c)?.classList.add('clue-active');clue('bottom',c)?.classList.add('clue-active');
    clue('left',r)?.classList.add('clue-active');clue('right',r)?.classList.add('clue-active');
  }

  function selectCell(r,c){state.selected={r,c};highlight();}
  function inputValue(val){
    if(!state.selected)return;const{r,c}=state.selected;if(state.puzzle[r][c])return;
    if(state.notesMode&&val){const ns=state.notes[r][c];if(ns.has(val))ns.delete(val);else ns.add(val);state.board[r][c]=0;}
    else{state.board[r][c]=val;state.notes[r][c]=new Set();}
    updateCell(r,c);highlight();checkComplete();
  }
  function checkBoard(){
    document.querySelectorAll('#sky-grid-wrapper .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));
    document.querySelectorAll('#sky-grid-wrapper .sky-clue').forEach(el=>el.classList.remove('clue-error'));
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){const v=state.board[r][c];if(!v)continue;cel(r,c)?.classList.add(v===state.solution[r][c]?'ok-cell':'error-cell');}
  }
  function checkComplete(){
    if(state.isComplete)return;
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(state.board[r][c]!==state.solution[r][c])return;
    state.isComplete=true;const t=App.getTimer('skyscraper');t.stop();setTimeout(()=>App.showWin(t.getFormatted(),'skyscraper'),400);
  }
  function resetBoard(){
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(!state.puzzle[r][c]){state.board[r][c]=0;state.notes[r][c]=new Set();}
    state.selected=null;state.isComplete=false;
    document.querySelectorAll('#sky-grid-wrapper .cell').forEach(el=>el.classList.remove('error-cell','ok-cell'));
    document.querySelectorAll('#sky-grid-wrapper .sky-clue').forEach(el=>el.classList.remove('clue-error'));
    updateAll();
  }
  function toggleNotes(){
    state.notesMode=!state.notesMode;const btn=document.getElementById('sky-notes');if(!btn)return;
    btn.classList.toggle('active',state.notesMode);btn.querySelector('.notes-badge').textContent=state.notesMode?'ON':'OFF';
    btn.querySelector('.notes-badge').className=`notes-badge ${state.notesMode?'on':'off'}`;
  }
  function buildNumpad(){
    const c=document.getElementById('sky-numpad');if(!c)return;c.innerHTML='';
    for(let n=1;n<=9;n++){const b=document.createElement('button');b.className='numpad-btn';b.textContent=n;b.dataset.value=n;c.appendChild(b);}
    const d=document.createElement('button');d.className='numpad-btn numpad-del';d.textContent='⌫';d.dataset.value=0;c.appendChild(d);
  }
  function handleKey(e){
    if(!document.getElementById('sec-skyscraper')?.classList.contains('active'))return;
    if(!state.selected)return;const{r,c}=state.selected;
    if(e.key>='1'&&e.key<='9')inputValue(+e.key);
    else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')inputValue(0);
    else if(e.key==='ArrowUp'){selectCell(Math.max(0,r-1),c);e.preventDefault();}
    else if(e.key==='ArrowDown'){selectCell(Math.min(8,r+1),c);e.preventDefault();}
    else if(e.key==='ArrowLeft'){selectCell(r,Math.max(0,c-1));e.preventDefault();}
    else if(e.key==='ArrowRight'){selectCell(r,Math.min(8,c+1));e.preventDefault();}
    else if(e.key==='n'||e.key==='N')toggleNotes();
  }
  function getDiff(){ return document.querySelector('#sec-skyscraper .diff-btn.active')?.dataset.diff||'medium'; }
  function init(difficulty){
    state=newState(difficulty||getDiff());
    const data=Engine.generateSkyscraper(state.difficulty);
    state.puzzle=data.puzzle;state.solution=data.solution;state.allClues=data.allClues;state.revealedClues=data.revealedClues;
    state.board=data.puzzle.map(r=>[...r]);
    state.notes=Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>new Set()));
    buildNumpad();renderGrid();
    App.getTimer('skyscraper').start(document.getElementById('timer-skyscraper'));
    document.getElementById('sky-numpad')?.querySelectorAll('.numpad-btn').forEach(b=>{b.onclick=()=>inputValue(+b.dataset.value);});
  }
  function setup(){
    if(listenersAttached)return;listenersAttached=true;
    document.getElementById('sky-new')?.addEventListener('click',()=>init());
    document.getElementById('sky-check')?.addEventListener('click',checkBoard);
    document.getElementById('sky-reset')?.addEventListener('click',resetBoard);
    document.getElementById('sky-notes')?.addEventListener('click',toggleNotes);
    document.querySelectorAll('#sec-skyscraper .diff-btn').forEach(b=>b.addEventListener('click',()=>{
      document.querySelectorAll('#sec-skyscraper .diff-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');init(b.dataset.diff);
    }));
    document.addEventListener('keydown',handleKey);
    window.addEventListener('resize',()=>{ if(document.getElementById('sec-skyscraper')?.classList.contains('active'))renderGrid(); });
  }
  document.addEventListener('DOMContentLoaded',setup);
  return{init};
})();
