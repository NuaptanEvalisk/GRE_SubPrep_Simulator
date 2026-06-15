Build a local desktop-first web app that simulates a GRE Mathematics Subject Test-style exam environment as closely as practical, while only using interaction features that ETS publicly describes for the GRE Subject Tests.

High-level goal:
Create a realistic, timed, computer-delivered math exam simulator for my own practice. It should feel like a GRE Mathematics Subject Test workflow, not a generic quiz app and not a “better-than-the-real-test” interface.

Very important realism constraint:
Do NOT add convenience features unless they are clearly aligned with ETS-publicly-described Subject Test behavior.
This app should simulate the real constraints, not improve on them.

What ETS-style behavior to preserve:

- 66 questions total
- 5 options per question: A, B, C, D, E
- single-choice only
- total timer: 170 minutes
- free navigation among questions
- mark and review
- review screen / complete question list
- visible status of answered vs unanswered vs marked questions
- ability to revisit answered questions and change answers before submission
- exam ends when time expires
- no pause in exam mode
- no breaks in exam mode

Non-goals:

- Do NOT build a more powerful interface than the real one.

Tech requirements:

- Local-first
- No backend required unless clearly useful
- Desktop-first UI
- Use React + Vite + TypeScript unless there is a strong reason not to
- Use KaTeX or MathJax for math rendering
- Questions should be loaded from JSON files
- Store exam progress in browser local storage for crash recovery only

Core exam mode requirements:

1. Show one question at a time.
2. Each question has exactly 5 options labeled A-E.
3. User can select one option only.
4. User can move to previous/next question.
5. User can jump to any question from a review/navigation panel.
6. User can mark/unmark a question for review.
7. Navigation panel / review screen must show:
   - current question
   - answered questions
   - unanswered questions
   - marked questions
8. User can submit early.
9. If timer reaches zero, auto-submit immediately.
10. There must be NO pause button in exam mode.
11. There must be NO instant feedback in exam mode.
12. There must be NO topic filter, difficulty filter, search, smart recommendation, or “jump to unanswered only” power features in exam mode.
13. There must be NO per-question live timing analytics visible during the exam.
14. There must be NO multiple custom mark categories; only a single mark-for-review state.

Allowed usability:

- Previous / Next buttons
- Clickable question-number navigation
- Optional keyboard shortcuts only if modest and realistic, e.g.:
  - 1..5 select A..E
  - left/right or n/p for previous/next
  - m for mark
These should not create a “speedrunner control panel”.

Exam data model:
Each question JSON object should support fields such as:

- id
- topic
- question_markdown
- options: array of 5 strings
- correct_answer
- solution_markdown
- source_note
- tags (optional)
- difficulty (optional, but NOT shown to user during exam mode)

Modes:

1. Exam Mode
   - strict 170-minute timer
   - no pause
   - no answers shown
   - only ETS-like navigation/review behavior
2. Review Mode
   After submission, show:
   - raw correct count
   - percentage correct
   - answer key
   - user answer vs correct answer
   - concise solution for each question
   - optionally topic breakdown AFTER the exam only
3. Optional Practice Mode
   This may exist, but it must be clearly separate from Exam Mode.
   Practice Mode may allow immediate feedback, but Exam Mode must remain strict.

Question source integration:
I will supply one or more JSON files containing GRE-style questions adapted from my lecture notes / assignments / problem banks.
Design the app so I can easily drop in new question-set JSON files.

Project deliverables:

1. Working source code
2. README with setup and usage instructions
3. A sample JSON exam file with a few demo questions containing math
4. Clean folder structure for adding future exam sets
5. A clear import path / registry for question banks

UI guidance:

- Minimal, clean, serious
- Calm neutral colors
- Readable mathematics
- Timer always visible
- Review screen should feel like a real exam workflow, not a dashboard
- Avoid flashy animation
- Avoid decorative clutter

Local persistence:

- Save answers, marks, current question index, and remaining time in local storage
- This is only for accidental refresh/crash recovery
- Do NOT create explicit “save slots”, “rewind”, or user-controlled restore features that make the experience easier than the real exam

Submission flow:

- Manual submission requires a confirmation dialog
- Auto-submission occurs immediately at time expiry
- After submission, exam mode state should lock
- Review mode should open afterwards

Please implement:

- React app
- question rendering component
- navigation/review panel
- timer logic
- local storage persistence
- exam submission logic
- review screen
- math rendering
- example question JSON

If helpful, also add a tiny utility script that validates question JSON files:

- exactly 5 options
- one valid correct answer
- required fields present

Do not include any chain-of-thought or hidden reasoning.
Write clean, maintainable code.
Optimize for realism and low-friction exam simulation, not extra convenience.
