// Supabase 프로젝트 설정: 대시보드 → Project Settings → API (또는 Connect)
//  - SUPABASE_URL : Project URL (https://xxxx.supabase.co)
//  - SUPABASE_KEY : publishable 키(sb_publishable_...) 또는 legacy anon 키
// 이 키는 브라우저에 공개되도록 만들어진 키입니다. service_role / secret 키는 절대 넣지 마세요.
window.CS_CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_KEY: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  MIN_N: 5, // 응답이 이보다 적으면 결과를 공개하지 않음(익명성 보호)
};
