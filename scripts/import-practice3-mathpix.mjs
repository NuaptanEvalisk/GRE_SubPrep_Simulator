import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const TEX_PATH = path.join(
  ROOT,
  'b338a126-6dfe-4b95-85da-921c7545ec88',
  'b338a126-6dfe-4b95-85da-921c7545ec88.tex',
);
const ANSWER_KEY_PATH = path.join(ROOT, 'p3-ans.txt');
const IMAGE_SOURCE_DIR = path.join(ROOT, 'b338a126-6dfe-4b95-85da-921c7545ec88', 'images');
const IMAGE_TARGET_DIR = path.join(ROOT, 'public', 'question-assets', 'ets-form-gr9367');
const OUTPUT_JSON_PATH = path.join(ROOT, 'src', 'data', 'banks', 'ets-form-gr9367.json');
const BANK_ID = 'ets-form-gr9367';
const SOURCE_NOTE = 'ETS GRE Mathematics Test, Form GR9367';

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

function cleanConvertedText(text) {
  return text
    .replace(/^\$If \$f\(x\)=/, 'If $f(x)=')
    .replace(/\n\n[A-E]\) [^\n]+$/g, '')
    .replace(/\n\nGO ON TO THE NEXT PAGE\.?/g, '')
    .replace(/\n\nIV If /g, '\n\nIV. If ')
    .replace(/\nIV If /g, '\nIV. If ')
    .replace('having derivatives of all orders If $D$', 'having derivatives of all orders. If $D$');
}

function preprocessTex(tex) {
  return tex
    .replace(
      '\n$2 \\cdot \\lim _{x \\rightarrow 0} \\frac{\\tan x}{\\cos x}=',
      '\n2. $2 \\cdot \\lim _{x \\rightarrow 0} \\frac{\\tan x}{\\cos x}=',
    )
    .replace(/\n52 Let /, '\n52. Let ')
    .replace(/\n54 If /, '\n54. If ')
    .replace(/\(A\.\)/g, '(A)')
    .replace('\\operatorname{If}_{f} f(x)=\\left\\{', 'If $f(x)=\\left\\{')
    .replace(
      '52. Let $T$ be the transformation of the $x y$-plane that reflects each vector through the $x$-axis and then doubles the If $A$ is the $2 \\times 2$ matrix such that $T\\left(\\left[\\begin{array}{l}x \\\\ y\\end{array}\\right]\\right)=A\\left[\\begin{array}{l}x \\\\ y\\end{array}\\right]$ for each vector $\\left[\\begin{array}{l}x \\\\ y\\end{array}\\right]$, then $A=$ vector\'s length.',
      '52. Let $T$ be the transformation of the $x y$-plane that reflects each vector through the $x$-axis and then doubles the vector\'s length. If $A$ is the $2 \\times 2$ matrix such that $T\\left(\\left[\\begin{array}{l}x \\\\ y\\end{array}\\right]\\right)=A\\left[\\begin{array}{l}x \\\\ y\\end{array}\\right]$ for each vector $\\left[\\begin{array}{l}x \\\\ y\\end{array}\\right]$, then $A=$',
    )
    .replace(
      /23\. Let \$f\$[\s\S]*?Which of the following must be true\?\n\n\\begin\{enumerate\}\n\s*\\item There exists \$x \\in\(0,1\)\$ such that \$f\(x\)=x\.\$\\\\\nII\. There exists \$x \\in\(0,1\)\$ such that \$f\^\{\\prime\}\(x\)=-1\.\$\\\\\nIII\. \$f\(x\)>0\$ for all \$x \\in\[0,1\)\.\$\\\\\n\(A\) I only\\\\\n\(B\) II only\\\\\n\(C\) I and II only\\\\\n\(D\) II and III only\\\\\n\(E\) I, II, and III/,
      `23. Let $f$ be a real-valued function continuous on the closed interval $[0,1]$ and differentiable on the open interval $(0,1)$ with $f(0)=1$ and $f(1)=0$. Which of the following must be true?

I. There exists $x \\in(0,1)$ such that $f(x)=x$.\\\\
II. There exists $x \\in(0,1)$ such that $f^{\\prime}(x)=-1$.\\\\
III. $f(x)>0$ for all $x \\in[0,1)$.\\\\
(A) I only\\\\
(B) II only\\\\
(C) I and II only\\\\
(D) II and III only\\\\
(E) I, II, and III`,
    )
    .replace(
      /43\. Let \$n\$ be an integer greater than 1[\s\S]*?interval \$\(0,1\)\$ \?\n\n\\begin\{enumerate\}\n\s*\\item \$a_\{0\}>0\$ and \\sum_\{i=0\}\^\{n-1\} a_\{i\}<1\\\\\nII\. \$a_\{0\}>0\$ and \\sum_\{i=0\}\^\{n-1\} a_\{i\}>1\\\\\nIII\. \$a_\{0\}<0\$ and \\sum_\{i=0\}\^\{n-1\} a_\{i\}>1\\\\\n\(A\) None\\\\\n\(B\) I only\\\\\n\(C\) II only\\\\\n\(D\) III only\\\\\n\(E\) I and III/,
      `43. Let $n$ be an integer greater than 1. Which of the following conditions guarantee that the equation
$x^{n}=\\sum_{i=0}^{n-1} a_{i} x^{i}$ has at least one root in the interval $(0,1)$ ?

I. $a_{0}>0$ and $\\sum_{i=0}^{n-1} a_{i}<1$\\\\
II. $a_{0}>0$ and $\\sum_{i=0}^{n-1} a_{i}>1$\\\\
III. $a_{0}<0$ and $\\sum_{i=0}^{n-1} a_{i}>1$\\\\
(A) None\\\\
(B) I only\\\\
(C) II only\\\\
(D) III only\\\\
(E) I and III`,
    )
    .replace(
      /66\. Let \$n\$ be any positive integer[\s\S]*?Which of the following must be true\?\n\n\\begin\{enumerate\}\n\s*\\item There is an \$x_\{i\}\$ that is the square of an integer\.\$\\\\\nII\. There is an \$i\$ such that \$x_\{i\+1\}=x_\{i\}\+1\.\$\\\\\nIII\. There is an \$x_\{i\}\$ that is prime\.\$\\\\\n\(A\) I only\\\\\n\(B\) II only\\\\\n\(C\) I and II\\\\\n\(D\) I and III\\\\\n\(E\) II and III\n\\end\{enumerate\}/,
      `66. Let $n$ be any positive integer and $1 \\leq x_{1}<x_{2}<\\ldots<x_{n+1} \\leq 2 n$, where each $x_{i}$ is an integer. Which of the following must be true?

I. There is an $x_{i}$ that is the square of an integer.\\\\
II. There is an $i$ such that $x_{i+1}=x_{i}+1$.\\\\
III. There is an $x_{i}$ that is prime.\\\\
(A) I only\\\\
(B) II only\\\\
(C) I and II\\\\
(D) I and III\\\\
(E) II and III`,
    );
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
      return `![](/question-assets/ets-form-gr9367/${resolvedFile})`;
    })
    .replace(/\\\\/g, '\n\n');

  text = normalizeLatexEnvironments(text);
  text = normalizeSubstackBlocks(text);
  text = text.replace(/\\operatorname\{det\}/g, '\\det');

  return cleanConvertedText(escapeForJson(text));
}

