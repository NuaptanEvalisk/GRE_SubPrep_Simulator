import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const TEX_PATH = path.join(
  ROOT,
  '55ecbe0b-0637-41ee-8cb3-a0267b297cc0',
  '55ecbe0b-0637-41ee-8cb3-a0267b297cc0.tex',
);
const IMAGE_SOURCE_DIR = path.join(ROOT, '55ecbe0b-0637-41ee-8cb3-a0267b297cc0', 'images');
const IMAGE_TARGET_DIR = path.join(ROOT, 'public', 'question-assets', 'bootcamp-problem-sets');
const OUTPUT_JSON_PATH = path.join(
  ROOT,
  'src',
  'data',
  'banks',
  'bootcamp-problem-sets.json',
);
const BANK_ID = 'bootcamp-problem-sets';
const SOURCE_NOTE = 'GRE Math Bootcamp problem sets (Mathpix export)';

const MANUAL_ANSWERS = new Map([
  ['problem-set-2:10', 'C'],
  ['problem-set-4:3', 'D'],
  ['problem-set-4:7', 'D'],
  ['problem-set-6:3', 'A'],
  ['problem-set-8:3', 'E'],
  ['problem-set-9:5', 'C'],
  ['combinatorics:6', null],
  ['combinatorics:8', 'A'],
]);

function normalizeWhitespace(text) {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildImageMap(imageFiles) {
  const imageMap = new Map();

  for (const fileName of imageFiles) {
    imageMap.set(fileName, fileName);
    imageMap.set(fileName.replace(path.extname(fileName), ''), fileName);
  }

  return imageMap;
}

function displaySectionName(name) {
  return name
    .replace(/\\#/g, '#')
    .replace(/#\s+/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalSectionKey(name) {
  const cleaned = displaySectionName(name);

  let match = cleaned.match(/^Problem Set #(\d+)$/i);
  if (match) {
    return `problem-set-${match[1]}`;
  }

  match = cleaned.match(/^Linear Algebra #(\d+)$/i);
  if (match) {
    return `linear-algebra-${match[1]}`;
  }

  if (/^Euclidean/i.test(cleaned)) {
    return 'euclidean';
  }
  if (/^Multivariable/i.test(cleaned)) {
    return 'multivariable';
  }
  if (/^(D\.E\.|Differential Equations)$/i.test(cleaned)) {
    return 'differential-equations';
  }

  return cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function protectItemizeItems(text) {
  return text.replace(/\\begin\{itemize\}[\s\S]*?\\end\{itemize\}/g, (block) =>
    block.replace(/\\item\b/g, '@@ITEMIZE_ITEM@@'),
  );
}

function splitSections(text) {
  const sections = [];
  const sectionRegex = /\\section\*\{([^}]+)\}/g;
  let match;

  while ((match = sectionRegex.exec(text))) {
    sections.push({
      rawName: match[1],
      displayName: displaySectionName(match[1]),
      key: canonicalSectionKey(match[1]),
      index: match.index,
    });
  }

  return sections;
}

function annotateQuestionMarkers(sectionText) {
  let counter = 0;
  const protectedText = protectItemizeItems(sectionText);

  return protectedText
    .replace(/\\setcounter\{enumi\}\{(\d+)\}|\\item\b/g, (match, counterValue) => {
      if (counterValue !== undefined) {
        counter = Number(counterValue);
        return '';
      }

      counter += 1;
      return `\n@@Q${counter}@@\n`;
    })
    .replace(/(^|\n)(\d{1,2})\.\s/g, (match, prefix, questionNumber) => {
      return `${prefix}@@Q${questionNumber}@@ `;
    })
    .replace(/@@ITEMIZE_ITEM@@/g, '\\item');
}

function parseSectionBlocks(text) {
  const sections = splitSections(text);
  const parsedSections = [];

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const nextIndex = index + 1 < sections.length ? sections[index + 1].index : text.length;
    const rawSection = text.slice(section.index, nextIndex);
    const annotated = annotateQuestionMarkers(rawSection);
    const markers = [...annotated.matchAll(/@@Q(\d+)@@/g)];

    parsedSections.push({
      ...section,
      blocks: markers.map((match, blockIndex) => {
        const start = match.index + match[0].length;
        const end = blockIndex + 1 < markers.length ? markers[blockIndex + 1].index : annotated.length;

        return {
          number: Number(match[1]),
          text: annotated.slice(start, end).trim(),
        };
      }),
    });
  }

  return parsedSections;
}

function normalizeLatexEnvironments(text) {
  return text.replace(
    /\\begin\{(array|aligned|gathered|cases)\}(\{[^}]+\})?([\s\S]*?)\\end\{\1\}/g,
    (_, envName, envArgs = '', envBody) => {
      const normalizedBody = envBody
        .trim()
        .replace(/\n\s*\n/g, ' \\\\ ')
        .replace(/\n/g, ' ')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

      return `\\begin{${envName}}${envArgs}${normalizedBody}\\end{${envName}}`;
    },
  );
}

function convertTexToMarkdown(raw, imageMap) {
  let text = raw.trim();

  text = text
    .replace(/\\begin\{figure\}\[[^\]]*]/g, '')
    .replace(/\\end\{figure\}/g, '')
    .replace(/\\begin\{center\}/g, '')
    .replace(/\\end\{center\}/g, '')
    .replace(/\\caption\{([^}]+)\}/g, '$1\n')
    .replace(/\\begin\{enumerate\}/g, '')
    .replace(/\\end\{enumerate\}/g, '')
    .replace(/\\setcounter\{enumi\}\{\d+\}/g, '')
    .replace(/\\begin\{itemize\}/g, '')
    .replace(/\\end\{itemize\}/g, '')
    .replace(/\\item\b/g, '- ')
    .replace(/\\captionsetup\{[^}]*\}/g, '')
    .replace(/\\quad/g, ' ')
    .replace(/\\includegraphics\[[^\]]*]\{([^}]+)\}/g, (_, imageName) => {
      const resolvedFile = imageMap.get(imageName);
      if (!resolvedFile) {
        throw new Error(`Missing image referenced in TeX: ${imageName}`);
      }
      return `![](/question-assets/${BANK_ID}/${resolvedFile})`;
    })
    .replace(/\\\\/g, '\n\n');

  text = normalizeLatexEnvironments(text);
  text = text.replace(/\\operatorname\{det\}/g, '\\det');

  return normalizeWhitespace(text);
}

