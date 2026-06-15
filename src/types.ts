export const OPTION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export type ChoiceKey = string;
export type SessionMode = 'exam' | 'practice';

export function getOptionLabel(index: number): string {
  return OPTION_LABELS[index] ?? `Option ${index + 1}`;
}

export interface Question {
  id: string;
  topic: string;
  question_markdown: string;
  options: string[];
  correct_answer: ChoiceKey | null;
  solution_markdown: string;
  source_note: string;
  tags?: string[];
  difficulty?: string | number;
}

export interface QuestionBank {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface ExamAttemptState {
  bankId: string;
  mode: SessionMode;
  startedAt: string;
  persistedAt: string;
  currentQuestionIndex: number;
  answers: Record<string, ChoiceKey | null>;
  markedQuestionIds: string[];
  remainingSeconds: number;
  submitted: boolean;
  submittedAt?: string;
  submissionReason?: 'manual' | 'time_expired' | 'practice_complete';
}
