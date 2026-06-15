import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const optionLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const bankDirectory = path.resolve(process.cwd(), 'src/data/banks');

async function getTargetFiles() {
  if (process.argv.length > 2) {
    return process.argv.slice(2).map((filePath) => path.resolve(process.cwd(), filePath));
  }

  const entries = await readdir(bankDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(bankDirectory, entry.name));
}

function validateQuestion(question, index, filePath, errors) {
  const prefix = `${path.basename(filePath)} question #${index + 1}`;

  for (const field of [
    'id',
    'topic',
    'question_markdown',
    'options',
    'correct_answer',
    'solution_markdown',
    'source_note',
  ]) {
    if (!(field in question)) {
      errors.push(`${prefix}: missing required field "${field}"`);
    }
  }

  if (!Array.isArray(question.options)) {
    errors.push(`${prefix}: options must be an array`);
  } else if (question.options.length !== 0 && (question.options.length < 2 || question.options.length > optionLabels.length)) {
    errors.push(
      `${prefix}: options must be empty for open-response items or contain between 2 and ${optionLabels.length} items`,
    );
  }

  if (Array.isArray(question.options) && question.options.length === 0) {
    if (question.correct_answer !== null) {
      errors.push(`${prefix}: open-response items must set correct_answer to null`);
    }
  } else if (
    !Array.isArray(question.options) ||
    !optionLabels.slice(0, question.options.length).includes(question.correct_answer)
  ) {
    errors.push(
      `${prefix}: correct_answer must match one of the rendered option labels (${optionLabels
        .slice(0, Array.isArray(question.options) ? question.options.length : 0)
        .join(', ')})`,
    );
  }
}

function validateBank(bank, filePath) {
  const errors = [];

  if (!bank || typeof bank !== 'object') {
    errors.push(`${path.basename(filePath)}: top-level JSON must be an object`);
    return errors;
  }

  for (const field of ['id', 'title', 'questions']) {
    if (!(field in bank)) {
      errors.push(`${path.basename(filePath)}: missing required field "${field}"`);
    }
  }

  if (!Array.isArray(bank.questions)) {
    errors.push(`${path.basename(filePath)}: "questions" must be an array`);
    return errors;
  }

  const seenIds = new Set();
  bank.questions.forEach((question, index) => {
    validateQuestion(question, index, filePath, errors);

    if (question?.id) {
      if (seenIds.has(question.id)) {
        errors.push(`${path.basename(filePath)} question #${index + 1}: duplicate id "${question.id}"`);
      }
      seenIds.add(question.id);
    }
  });

  if (bank.questions.length !== 66) {
    console.warn(
      `${path.basename(filePath)}: warning: expected 66 questions for a full exam, found ${bank.questions.length}`,
    );
  }

  return errors;
}

async function main() {
  const files = await getTargetFiles();
  if (files.length === 0) {
    console.error('No question bank JSON files found.');
    process.exit(1);
  }

  const allErrors = [];

  for (const filePath of files) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(filePath, 'utf8'));
    } catch (error) {
      allErrors.push(`${path.basename(filePath)}: invalid JSON (${error.message})`);
      continue;
    }

    allErrors.push(...validateBank(parsed, filePath));
  }

  if (allErrors.length > 0) {
    console.error('Question bank validation failed:\n');
    for (const error of allErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Validated ${files.length} question bank file(s) successfully.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
