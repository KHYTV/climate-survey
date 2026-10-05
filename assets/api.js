// 서버 호출 래퍼. 주소에 ?demo=1 을 붙이면 서버 없이 가짜 데이터로 동작(리허설용).
window.CS_API = (() => {
  const DEMO = new URLSearchParams(location.search).has('demo');

  const MESSAGES = {
    SESSION_NOT_FOUND: '참여 코드를 찾을 수 없습니다. 코드를 다시 확인해 주세요.',
    SESSION_CLOSED: '설문이 이미 종료되었습니다.',
    ALREADY_SUBMITTED: '이 학번으로 이미 제출되었습니다.',
    INVALID_INPUT: '입력값을 확인해 주세요.',
    ADMIN_KEY_INVALID: '관리자 비밀번호가 맞지 않습니다.',
    SESSION_EXISTS: '이미 있는 참여 코드입니다. 다른 코드를 쓰세요.',
    CONFIG_MISSING: 'Supabase 설정(assets/config.js)이 아직 비어 있습니다.',
  };

  function friendly(e) {
    const msg = String((e && e.message) || e);
    for (const code in MESSAGES) {
      if (msg.includes(code)) return Object.assign(new Error(MESSAGES[code]), { code });
    }
    if (/fetch|network|load failed/i.test(msg)) {
      return Object.assign(new Error('서버에 연결할 수 없습니다. 네트워크를 확인해 주세요.'), { code: 'NETWORK' });
    }
    return Object.assign(new Error('오류가 발생했습니다: ' + msg), { code: 'UNKNOWN' });
  }

  let client = null;
  function db() {
    const cfg = window.CS_CONFIG || {};
    if (!window.supabase || !cfg.SUPABASE_URL || cfg.SUPABASE_URL.startsWith('YOUR_')) {
      throw new Error('CONFIG_MISSING');
    }
    if (!client) {
      client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
    }
    return client;
  }

  async function rpc(fn, args) {
    try {
      const { data, error } = await db().rpc(fn, args);
      if (error) throw new Error(error.message || JSON.stringify(error));
      return data;
    } catch (e) {
      throw friendly(e);
    }
  }

  const real = {
    sessionInfo: code => rpc('cs_session_info', { p_code: code }),
    submit: (code, sid, name, answers) =>
      rpc('cs_submit', { p_code: code, p_student_id: sid, p_name: name, p_answers: answers }),
    results: (code, key) => rpc('cs_results', { p_code: code, p_admin_key: key || null }),
    adminList: key => rpc('cs_admin_list', { p_admin_key: key }),
    adminCreate: (key, code, title) => rpc('cs_admin_create', { p_admin_key: key, p_code: code, p_title: title }),
    adminSetStatus: (key, code, status) => rpc('cs_admin_set_status', { p_admin_key: key, p_code: code, p_status: status }),
    adminRoster: (key, code) => rpc('cs_admin_roster', { p_admin_key: key, p_code: code }),
    adminDelete: (key, code) => rpc('cs_admin_delete', { p_admin_key: key, p_code: code }),
  };

  // ---- 데모 백엔드 (이 탭 안에서만 유지) ----
  const wait = (ms = 250) => new Promise(r => setTimeout(r, ms));
  const demoState = {
    sessions: {
      DEMO: { code: 'DEMO', title: '데모 수업 (가짜 응답 38명)', status: 'open', answers: null, created_at: new Date().toISOString() },
    },
    submittedAt: 0,
  };
  const demoSession = code => {
    const s = demoState.sessions[String(code || '').trim().toUpperCase()];
    if (!s) throw Object.assign(new Error(MESSAGES.SESSION_NOT_FOUND), { code: 'SESSION_NOT_FOUND' });
    if (!s.answers) s.answers = s.code === 'DEMO' ? CS_STATS.demoAnswers(38) : [];
    return s;
  };
  const info = s => ({ code: s.code, title: s.title, status: s.status, n: s.answers.length });
  const demo = {
    async sessionInfo(code) {
      await wait();
      try {
        const s = demoSession(code);
        // 학생 화면 리허설: 제출 6초 뒤 '종료'로 바뀜
        if (demoState.submittedAt && Date.now() - demoState.submittedAt > 6000) s.status = 'closed';
        return info(s);
      } catch { return null; }
    },
    async submit(code, sid, name, answers) {
      await wait(500);
      const s = demoSession(code);
      if (s.status !== 'open') throw Object.assign(new Error(MESSAGES.SESSION_CLOSED), { code: 'SESSION_CLOSED' });
      s.answers.push(answers);
      demoState.submittedAt = Date.now();
      return { ok: true };
    },
    async results(code) {
      await wait();
      const s = demoSession(code);
      return { code: s.code, title: s.title, status: 'closed', answers: s.answers };
    },
    async adminList() {
      await wait();
      return Object.values(demoState.sessions).map(s => { demoSession(s.code); return { ...info(s), created_at: s.created_at }; });
    },
    async adminCreate(key, code, title) {
      await wait();
      code = code.trim().toUpperCase();
      if (demoState.sessions[code]) throw Object.assign(new Error(MESSAGES.SESSION_EXISTS), { code: 'SESSION_EXISTS' });
      demoState.sessions[code] = { code, title, status: 'open', answers: [], created_at: new Date().toISOString() };
      return info(demoSession(code));
    },
    async adminSetStatus(key, code, status) {
      await wait();
      const s = demoSession(code);
      s.status = status;
      return info(s);
    },
    async adminRoster(key, code) {
      await wait();
      const s = demoSession(code);
      const t0 = Date.now() - s.answers.length * 9000;
      return s.answers.map((_, i) => ({
        student_id: String(2026100 + i),
        name: '학생' + String(i + 1).padStart(2, '0'),
        submitted_at: new Date(t0 + i * 9000).toISOString(),
      }));
    },
    async adminDelete(key, code) {
      await wait();
      delete demoState.sessions[String(code).toUpperCase()];
      return { ok: true };
    },
  };

  return Object.assign(DEMO ? demo : real, { DEMO });
})();
