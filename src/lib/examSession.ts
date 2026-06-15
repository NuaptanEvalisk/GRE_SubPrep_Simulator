import type { ExamAttemptState, QuestionBank, SessionMode } from '../types';

export const EXAM_DURATION_SECONDS = 170 * 60;
const STORAGE_KEY = 'gre-subprep:active-session:v1';

function buildEmptyAnswers(bank: QuestionBank): Record<string, null> {
  return bank.questions.reduce<Record<string, null>>((accumulator, question) => {
    accumulator[question.id] = null;
    return accumulator;
  }, {});
}

export function createFreshAttempt(bank: QuestionBank, mode: SessionMode): ExamAttemptState {
  const now = new Date().toISOString();

  return {
    bankId: bank.id,
    mode,
    startedAt: now,
    persistedAt: now,
    currentQuestionIndex: 0,
    answers: buildEmptyAnswers(bank),
    markedQuestionIds: [],
    remainingSeconds: EXAM_DURATION_SECONDS,
    submitted: false,
  };
}

export function loadAttempt(): ExamAttemptState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ExamAttemptState>;
    return {
      ...parsed,
      mode: parsed.mode === 'practice' ? 'practice' : 'exam',
    } as ExamAttemptState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function hydrateAttempt(
  attempt: ExamAttemptState,
  bank: QuestionBank,
): ExamAttemptState {
  const nowMs = Date.now();
  const persistedAtMs = Date.parse(attempt.persistedAt);
  const elapsedSeconds = Number.isNaN(persistedAtMs)
    ? 0
    : Math.max(0, Math.floor((nowMs - persistedAtMs) / 1000));

  const hydratedAnswers = { ...buildEmptyAnswers(bank), ...attempt.answers };
  const mode = attempt.mode === 'practice' ? 'practice' : 'exam';
  const remainingSeconds = attempt.submitted || mode === 'practice'
    ? attempt.remainingSeconds
    : Math.max(0, attempt.remainingSeconds - elapsedSeconds);

  return {
    ...attempt,
    mode,
    answers: hydratedAnswers,
    markedQuestionIds: attempt.markedQuestionIds.filter((questionId) =>
      bank.questions.some((question) => question.id === questionId),
    ),
    currentQuestionIndex: Math.min(
      Math.max(0, attempt.currentQuestionIndex),
      Math.max(0, bank.questions.length - 1),
    ),
    remainingSeconds,
    persistedAt: new Date().toISOString(),
  };
}

export function persistAttempt(attempt: ExamAttemptState): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...attempt,
      persistedAt: new Date().toISOString(),
    }),
  );
}

export function clearAttempt(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function formatRemainingTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}
