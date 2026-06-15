import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const TEX_PATH = path.join(
  ROOT,
  '91a67ccb-b2c3-47fe-9520-9e6473348a4b',
  '91a67ccb-b2c3-47fe-9520-9e6473348a4b.tex',
);
const IMAGE_SOURCE_DIR = path.join(ROOT, '91a67ccb-b2c3-47fe-9520-9e6473348a4b', 'images');
const IMAGE_TARGET_DIR = path.join(
  ROOT,
  'public',
  'question-assets',
  'gre-math-practice-unlabeled-91a67ccb',
);
const OUTPUT_JSON_PATH = path.join(
  ROOT,
  'src',
  'data',
  'banks',
  'gre-math-practice-unlabeled-91a67ccb.json',
);
const BANK_ID = 'gre-math-practice-unlabeled-91a67ccb';
const SOURCE_NOTE = 'GRE Mathematics Practice Test (unlabeled Mathpix export)';

function normalizeWhitespace(text) {
  const codeBlocks = [];
  const protectedText = text.replace(/```[\s\S]*?```/g, (block) => {
    const token = `@@CODEBLOCK${codeBlocks.length}@@`;
    codeBlocks.push(block);
    return token;
  });

  const normalized = protectedText
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return codeBlocks.reduce(
    (accumulator, block, index) => accumulator.replace(`@@CODEBLOCK${index}@@`, block),
    normalized,
  );
}

function escapeForJson(text) {
  return normalizeWhitespace(text);
}

function buildImageMap(imageFiles) {
  const imageMap = new Map();

  for (const fileName of imageFiles) {
    imageMap.set(fileName, fileName);
    imageMap.set(fileName.replace(path.extname(fileName), ''), fileName);
  }

  return imageMap;
}

function normalizeVerbatimCode(code) {
  return code
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
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

function convertTabularToMarkdown(tabularBody) {
  const rows = tabularBody
    .replace(/\\hline/g, '')
    .split('\\\\')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) =>
      row
        .split('&')
        .map((cell) => cell.trim())
        .filter((cell, index, cells) => !(cells.length === 1 && cell === '')),
    )
    .filter((cells) => cells.length > 0);

  if (rows.length < 2) {
    return tabularBody.trim();
  }

  const columnCount = Math.max(...rows.map((cells) => cells.length));
  const normalizedRows = rows.map((cells) => {
    const padded = [...cells];
    while (padded.length < columnCount) {
      padded.push('');
    }
    return padded;
  });

  const header = `| ${normalizedRows[0].join(' | ')} |`;
  const separator = `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`;
  const body = normalizedRows
    .slice(1)
    .map((cells) => `| ${cells.join(' | ')} |`)
    .join('\n');

  return `${header}\n${separator}\n${body}`;
}

function convertTexToMarkdown(raw, imageMap) {
  let text = raw.trim();

  text = text
    .replace(
      /\\begin\{center\}\s*\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}\s*\\end\{center\}/g,
      (_, tabularBody) => `\n\n${convertTabularToMarkdown(tabularBody)}\n\n`,
    )
    .replace(/\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/g, (_, tabularBody) => {
      return `\n\n${convertTabularToMarkdown(tabularBody)}\n\n`;
    })
    .replace(/\\begin\{figure\}\[[^\]]*]/g, '')
    .replace(/\\end\{figure\}/g, '')
    .replace(/\\begin\{center\}/g, '')
    .replace(/\\end\{center\}/g, '')
    .replace(/\\caption\{([^}]+)\}/g, '$1\n')
    .replace(/\\begin\{enumerate\}/g, '')
    .replace(/\\end\{enumerate\}/g, '')
    .replace(/\\setcounter\{enumi\}\{\d+\}/g, '')
    .replace(/\\captionsetup\{[^}]*\}/g, '')
    .replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (_, code) => {
      return `\n\n\`\`\`\n${normalizeVerbatimCode(code)}\n\`\`\`\n\n`;
    })
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

  return escapeForJson(text);
}