function parseAnswerKey(answerText) {
  const answers = [...answerText.matchAll(/^\s*(\d+)\.\s*([A-E])\s*$/gm)]
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
  const questionSection = tex.split('IF YOU FINISH BEFORE TIME IS CALLED')[0];
  const enumerateStart = questionSection.indexOf('\\begin{enumerate}');
  if (enumerateStart === -1) {
    throw new Error('Could not find beginning of question enumerate block');
  }

  const content = questionSection.slice(enumerateStart);
  const lines = content.split('\n');
  let depth = 0;
  let questionCounter = 0;
  let annotated = '';

  for (const rawLine of lines) {
    const line = rawLine;
    const romanStatementStarts = [
      'There exists $x \\in(0,1)$ such that $f(x)=x$.\\\\',
      '$a_{0}>0$ and $\\sum_{i=0}^{n-1} a_{i}<1$\\\\',
      'There is an $x_{i}$ that is the square of an integer.\\\\',
    ];

    if (line.includes('\\begin{enumerate}')) {
      depth += 1;
      continue;
    }

    if (line.includes('\\end{enumerate}')) {
      depth = Math.max(0, depth - 1);
      continue;
    }

    const setCounterMatch = line.match(/\\setcounter\{enumi\}\{(\d+)\}/);
    if (setCounterMatch) {
      questionCounter = Number(setCounterMatch[1]);
      continue;
    }

    const explicitQuestionMatch = line.match(/^(\d{1,2})\.\s+(.*)$/);
    if (explicitQuestionMatch) {
      const questionNumber = Number(explicitQuestionMatch[1]);
      annotated += `\n@@Q${questionNumber}@@\n${explicitQuestionMatch[2]}\n`;
      questionCounter = questionNumber;
      continue;
    }

    const explicitQuestionNoDotMatch = line.match(/^(\d{1,2})\s+(?=[A-Z$])(.*)$/);
    if (explicitQuestionNoDotMatch && depth <= 1) {
      const questionNumber = Number(explicitQuestionNoDotMatch[1]);
      annotated += `\n@@Q${questionNumber}@@\n${explicitQuestionNoDotMatch[2]}\n`;
      questionCounter = questionNumber;
      continue;
    }

    if (depth === 1) {
      const topLevelItemMatch = line.match(/^\s*\\item\s*(.*)$/);
      if (topLevelItemMatch) {
        if (romanStatementStarts.includes(topLevelItemMatch[1])) {
          annotated += `I. ${topLevelItemMatch[1]}\n`;
          continue;
        }
        questionCounter += 1;
        annotated += `\n@@Q${questionCounter}@@\n${topLevelItemMatch[1]}\n`;
        continue;
      }
    }

    if (depth > 1) {
      const nestedItemMatch = line.match(/^\s*\\item\s*(.*)$/);
      if (nestedItemMatch) {
        annotated += `I. ${nestedItemMatch[1]}\n`;
        continue;
      }
    }

    annotated += `${line}\n`;
  }

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

  const optionMatches = [...normalizedBody.matchAll(/(?:^|\n)[ \t]*\(([A-E])\.?\)\s*/g)].map(
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

async function main() {
  const rawTex = await readFile(TEX_PATH, 'utf8');
  const tex = preprocessTex(rawTex);
  const answerText = await readFile(ANSWER_KEY_PATH, 'utf8');
  const imageFiles = (await readdir(IMAGE_SOURCE_DIR)).filter((fileName) =>
    /\.(png|jpe?g|gif|webp)$/i.test(fileName),
  );
  const imageMap = buildImageMap(imageFiles);
  const answerKey = parseAnswerKey(answerText);
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
      tags: ['official', 'ets', 'form-gr9367'],
    };
  });

  const bank = {
    id: BANK_ID,
    title: 'ETS GRE Mathematics Test Form GR9367',
    description: 'Imported from ETS GRE Mathematics Test Form GR9367.',
    questions,
  };

  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${questions.length} questions to ${OUTPUT_JSON_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
