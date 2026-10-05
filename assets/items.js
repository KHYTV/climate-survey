// 설문 문항과 비교 기준값(단위: %).
// KEI 값은 「우리국민의 기후변화인식: 현황과 진단」(한국환경연구원, 방송학회 발표자료) 슬라이드에서 옮김.
window.CS = window.CS || {};

CS.SOURCES = {
  kei: {
    label: '한국 국민',
    detail: 'KEI 국민환경의식조사 2023 · 만 19–69세 · N=3,088 · 2023.9.21–28',
    url: 'https://www.kei.re.kr',
  },
  us: {
    label: '미국 국민',
    detail: 'Climate Change in the American Mind · 2025.11.6–14 · N=1,146',
    url: 'https://climatecommunication.gmu.edu/all/climate-change-in-the-american-mind-beliefs-attitudes-fall-2025/',
  },
  usSeg: {
    label: '미국 국민',
    detail: 'Global Warming’s Six Americas · 2025.5.1–12 (반올림으로 합계 101%)',
    url: 'https://climatecommunication.gmu.edu/all/top-public-worries-in-the-u-s/',
  },
};

const HARM_SASSY = [
  [4, '매우 많이', 'A great deal'],
  [3, '어느 정도', 'A moderate amount'],
  [2, '조금', 'Only a little'],
  [1, '전혀', 'Not at all'],
  [0, '모르겠다', "Don't know"],
];

// A. SASSY 4문항 — Yale Program on Climate Change Communication (Chryst et al., 2018)
CS.SASSY = [
  {
    id: 'important',
    text: '지구온난화는 당신 개인에게 얼마나 중요한 문제입니까?',
    options: [
      [5, '매우 중요하다', 'Extremely important'],
      [4, '꽤 중요하다', 'Very important'],
      [3, '어느 정도 중요하다', 'Somewhat important'],
      [2, '별로 중요하지 않다', 'Not too important'],
      [1, '전혀 중요하지 않다', 'Not at all important'],
    ],
    top: [5, 4], chartLabel: '개인적으로 중요하다 (매우·꽤)', us: 31,
    usDist: [12, 19, 29, 18, 22], // 미국 전체 분포 (보기 순서대로)
  },
  {
    id: 'worry',
    text: '지구온난화에 대해 얼마나 걱정하십니까?',
    options: [
      [4, '매우 걱정된다', 'Very worried'],
      [3, '어느 정도 걱정된다', 'Somewhat worried'],
      [2, '별로 걱정되지 않는다', 'Not very worried'],
      [1, '전혀 걱정되지 않는다', 'Not at all worried'],
    ],
    top: [4, 3], chartLabel: '걱정된다 (매우·어느 정도)', us: 64,
  },
  {
    id: 'personal',
    text: '지구온난화가 당신 개인에게 얼마나 피해를 줄 것이라고 생각하십니까?',
    options: HARM_SASSY,
    top: [4, 3], chartLabel: '나에게 피해 (매우 많이·어느 정도)', us: 44,
  },
  {
    id: 'future',
    text: '지구온난화가 미래 세대 사람들에게 얼마나 피해를 줄 것이라고 생각하십니까?',
    options: HARM_SASSY,
    top: [4, 3], chartLabel: '미래 세대에 피해 (매우 많이·어느 정도)', us: 68,
  },
];