function parseAnswerKey(tex) {
  const answerSection = tex.split('\\section*{Answers}')[1];
  if (!answerSection) {
    throw new Error('Could not find embedded answer section');
  }

  const answers = [...answerSection.matchAll(/\\item\s+([A-E])/g)].map((match, index) => ({
    number: index + 1,
    answer: match[1],
  }));

  if (answers.length !== 66) {
    throw new Error(`Expected 66 embedded answers, found ${answers.length}`);
  }

  return answers;
}

function parseQuestionBodies(tex) {
  const questionSection = tex.split('\\section*{Answers}')[0];
  const enumerateStart = questionSection.indexOf('\\begin{enumerate}');
  if (enumerateStart === -1) {
    throw new Error('Could not find beginning of question enumerate block');
  }

  const content = questionSection.slice(enumerateStart);
  let enumerateCounter = 0;
  const annotated = content
    .replace(/\\setcounter\{enumi\}\{(\d+)\}|\\item\b/g, (match, counterValue) => {
      if (counterValue !== undefined) {
        enumerateCounter = Number(counterValue);
        return '';
      }

      enumerateCounter += 1;
      return `\n@@Q${enumerateCounter}@@\n`;
    })
    .replace(/(^|\n)(\d{1,2})\.\s/g, (match, prefix, questionNumber) => {
      return `${prefix}@@Q${questionNumber}@@ `;
    });

  const markerMatches = [...annotated.matchAll(/@@Q(\d+)@@/g)];
  const numberedBlocks = markerMatches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < markerMatches.length ? markerMatches[index + 1].index : annotated.length;
    return {
      questionNumber: Number(match[1]),
      text: annotated.slice(start, end).trim(),
    };
  });

  if (numberedBlocks.length !== 66) {
    throw new Error(`Expected 66 numbered question blocks, found ${numberedBlocks.length}`);
  }

  const bodies = [];
  let pendingPrefix = '';

  for (const block of numberedBlocks) {
    let text = block.text;

    if (pendingPrefix) {
      text = `${pendingPrefix}\n${text}`.trim();
      pendingPrefix = '';
    }

    const endEnumerateIndex = text.lastIndexOf('\\end{enumerate}');
    if (endEnumerateIndex !== -1) {
      const before = text.slice(0, endEnumerateIndex).trim();
      const after = text.slice(endEnumerateIndex + '\\end{enumerate}'.length).trim();
      const optionCountBefore = [...before.matchAll(/\(([A-E])\)/g)].length;

      if (optionCountBefore >= 5) {
        if (/^If you finished before time is called/i.test(after)) {
          text = before;
        } else {
          text = before;
          pendingPrefix = after;
        }
      } else {
        text = [before, after].filter(Boolean).join('\n\n');
      }
    }

    const cleaned = text
      .replace(/\\begin\{enumerate\}/g, '')
      .replace(/\\end\{enumerate\}/g, '')
      .replace(/\\setcounter\{enumi\}\{\d+\}/g, '')
      .trim();

    bodies.push(cleaned);
  }

  if (pendingPrefix) {
    throw new Error('Unattached question prefix remained after parsing');
  }

  return bodies;
}

