// 선택값 → 화면에 보여줄 이름
const traitLabels = {
  new: { emoji: '🧭', label: '새로운 곳 탐험' },
  familiar: { emoji: '🛋️', label: '익숙한 곳 단골' },
  deep: { emoji: '🔍', label: '한 곳을 깊게' },
  wide: { emoji: '🎈', label: '여러 곳을 가볍게' },
  together: { emoji: '👫', label: '함께가 좋아' },
  alone: { emoji: '🎧', label: '혼자가 좋아' },
  emotional: { emoji: '💗', label: '감성 우선' },
  practical: { emoji: '✅', label: '실용 우선' },
  indoor: { emoji: '🏠', label: '실내파' },
  outdoor: { emoji: '🌳', label: '실외파' },
  active: { emoji: '👟', label: '걸어 다니는 편' },
  relax: { emoji: '☕', label: '느긋하게 머무는 편' },
  lively: { emoji: '🎉', label: '활기찬 분위기' },
  calm: { emoji: '🌙', label: '차분한 분위기' },
  popular: { emoji: '⭐', label: '유명한 곳' },
  hidden: { emoji: '🗝️', label: '숨은 곳' },
};

export function buildProfile(answers) {
  const v = Object.fromEntries(answers.map((a) => [a.id, a.value]));

  const adj = v.energy === 'active' ? '부지런한' : '느긋한';
  const mid = v.place === 'outdoor' ? '산책' : '아지트';
  const noun = v.novelty === 'new' ? '발견러' : '단골러';

  return {
    nickname: `${adj} ${mid} ${noun}`,
    traits: answers.map((a) => ({ id: a.id, ...traitLabels[a.value] })),
  };
}