// B. KEI 국민환경의식조사 문항 (5점 척도는 ①+② / ③ / ④+⑤ 로 묶어 비교)
CS.KEI = {
  important: {
    id: 'kei_important',
    text: '“기후변화는 나에게 중요한 문제다”에 얼마나 동의하십니까?',
    options: [[5, '매우 그렇다'], [4, '그런 편이다'], [3, '보통이다'], [2, '그렇지 않은 편이다'], [1, '전혀 그렇지 않다']],
    groups: [[[5, 4], '중요하다', 82.7], [[3], '보통', 15.1], [[2, 1], '중요하지 않다', 2.2]],
  },
  harm: {
    text: '기후변화로 인해 다음 대상이 피해를 얼마나 받을 것이라고 생각하십니까?',
    options: [[5, '매우 많이 받는다'], [4, '어느 정도 받는다'], [3, '보통이다'], [2, '별로 받지 않는다'], [1, '전혀 받지 않는다']],
    short: ['매우 많이', '어느 정도', '보통', '별로', '전혀'],
    top: [5, 4],
    targets: [
      ['harm_self', '나 자신', 75.3],
      ['harm_family', '나의 가족', 77.6],
      ['harm_community', '나의 공동체 (이웃·동료·친구)', 78.1],
      ['harm_korea', '우리나라 국민', 85.7],
      ['harm_low', '저소득 국가의 국민', 87.4],
      ['harm_high', '고소득 국가의 국민', 53.7],
      ['harm_future', '미래 세대', 91.1],
      ['harm_species', '동물·식물종', 90.7],
    ],
  },
  emotions: {
    id: 'emotions', pick: 3,
    text: '기후변화를 생각할 때 드는 감정을 3개 골라 주세요.',
    options: [
      ['anxiety', '불안감', '재난이나 위험을 예측할 수 없어 불안하다', 83.1],
      ['sorry', '미안함', '미래 세대에 나쁜 환경을 물려주는 것 같아 미안하다', 55.7],
      ['helpless', '무력감', '개인의 노력으로 해결할 수 없을 것 같아 무력하다', 42.9],
      ['anger', '분노', '원인을 제공한 사람·집단·국가·기업 등에 화가 난다', 36.1],
      ['confused', '당혹감', '걱정은 되지만 어떻게 대처할지 몰라 당혹스럽다', 27.2],
      ['guilt', '죄책감', '나도 원인을 제공한 것 같아 죄책감이 든다', 25.3],
      ['depressed', '우울감', '문제가 좀처럼 해결되지 않는 것 같아 우울하다', 18.7],
      ['indifferent', '무관심', '별로 걱정하지 않아 특별한 감정이 들지 않는다', 11.0],
    ],
  },
  images: {
    id: 'images', pick: 3,
    text: '“기후변화” 하면 떠오르는 것을 3개 골라 주세요.',
    options: [
      ['temp', '평균기온 상승', '', 68.8],
      ['disaster', '이상기후로 인한 자연재해', '폭염·태풍·집중호우·가뭄 등', 66.0],
      ['sea', '해수면 상승', '', 52.2],
      ['ghg', '온실가스 증가', '', 44.5],
      ['season', '계절의 변화', '개화 시기 등', 19.3],
      ['air', '대기오염 악화', '', 15.9],
      ['disease', '감염병 유행', '', 10.5],
      ['biodiv', '생물다양성 감소', '동·식물 멸종 등', 9.7],
      ['crops', '재배 작물·과일 변화', '', 7.0],
      ['fish', '어종 변화', '', 4.5],
    ],
  },
  media: {
    id: 'media',
    text: '미디어(언론 보도 등)는 환경문제의 심각성을 어떻게 보여준다고 생각하십니까?',
    options: [
      [1, '지나치게 과장한다', 5.3],
      [2, '약간 과장한다', 21.7],
      [3, '그대로 보여준다', 47.3],
      [4, '약간 축소한다', 21.9],
      [5, '지나치게 축소한다', 3.7],
    ],
  },
  convenience: {
    id: 'convenience',
    text: '환경친화적 행동과 생활의 편리함 중 무엇이 더 우선이라고 생각하십니까?',
    options: [
      [1, '다소 불편하더라도 환경친화적 행동이 우선이다'],
      [2, '환경친화적 행동이 우선인 편이다'],
      [3, '비슷하다'],
      [4, '생활의 편리함이 우선인 편이다'],
      [5, '생활의 편리함이 우선이다'],
    ],
    groups: [[[1, 2], '환경친화적 행동 우선', 61.7], [[3], '보통', 19.3], [[4, 5], '생활의 편리함 우선', 19.0]],
  },
};

// C. Six Americas 6개 유형 (Yale SASSY 그룹 툴로 분류)
CS.SEGMENTS = [
  ['Alarmed', '경각', 26],
  ['Concerned', '우려', 27],
  ['Cautious', '신중', 19],
  ['Disengaged', '무관심', 7],
  ['Doubtful', '의심', 11],
  ['Dismissive', '부정', 11],
];

// 응답 키 전체 (제출 전 누락 확인용)
CS.allKeys = () => [
  ...CS.SASSY.map(q => q.id),
  CS.KEI.important.id,
  ...CS.KEI.harm.targets.map(t => t[0]),
  CS.KEI.emotions.id, CS.KEI.images.id, CS.KEI.media.id, CS.KEI.convenience.id,
];