function splitStemAndOptions(questionBody) {
  const normalizedBody = questionBody
    .replace(/\\begin\{figure\}\[[^\]]*]/g, '')
    .replace(/\\end\{figure\}/g, '')
    .replace(/\\begin\{center\}/g, '')
    .replace(/\\end\{center\}/g, '')
    .replace(/\\captionsetup\{[^}]*\}/g, '')
    .replace(/\\caption\{([^}]+)\}/g, '\n$1\n')
    .trim();

  const optionMatches = [...normalizedBody.matchAll(/(?:^|\n)[ \t]*\(([a-f])\)\s*/g)].map(
    (match) => ({
      index:
        match.index +
        (match[0].startsWith('\n') ? 1 : 0) +
        (match[0].match(/^\n?([ \t]*)/)?.[1].length ?? 0),
      markerLength:
        match[0].length -
        (match[0].startsWith('\n') ? 1 : 0) -
        (match[0].match(/^\n?([ \t]*)/)?.[1].length ?? 0),
    }),
  );

  if (optionMatches.length === 0) {
    return { stem: normalizedBody, options: [] };
  }

  const stem = normalizedBody.slice(0, optionMatches[0].index).trim();
  const options = optionMatches.map((match, index) => {
    const start = match.index + match.markerLength;
    const end =
      index + 1 < optionMatches.length ? optionMatches[index + 1].index : normalizedBody.length;

    return normalizedBody.slice(start, end).trim();
  });

  return { stem, options };
}

