// 비교 막대(가로 쌍막대) · 수치 타일 · 툴팁
window.CS_CHARTS = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (x, d = 0) => CS_STATS.fmt(x, d) + '%';

  // series: [{ key, name, cls }]  (cls: c-ours | c-kei | c-us)
  // rows:   [{ label, sub, values: { [key]: { pct, k?, n? } } }]
  function paired(el, { series, rows, note }) {
    const legend = series.map(s => `<span class="${s.cls}"><span class="key"></span>${esc(s.name)}</span>`).join('');
    const body = rows.map(r => {
      const lines = series.map(s => {
        const v = r.values[s.key];
        if (!v) return '';
        const w = Math.max(0, Math.min(100, v.pct));
        const tip = `${s.name}: ${pct(v.pct, 1)}` + (v.n != null ? ` (${v.k}/${v.n}명)` : '');
        return `<div class="pline ${s.cls}" style="--w:${w}%">
          <div class="pbar" data-tip="${esc(r.label + '\n' + tip)}"></div>
          <span class="pval">${pct(v.pct)}</span></div>`;
      }).join('');
      return `<div class="prow"><div class="plabel">${esc(r.label)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>
        <div class="pbars">${lines}</div></div>`;
    }).join('');
    const axis = `<div class="paxis"><div></div><div class="ticks">
      ${[0, 25, 50, 75, 100].map(t => `<span style="left:${t}%">${t}${t === 100 ? '%' : ''}</span>`).join('')}
      </div></div>`;
    const head = series.map(s => `<th>${esc(s.name)}</th>`).join('');
    const trs = rows.map(r => `<tr><td>${esc(r.label)}</td>${series.map(s => {
      const v = r.values[s.key];
      return `<td>${v ? pct(v.pct, 1) + (v.n != null ? ` (${v.k}/${v.n})` : '') : '–'}</td>`;
    }).join('')}</tr>`).join('');
    el.innerHTML = `<div class="legend">${legend}</div>
      <div class="pchart">${body}</div>${axis}
      ${note ? `<p class="small muted" style="margin-top:10px">${note}</p>` : ''}
      <details class="table"><summary>표로 보기</summary><table><thead><tr><th>항목</th>${head}</tr></thead><tbody>${trs}</tbody></table></details>`;
  }

  // tiles: [{ label, value, unit, cls, vs }]
  function tiles(el, list) {
    el.innerHTML = list.map(t => `<div class="tile ${t.cls || ''}">
      <div class="tlabel"><span class="who"></span>${esc(t.label)}</div>
      <div class="hero">${esc(t.value)}<span style="font-size:.5em;font-weight:600">${esc(t.unit || '')}</span></div>
      ${t.vs ? `<div class="vs">${t.vs}</div>` : ''}</div>`).join('');
  }

  // 툴팁 (마우스 올리면 정확한 값과 인원)
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
      const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
      tip.style.left = x + 'px';
      tip.style.top = (e.clientY + 16) + 'px';
    });
  }

  return { paired, tiles, initTips, esc, pct };
})();
