-- =====================================================================
-- 기후변화 인식 수업 설문 — Supabase 설정 스크립트
-- 사용법: Supabase 대시보드 → SQL Editor → 이 파일 전체 붙여넣기
--         → 맨 아래 "관리자 비밀번호" 줄을 본인 비밀번호로 바꾼 뒤 Run.
-- 여러 번 실행해도 안전합니다(비밀번호를 바꿀 때도 다시 실행).
--
-- 보안 구조
--  * 모든 표는 RLS 를 켜고 정책을 두지 않음 → 웹(anon 키)에서 표를 직접 읽거나 쓸 수 없음
--  * 웹은 아래 cs_* 함수로만 접근
--  * 이름·학번(cs_participants)과 답변(cs_responses)은 연결 키 없이 따로 저장
--    (답변 표에는 제출 시각도 남기지 않음)
-- =====================================================================

create table if not exists public.cs_sessions (
  code       text primary key check (code ~ '^[A-Z0-9]{3,12}$'),
  title      text not null default '',
  status     text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at  timestamptz
);

create table if not exists public.cs_participants (
  session_code text not null references public.cs_sessions(code) on delete cascade,
  student_id   text not null,
  name         text not null,
  submitted_at timestamptz not null default now(),
  primary key (session_code, student_id)
);

create table if not exists public.cs_responses (
  id           uuid primary key default gen_random_uuid(),
  session_code text not null references public.cs_sessions(code) on delete cascade,
  answers      jsonb not null
);
create index if not exists cs_responses_session_idx on public.cs_responses (session_code);

create table if not exists public.cs_admin (
  id       int primary key default 1 check (id = 1),
  key_hash text not null
);

alter table public.cs_sessions     enable row level security;
alter table public.cs_participants enable row level security;
alter table public.cs_responses    enable row level security;
alter table public.cs_admin        enable row level security;

