import { startTransition, useEffect, useMemo, useState } from 'react';
import QuestionNavPanel from './components/QuestionNavPanel';
import QuestionRenderer from './components/QuestionRenderer';
import ReviewScreen from './components/ReviewScreen';
import SubmissionDialog from './components/SubmissionDialog';
import { examRegistry, getExamBank } from './data/examRegistry';
import {
  clearAttempt,
  createFreshAttempt,
  EXAM_DURATION_SECONDS,
  formatRemainingTime,
  hydrateAttempt,
  loadAttempt,
  persistAttempt,
} from './lib/examSession';
import {
  type ChoiceKey,
  type ExamAttemptState,
  type QuestionBank,
  type SessionMode,
} from './types';

type AppView =
  | {
      phase: 'landing';
      bank: QuestionBank | null;
      resumableAttempt: ExamAttemptState | null;
    }
  | { phase: 'exam'; bank: QuestionBank; attempt: ExamAttemptState }
  | { phase: 'review'; bank: QuestionBank; attempt: ExamAttemptState };

function submitAttempt(
  previousAttempt: ExamAttemptState,
  reason: 'manual' | 'time_expired' | 'practice_complete',
): ExamAttemptState {
  const now = new Date().toISOString();

  return {
    ...previousAttempt,
    submitted: true,
    submittedAt: now,
    submissionReason: reason,
    remainingSeconds: reason === 'time_expired' ? 0 : previousAttempt.remainingSeconds,
    persistedAt: now,
  };
}

