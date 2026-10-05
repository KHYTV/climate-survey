// 결과 슬라이드용 그래픽: 와플 VS · 덤벨 · 분포 막대 · 기울기 차트 · 툴팁
window.CS_CHARTS = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f0 = x => CS_STATS.fmt(x, 0);
  const f1 = x => CS_STATS.fmt(x, 1);
  const cnt = v => (v && v.n != null ? ` (${v.k}/${v.n}명)` : '');
  const dlt = d => (Math.round(Math.abs(d)) === 0 ? '0' : `${d > 0 ? '+' : '−'}${f0(Math.abs(d))}`);

  function deltaText(d, who) {
    if (Math.abs(d) < 1) return `${who}과 거의 같음`;
    return `우리 반이 ${who}보다 ${d > 0 ? '높음' : '낮음'}`;
  }

  // 10×10 와플 (1칸 = 1%)
  function waffle(pct) {
    const on = Math.round(Math.max(0, Math.min(100, pct)));
    let cells = '';
    for (let i = 0; i < 100; i++) cells += `<i${i < on ? ' class="on"' : ''}></i>`;
    return `<div class="waffle" role="img" aria-label="100칸 중 ${on}칸">${cells}</div>`;
  }

  // 핵심 비율 하나를 두 집단이 나란히: [와플 | 차이 | 와플]
  function vs(el, { label, left, right, compact }) {
    const d = left.pct - right.pct;
    const side = s => `<div class="vs-side ${s.cls}">
        <div class="vs-name"><span class="key"></span>${esc(s.name)}</div>
        <div class="vs-num">${f0(s.pct)}<small>%</small></div>
        ${compact ? '' : waffle(s.pct)}
        <div class="vs-sub">${s.n != null ? `${s.k} / ${s.n}명` : esc(s.note || '')}</div>
      </div>`;
    el.innerHTML = `<p class="vs-label">${esc(label)}</p>
      <div class="vs">${side(left)}
        <div class="vs-mid">
          <div class="delta ${Math.abs(d) >= 10 ? 'big' : ''}">${Math.abs(d) < 1 ? '≈' : (d > 0 ? '▲' : '▼')}<b>${f0(Math.abs(d))}</b><small>%p</small></div>
          <div class="delta-txt">${esc(deltaText(d, right.name))}</div>
        </div>${side(right)}</div>`;
  }

  // 덤벨: 항목마다 두 점을 선으로 이어 격차를 강조
  function dumbbell(el, { a, b, rows, note }) {
    const gaps = rows.map(r => r.a.pct - r.b.pct);
    const maxI = gaps.reduce((m, g, i) => (Math.abs(g) > Math.abs(gaps[m]) ? i : m), 0);
    const body = rows.map((r, i) => {
      const x1 = r.a.pct, x2 = r.b.pct, lo = Math.min(x1, x2), hi = Math.max(x1, x2);
      const aRight = x1 >= x2; // 큰 쪽 값은 바깥(오른쪽), 작은 쪽 값은 왼쪽에 표시
      const lab = (x, onRight, cls, txt) => onRight
        ? `<span class="dval ${cls}" style="left:calc(${x}% + 11px)">${txt}</span>`
        : `<span class="dval ${cls}" style="right:calc(${100 - x}% + 11px)">${txt}</span>`;
      const g = gaps[i];
      return `<div class="drow${i === maxI && Math.abs(g) >= 5 ? ' top' : ''}">
        <div class="dlabel">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>
        <div class="dtrack">
          <div class="dline" style="left:${lo}%;width:${hi - lo}%"></div>
          <span class="ddot ${b.cls}" style="left:${x2}%" data-tip="${esc(`${r.label}\n${b.name}: ${f1(x2)}%`)}"></span>
          <span class="ddot ${a.cls}" style="left:${x1}%" data-tip="${esc(`${r.label}\n${a.name}: ${f1(x1)}%${cnt(r.a)}`)}"></span>
          ${lab(x1, aRight, 'a', f0(x1))}${lab(x2, !aRight, 'b', f0(x2))}
        </div>
        <div class="dgap${Math.abs(g) >= 10 ? ' big' : ''}">${dlt(g)}<small>%p</small></div>
      </div>`;
    }).join('');
    el.innerHTML = `<div class="legend"><span class="${a.cls}"><span class="key dot"></span>${esc(a.name)}</span>
        <span class="${b.cls}"><span class="key dot"></span>${esc(b.name)}</span>
        <span class="muted">오른쪽 숫자 = 우리 반 − ${esc(b.name)}</span></div>
      <div class="dchart">${body}
        <div class="drow axis"><div></div><div class="dtrack ticks">${[0, 25, 50, 75, 100].map(t => `<span style="left:${t}%">${t}${t === 100 ? '%' : ''}</span>`).join('')}</div><div></div></div>
      </div>${note ? `<p class="note">${note}</p>` : ''}${table(rows.map(r => [r.label, r.a, r.b]), [a.name, b.name])}`;
  }

  // 100% 분포 막대 (집단별 한 줄)
  function stack(el, { cats, rows, note }) {
    const legend = cats.map(c => `<span><span class="key" style="background:${c.color}"></span>${esc(c.label)}</span>`).join('');
    const body = rows.map(r => {
      const segs = r.parts.map((p, i) => p <= 0 ? '' : `<div class="sseg" style="flex-grow:${p};background:${cats[i].color};color:${cats[i].ink || '#0b0b0b'}"
          data-tip="${esc(`${r.name} · ${cats[i].label}\n${f1(p)}%${r.counts ? ` (${r.counts[i]}/${r.n}명)` : ''}`)}">${p >= 7 ? f0(p) + '%' : ''}</div>`).join('');
      return `<div class="srow"><div class="sname ${r.cls}"><span class="key"></span>${esc(r.name)}</div><div class="sbar">${segs}</div></div>`;
    }).join('');
    el.innerHTML = `<div class="legend">${legend}</div><div class="schart">${body}</div>${note ? `<p class="note">${note}</p>` : ''}` +
      table(cats.map((c, i) => [c.label, ...rows.map(r => ({ pct: r.parts[i], k: r.counts && r.counts[i], n: r.n }))]), rows.map(r => r.name), true);
  }

  // 기울기 차트: 왼쪽 값 → 오른쪽 값 (예: 나 자신 → 미래 세대)
  function slope(el, { title, left, right, lines }) {
    const W = 420, H = 300, X1 = 110, X2 = 310, top = 24, bot = 272;
    const y = v => bot - (v / 100) * (bot - top);
    const spread = (vals) => { // 겹치는 라벨을 위아래로 벌림
      const ys = vals.map(v => y(v)); const order = ys.map((v, i) => i).sort((p, q) => ys[p] - ys[q]);
      for (let k = 1; k < order.length; k++) { const p = order[k - 1], q = order[k]; if (ys[q] - ys[p] < 20) ys[q] = ys[p] + 20; }
      return ys;
    };
    const ly = spread(lines.map(l => l.a)), ry = spread(lines.map(l => l.b));
    const grid = [0, 25, 50, 75, 100].map(t => `<line x1="${X1 - 58}" x2="${X2}" y1="${y(t)}" y2="${y(t)}" class="sgrid"/><text x="${X1 - 80}" y="${y(t) + 4}" class="stick">${t}</text>`).join('');
    const ls = lines.map((l, i) => `<g class="${l.cls}">
        <line x1="${X1}" y1="${y(l.a)}" x2="${X2}" y2="${y(l.b)}" class="sline"/>
        <circle cx="${X1}" cy="${y(l.a)}" r="7" class="sdot"/><circle cx="${X2}" cy="${y(l.b)}" r="7" class="sdot"/>
        <text x="${X1 - 14}" y="${ly[i] + 5}" text-anchor="end" class="sval">${f0(l.a)} <tspan class="smark">●</tspan></text>
        <text x="${X2 + 14}" y="${ry[i] + 5}" class="sval"><tspan class="smark">●</tspan> ${f0(l.b)} <tspan class="sgap">(${dlt(l.b - l.a)}%p)</tspan></text>
      </g>`).join('');
    el.innerHTML = `<div class="slope"><div class="slope-title">${esc(title)}</div>
      <div class="legend">${lines.map(l => `<span class="${l.cls}"><span class="key dot"></span>${esc(l.name)}</span>`).join('')}</div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${grid}
        <text x="${X1}" y="${H - 4}" text-anchor="middle" class="saxis">${esc(left)}</text>
        <text x="${X2}" y="${H - 4}" text-anchor="middle" class="saxis">${esc(right)}</text>${ls}</svg></div>`;
  }

  function table(rows, heads, isStack) {
    const cell = v => (v == null ? '–' : `${f1(v.pct)}%${v.n != null && v.k != null ? ` (${v.k}/${v.n})` : ''}`);
    return `<details class="table"><summary>표로 보기</summary><table><thead><tr><th>항목</th>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(([label, ...vals]) => `<tr><td>${esc(label)}</td>${vals.map(v => `<td>${cell(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
  }

  // 툴팁
  function initTips() {
    if (document.getElementById('tip')) return;
    const tip = document.createElement('div');
    tip.id = 'tip';
    tip.hidden = true;
    document.body.appendChild(tip);
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-tip]');
      if (!t) { tip.hidden = true; return; }
      tip.textContent = t.dataset.tip;
      tip.hidden = false;
    });
    document.addEventListener('mousemove', e => {
      if (tip.hidden) return;
      tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + 'px';
      tip.style.top = (e.clientY + 16) + 'px';
    });
  }

  return { vs, dumbbell, stack, slope, waffle, initTips, esc, dlt, f0 };
})();