function splitStemAndOptions(questionBody) {
  const normalizedBody = questionBody
    .replace(/\\begin\{figure\}\[[^\]]*]/g, '')
    .replace(/\\end\{figure\}/g, '')
    .replace(/\\begin\{center\}/g, '')
    .replace(/\\end\{center\}/g, '')
    .replace(/\\captionsetup\{[^}]*\}/g, '')
    .replace(/\\caption\{\(([A-E])\)\}/g, '\n($1)\n')
    .trim();

  const optionMatches = [...normalizedBody.matchAll(/(?:^|\n)[ \t]*\(([A-E])\)\s*/g)].map(
    (match) => ({
      label: match[1],
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

  if (optionMatches.length < 5) {
    throw new Error(`Question body is missing option labels:\n${normalizedBody.slice(0, 200)}`);
  }

  const stem = normalizedBody.slice(0, optionMatches[0].index).trim();
  const options = optionMatches.slice(0, 5).map((match, index) => {
    const start = match.index + match.markerLength;
    const end =
      index + 1 < optionMatches.length ? optionMatches[index + 1].index : normalizedBody.length;
    return normalizedBody.slice(start, end).trim();
  });

  if (options.length !== 5) {
    throw new Error('Each question must have exactly 5 options');
  }

  return { stem, options };
}

function moveTrailingBlockToNextStem(questions, questionNumber, blockType) {
  const previousQuestion = questions[questionNumber - 2];
  const currentQuestion = questions[questionNumber - 1];

  if (!previousQuestion || !currentQuestion) {
    throw new Error(`Cannot relocate prefix for question ${questionNumber}`);
  }

  const blockRegex =
    blockType === 'image'
      ? /(\n\n)?(!\[\]\([^)]+\))\s*$/s
      : /(\n\n)?(\$\$[\s\S]+?\$\$)\s*$/s;

  const match = previousQuestion.options[4].match(blockRegex);
  if (!match) {
    throw new Error(
      `Expected trailing ${blockType} block before question ${questionNumber}, but none was found`,
    );
  }

  const block = match[2];
  previousQuestion.options[4] = previousQuestion.options[4].replace(blockRegex, '').trim();
  currentQuestion.question_markdown = `${block}\n\n${currentQuestion.question_markdown}`.trim();
}

function moveTrailingTableToNextStem(questions, questionNumber) {
  const previousQuestion = questions[questionNumber - 2];
  const currentQuestion = questions[questionNumber - 1];

  if (!previousQuestion || !currentQuestion) {
    throw new Error(`Cannot relocate table for question ${questionNumber}`);
  }

  const tableRegex = /(\n\n)?((?:\|.*\|\n?)+)\s*$/s;
  const match = previousQuestion.options[4].match(tableRegex);
  if (!match) {
    throw new Error(`Expected trailing table before question ${questionNumber}`);
  }

  const block = match[2].trim();
  previousQuestion.options[4] = previousQuestion.options[4].replace(tableRegex, '').trim();
  currentQuestion.question_markdown = `${block}\n\n${currentQuestion.question_markdown}`.trim();
}

async function main() {
  const tex = await readFile(TEX_PATH, 'utf8');
  const imageFiles = (await readdir(IMAGE_SOURCE_DIR)).filter((fileName) =>
    /\.(png|jpe?g|gif|webp)$/i.test(fileName),
  );
  const imageMap = buildImageMap(imageFiles);
  const answerKey = parseAnswerKey(tex);
  const questionBodies = parseQuestionBodies(tex);

  await mkdir(IMAGE_TARGET_DIR, { recursive: true });
  await Promise.all(
    imageFiles.map((fileName) =>
      copyFile(path.join(IMAGE_SOURCE_DIR, fileName), path.join(IMAGE_TARGET_DIR, fileName)),
    ),
  );

  const questions = questionBodies.map((body, index) => {
    const { stem, options } = splitStemAndOptions(body);
    const correctAnswer = answerKey[index]?.answer;
    if (!correctAnswer) {
      throw new Error(`Missing answer for question ${index + 1}`);
    }

    return {
      id: `${BANK_ID}-q${String(index + 1).padStart(2, '0')}`,
      topic: 'Practice Test',
      question_markdown: convertTexToMarkdown(stem, imageMap),
      options: options.map((option) => convertTexToMarkdown(option, imageMap)),
      correct_answer: correctAnswer,
      solution_markdown: `Embedded answer key: ${correctAnswer}. Worked solutions are not included in the source test booklet.`,
      source_note: SOURCE_NOTE,
      tags: ['practice', 'mathpix-import', 'unlabeled-form'],
    };
  });

  moveTrailingBlockToNextStem(questions, 24, 'image');
  moveTrailingTableToNextStem(questions, 26);
  moveTrailingBlockToNextStem(questions, 27, 'image');
  moveTrailingBlockToNextStem(questions, 35, 'image');
  moveTrailingBlockToNextStem(questions, 51, 'image');
  moveTrailingBlockToNextStem(questions, 62, 'image');
  moveTrailingBlockToNextStem(questions, 65, 'image');
  moveTrailingTableToNextStem(questions, 66);

  const bank = {
    id: BANK_ID,
    title: 'GRE Mathematics Practice Test (Unlabeled Form)',
    description:
      'Imported from an unlabeled GRE Mathematics practice test Mathpix export.',
    questions,
  };

  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${questions.length} questions to ${OUTPUT_JSON_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
