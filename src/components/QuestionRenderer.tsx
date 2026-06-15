import MarkdownMath from './MarkdownMath';
import { getOptionLabel, type ChoiceKey, type Question, type SessionMode } from '../types';

interface QuestionRendererProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: ChoiceKey | null;
  onSelect: (choice: ChoiceKey) => void;
  marked: boolean;
  mode: SessionMode;
}

export default function QuestionRenderer({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelect,
  marked,
  mode,
}: QuestionRendererProps) {
  const isGradable = question.options.length > 0 && question.correct_answer !== null;
  const showPracticeFeedback =
    mode === 'practice' && selectedAnswer !== null && question.correct_answer !== null;
  const selectedAnswerCorrect =
    question.correct_answer !== null && selectedAnswer === question.correct_answer;

  return (
    <section className="question-card" aria-labelledby={`question-${question.id}`}>
      <div className="question-card__meta">
        <div className="question-card__heading">
          <p className="eyebrow">{mode === 'practice' ? 'Practice Mode' : 'Exam Mode'}</p>
          <h2 id={`question-${question.id}`}>
            Question {questionNumber} of {totalQuestions}
          </h2>
        </div>
        <dl className="question-card__status">
          <div className="question-card__status-item question-card__status-item--topic">
            <dt>Topic</dt>
            <dd>{question.topic}</dd>
          </div>
          <div className="question-card__status-item question-card__status-item--status">
            <dt>Status</dt>
            <dd>{marked ? 'Marked for review' : 'Not marked'}</dd>
          </div>
        </dl>
      </div>

      <div className="question-card__prompt">
        <MarkdownMath content={question.question_markdown} />
      </div>

      {question.options.length > 0 ? (
        <div className="option-list" role="radiogroup" aria-label="Answer choices">
          {question.options.map((option, index) => {
            const choice = getOptionLabel(index);
            const checked = selectedAnswer === choice;
            const isCorrectChoice = question.correct_answer === choice;
            const practiceClassName = showPracticeFeedback
              ? checked && selectedAnswerCorrect
                ? ' option-button--correct'
                : checked && !selectedAnswerCorrect
                  ? ' option-button--incorrect'
                  : isCorrectChoice
                    ? ' option-button--solution'
                    : ''
              : '';

            return (
              <button
                key={`${question.id}-${choice}`}
                type="button"
                className={`option-button${checked ? ' option-button--selected' : ''}${practiceClassName}`}
                role="radio"
                aria-checked={checked}
                onClick={() => onSelect(choice)}
              >
                <span className="option-button__label">{choice}</span>
                <span className="option-button__content">
                  <MarkdownMath content={option} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="question-note">
          {isGradable
            ? 'Answer choices are unavailable for this imported item.'
            : 'Open-response imported item. Work it manually; the official solution is shown after submission.'}
        </div>
      )}

      {showPracticeFeedback ? (
        <div
          className={`practice-feedback${selectedAnswerCorrect ? ' practice-feedback--correct' : ' practice-feedback--incorrect'}`}
          aria-live="polite"
        >
          <strong>{selectedAnswerCorrect ? 'Correct.' : 'Incorrect.'}</strong>{' '}
          Correct answer: {question.correct_answer}
        </div>
      ) : null}

      <div className="source-note">
        <span>Source note:</span> {question.source_note}
      </div>
    </section>
  );
}
