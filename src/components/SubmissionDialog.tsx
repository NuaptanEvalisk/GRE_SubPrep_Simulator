import type { SessionMode } from '../types';

interface SubmissionDialogProps {
  open: boolean;
  mode: SessionMode;
  answeredCount: number;
  totalQuestions: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SubmissionDialog({
  open,
  mode,
  answeredCount,
  totalQuestions,
  onConfirm,
  onCancel,
}: SubmissionDialogProps) {
  if (!open) {
    return null;
  }

  const isPracticeMode = mode === 'practice';

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-dialog-title"
      >
        <p className="eyebrow">Submission Confirmation</p>
        <h2 id="submit-dialog-title">
          {isPracticeMode ? 'End this practice session now?' : 'End this testing session now?'}
        </h2>
        <p>
          You have answered {answeredCount} of {totalQuestions} questions. After
          submission, {isPracticeMode ? 'practice mode' : 'exam mode'} is locked and review
          opens immediately.
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            {isPracticeMode ? 'Continue practice' : 'Continue exam'}
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            {isPracticeMode ? 'End practice' : 'Submit exam'}
          </button>
        </div>
      </div>
    </div>
  );
}