revoke all on table public.cs_sessions, public.cs_participants,
                    public.cs_responses, public.cs_admin
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 내부: 관리자 비밀번호 확인
-- ---------------------------------------------------------------------
create or replace function public.cs_check_admin(p_admin_key text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_admin_key is null or p_admin_key = '' or p_admin_key = '여기에-비밀번호' then
    raise exception 'ADMIN_KEY_INVALID';
  end if;
  if not exists (
    select 1 from cs_admin
    where key_hash = encode(sha256(convert_to(p_admin_key, 'UTF8')), 'hex')
  ) then
    raise exception 'ADMIN_KEY_INVALID';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 공개: 세션 상태 (학생 화면이 몇 초마다 호출)
-- ---------------------------------------------------------------------
create or replace function public.cs_session_info(p_code text)
returns json
language sql security definer set search_path = public stable
as $$
  select json_build_object(
    'code', s.code, 'title', s.title, 'status', s.status,
    'n', (select count(*) from cs_responses r where r.session_code = s.code)
  )
  from cs_sessions s
  where s.code = upper(trim(p_code));
$$;

-- ---------------------------------------------------------------------
-- 공개: 설문 제출 (학번당 1회)
-- ---------------------------------------------------------------------
create or replace function public.cs_submit(
  p_code text, p_student_id text, p_name text, p_answers jsonb
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_code   text := upper(trim(coalesce(p_code, '')));
  v_sid    text := trim(coalesce(p_student_id, ''));
  v_name   text := trim(coalesce(p_name, ''));
  v_status text;
  v_rows   int;
begin
  select status into v_status from cs_sessions where code = v_code;
  if v_status is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_status <> 'open' then raise exception 'SESSION_CLOSED'; end if;

  if length(v_sid) not between 2 and 20 or length(v_name) not between 1 and 30 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object'
     or length(p_answers::text) > 4000 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into cs_participants (session_code, student_id, name)
  values (v_code, v_sid, v_name)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'ALREADY_SUBMITTED'; end if;

  insert into cs_responses (session_code, answers) values (v_code, p_answers);

  return json_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- 공개(종료 후) / 관리자(언제나): 익명 답변 목록
-- ---------------------------------------------------------------------
create or replace function public.cs_results(p_code text, p_admin_key text default null)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  s      cs_sessions%rowtype;
begin
  select * into s from cs_sessions where code = v_code;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if s.status <> 'closed' then
    perform cs_check_admin(p_admin_key);
  end if;
  return json_build_object(
    'code', s.code, 'title', s.title, 'status', s.status,
    'answers', coalesce(
      (select json_agg(r.answers order by r.id) from cs_responses r where r.session_code = v_code),
      '[]'::json)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 관리자 전용
-- ---------------------------------------------------------------------
create or replace function public.cs_admin_list(p_admin_key text)
returns json
language plpgsql security definer set search_path = public
as $$
begin
  perform cs_check_admin(p_admin_key);
  return coalesce((
    select json_agg(json_build_object(
      'code', s.code, 'title', s.title, 'status', s.status, 'created_at', s.created_at,
      'n', (select count(*) from cs_responses r where r.session_code = s.code)
    ) order by s.created_at desc)
    from cs_sessions s), '[]'::json);
end;
$$;

create or replace function public.cs_admin_create(p_admin_key text, p_code text, p_title text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  perform cs_check_admin(p_admin_key);
  if v_code !~ '^[A-Z0-9]{3,12}$' then raise exception 'INVALID_INPUT'; end if;
  if exists (select 1 from cs_sessions where code = v_code) then
    raise exception 'SESSION_EXISTS';
  end if;
  insert into cs_sessions (code, title) values (v_code, left(trim(coalesce(p_title, '')), 80));
  return cs_session_info(v_code);
end;
$$;

create or replace function public.cs_admin_set_status(p_admin_key text, p_code text, p_status text)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
begin
  perform cs_check_admin(p_admin_key);
  if p_status not in ('open', 'closed') then raise exception 'INVALID_INPUT'; end if;
  update cs_sessions
     set status = p_status,
         closed_at = case when p_status = 'closed' then now() else null end
   where code = v_code;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  return cs_session_info(v_code);
end;
$$;

create or replace function public.cs_admin_roster(p_admin_key text, p_code text)
returns json
language plpgsql security definer set search_path = public
as $$
begin
  perform cs_check_admin(p_admin_key);
  return coalesce((
    select json_agg(json_build_object(
      'student_id', p.student_id, 'name', p.name, 'submitted_at', p.submitted_at
    ) order by p.submitted_at)
    from cs_participants p
    where p.session_code = upper(trim(p_code))), '[]'::json);
end;
$$;

create or replace function public.cs_admin_delete(p_admin_key text, p_code text)
returns json
language plpgsql security definer set search_path = public
as $$
begin
  perform cs_check_admin(p_admin_key);
  delete from cs_sessions where code = upper(trim(p_code));
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  return json_build_object('ok', true);
end;
$$;

-- 실행 권한: 내부 함수는 막고, 나머지만 웹(anon)에 허용
revoke execute on function public.cs_check_admin(text) from public, anon, authenticated;
grant execute on function
  public.cs_session_info(text),
  public.cs_submit(text, text, text, jsonb),
  public.cs_results(text, text),
  public.cs_admin_list(text),
  public.cs_admin_create(text, text, text),
  public.cs_admin_set_status(text, text, text),
  public.cs_admin_roster(text, text),
  public.cs_admin_delete(text, text)
to anon, authenticated;

-- =====================================================================
-- ▼ 관리자 비밀번호: '여기에-비밀번호' 를 본인만 아는 문구(12자 이상)로 바꾸고 실행
-- =====================================================================
insert into public.cs_admin (id, key_hash)
values (1, encode(sha256(convert_to('여기에-비밀번호', 'UTF8')), 'hex'))
on conflict (id) do update set key_hash = excluded.key_hash;
