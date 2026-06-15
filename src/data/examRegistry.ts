import demoBank from './banks/demo-gre-math-subject.json';
import demoBankSetB from './banks/demo-gre-math-subject-set-b.json';
import bootcampProblemSets from './banks/bootcamp-problem-sets.json';
import greMathPracticeUnlabeled91a67ccb from './banks/gre-math-practice-unlabeled-91a67ccb.json';
import etsFormGR0568 from './banks/ets-form-gr0568.json';
import etsFormGR1268 from './banks/ets-form-gr1268.json';
import etsFormGR9367 from './banks/ets-form-gr9367.json';
import revisitProblems from './banks/revisit-problems.json';
import type { QuestionBank } from '../types';

export const examRegistry: QuestionBank[] = [
  revisitProblems as QuestionBank,
  bootcampProblemSets as QuestionBank,
  greMathPracticeUnlabeled91a67ccb as QuestionBank,
  etsFormGR9367 as QuestionBank,
  etsFormGR0568 as QuestionBank,
  etsFormGR1268 as QuestionBank,
  demoBank as QuestionBank,
  demoBankSetB as QuestionBank,
];

export function getExamBank(bankId: string): QuestionBank | undefined {
  return examRegistry.find((bank) => bank.id === bankId);
}