function findImportedQuestion(questions, sectionKey, number) {
  const question = questions.find(
    (candidate) => candidate.sectionKey === sectionKey && candidate.sectionNumber === number,
  );

  if (!question) {
    throw new Error(`Could not find imported question ${sectionKey}:${number}`);
  }

  return question;
}

function extractTrailingFigureSequence(text) {
  const match = text.match(/(\n\n)?((?:(?:!\[\]\([^)]+\)|Figure \d+)\s*)+)\s*$/s);
  if (!match) {
    throw new Error('Expected trailing image sequence, but none was found');
  }

  return {
    remainingText: text.replace(match[0], '').trim(),
    block: normalizeWhitespace(match[2]),
  };
}

function moveTrailingFigureSequenceToStem(questions, previousSectionKey, previousNumber, nextSectionKey, nextNumber) {
  const previousQuestion = findImportedQuestion(questions, previousSectionKey, previousNumber);
  const nextQuestion = findImportedQuestion(questions, nextSectionKey, nextNumber);

  if (previousQuestion.options.length === 0) {
    throw new Error(`Question ${previousSectionKey}:${previousNumber} has no options to relocate from`);
  }

  const lastOptionIndex = previousQuestion.options.length - 1;
  const extracted = extractTrailingFigureSequence(previousQuestion.options[lastOptionIndex]);
  previousQuestion.options[lastOptionIndex] = extracted.remainingText;
  nextQuestion.question_markdown = normalizeWhitespace(
    `${extracted.block}\n\n${nextQuestion.question_markdown}`,
  );

  return extracted.block;
}

function prependBlockToQuestion(questions, sectionKey, number, block) {
  const question = findImportedQuestion(questions, sectionKey, number);
  question.question_markdown = normalizeWhitespace(`${block}\n\n${question.question_markdown}`);
}

function moveTrailingHintToStem(questions, sectionKey, number) {
  const question = findImportedQuestion(questions, sectionKey, number);
  if (question.options.length === 0) {
    return;
  }

  const lastOptionIndex = question.options.length - 1;
  const match = question.options[lastOptionIndex].match(/(\n\n\(Hint:[\s\S]+)$/);
  if (!match) {
    return;
  }

  question.options[lastOptionIndex] = question.options[lastOptionIndex].replace(match[1], '').trim();
  question.question_markdown = normalizeWhitespace(
    `${question.question_markdown}\n\n${match[1].trim()}`,
  );
}

function extractAnswerAndExplanation(sectionKey, questionNumber, rawText) {
  const manualKey = `${sectionKey}:${questionNumber}`;
  const manualAnswer = MANUAL_ANSWERS.get(manualKey);
  const trimmed = rawText.trim();

  const patterns = [
    /^\$([A-F])\$\s*\.\s*/,
    /^([A-F])\s*\.\s*/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      return {
        answer: manualAnswer ?? match[1],
        explanation: trimmed.slice(match[0].length).trim(),
      };
    }
  }

  if (manualAnswer !== undefined) {
    return {
      answer: manualAnswer,
      explanation: trimmed,
    };
  }

  throw new Error(`Missing answer key for ${manualKey}`);
}

function ensureValidAnswer(correctAnswer, optionCount, sectionKey, questionNumber) {
  if (optionCount === 0) {
    if (correctAnswer !== null) {
      throw new Error(`Open-response question ${sectionKey}:${questionNumber} must not have a letter answer`);
    }
    return;
  }

  if (typeof correctAnswer !== 'string') {
    throw new Error(`Question ${sectionKey}:${questionNumber} is missing a choice answer`);
  }

  const validAnswers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, optionCount).split('');
  if (!validAnswers.includes(correctAnswer)) {
    throw new Error(
      `Question ${sectionKey}:${questionNumber} has answer ${correctAnswer}, but only ${optionCount} option(s) were parsed`,
    );
  }
}

