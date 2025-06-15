export const normalizeSkill = (skill: unknown): string => {
  if (typeof skill === 'string') return skill;
  if (typeof skill === 'object' && skill !== null) {
    const maybeValue = (skill as { value?: unknown }).value;
    if (typeof maybeValue === 'string') return maybeValue;
    const maybeName = (skill as { name?: unknown }).name;
    if (typeof maybeName === 'string') return maybeName;
  }
  return '';
};

export const normalizeSkillsArray = (skills: unknown): string[] =>
  Array.isArray(skills) ? skills.map(normalizeSkill).filter(Boolean) : [];
