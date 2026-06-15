import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const TEX_PATH = path.join(
  ROOT,
  'bce54b49-274a-411d-852c-aa7cec973585',
  'bce54b49-274a-411d-852c-aa7cec973585.tex',
);
const IMAGE_SOURCE_DIR = path.join(ROOT, 'bce54b49-274a-411d-852c-aa7cec973585', 'images');
const IMAGE_TARGET_DIR = path.join(ROOT, 'public', 'question-assets', 'ets-form-gr0568');
const OUTPUT_JSON_PATH = path.join(ROOT, 'src', 'data', 'banks', 'ets-form-gr0568.json');
const BANK_ID = 'ets-form-gr0568';
const SOURCE_NOTE = 'ETS GRE Mathematics Test, Form GR0568';

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
    .map((line) => {
      const trimmed = line.trim();

      if (trimmed === 'begin') {
        return '    begin';
      }
      if (trimmed === 'end') {
        return '    end';
      }
      if (trimmed.startsWith('replace ') || trimmed.startsWith('set $k=')) {
        return `        ${trimmed}`;
      }
      if (trimmed.startsWith('while k ')) {
        return `        ${trimmed}`;
      }
      if (trimmed.startsWith('if ')) {
        return `            ${trimmed}`;
      }

      return trimmed;
    })
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

function normalizeSubstackBlocks(text) {
  return text.replace(/\\substack\{([\s\S]*?)\}/g, (_, body) => {
    const normalizedBody = body
      .trim()
      .replace(/\n\s*\n/g, ' \\\\ ')
      .replace(/\n/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    return `\\substack{${normalizedBody}}`;
  });
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
      return `![](/question-assets/ets-form-gr0568/${resolvedFile})`;
    })
    .replace(/\\\\/g, '\n\n');

  text = normalizeLatexEnvironments(text);
  text = normalizeSubstackBlocks(text);
  text = text.replace(/\\operatorname\{det\}/g, '\\det');

  return escapeForJson(text);
}

function parseAnswerKey(tex) {
  const answers = [...tex.matchAll(/\n\s*(\d+)\s*&\s*([A-E])\s*&/g)]
    .map((match) => ({
      number: Number(match[1]),
      answer: match[2],
    }))
    .filter(({ number }) => number >= 1 && number <= 66);

  if (answers.length !== 66) {
    throw new Error(`Expected 66 answer-key rows, found ${answers.length}`);
  }

  return answers;
}

function parseQuestionBodies(tex) {
  const questionSection = tex.split('\\section*{STOP}')[0];
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
    const questionNumber = Number(match[1]);
    const start = match.index + match[0].length;
    const end = index + 1 < markerMatches.length ? markerMatches[index + 1].index : annotated.length;
    return {
      questionNumber,
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
        text = before;
        pendingPrefix = after;
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
  previousQuestion.options[4] = previousQuestion.options[4]
    .replace(blockRegex, '')
    .trim();
  currentQuestion.question_markdown = `${block}\n\n${currentQuestion.question_markdown}`.trim();
}

function moveTrailingImageSequenceToNextStem(questions, questionNumber) {
  const previousQuestion = questions[questionNumber - 2];
  const currentQuestion = questions[questionNumber - 1];

  if (!previousQuestion || !currentQuestion) {
    throw new Error(`Cannot relocate image sequence for question ${questionNumber}`);
  }

  const sequenceRegex =
    /(\n\n)?((?:!\[\]\([^)]+\)\s*(?:Figure \d+)?\s*)+)\s*$/s;
  const match = previousQuestion.options[4].match(sequenceRegex);
  if (!match) {
    throw new Error(`Expected trailing image sequence before question ${questionNumber}`);
  }

  const block = match[2].trim();
  previousQuestion.options[4] = previousQuestion.options[4]
    .replace(sequenceRegex, '')
    .trim();
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
      topic: 'Official Practice Test',
      question_markdown: convertTexToMarkdown(stem, imageMap).replace(
        /\\operatorname\{det\}/g,
        '\\det',
      ),
      options: options.map((option) =>
        convertTexToMarkdown(option, imageMap).replace(/\\operatorname\{det\}/g, '\\det'),
      ),
      correct_answer: correctAnswer,
      solution_markdown: `Official answer key: ${correctAnswer}. Worked solutions are not included in the source test booklet.`,
      source_note: SOURCE_NOTE,
      tags: ['official', 'ets', 'form-gr0568'],
    };
  });

  moveTrailingBlockToNextStem(questions, 5, 'image');
  moveTrailingBlockToNextStem(questions, 10, 'image');
  moveTrailingBlockToNextStem(questions, 28, 'image');
  moveTrailingBlockToNextStem(questions, 45, 'image');
  moveTrailingImageSequenceToNextStem(questions, 54);
  moveTrailingBlockToNextStem(questions, 60, 'image');

  const bank = {
    id: BANK_ID,
    title: 'ETS GRE Mathematics Test Form GR0568',
    description: 'Imported from ETS GRE Mathematics Test Form GR0568.',
    questions,
  };

  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${questions.length} questions to ${OUTPUT_JSON_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