async function main() {
  const tex = await readFile(TEX_PATH, 'utf8');
  const imageFiles = (await readdir(IMAGE_SOURCE_DIR)).filter((fileName) =>
    /\.(png|jpe?g|gif|webp)$/i.test(fileName),
  );
  const imageMap = buildImageMap(imageFiles);
  const [questionPart, solutionPart] = tex.split('\nReferences:');

  if (!questionPart || !solutionPart) {
    throw new Error('Could not split bootcamp TeX into question and solution sections');
  }

  const questionSections = parseSectionBlocks(questionPart);
  const solutionSections = parseSectionBlocks(solutionPart);
  const solutionMap = new Map();

  for (const section of solutionSections) {
    for (const block of section.blocks) {
      const { answer, explanation } = extractAnswerAndExplanation(section.key, block.number, block.text);
      solutionMap.set(`${section.key}:${block.number}`, {
        answer,
        explanation,
      });
    }
  }

  await mkdir(IMAGE_TARGET_DIR, { recursive: true });
  await Promise.all(
    imageFiles.map((fileName) =>
      copyFile(path.join(IMAGE_SOURCE_DIR, fileName), path.join(IMAGE_TARGET_DIR, fileName)),
    ),
  );

  const importedQuestions = [];

  for (const section of questionSections) {
    const matchingSolutions = solutionSections.find(
      (candidate) => candidate.key === section.key,
    );

    if (!matchingSolutions) {
      throw new Error(`Missing solution section for ${section.displayName}`);
    }

    if (matchingSolutions.blocks.length !== section.blocks.length) {
      throw new Error(
        `Question/solution count mismatch for ${section.displayName}: ${section.blocks.length} questions vs ${matchingSolutions.blocks.length} solutions`,
      );
    }

    for (const block of section.blocks) {
      const solutionEntry = solutionMap.get(`${section.key}:${block.number}`);
      if (!solutionEntry) {
        throw new Error(`Missing solution entry for ${section.key}:${block.number}`);
      }

      const { stem, options } = splitStemAndOptions(block.text);
      ensureValidAnswer(solutionEntry.answer, options.length, section.key, block.number);

      importedQuestions.push({
        id: `${BANK_ID}-${section.key}-q${String(block.number).padStart(2, '0')}`,
        sectionKey: section.key,
        sectionNumber: block.number,
        topic: section.displayName,
        question_markdown: convertTexToMarkdown(stem, imageMap),
        options: options.map((option) => convertTexToMarkdown(option, imageMap)),
        correct_answer: solutionEntry.answer,
        solution_markdown: convertTexToMarkdown(solutionEntry.explanation, imageMap),
        source_note: SOURCE_NOTE,
        tags: [
          'bootcamp',
          'mathpix-import',
          section.key,
          options.length === 0 ? 'open-response' : 'multiple-choice',
        ],
      });
    }
  }

  moveTrailingHintToStem(importedQuestions, 'problem-set-2', 1);
  moveTrailingFigureSequenceToStem(importedQuestions, 'euclidean', 2, 'euclidean', 3);
  const euclideanFigureBlock = moveTrailingFigureSequenceToStem(
    importedQuestions,
    'euclidean',
    3,
    'euclidean',
    4,
  );
  prependBlockToQuestion(importedQuestions, 'euclidean', 5, euclideanFigureBlock);

  const questions = importedQuestions.map(({ sectionKey, sectionNumber, ...question }) => question);

  const bank = {
    id: BANK_ID,
    title: 'GRE Math Bootcamp Problem Sets',
    description:
      'Imported from a large GRE math bootcamp problem-set packet with topic-grouped questions, mixed multiple-choice formats, and one ungraded open-response item.',
    questions,
  };

  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${questions.length} questions to ${OUTPUT_JSON_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
