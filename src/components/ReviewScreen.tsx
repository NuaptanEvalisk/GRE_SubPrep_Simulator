import MarkdownMath from './MarkdownMath';
import {
  getOptionLabel,
  type ExamAttemptState,
  type Question,
  type QuestionBank,
} from '../types';

interface ReviewScreenProps {
  bank: QuestionBank;
  attempt: ExamAttemptState;
  onStartNewAttempt: () => void;
}

function buildTopicBreakdown(bank: QuestionBank, attempt: ExamAttemptState) {
  const byTopic = new Map<string, { total: number; correct: number }>();

  for (const question of bank.questions) {
    if (!isGradableQuestion(question)) {
      continue;
    }

    const current = byTopic.get(question.topic) ?? { total: 0, correct: 0 };
    current.total += 1;

    if (attempt.answers[question.id] === question.correct_answer) {
      current.correct += 1;
    }

    byTopic.set(question.topic, current);
  }

  return Array.from(byTopic.entries()).sort(([topicA], [topicB]) =>
    topicA.localeCompare(topicB),
  );
}

function isGradableQuestion(question: Question): boolean {
  return question.options.length > 0 && question.correct_answer !== null;
}

export default function ReviewScreen({
  bank,
  attempt,
  onStartNewAttempt,
}: ReviewScreenProps) {
  const isPracticeMode = attempt.mode === 'practice';
  const gradableQuestions = bank.questions.filter(isGradableQuestion);
  const ungradedCount = bank.questions.length - gradableQuestions.length;
  const correctCount = gradableQuestions.filter(
    (question) => attempt.answers[question.id] === question.correct_answer,
  ).length;
  const percentage = gradableQuestions.length
    ? Math.round((correctCount / gradableQuestions.length) * 100)
    : 0;
  const topicBreakdown = buildTopicBreakdown(bank, attempt);
  const incorrectQuestions = gradableQuestions
    .map((question, index) => ({
      question,
      index: bank.questions.findIndex((candidate) => candidate.id === question.id),
      userAnswer: attempt.answers[question.id],
    }))
    .filter(({ question, userAnswer }) => userAnswer !== question.correct_answer);

  return (
    <main className="review-layout">
      <section className="review-summary">
        <div className="review-summary__bar">
          <span>Testing session closed</span>
          <span>Answer review</span>
        </div>
        <div>
          <p className="eyebrow">Review Mode</p>
          <h1>{bank.title}</h1>
          <p className="review-summary__description">
            {isPracticeMode
              ? 'The practice session has ended. Your answers are locked and the full answer key with concise solutions is shown below.'
              : 'The exam has ended. Your answers are locked and the full answer key with concise solutions is shown below.'}
          </p>
        </div>

        <div className="review-stats">
          <div className="stat-card">
            <span>Correct</span>
            <strong>
              {correctCount} / {gradableQuestions.length}
            </strong>
          </div>
          <div className="stat-card">
            <span>Percent</span>
            <strong>{percentage}%</strong>
          </div>
          {ungradedCount > 0 ? (
            <div className="stat-card">
              <span>Ungraded</span>
              <strong>{ungradedCount}</strong>
            </div>
          ) : null}
          <div className="stat-card">
            <span>Ended by</span>
            <strong>
              {attempt.submissionReason === 'time_expired'
                ? 'Time expiry'
                : attempt.submissionReason === 'practice_complete'
                  ? 'Practice completion'
                  : 'Manual submission'}
            </strong>
          </div>
        </div>

        {topicBreakdown.length > 0 ? (
          <div className="topic-breakdown">
            <h2>Topic summary</h2>
            <div className="topic-breakdown__grid">
              {topicBreakdown.map(([topic, stats]) => (
                <div key={topic} className="topic-breakdown__card">
                  <span>{topic}</span>
                  <strong>
                    {stats.correct} / {stats.total}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <button type="button" className="primary-button" onClick={onStartNewAttempt}>
          {isPracticeMode ? 'Start a new practice session' : 'Start a new exam attempt'}
        </button>
      </section>

      <section className="review-index">
        <div className="review-index__header">
          <h2>Incorrect questions</h2>
          <span>{incorrectQuestions.length} graded misses</span>
        </div>
        {incorrectQuestions.length > 0 ? (
          <div className="review-index__links">
            {incorrectQuestions.map(({ question, index, userAnswer }) => (
              <a
                key={question.id}
                href={`#review-question-${index + 1}`}
                className="review-index__link"
              >
                <strong>Question {index + 1}</strong>
                <span>
                  Your answer: {userAnswer ?? 'Blank'} | Correct: {question.correct_answer}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="review-index__empty">No incorrect questions. Every response was correct.</p>
        )}
      </section>

      <section className="review-list" aria-label="Answer review">
        {bank.questions.map((question, index) => {
          const userAnswer = attempt.answers[question.id];
          const isGradable = isGradableQuestion(question);
          const correct = isGradable ? userAnswer === question.correct_answer : null;

          return (
            <article
              key={question.id}
              id={`review-question-${index + 1}`}
              className="review-card"
            >
              <div className="review-card__header">
                <div>
                  <p className="eyebrow">Question {index + 1}</p>
                  <h2>{question.topic}</h2>
                </div>
                <div
                  className={[
                    'review-result',
                    correct === true ? 'review-result--correct' : '',
                    correct === false ? 'review-result--incorrect' : '',
                    correct === null ? 'review-result--ungraded' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {correct === true ? 'Correct' : correct === false ? 'Incorrect' : 'Ungraded'}
                </div>
              </div>

              <div className="review-card__prompt">
                <MarkdownMath content={question.question_markdown} />
              </div>

              <div className="review-answer-strip">
                <span>Your answer: {userAnswer ?? 'Blank'}</span>
                <span>
                  {question.correct_answer === null
                    ? 'Official response: see solution'
                    : `Correct answer: ${question.correct_answer}`}
                </span>
              </div>

              {question.options.length > 0 ? (
                <div className="review-options" aria-label={`Options for question ${index + 1}`}>
                  {question.options.map((option, optionIndex) => {
                    const choice = getOptionLabel(optionIndex);
                    const isUserChoice = userAnswer === choice;
                    const isCorrectChoice = question.correct_answer === choice;

                    return (
                      <div
                        key={`${question.id}-${choice}`}
                        className={[
                          'review-option',
                          isUserChoice ? 'review-option--selected' : '',
                          isCorrectChoice ? 'review-option--correct' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="review-option__meta">
                          <span className="review-option__label">{choice}</span>
                          <div className="review-option__tags">
                            {isUserChoice ? <span>Your choice</span> : null}
                            {isCorrectChoice ? <span>Correct</span> : null}
                          </div>
                        </div>
                        <div className="review-option__content">
                          <MarkdownMath content={option} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="question-note review-note">
                  This imported item is open response and is not auto-graded in the simulator.
                </div>
              )}

              <div className="review-solution">
                <h3>Solution</h3>
                <MarkdownMath content={question.solution_markdown} />
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
