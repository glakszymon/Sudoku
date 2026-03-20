/* engine.js — Sudoku Studio Core Engine */

const Engine = (() => {

  function shuffle(arr) {
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function range(s,e){return Array.from({length:e-s},(_,i)=>s+i);}
  function createGrid(size){return Array.from({length:size},()=>new Array(size).fill(0));}
  function cloneGrid(g){return g.map(r=>[...r]);}

  // ── Standard solver ──────────────────────────────────────────
  function isValidStd(grid,row,col,num,size,bw,bh){
    if(grid[row].includes(num))return false;
    for(let r=0;r<size;r++)if(grid[r][col]===num)return false;
    const br=Math.floor(row/bh)*bh,bc=Math.floor(col/bw)*bw;
    for(let r=br;r<br+bh;r++)for(let c=bc;c<bc+bw;c++)if(grid[r][c]===num)return false;
    return true;
  }
  function findEmpty(grid,size){
    for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(grid[r][c]===0)return[r,c];
    return null;
  }
  function solveStd(grid,size,bw,bh,rand=false){
    const e=findEmpty(grid,size);if(!e)return true;
    const[row,col]=e;let nums=range(1,size+1);if(rand)nums=shuffle(nums);
    for(const num of nums){
      if(isValidStd(grid,row,col,num,size,bw,bh)){
        grid[row][col]=num;
        if(solveStd(grid,size,bw,bh,rand))return true;
        grid[row][col]=0;
      }
    }
    return false;
  }
  function countSolutions(grid,size,bw,bh,limit=2){
    let count=0;
    function solve(g){
      if(count>=limit)return;
      const e=findEmpty(g,size);if(!e){count++;return;}
      const[row,col]=e;
      for(let num=1;num<=size;num++){
        if(isValidStd(g,row,col,num,size,bw,bh)){
          g[row][col]=num;solve(g);g[row][col]=0;if(count>=limit)return;
        }
      }
    }
    solve(cloneGrid(grid));return count;
  }
  function generateSolved(size,bw,bh){const g=createGrid(size);solveStd(g,size,bw,bh,true);return g;}

  function digHoles(solution,size,bw,bh,givens){
    const puzzle=cloneGrid(solution);
    const cells=shuffle(range(0,size*size));let filled=size*size;
    for(const idx of cells){
      if(filled<=givens)break;
      const r=Math.floor(idx/size),c=idx%size;
      const backup=puzzle[r][c];puzzle[r][c]=0;
      if(countSolutions(puzzle,size,bw,bh,2)===1)filled--;
      else puzzle[r][c]=backup;
    }
    return puzzle;
  }
  function digHolesFast(solution,size,givens){
    const puzzle=cloneGrid(solution);
    const cells=shuffle(range(0,size*size));let filled=size*size;
    for(const idx of cells){
      if(filled<=givens)break;
      const r=Math.floor(idx/size),c=idx%size;
      puzzle[r][c]=0;filled--;
    }
    return puzzle;
  }

  // ── Classic ──────────────────────────────────────────────────
  const CLASSIC_GIVENS={easy:40,medium:32,hard:25};
  function generateClassic(difficulty='medium'){
    const size=9,bw=3,bh=3;
    const solution=generateSolved(size,bw,bh);
    const puzzle=digHoles(solution,size,bw,bh,CLASSIC_GIVENS[difficulty]||32);
    return{puzzle,solution,size,boxW:bw,boxH:bh};
  }

  // ── Giant ────────────────────────────────────────────────────
  const GIANT_GIVENS={easy:100,medium:75};
  function generateGiant(difficulty='easy'){
    const size=16,bw=4,bh=4;
    const solution=generateSolved(size,bw,bh);
    const puzzle=digHolesFast(solution,size,GIANT_GIVENS[difficulty]||100);
    return{puzzle,solution,size,boxW:bw,boxH:bh};
  }

  // ── Jigsaw Regions — IMPROVED BFS with spread seeding ────────
  function generateJigsawRegions(size=9){
    const DIRS=[[-1,0],[1,0],[0,-1],[0,1]];

    for(let attempt=0;attempt<80;attempt++){
      const grid=Array.from({length:size},()=>new Array(size).fill(-1));
      const sizes=new Array(size).fill(0);

      // Place seeds maximally spread apart (furthest-point sampling)
      const seeds=[];
      // First seed: random
      const firstR=Math.floor(Math.random()*size), firstC=Math.floor(Math.random()*size);
      seeds.push([firstR,firstC]);
      grid[firstR][firstC]=0; sizes[0]=1;

      for(let i=1;i<size;i++){
        let bestCell=null, bestDist=-1;
        for(let r=0;r<size;r++){
          for(let c=0;c<size;c++){
            if(grid[r][c]!==-1)continue;
            // min manhattan distance to any seed
            let minD=Infinity;
            for(const[sr,sc] of seeds) minD=Math.min(minD,Math.abs(r-sr)+Math.abs(c-sc));
            if(minD>bestDist){bestDist=minD;bestCell=[r,c];}
          }
        }
        if(!bestCell)break;
        // Add small random jitter: pick from cells within bestDist
        const candidates=[];
        for(let r=0;r<size;r++)for(let c=0;c<size;c++){
          if(grid[r][c]!==-1)continue;
          let minD=Infinity;
          for(const[sr,sc] of seeds) minD=Math.min(minD,Math.abs(r-sr)+Math.abs(c-sc));
          if(minD>=Math.max(1,bestDist-1))candidates.push([r,c]);
        }
        const chosen=candidates[Math.floor(Math.random()*candidates.length)]||bestCell;
        seeds.push(chosen);
        grid[chosen[0]][chosen[1]]=i; sizes[i]=1;
      }
      if(seeds.length<size)continue;

      // BFS growth: queue per region
      const queues=seeds.map(s=>[s]);
      let unassigned=size*size-size;

      for(let iter=0;iter<size*size*10&&unassigned>0;iter++){
        const regOrder=shuffle(range(0,size));
        let progress=false;
        for(const reg of regOrder){
          if(sizes[reg]>=size)continue;
          // Find a random free neighbor of any cell in this region
          const q=shuffle([...queues[reg]]);
          let expanded=false;
          for(const[r,c] of q){
            const nbrs=shuffle(DIRS.map(([dr,dc])=>[r+dr,c+dc]).filter(([nr,nc])=>nr>=0&&nr<size&&nc>=0&&nc<size&&grid[nr][nc]===-1));
            if(nbrs.length===0)continue;
            const[nr,nc]=nbrs[0];
            grid[nr][nc]=reg; sizes[reg]++; unassigned--;
            queues[reg].push([nr,nc]);
            progress=true; expanded=true; break;
          }
          if(!expanded){
            // Clean up stale queue entries
            queues[reg]=queues[reg].filter(([r,c])=>{
              return DIRS.some(([dr,dc])=>{const nr=r+dr,nc=c+dc;return nr>=0&&nr<size&&nc>=0&&nc<size&&grid[nr][nc]===-1;});
            });
          }
        }
        if(!progress)break;
      }

      if(unassigned>0)continue;
      let valid=true;
      for(let i=0;i<size;i++)if(sizes[i]!==size){valid=false;break;}

      // Extra check: verify connectivity of each region
      if(valid){
        for(let reg=0;reg<size&&valid;reg++){
          const cells=[];
          for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(grid[r][c]===reg)cells.push([r,c]);
          // BFS connectivity check
          const visited=new Set();
          const start=cells[0];
          const key=([r,c])=>`${r},${c}`;
          const q2=[start]; visited.add(key(start));
          while(q2.length){
            const[r,c]=q2.shift();
            for(const[dr,dc] of DIRS){
              const nr=r+dr,nc=c+dc;
              if(nr>=0&&nr<size&&nc>=0&&nc<size&&grid[nr][nc]===reg&&!visited.has(key([nr,nc]))){
                visited.add(key([nr,nc]));q2.push([nr,nc]);
              }
            }
          }
          if(visited.size!==size)valid=false;
        }
      }

      if(valid)return grid;
    }

    // Fallback: an irregular (diagonal-stripe) pattern — never produces 3×3 boxes
    const g=Array.from({length:size},()=>new Array(size).fill(0));
    const regionCells=Array.from({length:size},()=>[]);
    for(let r=0;r<size;r++)for(let c=0;c<size;c++)regionCells[(r+c)%size].push([r,c]);
    for(let reg=0;reg<size;reg++)for(const[r,c] of regionCells[reg])g[r][c]=reg;
    return g;
  }

  // ── Jigsaw solver ────────────────────────────────────────────
  function isValidJigsaw(grid,row,col,num,size,regions){
    for(let c=0;c<size;c++)if(grid[row][c]===num)return false;
    for(let r=0;r<size;r++)if(grid[r][col]===num)return false;
    const reg=regions[row][col];
    for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(regions[r][c]===reg&&grid[r][c]===num)return false;
    return true;
  }
  function solveJigsaw(grid,size,regions,rand=false){
    for(let r=0;r<size;r++)for(let c=0;c<size;c++){
      if(grid[r][c]===0){
        let nums=range(1,size+1);if(rand)nums=shuffle(nums);
        for(const num of nums){
          if(isValidJigsaw(grid,r,c,num,size,regions)){
            grid[r][c]=num;if(solveJigsaw(grid,size,regions,rand))return true;grid[r][c]=0;
          }
        }
        return false;
      }
    }
    return true;
  }

  const JIGSAW_GIVENS={easy:40,medium:32,hard:25};
  function generateJigsaw(difficulty='medium'){
    const size=9;
    let regions,solution;
    for(let a=0;a<15;a++){
      regions=generateJigsawRegions(size);
      solution=createGrid(size);
      if(solveJigsaw(solution,size,regions,true))break;
    }
    const givens=JIGSAW_GIVENS[difficulty]||32;
    const puzzle=digHolesFast(solution,size,givens);
    return{puzzle,solution,regions,size};
  }

  // ── Skyscraper ───────────────────────────────────────────────
  function countVisible(seq){let v=1,max=seq[0];for(let i=1;i<seq.length;i++)if(seq[i]>max){v++;max=seq[i];}return v;}
  function calculateAllClues(solution,size){
    const top=[],bottom=[],left=[],right=[];
    for(let c=0;c<size;c++){const col=solution.map(r=>r[c]);top.push(countVisible(col));bottom.push(countVisible([...col].reverse()));}
    for(let r=0;r<size;r++){const row=solution[r];left.push(countVisible(row));right.push(countVisible([...row].reverse()));}
    return{top,bottom,left,right};
  }
  const SKY_REVEAL={easy:1.0,medium:0.65,hard:0.40};
  function generateSkyscraper(difficulty='medium'){
    const size=9,bw=3,bh=3;
    const solution=generateSolved(size,bw,bh);
    const allClues=calculateAllClues(solution,size);
    const reveal=SKY_REVEAL[difficulty]||0.65;
    const revealedClues={};
    for(const dir of['top','bottom','left','right'])
      revealedClues[dir]=allClues[dir].map(v=>Math.random()<reveal?v:null);
    const puzzle=digHoles(solution,size,bw,bh,CLASSIC_GIVENS[difficulty]||32);
    return{puzzle,solution,allClues,revealedClues,size,boxW:bw,boxH:bh};
  }

  // ── Killer ───────────────────────────────────────────────────
  function generateKillerCages(solution,size,difficulty){
    const DIRS=[[-1,0],[1,0],[0,-1],[0,1]];
    const maxCage=difficulty==='easy'?3:5;
    const assigned=Array.from({length:size},()=>new Array(size).fill(-1));
    const cages=[];
    for(let r=0;r<size;r++)for(let c=0;c<size;c++){
      if(assigned[r][c]!==-1)continue;
      const target=1+Math.floor(Math.random()*maxCage);
      const cells=[[r,c]]; assigned[r][c]=cages.length;
      while(cells.length<target){
        const frontier=[];
        for(const[cr,cc] of cells)for(const[dr,dc] of DIRS){const nr=cr+dr,nc=cc+dc;if(nr>=0&&nr<size&&nc>=0&&nc<size&&assigned[nr][nc]===-1)frontier.push([nr,nc]);}
        if(!frontier.length)break;
        const next=frontier[Math.floor(Math.random()*frontier.length)];
        if(assigned[next[0]][next[1]]!==-1)break;
        assigned[next[0]][next[1]]=cages.length; cells.push(next);
      }
      const sum=cells.reduce((s,[cr,cc])=>s+solution[cr][cc],0);
      cages.push({id:cages.length,cells,sum});
    }
    return cages;
  }
  function generateKiller(difficulty='easy'){
    const size=9,bw=3,bh=3;
    const solution=generateSolved(size,bw,bh);
    const cages=generateKillerCages(solution,size,difficulty);
    const puzzle=createGrid(size);
    return{puzzle,solution,cages,size,boxW:bw,boxH:bh};
  }

  // ── Inequality ───────────────────────────────────────────────
  const INEQ_GIVENS={easy:35,medium:26,hard:18};
  function generateInequality(difficulty='medium'){
    const size=9,bw=3,bh=3;
    const solution=generateSolved(size,bw,bh);
    const hc=Array.from({length:size},(_,r)=>Array.from({length:size-1},(_,c)=>solution[r][c]>solution[r][c+1]?'>':'<'));
    const vc=Array.from({length:size-1},(_,r)=>Array.from({length:size},(_,c)=>solution[r][c]>solution[r+1][c]?'v':'^'));
    const puzzle=digHoles(solution,size,bw,bh,INEQ_GIVENS[difficulty]||26);
    return{puzzle,solution,hc,vc,size,boxW:bw,boxH:bh};
  }

  return{shuffle,range,createGrid,cloneGrid,isValidStandard:isValidStd,countVisible,
    generateClassic,generateGiant,generateJigsaw,generateSkyscraper,generateKiller,generateInequality,
    countSolutions,calculateAllClues};
})();
