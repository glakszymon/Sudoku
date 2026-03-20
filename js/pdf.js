/* pdf.js — PDF Generator · 1 puzzle per page */

const PdfSection = (() => {
  let listenersAttached = false;

  function init() {
    const list = document.getElementById('pdf-rows');
    if (list && list.children.length === 0) addRow();
    if (listenersAttached) return;
    listenersAttached = true;
    document.getElementById('pdf-add-row')?.addEventListener('click', addRow);
    document.getElementById('pdf-generate')?.addEventListener('click', generatePdf);
  }

  function addRow() {
    const list = document.getElementById('pdf-rows'); if (!list) return;
    const row = document.createElement('div');
    row.className = 'pdf-row';
    row.innerHTML = `
      <select class="pdf-type-select">
        <option value="classic">Klasyczne 9×9</option>
        <option value="giant">Giant 16×16</option>
        <option value="jigsaw">Jigsaw</option>
        <option value="skyscraper">Skyscraper</option>
        <option value="killer">Killer</option>
        <option value="inequality">Nierówności</option>
      </select>
      <select class="pdf-diff-select">
        <option value="easy">Łatwy</option>
        <option value="medium" selected>Średni</option>
        <option value="hard">Trudny</option>
      </select>
      <div class="pdf-count-wrap">
        <button class="pdf-count-btn" data-dir="-1">−</button>
        <span class="pdf-count-val">2</span>
        <button class="pdf-count-btn" data-dir="1">+</button>
      </div>
      <button class="pdf-remove-btn" title="Usuń">✕</button>
    `;
    const ts = row.querySelector('.pdf-type-select'), ds = row.querySelector('.pdf-diff-select');
    ts.addEventListener('change', () => {
      if (ts.value === 'giant' || ts.value === 'killer') {
        ds.innerHTML = `<option value="easy">Łatwy</option><option value="medium">Średni</option>`;
      } else {
        ds.innerHTML = `<option value="easy">Łatwy</option><option value="medium" selected>Średni</option><option value="hard">Trudny</option>`;
      }
    });
    row.querySelectorAll('.pdf-count-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = btn.parentElement.querySelector('.pdf-count-val');
        el.textContent = Math.max(1, Math.min(8, parseInt(el.textContent) + parseInt(btn.dataset.dir)));
      });
    });
    row.querySelector('.pdf-remove-btn').addEventListener('click', () => row.remove());
    list.appendChild(row);
  }

  async function generatePdf() {
    const rows = document.querySelectorAll('#pdf-rows .pdf-row');
    if (!rows.length) { alert('Dodaj przynajmniej jeden typ puzzla.'); return; }
    const jobs = [];
    rows.forEach(row => jobs.push({
      type: row.querySelector('.pdf-type-select').value,
      diff: row.querySelector('.pdf-diff-select').value,
      count: parseInt(row.querySelector('.pdf-count-val').textContent)
    }));
    const total = jobs.reduce((s,j) => s+j.count, 0);
    showProgress(0, total, '');
    const all = [];
    let done = 0;
    for (const job of jobs) {
      for (let i = 0; i < job.count; i++) {
        await sleep(0);
        const p = genOne(job.type, job.diff);
        p.typeName = tl(job.type); p.diffName = dl(job.diff); p.num = i+1;
        all.push(p); done++;
        showProgress(done, total, job.type);
      }
    }
    hideProgress();
    drawPdf(all);
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function genOne(type, diff) {
    switch(type) {
      case 'classic':    return { ...Engine.generateClassic(diff), type };
      case 'giant':      return { ...Engine.generateGiant(diff), type };
      case 'jigsaw':     return { ...Engine.generateJigsaw(diff), type };
      case 'skyscraper': return { ...Engine.generateSkyscraper(diff), type };
      case 'killer':     return { ...Engine.generateKiller(diff), type };
      case 'inequality': return { ...Engine.generateInequality(diff), type };
      default:           return { ...Engine.generateClassic(diff), type:'classic' };
    }
  }

  const tl = t => ({classic:'Klasyczne',giant:'Giant 16×16',jigsaw:'Jigsaw',skyscraper:'Skyscraper',killer:'Killer',inequality:'Nierówności'}[t]||t);
  const dl = d => ({easy:'Łatwy',medium:'Średni',hard:'Trudny'}[d]||d);

  function showProgress(done, total, type) {
    const bar = document.getElementById('pdf-progress'); if (!bar) return;
    bar.classList.remove('hidden');
    const fill = bar.querySelector('.progress-fill'), lbl = bar.querySelector('.progress-label');
    if (fill) fill.style.width = (total > 0 ? Math.round(done/total*100) : 0) + '%';
    if (lbl) lbl.textContent = done < total ? `Generowanie: ${tl(type)}… (${done}/${total})` : 'Gotowe!';
  }
  function hideProgress() { document.getElementById('pdf-progress')?.classList.add('hidden'); }

  /* ── PDF Drawing: 1 puzzle per page ── */

  function drawPdf(puzzles) {
    if (!window.jspdf) { alert('Biblioteka jsPDF nie załadowana. Sprawdź połączenie z internetem.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

    puzzles.forEach((p, i) => {
      if (i > 0) doc.addPage();
      drawPage(doc, p);
    });

    doc.save(`sudoku-arkusz-${Date.now()}.pdf`);
  }

  /* A4: 210×297mm, margin: 14mm */
  const M = 14, PW = 210, PH = 297;

  function drawPage(doc, p) {
    /* ─ Header ─ */
    doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(30,30,30);
    doc.text('Sudoku — Arkusz ćwiczeń', PW/2, M+7, {align:'center'});

    doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80);
    doc.text(`${p.typeName} · ${p.diffName} #${p.num}`, PW/2, M+14, {align:'center'});

    doc.setDrawColor(200,200,200); doc.setLineWidth(0.3);
    doc.line(M, M+17, PW-M, M+17);

    /* ─ Footer ─ */
    const today = new Date().toLocaleDateString('pl-PL');
    doc.setFontSize(8); doc.setTextColor(160,160,160);
    doc.text(`Wygenerowano: ${today}`, M, PH-8);
    doc.text(`${p.typeName}`, PW-M, PH-8, {align:'right'});

    /* ─ Grid area ─ */
    const availW = PW - M*2;          // 182mm
    const availH = PH - M*2 - 22 - 12; // 297 - 28 - 22 - 12 = 235mm

    switch (p.type) {
      case 'classic':    drawClassic(doc, p, availW, availH); break;
      case 'giant':      drawGiant(doc, p, availW, availH); break;
      case 'jigsaw':     drawJigsaw(doc, p, availW, availH); break;
      case 'skyscraper': drawSkyscraper(doc, p, availW, availH); break;
      case 'killer':     drawKiller(doc, p, availW, availH); break;
      case 'inequality': drawInequality(doc, p, availW, availH); break;
    }
  }

  /* Grid starts at y = M + 22 */
  const GY = M + 22;

  /* ── Classic ── */
  function drawClassic(doc, p, aw, ah) {
    const n=9, cell=Math.min(aw/n, ah/n);
    const gw=cell*n, x=M+(aw-gw)/2;
    draw9x9(doc, p.puzzle, x, GY, cell, n, 3);
  }

  /* Base 9×9 grid drawer */
  function draw9x9(doc, grid, x, y, cell, n, box) {
    // Given cell fill
    doc.setFillColor(235,230,255);
    for (let r=0;r<n;r++) for (let c=0;c<n;c++)
      if (grid[r][c]) doc.rect(x+c*cell, y+r*cell, cell, cell, 'F');

    // Thin grid lines
    doc.setDrawColor(190,185,215); doc.setLineWidth(0.2);
    for (let i=0;i<=n;i++) {
      doc.line(x+i*cell,y, x+i*cell,y+n*cell);
      doc.line(x,y+i*cell, x+n*cell,y+i*cell);
    }
    // Box lines
    doc.setDrawColor(80,60,160); doc.setLineWidth(0.8);
    for (let i=0;i<=n;i+=box) {
      doc.line(x+i*cell,y, x+i*cell,y+n*cell);
      doc.line(x,y+i*cell, x+n*cell,y+i*cell);
    }
    // Numbers
    doc.setFontSize(Math.max(6, cell*0.52)); doc.setFont('helvetica','bold'); doc.setTextColor(25,18,60);
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const v=grid[r][c]; if (!v) continue;
      doc.text(String(v), x+c*cell+cell/2, y+r*cell+cell*0.66, {align:'center'});
    }
  }

  /* ── Giant ── */
  function drawGiant(doc, p, aw, ah) {
    const n=16, cell=Math.min(aw/n, ah/n);
    const gw=cell*n, x=M+(aw-gw)/2;
    doc.setFillColor(230,220,255);
    for (let r=0;r<n;r++) for (let c=0;c<n;c++)
      if (p.puzzle[r][c]) doc.rect(x+c*cell,GY+r*cell,cell,cell,'F');
    doc.setDrawColor(200,195,230); doc.setLineWidth(0.15);
    for (let i=0;i<=n;i++) { doc.line(x+i*cell,GY,x+i*cell,GY+n*cell); doc.line(x,GY+i*cell,x+n*cell,GY+i*cell); }
    doc.setDrawColor(70,50,150); doc.setLineWidth(0.7);
    for (let i=0;i<=n;i+=4) { doc.line(x+i*cell,GY,x+i*cell,GY+n*cell); doc.line(x,GY+i*cell,x+n*cell,GY+i*cell); }
    doc.setFontSize(Math.max(4, cell*0.5)); doc.setFont('helvetica','bold'); doc.setTextColor(25,18,60);
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const v=p.puzzle[r][c]; if (!v) continue;
      const lbl = v<=9 ? String(v) : String.fromCharCode(55+v);
      doc.text(lbl, x+c*cell+cell/2, GY+r*cell+cell*0.66, {align:'center'});
    }
  }

  /* ── Jigsaw ── */
  const JCLR = [[255,234,212],[212,234,255],[212,255,222],[255,212,212],[238,212,255],[255,255,212],[212,255,255],[255,212,238],[238,255,212]];

  function drawJigsaw(doc, p, aw, ah) {
    const n=9, cell=Math.min(aw/n, ah/n);
    const gw=cell*n, x=M+(aw-gw)/2;
    // Fill regions
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const [cr,cg,cb]=JCLR[p.regions[r][c]%JCLR.length];
      doc.setFillColor(cr,cg,cb); doc.rect(x+c*cell,GY+r*cell,cell,cell,'F');
    }
    // Thin lines
    doc.setDrawColor(210,205,235); doc.setLineWidth(0.15);
    for (let i=0;i<=n;i++) { doc.line(x+i*cell,GY,x+i*cell,GY+n*cell); doc.line(x,GY+i*cell,x+n*cell,GY+i*cell); }
    // Region borders
    doc.setLineWidth(1.0);
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const reg=p.regions[r][c], [cr,cg,cb]=JCLR[reg%JCLR.length];
      doc.setDrawColor(Math.max(0,cr-90),Math.max(0,cg-90),Math.max(0,cb-90));
      const cx=x+c*cell, cy=GY+r*cell;
      if (r===0||p.regions[r-1][c]!==reg) doc.line(cx,cy,cx+cell,cy);
      if (r===n-1||p.regions[r+1][c]!==reg) doc.line(cx,cy+cell,cx+cell,cy+cell);
      if (c===0||p.regions[r][c-1]!==reg) doc.line(cx,cy,cx,cy+cell);
      if (c===n-1||p.regions[r][c+1]!==reg) doc.line(cx+cell,cy,cx+cell,cy+cell);
    }
    // Numbers
    doc.setFontSize(Math.max(6,cell*0.52)); doc.setFont('helvetica','bold'); doc.setTextColor(25,18,60);
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const v=p.puzzle[r][c]; if (!v) continue;
      doc.text(String(v),x+c*cell+cell/2,GY+r*cell+cell*0.66,{align:'center'});
    }
  }

  /* ── Skyscraper ── */
  function drawSkyscraper(doc, p, aw, ah) {
    const n=9, clueW=6;
    const cell = Math.min((aw - clueW*2)/n, (ah - clueW*2)/n);
    const gw = cell*n + clueW*2;
    const x0 = M + (aw - gw)/2; // left edge including clue column
    const gx = x0 + clueW, gy = GY + clueW;

    doc.setFontSize(Math.max(5, cell*0.4)); doc.setFont('helvetica','bold'); doc.setTextColor(100,80,160);
    for (let i=0;i<n;i++) {
      const tc=p.revealedClues.top[i],bc=p.revealedClues.bottom[i],lc=p.revealedClues.left[i],rc=p.revealedClues.right[i];
      if (tc!=null) doc.text(String(tc),gx+i*cell+cell/2,gy-1,{align:'center'});
      if (bc!=null) doc.text(String(bc),gx+i*cell+cell/2,gy+n*cell+5,{align:'center'});
      if (lc!=null) doc.text(String(lc),gx-2,gy+i*cell+cell*0.66,{align:'right'});
      if (rc!=null) doc.text(String(rc),gx+n*cell+2,gy+i*cell+cell*0.66);
    }
    draw9x9(doc, p.puzzle, gx, gy, cell, n, 3);
  }

  /* ── Killer ── */
  const KCLR = [[255,240,224],[224,240,255],[224,255,230],[255,224,224],[242,224,255],[255,255,224],[224,255,255],[255,224,242],[242,255,224],[224,242,255]];

  function drawKiller(doc, p, aw, ah) {
    const n=9, cell=Math.min(aw/n, ah/n);
    const gw=cell*n, x=M+(aw-gw)/2;
    const cageMap=Array.from({length:n},()=>new Array(n).fill(-1));
    for (const cage of p.cages) for (const [r,c] of cage.cells) cageMap[r][c]=cage.id;
    // Fill cages
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const [cr,cg,cb]=KCLR[cageMap[r][c]%KCLR.length];
      doc.setFillColor(cr,cg,cb); doc.rect(x+c*cell,GY+r*cell,cell,cell,'F');
    }
    // Box lines
    doc.setDrawColor(195,190,220); doc.setLineWidth(0.2);
    for (let i=0;i<=n;i++) { doc.line(x+i*cell,GY,x+i*cell,GY+n*cell); doc.line(x,GY+i*cell,x+n*cell,GY+i*cell); }
    doc.setDrawColor(60,40,120); doc.setLineWidth(0.8);
    for (let i=0;i<=n;i+=3) { doc.line(x+i*cell,GY,x+i*cell,GY+n*cell); doc.line(x,GY+i*cell,x+n*cell,GY+i*cell); }
    // Cage dashed borders
    doc.setLineWidth(0.5); doc.setLineDashPattern([0.6,0.6],0);
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const id=cageMap[r][c], cx=x+c*cell, cy=GY+r*cell;
      doc.setDrawColor(130,115,175);
      if (r===0||cageMap[r-1][c]!==id) doc.line(cx,cy,cx+cell,cy);
      if (r===n-1||cageMap[r+1][c]!==id) doc.line(cx,cy+cell,cx+cell,cy+cell);
      if (c===0||cageMap[r][c-1]!==id) doc.line(cx,cy,cx,cy+cell);
      if (c===n-1||cageMap[r][c+1]!==id) doc.line(cx+cell,cy,cx+cell,cy+cell);
    }
    doc.setLineDashPattern([],0);
    // Cage sums
    const tlMap={};
    for (const cage of p.cages) {
      let mr=n,mc=n; for (const [r,c] of cage.cells) if (r<mr||(r===mr&&c<mc)){mr=r;mc=c;}
      tlMap[`${mr},${mc}`]=cage.sum;
    }
    doc.setFontSize(Math.max(3.5, cell*0.22)); doc.setFont('helvetica','bold'); doc.setTextColor(60,40,120);
    for (const [key,sum] of Object.entries(tlMap)) {
      const [r,c]=key.split(',').map(Number);
      doc.text(String(sum),x+c*cell+1,GY+r*cell+cell*0.28);
    }
  }

  /* ── Inequality ── */
  function drawInequality(doc, p, aw, ah) {
    const n=9;
    // Leave room for signs between cells (each sign ~3mm gap)
    const signGap = 3;
    const cell = Math.min((aw - signGap*(n-1))/n, (ah - signGap*(n-1))/n);
    const totalW = cell*n + signGap*(n-1);
    const totalH = cell*n + signGap*(n-1);
    const x0 = M + (aw - totalW)/2;

    // Draw cells
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) {
      const cx = x0 + c*(cell+signGap), cy = GY + r*(cell+signGap);
      if (p.puzzle[r][c]) {
        doc.setFillColor(235,230,255); doc.rect(cx,cy,cell,cell,'F');
      } else {
        doc.setFillColor(252,252,255); doc.rect(cx,cy,cell,cell,'F');
      }
      // Cell border
      const boxTop=r%3===0,boxBot=r%3===2,boxL=c%3===0,boxR=c%3===2;
      doc.setDrawColor(80,60,160);
      doc.setLineWidth(boxTop?0.8:0.2); doc.line(cx,cy,cx+cell,cy);
      doc.setLineWidth(boxBot?0.8:0.2); doc.line(cx,cy+cell,cx+cell,cy+cell);
      doc.setLineWidth(boxL?0.8:0.2);  doc.line(cx,cy,cx,cy+cell);
      doc.setLineWidth(boxR?0.8:0.2);  doc.line(cx+cell,cy,cx+cell,cy+cell);
      // Number
      if (p.puzzle[r][c]) {
        doc.setFontSize(Math.max(6,cell*0.52)); doc.setFont('helvetica','bold'); doc.setTextColor(25,18,60);
        doc.text(String(p.puzzle[r][c]),cx+cell/2,cy+cell*0.66,{align:'center'});
      }
    }
    // Horizontal signs
    doc.setFontSize(Math.max(4,signGap*0.9)); doc.setFont('helvetica','bold'); doc.setTextColor(80,60,160);
    for (let r=0;r<n;r++) for (let c=0;c<n-1;c++) {
      const cx = x0 + (c+1)*(cell+signGap) - signGap/2;
      const cy = GY + r*(cell+signGap) + cell/2 + 0.8;
      doc.text(p.hc[r][c]==='<'?'<':'>', cx, cy, {align:'center'});
    }
    // Vertical signs
    for (let r=0;r<n-1;r++) for (let c=0;c<n;c++) {
      const cx = x0 + c*(cell+signGap) + cell/2;
      const cy = GY + (r+1)*(cell+signGap) - signGap/2 + 1;
      doc.text(p.vc[r][c]==='^'?'^':'v', cx, cy, {align:'center'});
    }
  }

  /* ── Setup ── */
  document.addEventListener('DOMContentLoaded', () => {
    if (listenersAttached) return;
    listenersAttached = true;
    const list = document.getElementById('pdf-rows');
    if (list && list.children.length === 0) addRow();
    document.getElementById('pdf-add-row')?.addEventListener('click', addRow);
    document.getElementById('pdf-generate')?.addEventListener('click', generatePdf);
  });

  return { init };
})();
