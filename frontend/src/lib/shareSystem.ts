export const SYSTEM_SHARE_TAG_RESUME = "sys-resume-share";
export const SYSTEM_SHARE_TAG_PORTFOLIO = "sys-portfolio-share";
export const SYSTEM_SHARE_TAG_WHITEBOOK = "sys-whitebook-share";
export const SYSTEM_SHARE_TAG_STUDY_NOTES = "sys-study-notes-share";
export const SYSTEM_SHARE_TAG_BUGFIX_RESULT = "sys-bugfix-result-share";
export const SYSTEM_SHARE_TAG_AI_TEACHER_PLAYAREA = "sys-ai-teacher-playarea";

export function isResumeSharePost(tags?: string[] | null) {
  if (!tags || !Array.isArray(tags)) {
    return false;
  }
  return tags.includes(SYSTEM_SHARE_TAG_RESUME);
}

export function isPortfolioSharePost(tags?: string[] | null) {
  if (!tags || !Array.isArray(tags)) {
    return false;
  }
  return tags.includes(SYSTEM_SHARE_TAG_PORTFOLIO);
}

export function isWhitebookSharePost(tags?: string[] | null) {
  if (!tags || !Array.isArray(tags)) {
    return false;
  }
  return tags.includes(SYSTEM_SHARE_TAG_WHITEBOOK);
}

export function isStudyNotesSharePost(tags?: string[] | null) {
  if (!tags || !Array.isArray(tags)) {
    return false;
  }
  return tags.includes(SYSTEM_SHARE_TAG_STUDY_NOTES);
}

export function isBugFixResultSharePost(tags?: string[] | null) {
  if (!tags || !Array.isArray(tags)) {
    return false;
  }
  return tags.includes(SYSTEM_SHARE_TAG_BUGFIX_RESULT);
}

export function isAiTeacherPlayAreaSharePost(tags?: string[] | null) {
  if (!tags || !Array.isArray(tags)) {
    return false;
  }
  return tags.includes(SYSTEM_SHARE_TAG_AI_TEACHER_PLAYAREA);
}

export function isSystemShareTag(tag: string) {
  return (
    tag === SYSTEM_SHARE_TAG_RESUME ||
    tag === SYSTEM_SHARE_TAG_PORTFOLIO ||
    tag === SYSTEM_SHARE_TAG_WHITEBOOK ||
    tag === SYSTEM_SHARE_TAG_STUDY_NOTES ||
    tag === SYSTEM_SHARE_TAG_BUGFIX_RESULT ||
    tag === SYSTEM_SHARE_TAG_AI_TEACHER_PLAYAREA
  );
}