export default function App() {
  const [view, setView] = useState<AppView>({
    phase: 'landing',
    bank: examRegistry[0] ?? null,
    resumableAttempt: null,
  });
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTime, setShowTime] = useState(true);

  useEffect(() => {
    const storedAttempt = loadAttempt();
    if (!storedAttempt) {
      return;
    }

    const bank = getExamBank(storedAttempt.bankId);
    if (!bank) {
      clearAttempt();
      return;
    }

    const hydratedAttempt = hydrateAttempt(storedAttempt, bank);

    if (
      hydratedAttempt.submitted ||
      (hydratedAttempt.mode === 'exam' && hydratedAttempt.remainingSeconds === 0)
    ) {
      startTransition(() => {
        setView({
          phase: 'review',
          bank,
          attempt:
            hydratedAttempt.submitted
              ? hydratedAttempt
              : submitAttempt(hydratedAttempt, 'time_expired'),
        });
      });
      return;
    }

    startTransition(() => {
      setView({
        phase: 'landing',
        bank,
        resumableAttempt: hydratedAttempt,
      });
    });
  }, []);

  useEffect(() => {
    if (view.phase === 'exam' || view.phase === 'review') {
      persistAttempt(view.attempt);
      return;
    }

    if (view.phase === 'landing' && view.resumableAttempt) {
      persistAttempt(view.resumableAttempt);
    }
  }, [view]);

  useEffect(() => {
    if (view.phase !== 'landing' || !view.resumableAttempt) {
      return;
    }

    if (view.resumableAttempt.mode !== 'exam') {
      return;
    }

    if (view.resumableAttempt.remainingSeconds <= 0) {
      setView({
        phase: 'review',
        bank: view.bank ?? getExamBank(view.resumableAttempt.bankId)!,
        attempt: submitAttempt(view.resumableAttempt, 'time_expired'),
      });
      return;
    }

    const timerId = window.setInterval(() => {
      setView((currentView) => {
        if (
          currentView.phase !== 'landing' ||
          !currentView.resumableAttempt ||
          !currentView.bank ||
          currentView.resumableAttempt.mode !== 'exam'
        ) {
          return currentView;
        }

        const nextRemainingSeconds = Math.max(
          0,
          currentView.resumableAttempt.remainingSeconds - 1,
        );

        if (nextRemainingSeconds === 0) {
          return {
            phase: 'review',
            bank: currentView.bank,
            attempt: submitAttempt(
              { ...currentView.resumableAttempt, remainingSeconds: 0 },
              'time_expired',
            ),
          };
        }

        return {
          ...currentView,
          resumableAttempt: {
            ...currentView.resumableAttempt,
            remainingSeconds: nextRemainingSeconds,
            persistedAt: new Date().toISOString(),
          },
        };
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [view]);

  useEffect(() => {
    if (view.phase !== 'exam' || view.attempt.mode !== 'exam') {
      return;
    }

    if (view.attempt.remainingSeconds <= 0) {
      const completedAttempt = submitAttempt(view.attempt, 'time_expired');
      setView({ phase: 'review', bank: view.bank, attempt: completedAttempt });
      return;
    }

    const timerId = window.setInterval(() => {
      setView((currentView) => {
        if (currentView.phase !== 'exam' || currentView.attempt.mode !== 'exam') {
          return currentView;
        }

        const nextRemainingSeconds = Math.max(
          0,
          currentView.attempt.remainingSeconds - 1,
        );

        if (nextRemainingSeconds === 0) {
          return {
            phase: 'review',
            bank: currentView.bank,
            attempt: submitAttempt(
              { ...currentView.attempt, remainingSeconds: 0 },
              'time_expired',
            ),
          };
        }

        return {
          ...currentView,
          attempt: {
            ...currentView.attempt,
            remainingSeconds: nextRemainingSeconds,
            persistedAt: new Date().toISOString(),
          },
        };
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [view]);

  const answeredCount = useMemo(() => {
    if (view.phase !== 'exam') {
      return 0;
    }

    return view.bank.questions.filter((question) => view.attempt.answers[question.id]).length;
  }, [view]);

  function beginAttempt(bank: QuestionBank, mode: SessionMode) {
    startTransition(() => {
      setView({ phase: 'exam', bank, attempt: createFreshAttempt(bank, mode) });
    });
  }

  function chooseBank(bank: QuestionBank) {
    setView((currentView) => {
      if (currentView.phase !== 'landing') {
        return currentView;
      }

      return {
        ...currentView,
        bank,
      };
    });
  }

  function resumeAttempt() {
    setView((currentView) => {
      if (
        currentView.phase !== 'landing' ||
        !currentView.bank ||
        !currentView.resumableAttempt
      ) {
        return currentView;
      }

      return {
        phase: 'exam',
        bank: currentView.bank,
        attempt: currentView.resumableAttempt,
      };
    });
  }

  function dropAttempt() {
    clearAttempt();
    setView((currentView) => {
      if (currentView.phase !== 'landing') {
        return currentView;
      }

      return {
        phase: 'landing',
        bank: examRegistry[0] ?? currentView.bank,
        resumableAttempt: null,
      };
    });
  }

  function handleAnswerSelect(choice: ChoiceKey) {
    setView((currentView) => {
      if (currentView.phase !== 'exam') {
        return currentView;
      }

      const question = currentView.bank.questions[currentView.attempt.currentQuestionIndex];

      return {
        ...currentView,
        attempt: {
          ...currentView.attempt,
          answers: {
            ...currentView.attempt.answers,
            [question.id]: choice,
          },
        },
      };
    });
  }

  function moveQuestion(offset: -1 | 1) {
    setView((currentView) => {
      if (currentView.phase !== 'exam') {
        return currentView;
      }

      const nextIndex = Math.min(
        Math.max(0, currentView.attempt.currentQuestionIndex + offset),
        currentView.bank.questions.length - 1,
      );

      return {
        ...currentView,
        attempt: {
          ...currentView.attempt,
          currentQuestionIndex: nextIndex,
        },
      };
    });
  }

  function jumpToQuestion(questionIndex: number) {
    setView((currentView) => {
      if (currentView.phase !== 'exam') {
        return currentView;
      }

      return {
        ...currentView,
        attempt: {
          ...currentView.attempt,
          currentQuestionIndex: questionIndex,
        },
      };
    });
  }

  function toggleMark() {
    setView((currentView) => {
      if (currentView.phase !== 'exam') {
        return currentView;
      }

      const questionId =
        currentView.bank.questions[currentView.attempt.currentQuestionIndex].id;
      const markedSet = new Set(currentView.attempt.markedQuestionIds);

      if (markedSet.has(questionId)) {
        markedSet.delete(questionId);
      } else {
        markedSet.add(questionId);
      }

      return {
        ...currentView,
        attempt: {
          ...currentView.attempt,
          markedQuestionIds: Array.from(markedSet),
        },
      };
    });
  }

  function confirmSubmission() {
    setView((currentView) => {
      if (currentView.phase !== 'exam') {
        return currentView;
      }

      return {
        phase: 'review',
        bank: currentView.bank,
        attempt: submitAttempt(
          currentView.attempt,
          currentView.attempt.mode === 'practice' ? 'practice_complete' : 'manual',
        ),
      };
    });
    setShowSubmitDialog(false);
  }

  function resetToNewAttempt(bank: QuestionBank, mode: SessionMode) {
    clearAttempt();
    beginAttempt(bank, mode);
  }

  if (view.phase === 'landing') {
    const resumableMode = view.resumableAttempt?.mode === 'practice' ? 'practice' : 'exam';

    return (
      <main className="landing-layout">
        <section className="landing-hero">
          <div className="landing-hero__bar">
            <span className="landing-hero__product">Testing Session Manager</span>
            <span className="landing-hero__mode">Local workstation</span>
          </div>
          <div className="landing-hero__body">
            <img
              src="/logo.png"
              alt="ETS GRE"
              className="app-logo app-logo--landing"
            />
            <p className="eyebrow">Launch Screen</p>
            <h1>GRE Mathematics Subject Test Simulator</h1>
            <p className="landing-hero__copy">
              A local exam workstation designed to mimic a formal, timed desktop testing
              session with strict navigation, review, and submission behavior.
            </p>
          </div>
          <div className="landing-meta">
            <div>
              <span>Exam timer</span>
              <strong>{formatRemainingTime(EXAM_DURATION_SECONDS)}</strong>
            </div>
            <div>
              <span>Modes</span>
              <strong>Exam / Practice</strong>
            </div>
            <div>
              <span>Persistence</span>
              <strong>Crash recovery only</strong>
            </div>
          </div>
        </section>

        {view.resumableAttempt && view.bank ? (
          <section className="resume-panel">
            <div className="resume-panel__bar">
              <span>Active session detected</span>
              <span>{view.bank.title}</span>
            </div>
            <div className="resume-panel__body">
              <div className="resume-panel__details">
                <div>
                  <span>Mode</span>
                  <strong>{resumableMode === 'practice' ? 'Practice' : 'Exam'}</strong>
                </div>
                <div>
                  <span>Answered</span>
                  <strong>
                    {
                      view.bank.questions.filter(
                        (question) => view.resumableAttempt?.answers[question.id],
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  <span>Marked</span>
                  <strong>{view.resumableAttempt.markedQuestionIds.length}</strong>
                </div>
                <div>
                  <span>Current question</span>
                  <strong>{view.resumableAttempt.currentQuestionIndex + 1}</strong>
                </div>
                {resumableMode === 'exam' ? (
                  <div>
                    <span>Time remaining</span>
                    <strong>
                      {formatRemainingTime(view.resumableAttempt.remainingSeconds)}
                    </strong>
                  </div>
                ) : null}
              </div>
              <p className="resume-panel__note">
                {resumableMode === 'practice'
                  ? 'This practice session is already in progress. Resume it to continue with immediate answer feedback.'
                  : 'This exam is already in progress. The timer continues to run until the session is resumed or expires.'}
              </p>
              <div className="resume-panel__actions">
                <button type="button" className="primary-button" onClick={resumeAttempt}>
                  {resumableMode === 'practice' ? 'Resume practice' : 'Resume exam'}
                </button>
                <button type="button" className="danger-button" onClick={dropAttempt}>
                  Drop exam
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {!view.resumableAttempt ? (
          <section className="set-selector">
            <aside className="set-selector__menu">
              <div className="set-selector__menu-bar">
                <span>Problem sets</span>
                <span>{examRegistry.length} available</span>
              </div>
              <div className="set-selector__menu-body">
                {examRegistry.map((bank, index) => {
                  const isSelected = view.bank?.id === bank.id;

                  return (
                    <button
                      key={bank.id}
                      type="button"
                      className={`set-selector__item${isSelected ? ' set-selector__item--selected' : ''}`}
                      onClick={() => chooseBank(bank)}
                      aria-pressed={isSelected}
                    >
                      <span className="set-selector__item-index">
                        Set {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="set-selector__item-title">{bank.title}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="bank-card">
              <div>
                <p className="eyebrow">Selected problem set</p>
                <h2>{view.bank?.title ?? 'No set selected'}</h2>
                <p>{view.bank?.description ?? 'Choose a problem set from the menu.'}</p>
              </div>
              <dl className="bank-card__details">
                <div>
                  <dt>Questions</dt>
                  <dd>{view.bank?.questions.length ?? 0}</dd>
                </div>
                <div>
                  <dt>Time limit</dt>
                  <dd>170 min exam / untimed practice</dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>Single-choice; imported banks may vary</dd>
                </div>
                <div>
                  <dt>Review</dt>
                  <dd>Mark and revisit allowed</dd>
                </div>
              </dl>
              <div className="bank-card__actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => view.bank && beginAttempt(view.bank, 'exam')}
                  disabled={!view.bank}
                >
                  Start exam mode
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => view.bank && beginAttempt(view.bank, 'practice')}
                  disabled={!view.bank}
                >
                  Start practice mode
                </button>
              </div>
            </section>
          </section>
        ) : null}
      </main>
    );
  }

  if (view.phase === 'review') {
    return (
      <ReviewScreen
        bank={view.bank}
        attempt={view.attempt}
        onStartNewAttempt={() => resetToNewAttempt(view.bank, view.attempt.mode)}
      />
    );
  }

  const currentQuestion = view.bank.questions[view.attempt.currentQuestionIndex];
  const isMarked = view.attempt.markedQuestionIds.includes(currentQuestion.id);
  const unansweredCount = view.bank.questions.length - answeredCount;
  const isPracticeMode = view.attempt.mode === 'practice';

  return (
    <>
      <main className="exam-layout">
        <header className="exam-header">
          <div className="exam-header__identity">
            <img
              src="/logo.png"
              alt="ETS GRE"
              className="app-logo app-logo--header"
            />
            <h1>{view.bank.title}</h1>
          </div>
          <div className="exam-header__actions">
            <button
              type="button"
              className="danger-button"
              onClick={() => setShowSubmitDialog(true)}
            >
              {isPracticeMode ? 'End practice' : 'Submit exam'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => moveQuestion(-1)}
              disabled={view.attempt.currentQuestionIndex === 0}
            >
              Previous
            </button>
            <button type="button" className="secondary-button" onClick={toggleMark}>
              {isMarked ? 'Unmark' : 'Mark for review'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => moveQuestion(1)}
              disabled={view.attempt.currentQuestionIndex === view.bank.questions.length - 1}
            >
              Next
            </button>
          </div>
        </header>

        <section className="exam-timebar">
          <div className="exam-timebar__status" aria-label="Exam status">
            <div className="exam-timebar__item">
              <span>Mode</span>
              <strong>{isPracticeMode ? 'Practice' : 'Exam'}</strong>
            </div>
            <div className="exam-timebar__item">
              <span>Current</span>
              <strong>
                {view.attempt.currentQuestionIndex + 1}/{view.bank.questions.length}
              </strong>
            </div>
            <div className="exam-timebar__item">
              <span>Answered</span>
              <strong>{answeredCount}</strong>
            </div>
            <div className="exam-timebar__item">
              <span>Unanswered</span>
              <strong>{unansweredCount}</strong>
            </div>
            <div className="exam-timebar__item">
              <span>Marked</span>
              <strong>{view.attempt.markedQuestionIds.length}</strong>
            </div>
          </div>
          {isPracticeMode ? null : (
            <div className="exam-timebar__controls">
              <div className="exam-header__timer" aria-live="polite">
                <span>Time Remaining</span>
                <strong>
                  {showTime
                    ? formatRemainingTime(view.attempt.remainingSeconds)
                    : '--:--:--'}
                </strong>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowTime((current) => !current)}
              >
                {showTime ? 'Hide time' : 'Show time'}
              </button>
            </div>
          )}
        </section>

        <section className="exam-shell">
          <div className="exam-main">
            <QuestionRenderer
              question={currentQuestion}
              questionNumber={view.attempt.currentQuestionIndex + 1}
              totalQuestions={view.bank.questions.length}
              selectedAnswer={view.attempt.answers[currentQuestion.id]}
              onSelect={handleAnswerSelect}
              marked={isMarked}
              mode={view.attempt.mode}
            />
          </div>

          <QuestionNavPanel
            questions={view.bank.questions}
            currentQuestionIndex={view.attempt.currentQuestionIndex}
            answers={view.attempt.answers}
            markedQuestionIds={view.attempt.markedQuestionIds}
            onJump={jumpToQuestion}
          />
        </section>
      </main>

      <SubmissionDialog
        open={showSubmitDialog}
        mode={view.attempt.mode}
        answeredCount={answeredCount}
        totalQuestions={view.bank.questions.length}
        onConfirm={confirmSubmission}
        onCancel={() => setShowSubmitDialog(false)}
      />
    </>
  );
}
