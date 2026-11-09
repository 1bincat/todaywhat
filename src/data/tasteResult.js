// 선택값 → 화면에 보여줄 이름 (mark: 도장 배지에 들어갈 한 글자)
const traitLabels = {
  new: {label: '새로운 곳 탐험' },
  familiar: { label: '익숙한 곳 단골' },
  deep: {label: '한 곳을 깊게' },
  wide: { label: '여러 곳을 가볍게' },
  together: { label: '함께가 좋아' },
  alone: {label: '혼자가 좋아' },
  emotional: {label: '감성 우선' },
  practical: {label: '실용 우선' },
  indoor: { label: '실내파' },
  outdoor: {label: '실외파' },
  active: { label: '걸어 다니는 편' },
  relax: { label: '느긋하게 머무는 편' },
  lively: { label: '활기찬 분위기' },
  calm: { label: '차분한 분위기' },
  popular: { label: '유명한 곳' },
  hidden: { label: '숨은 곳' },
};

export function buildProfile(answers) {
  const v = Object.fromEntries(answers.map((a) => [a.id, a.value]));

  const adj = v.energy === 'active' ? '부지런한' : '느긋한';
  const mid = v.place === 'outdoor' ? '산책' : '아지트';
  const noun = v.novelty === 'new' ? '발견러' : '단골러';

  return {
    nickname: `${adj} ${mid} ${noun}`,
   traits: answers.map((a) => ({ id: a.id, value: a.value, ...traitLabels[a.value] })),
  };
}