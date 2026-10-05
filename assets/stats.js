// 집계 · CSV · 데모 데이터
window.CS_STATS = (() => {
  // 응답 중 vals 에 해당하는 비율 (해당 문항에 답한 사람이 분모)
  function share(answers, id, vals) {
    let k = 0, n = 0;
    for (const a of answers) {
      const v = a[id];
      if (v === undefined || v === null) continue;
      n++;
      if (vals.includes(v)) k++;
    }
    return { k, n, pct: n ? (k / n) * 100 : 0 };
  }

  // 복수선택 문항에서 opt 를 고른 사람의 비율
  function picked(answers, id, opt) {
    let k = 0, n = 0;
    for (const a of answers) {
      if (!Array.isArray(a[id])) continue;
      n++;
      if (a[id].includes(opt)) k++;
    }
    return { k, n, pct: n ? (k / n) * 100 : 0 };
  }

  const fmt = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d).toFixed(d);

  // ---- CSV ----
  const csvCell = v => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const toCsv = rows => rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
  }

  // Yale SASSY 그룹 툴 입력 형식: casenumber, important, worry, personal, future (영문 원문 응답)
  function sassyCsv(answers) {
    const label = (q, v) => (q.options.find(o => o[0] === v) || [])[2] || '';
    const rows = [['casenumber', 'important', 'worry', 'personal', 'future']];
    answers.forEach((a, i) => rows.push([i + 1, ...CS.SASSY.map(q => label(q, a[q.id]))]));
    return toCsv(rows);
  }

  // 통계분석용 익명 원자료: 응답자 1명 = 1행. resp_no 는 SASSY CSV 의 casenumber 와 같은 순서.
  // 단일선택은 숫자 코드, 3개 선택 문항은 보기별 0/1 더미 변수.
  function rawColumns() {
    const K = CS.KEI;
    const v = id => [id, a => (a[id] ?? '')];
    const pick = (q, prefix) => q.options.map(([val]) => [prefix + val,
      a => (Array.isArray(a[q.id]) ? (a[q.id].includes(val) ? 1 : 0) : '')]);
    return [
      ...CS.SASSY.map(q => v(q.id)),
      v(K.important.id),
      ...K.harm.targets.map(t => v(t[0])),
      ...pick(K.emotions, 'emo_'),
      ...pick(K.images, 'img_'),
      v(K.media.id),
      v(K.convenience.id),
    ];
  }

  // date: 설문일 'YYYYMMDD' → id = 20261006-001 형식 (이름·학번과 연결되지 않는 익명 ID)
  function rawCsv(answers, session, date) {
    const cols = rawColumns();
    const rows = [['id', 'resp_no', 'session', ...cols.map(c => c[0])]];
    answers.forEach((a, i) =>
      rows.push([`${date}-${String(i + 1).padStart(3, '0')}`, i + 1, session, ...cols.map(c => c[1](a))]));
    return toCsv(rows);
  }

  const ymd = d => {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  };

  function codebookCsv() {
    const K = CS.KEI;
    const vals = opts => opts.map(o => `${o[0]}=${o[1]}${o[2] && typeof o[2] === 'string' ? ` (${o[2]})` : ''}`).join('; ');
    const rows = [['variable', 'question', 'type', 'values']];
    rows.push(['id', '응답 ID = 설문일(세션 생성일, YYYYMMDD) + 응답 순번(001~). 이름·학번과 연결되지 않는 익명 ID', 'text', '예: 20261006-001']);
    rows.push(['resp_no', '응답 순번. 같은 세션의 SASSY 분류용 CSV casenumber와 같은 번호', 'id', '']);
    rows.push(['session', '세션(참여) 코드', 'text', '']);
    CS.SASSY.forEach(q => rows.push([q.id, `[Yale SASSY] ${q.text}`, '단일선택',
      vals(q.options) + (q.options.some(o => o[0] === 0) ? ' — 0(모르겠다)은 분석 시 결측 처리 검토' : '')]));
    rows.push([K.important.id, `[KEI] ${K.important.text}`, '단일선택(5점)', vals(K.important.options)]);
    K.harm.targets.forEach(([id, label]) =>
      rows.push([id, `[KEI] ${K.harm.text} — ${label}`, '단일선택(5점)', vals(K.harm.options)]));
    K.emotions.options.forEach(([v, label, desc]) =>
      rows.push(['emo_' + v, `[KEI] ${K.emotions.text} — ${label}: ${desc}`, '0/1 (3개 선택)', '1=선택, 0=선택 안 함']));
    K.images.options.forEach(([v, label, desc]) =>
      rows.push(['img_' + v, `[KEI] ${K.images.text} — ${label}${desc ? ` (${desc})` : ''}`, '0/1 (3개 선택)', '1=선택, 0=선택 안 함']));
    rows.push([K.media.id, `[KEI] ${K.media.text}`, '단일선택(5점)', K.media.options.map(o => `${o[0]}=${o[1]}`).join('; ')]);
    rows.push([K.convenience.id, `[KEI] ${K.convenience.text}`, '단일선택(5점)', K.convenience.options.map(o => `${o[0]}=${o[1]}`).join('; ')]);
    return toCsv(rows);
  }

  // Yale 툴이 돌려준 CSV에서 6개 유형 열을 찾아 개수를 셈
  function segmentCounts(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('CSV에 데이터가 없습니다.');
    const names = CS.SEGMENTS.map(s => s[0].toLowerCase());
    const width = Math.max(...rows.map(r => r.length));
    let best = -1, bestHits = 0;
    for (let c = 0; c < width; c++) {
      const hits = rows.filter(r => names.includes(String(r[c] || '').trim().toLowerCase())).length;
      if (hits > bestHits) { best = c; bestHits = hits; }
    }
    if (best < 0) throw new Error('Alarmed·Concerned 등 유형 이름이 들어 있는 열을 찾지 못했습니다.');
    const counts = Object.fromEntries(CS.SEGMENTS.map(s => [s[0], 0]));
    for (const r of rows) {
      const v = String(r[best] || '').trim().toLowerCase();
      const seg = CS.SEGMENTS.find(s => s[0].toLowerCase() === v);
      if (seg) counts[seg[0]]++;
    }
    return { counts, n: bestHits };
  }

  function download(filename, text, bom = false) {
    const blob = new Blob([(bom ? '﻿' : '') + text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---- 데모 응답 (리허설·화면 점검용) ----
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function demoAnswers(n = 38, seed = 2026) {
    const r = rng(seed);
    const gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, Math.round(x)));
    const weighted = (items, w) => {
      let t = w.reduce((a, b) => a + b, 0), x = r() * t;
      for (let i = 0; i < items.length; i++) { x -= w[i]; if (x <= 0) return i; }
      return items.length - 1;
    };
    const pickK = (opts, k) => {
      const pool = opts.slice(), out = [];
      while (out.length < k && pool.length) {
        const i = weighted(pool, pool.map(o => o[3]));
        out.push(pool[i][0]);
        pool.splice(i, 1);
      }
      return out;
    };
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = Math.max(0, Math.min(1, 0.6 + 0.22 * gauss()));
      const a = {
        important: clamp(1 + 4 * c + 0.7 * gauss(), 1, 5),
        worry: clamp(1 + 3 * c + 0.6 * gauss(), 1, 4),
        personal: r() < 0.06 ? 0 : clamp(1 + 3 * (c - 0.1) + 0.7 * gauss(), 1, 4),
        future: r() < 0.04 ? 0 : clamp(1 + 3 * (c + 0.2) + 0.6 * gauss(), 1, 4),
        kei_important: clamp(1 + 4 * (c + 0.1) + 0.7 * gauss(), 1, 5),
        emotions: pickK(CS.KEI.emotions.options, 3),
        images: pickK(CS.KEI.images.options, 3),
        media: CS.KEI.media.options[weighted(CS.KEI.media.options, CS.KEI.media.options.map(o => o[2]))][0],
        convenience: clamp(3 - 2.4 * (c - 0.5) + 0.9 * gauss(), 1, 5),
      };
      for (const [key, , p] of CS.KEI.harm.targets) {
        const pr = Math.max(0.02, Math.min(0.98, p / 100 + (c - 0.6) * 0.6 - 0.04));
        a[key] = r() < pr ? (r() < 0.3 + 0.4 * c ? 5 : 4) : (r() < 0.75 ? 3 : r() < 0.7 ? 2 : 1);
      }
      out.push(a);
    }
    return out;
  }

  // 데모용: Yale 툴 결과처럼 보이는 유형 분포 (실제 분류 아님)
  function demoSegmentsCsv(answers) {
    const rows = [['casenumber', 'segment']];
    answers.forEach((a, i) => {
      const s = (a.important || 0) + (a.worry || 0) + (a.future || 0);
      const seg = s >= 12 ? 'Alarmed' : s >= 10 ? 'Concerned' : s >= 8 ? 'Cautious'
        : a.personal === 0 ? 'Disengaged' : s >= 6 ? 'Doubtful' : 'Dismissive';
      rows.push([i + 1, seg]);
    });
    return toCsv(rows);
  }

  return { share, picked, fmt, toCsv, parseCsv, sassyCsv, rawCsv, codebookCsv, ymd, segmentCounts, download, demoAnswers, demoSegmentsCsv };
})();
