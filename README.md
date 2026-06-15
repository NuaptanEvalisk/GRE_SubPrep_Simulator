# GRE Math Subject Test Simulator

A local-first React + Vite + TypeScript web app for practicing a GRE Mathematics Subject Test-style workflow.

The simulator is intentionally strict in exam mode:

- 170-minute total timer
- one question shown at a time
- single-answer choices with per-bank option counts
- free navigation across the full question list
- single mark-for-review state
- manual submission confirmation
- automatic submission when time expires
- no pause, no instant feedback, no search/filter conveniences in exam mode

**Info.** This was vibe coded before I took the test in May this year for my own use. The test was not difficult but doing those many problems *consecutively without taking a break* is wearisome, so a few mock tests before real exam seemed to be necessary. The code was written by Codex. I will not include any test suite in the repository to avoid copyright issues. You can just download a past paper / mock test from ETS (or elsewhere), use PDF4Qt PageMaster to delete irrelevant pages, and then feed the PDF into Codex and it can convert it to the format this app uses. If you want you may download an ETS logo, name it as `logo.png` and put it into the root of project directory to make the experience more authentic. PS: Everything in this README is written by Codex, except for this paragraph.

## Setup

```bash
npm install
npm run dev
```

For normal use after setup, launch the production build with:

```bash
./launch-gre-simulator.sh
```

or:

```bash
npm start
```

The launcher rebuilds automatically if the app files are newer than `dist/`, starts a local preview server on `http://127.0.0.1:4173`, and attempts to open the browser for you. A desktop launcher file is also included as `GRE-Math-Simulator.desktop`.

For a production build:

```bash
npm run build
```

To validate question bank JSON files:

```bash
npm run validate:questions
```

To regenerate the imported ETS practice banks from the Mathpix `.tex` exports stored in this repository:

```bash
npm run import:practice1
npm run import:practice2
npm run import:practice3
npm run import:practice-new
npm run import:bootcamp
npm run import:revisit-problems
```

## Question Banks

Question banks live in `src/data/banks/` and are registered in `src/data/examRegistry.ts`.
The welcome screen shows a selectable menu of all registered problem sets.

Each JSON file should follow this shape:

```json
{
  "id": "my-bank",
  "title": "My GRE Math Practice Set",
  "description": "Optional description",
  "questions": [
    {
      "id": "alg-001",
      "topic": "Algebra",
      "question_markdown": "Question text with $math$",
      "options": ["A choice", "B choice", "C choice"],
      "correct_answer": "A",
      "solution_markdown": "Concise solution text",
      "source_note": "Where the item came from",
      "tags": ["optional", "tags"],
      "difficulty": "optional metadata"
    }
  ]
}
```

Notes:

- The validator accepts 2-26 multiple-choice options, or 0 options for imported open-response items.
- `correct_answer` must match the rendered option label (`A`, `B`, `C`, and so on) or be `null` for open-response items.
- Full-length exam banks should contain 66 questions.
- The included demo banks are intentionally short so the app is easy to inspect and test.
- The repository also includes several imported practice banks, including `bootcamp-problem-sets`, `ets-form-gr9367`, `ets-form-gr0568`, `ets-form-gr1268`, and `gre-math-practice-unlabeled-91a67ccb`.
- The repository also includes a `revisit-problems` bank built from `problems.pdf`, mostly by reusing those imported banks.

## Crash Recovery

The app stores the current exam state in browser local storage:

- selected answers
- marked questions
- current question index
- remaining time

This persistence is only for accidental refresh or browser crashes. There are no save slots or pause controls in exam mode.

## Structure

```text
src/
  components/
  data/
    banks/
    examRegistry.ts
  lib/
  App.tsx
  main.tsx
  styles.css
scripts/
  import-practice1-mathpix.mjs
  validate-question-bank.mjs
```
