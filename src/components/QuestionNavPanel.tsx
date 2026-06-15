import type { ChoiceKey, Question } from '../types';

interface QuestionNavPanelProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, ChoiceKey | null>;
  markedQuestionIds: string[];
  onJump: (questionIndex: number) => void;
}

function getStatusClass(
  questionId: string,
  isCurrent: boolean,
  isAnswered: boolean,
  isMarked: boolean,
): string {
  if (isCurrent) {
    return 'nav-grid__button nav-grid__button--current';
  }
  if (isMarked && isAnswered) {
    return 'nav-grid__button nav-grid__button--marked-answered';
  }
  if (isMarked) {
    return 'nav-grid__button nav-grid__button--marked';
  }
  if (isAnswered) {
    return 'nav-grid__button nav-grid__button--answered';
  }
  return 'nav-grid__button nav-grid__button--unanswered';
}

export default function QuestionNavPanel({
  questions,
  currentQuestionIndex,
  answers,
  markedQuestionIds,
  onJump,
}: QuestionNavPanelProps) {
  const markedSet = new Set(markedQuestionIds);
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const markedCount = markedQuestionIds.length;

  return (
    <aside className="nav-panel">
      <div className="nav-panel__header">
        <div>
          <p className="eyebrow">Review Panel</p>
          <h2>Question navigation</h2>
        </div>
        <div className="nav-panel__totals">
          <div>
            <span>Answered</span>
            <strong>{answeredCount}</strong>
          </div>
          <div>
            <span>Unanswered</span>
            <strong>{questions.length - answeredCount}</strong>
          </div>
          <div>
            <span>Marked</span>
            <strong>{markedCount}</strong>
          </div>
        </div>
      </div>

      <div className="nav-grid" aria-label="Question navigation">
        {questions.map((question, index) => {
          const isCurrent = index === currentQuestionIndex;
          const isAnswered = answers[question.id] !== null;
          const isMarked = markedSet.has(question.id);

          return (
            <button
              key={question.id}
              type="button"
              className={getStatusClass(question.id, isCurrent, isAnswered, isMarked)}
              onClick={() => onJump(index)}
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={`Question ${index + 1}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="nav-legend" aria-label="Status legend">
        <div><span className="legend-swatch legend-swatch--current" />Current</div>
        <div><span className="legend-swatch legend-swatch--answered" />Answered</div>
        <div><span className="legend-swatch legend-swatch--marked" />Marked</div>
        <div><span className="legend-swatch legend-swatch--marked-answered" />Answered + marked</div>
        <div><span className="legend-swatch legend-swatch--unanswered" />Unanswered</div>
      </div>
    </aside>
  );
}
