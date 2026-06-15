import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const OUTPUT_JSON_PATH = path.join(ROOT, 'src', 'data', 'banks', 'revisit-problems.json');
const FLOWCHART_ASSET_PATH = '/question-assets/revisit-problems/revisit-q44-flowchart.png';
const PACKET_SOURCE_NOTE = 'GRE Math Subject Test Problems (problems.pdf)';
const ADDITIONS_SOURCE_NOTE = 'Personal additions from problems_add.md';
const USER_SUPPLIED_SOURCE_NOTE = 'User-supplied supplemental problem';
const SHUFFLE_SEED = 20260406;

const SOURCE_BANK_FILES = [
  'bootcamp-problem-sets.json',
  'ets-form-gr0568.json',
  'ets-form-gr1268.json',
  'ets-form-gr9367.json',
  'gre-math-practice-unlabeled-91a67ccb.json',
];

function createReusedQuestion(question, topic, sourceLabel, extraTags = []) {
  return {
    ...question,
    id: 'pending',
    topic,
    source_note: `${sourceLabel}. Reused from ${question.id}. ${question.source_note}`,
    tags: [...new Set([...(question.tags ?? []), 'revisit-packet', ...extraTags])],
  };
}

function createManualQuestion(topic, data, sourceLabel, extraTags = []) {
  return {
    id: 'pending',
    topic,
    question_markdown: data.question_markdown,
    options: data.options,
    correct_answer: data.correct_answer,
    solution_markdown: data.solution_markdown,
    source_note: `${sourceLabel}. Entered manually for Personal mGRE Mock Test 1.`,
    tags: ['revisit-packet', 'manual-transcription', ...extraTags],
  };
}

function createRng(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(items, seed) {
  const random = createRng(seed);

  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

async function loadSourceQuestions() {
  const byId = new Map();

  for (const fileName of SOURCE_BANK_FILES) {
    const filePath = path.join(ROOT, 'src', 'data', 'banks', fileName);
    const bank = JSON.parse(await readFile(filePath, 'utf8'));

    for (const question of bank.questions) {
      byId.set(question.id, question);
    }
  }

  return byId;
}

async function buildBank() {
  const sourceQuestions = await loadSourceQuestions();

  function reuse(topic, sourceId) {
    const sourceQuestion = sourceQuestions.get(sourceId);
    if (!sourceQuestion) {
      throw new Error(`Missing source question: ${sourceId}`);
    }

    return createReusedQuestion(sourceQuestion, topic, PACKET_SOURCE_NOTE);
  }

  const packetQuestions = [
    reuse('Calculus', 'gre-math-practice-unlabeled-91a67ccb-q19'),
    reuse('Calculus', 'gre-math-practice-unlabeled-91a67ccb-q38'),
    reuse('Calculus', 'gre-math-practice-unlabeled-91a67ccb-q40'),
    reuse('Calculus', 'ets-form-gr0568-q39'),
    reuse('Calculus', 'ets-form-gr1268-q03'),
    reuse('Calculus', 'ets-form-gr9367-q44'),
    reuse('Calculus', 'ets-form-gr1268-q17'),
    reuse('Calculus', 'ets-form-gr1268-q33'),
    reuse('Calculus', 'ets-form-gr1268-q48'),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'A spherical tank of radius $5$ meters contains water that is slowly draining out. At the instant that measurements are taken, the maximum depth of the water in the tank is $2$ meters, and the depth is decreasing by $\\frac{1}{3}$ meter per second. What is the rate of decrease of the volume of the water, in cubic meters per second, at that instant?',
        options: [
          '$\\frac{16\\pi}{3}$',
          '$\\frac{59\\pi}{3}$',
          '$22\\pi$',
          '$\\frac{98\\pi}{3}$',
          '$\\frac{176\\pi}{3}$',
        ],
        correct_answer: 'A',
        solution_markdown:
          'For a spherical cap of depth $h$ in a sphere of radius $R$, $V(h)=\\pi h^{2}(R-h / 3)$, so $\\frac{dV}{dh}=\\pi(2Rh-h^{2})$. With $R=5$ and $h=2$, this is $16\\pi$. Since $\\frac{dh}{dt}=-\\frac{1}{3}$, the rate of decrease is $\\frac{16\\pi}{3}$.',
      },
      PACKET_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'Consider the sequence $\\{a_n\\}_{n=1}^{\\infty}$, where $a_n=\\sum_{k=1}^{n} \\frac{n}{n^{2}+k^{2}}$ for all $n \\geq 1$. What is $\\lim _{n \\rightarrow \\infty} a_n$?',
        options: [
          '$\\frac{1}{2}$',
          '$\\frac{\\pi}{4}$',
          '$\\frac{\\pi}{2}$',
          '$\\log 2$',
          '$2 \\log 2$',
        ],
        correct_answer: 'B',
        solution_markdown:
          'This is the Riemann sum $\\frac{1}{n} \\sum_{k=1}^{n} \\frac{1}{1+(k / n)^{2}}$, which converges to $\\int_{0}^{1} \\frac{dx}{1+x^{2}}=\\frac{\\pi}{4}$.',
      },
      PACKET_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          "Suppose that $f$ and $g$ are continuously differentiable real-valued functions on $\\mathbb{R}$ such that $f(0)=g(0)=0$ and $g'(0) \\neq 0$. Which of the following statements must be true?\n\nI. The function $\\frac{f}{g}$ can be extended to a continuous function in a neighborhood of $0$.\n\nII. The function $\\frac{f^{2}-f}{2g-g^{3}}$ can be extended to a continuous function in a neighborhood of $0$.\n\nIII. The function $\\frac{f}{g}$ can be extended to a differentiable function in a neighborhood of $0$.",
        options: ['None', 'I only', 'I and II only', 'I and III only', 'I, II, and III'],
        correct_answer: 'C',
        solution_markdown:
          "Because $g'(0) \\neq 0$, the zero of $g$ at $0$ is simple, so both I and II are removable-discontinuity statements. III need not hold; for example, taking $g(x)=x$ and $f(x)=x+x|x|$ makes $f / g=1+|x|$, which is not differentiable at $0$.",
      },
      PACKET_SOURCE_NOTE,
    ),
    reuse('Calculus', 'bootcamp-problem-sets-problem-set-1-q08'),
    reuse('Calculus', 'bootcamp-problem-sets-problem-set-2-q01'),
    reuse('Calculus', 'bootcamp-problem-sets-problem-set-4-q10'),
    reuse('Calculus', 'bootcamp-problem-sets-problem-set-6-q01'),
    createManualQuestion(
      'Calculus',
      {
        question_markdown: 'Find the volume enclosed by $(x^{2}+y^{2}+z^{2})^{2}=2 z\\left(x^{2}+y^{2}\\right)$.',
        options: [
          '$\\frac{\\pi}{40}$',
          '$\\frac{3\\pi}{40}$',
          '$\\frac{\\pi}{15}$',
          '$\\frac{2\\pi}{15}$',
          '$\\frac{\\pi}{2}$',
        ],
        correct_answer: 'D',
        solution_markdown:
          'In spherical coordinates the boundary is $\\rho=2 \\cos \\phi \\sin ^{2} \\phi$, so $V=2 \\pi \\int_{0}^{\\pi / 2} \\int_{0}^{2 \\cos \\phi \\sin ^{2} \\phi} \\rho^{2} \\sin \\phi \\, d \\rho \\, d \\phi=\\frac{2\\pi}{15}$.',
      },
      PACKET_SOURCE_NOTE,
    ),
    reuse('Calculus', 'bootcamp-problem-sets-problem-set-9-q04'),
    reuse('Calculus', 'bootcamp-problem-sets-problem-set-9-q10'),
    reuse('Differential Equations', 'ets-form-gr1268-q44'),
    reuse('Differential Equations', 'bootcamp-problem-sets-problem-set-4-q04'),
    reuse('Differential Equations', 'bootcamp-problem-sets-problem-set-4-q07'),
    reuse('Differential Equations', 'bootcamp-problem-sets-problem-set-9-q01'),
    reuse('Differential Equations', 'bootcamp-problem-sets-multivariable-q05'),
    reuse('Algebra', 'ets-form-gr1268-q49'),
    reuse('Algebra', 'gre-math-practice-unlabeled-91a67ccb-q31'),
    reuse('Algebra', 'ets-form-gr0568-q46'),
    reuse('Algebra', 'ets-form-gr1268-q59'),
    reuse('Algebra', 'bootcamp-problem-sets-problem-set-1-q09'),
    reuse('Algebra', 'bootcamp-problem-sets-linear-algebra-1-q08'),
    reuse('Algebra', 'bootcamp-problem-sets-linear-algebra-2-q08'),
    reuse('Algebra', 'bootcamp-problem-sets-abstract-algebra-q08'),
    reuse('Algebra', 'ets-form-gr9367-q55'),
    reuse('Algebra', 'ets-form-gr0568-q57'),
    reuse('Topology and Complex Analysis', 'ets-form-gr0568-q52'),
    reuse('Topology and Complex Analysis', 'ets-form-gr1268-q62'),
    createManualQuestion(
      'Topology and Complex Analysis',
      {
        question_markdown:
          'In the complex plane, let $C$ be the circle $\\{z=1+e^{i \\theta}: 0 \\leq \\theta \\leq 2 \\pi\\}$, oriented counterclockwise. What is the value of $\\frac{1}{2 \\pi i} \\int_{C} \\frac{\\sin z}{z-1} \\, d z$?',
        options: ['0', '$\\cos 1$', '$\\sin 1$', '$\\sin ^{-1} 1$', '$\\sin 2$'],
        correct_answer: 'C',
        solution_markdown:
          "By Cauchy's integral formula, $\\frac{1}{2 \\pi i} \\int_{C} \\frac{f(z)}{z-1} \\, d z=f(1)$ for $f(z)=\\sin z$, so the value is $\\sin 1$.",
      },
      PACKET_SOURCE_NOTE,
    ),
    reuse('Topology and Complex Analysis', 'ets-form-gr9367-q62'),
    reuse('Topology and Complex Analysis', 'bootcamp-problem-sets-topology-q09'),
    reuse('Probability, Combinatorics, Graphs, Algorithms', 'gre-math-practice-unlabeled-91a67ccb-q56'),
    reuse('Probability, Combinatorics, Graphs, Algorithms', 'gre-math-practice-unlabeled-91a67ccb-q14'),
    reuse('Probability, Combinatorics, Graphs, Algorithms', 'bootcamp-problem-sets-combinatorics-q02'),
    createManualQuestion(
      'Probability, Combinatorics, Graphs, Algorithms',
      {
        question_markdown:
          'Consider $10$ lines in the plane such that no two of the lines are parallel and no three of the lines have a common point. The $10$ lines divide the plane into how many regions?',
        options: ['36', '45', '46', '55', '56'],
        correct_answer: 'E',
        solution_markdown:
          'The $n$th line meets the previous $n-1$ lines in distinct points, so it creates $n$ new regions. Thus the total is $1+\\sum_{k=1}^{10} k=56$.',
      },
      PACKET_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Probability, Combinatorics, Graphs, Algorithms',
      {
        question_markdown:
          `![](${FLOWCHART_ASSET_PATH})\n\nThe flowchart above prints out a sequence of integers. Which of the following is a term in the sequence?`,
        options: ['32', '59', '81', '360', '1,000'],
        correct_answer: 'C',
        solution_markdown:
          'The loop generates cumulative sums of consecutive odd numbers, namely $4,9,16,25,\\ldots$, so the printed values are perfect squares greater than $1$. Only $81$ appears in the list.',
      },
      PACKET_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Probability, Combinatorics, Graphs, Algorithms',
      {
        question_markdown:
          'Let $X$ be a continuous random variable. The standard deviation of the sampling distribution of the sample mean for random samples of $30$ observations of $X$ is equal to $8$. What is the standard deviation of the sampling distribution of the sample mean for random samples of $120$ observations of $X$?',
        options: ['2', '4', '8', '12', '32'],
        correct_answer: 'B',
        solution_markdown:
          'The sample-mean standard deviation is $\\sigma / \\sqrt{n}$. Increasing the sample size from $30$ to $120$ halves that quantity, so the answer is $4$.',
      },
      PACKET_SOURCE_NOTE,
    ),
    reuse('Probability, Combinatorics, Graphs, Algorithms', 'bootcamp-problem-sets-problem-set-10-q07'),
    reuse('Probability, Combinatorics, Graphs, Algorithms', 'bootcamp-problem-sets-combinatorics-q01'),
    reuse('Probability, Combinatorics, Graphs, Algorithms', 'bootcamp-problem-sets-combinatorics-q03'),
    reuse('Probability, Combinatorics, Graphs, Algorithms', 'bootcamp-problem-sets-probability-q01'),
    reuse('Probability, Combinatorics, Graphs, Algorithms', 'bootcamp-problem-sets-probability-q07'),
  ];

  const additionalQuestions = [
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'Evaluate the following limit with the help of integrals:\n\n$$\n\\lim_{m,n\\rightarrow+\\infty}\\sum_{i=1}^m\\sum_{j=1}^n\\frac{(-1)^{i+j}}{i+j}\n$$',
        options: [
          '$\\ln 2-\\frac{1}{2}$',
          '$\\frac{1}{2}-\\ln 2$',
          '$1-\\ln 2$',
          '$(\\ln 2)^2$',
          '$\\ln 2$',
        ],
        correct_answer: 'A',
        solution_markdown:
          'Use $\\frac{1}{i+j}=\\int_{0}^{1} x^{i+j-1} \\, dx$. Then the double sum becomes $\\int_{0}^{1} \\frac{x}{(1+x)^{2}} \\, dx=\\ln 2-\\frac{1}{2}$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'Evaluate:\n\n$$\n\\lim_{x\\rightarrow\\infty}\\left(e\\left(1+\\frac{1}{x}\\right)^{-x}\\right)^x\n$$',
        options: ['1', '$e^{-1/2}$', '$e^{1/2}$', '$e$', '$e^{-1}$'],
        correct_answer: 'C',
        solution_markdown:
          'Take logarithms: $x\\left(1-x \\log \\left(1+\\frac{1}{x}\\right)\\right)=x\\left(\\frac{1}{2x}+o\\left(\\frac{1}{x}\\right)\\right) \\to \\frac{1}{2}$. Exponentiating gives $e^{1/2}$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'Integrate\n\n$$\n\\iint_S(x^2-y^2)\\,dy\\,dz+(y^2-z^2)\\,dz\\,dx+2z(y-x)\\,dx\\,dy\n$$\n\nwhere $S$ is the $z\\geq 0$ part of the lower hemisphere of\n\n$$\n\\frac{x^2}{a^2}+\\frac{y^2}{b^2}+\\frac{z^2}{c^2}=1.\n$$',
        options: ['0', '$\\frac{2\\pi abc}{3}$', '$\\frac{4\\pi abc}{3}$', '$\\pi abc$', '$-\\frac{4\\pi abc}{3}$'],
        correct_answer: 'A',
        solution_markdown:
          'Treat the integral as the flux of $F=(x^2-y^2, y^2-z^2, 2z(y-x))$. Its divergence is $2x+4y-2x=4y$, whose integral over the symmetric solid is $0$. The base disk also contributes $0$, so the surface integral is $0$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'Find the area of the region enclosed by the curve\n\n$$\nx=a(t-\\sin t),\\qquad y=a(1-\\cos t)\n$$\n\nfor $0\\leq t\\leq2\\pi$, together with the $x$-axis.',
        options: [
          '$2\\pi a^2$',
          '$3\\pi a^2$',
          '$4\\pi a^2$',
          '$\\frac{3\\pi a^2}{2}$',
          '$8a^2$',
        ],
        correct_answer: 'B',
        solution_markdown:
          'For one arch of the cycloid, the enclosed area is $\\int y \\, dx=\\int_{0}^{2\\pi} a(1-\\cos t) \\cdot a(1-\\cos t) \\, dt=3\\pi a^2$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'Integrate\n\n$$\n\\int_0^{1000}(\\lfloor\\lceil x\\rceil\\rfloor+\\lceil\\lfloor x\\rfloor\\rceil+\\lfloor{x}\\rfloor+{\\lfloor x\\rfloor}+\\lceil{x}\\rceil+{\\lceil x\\rceil})\\,dx\n$$',
        options: ['1000000', '1000500', '1001000', '1002000', '999000'],
        correct_answer: 'C',
        solution_markdown:
          'Using the intended floor-ceiling interpretation from the source, the integrand is constant on each interval $[k,k+1)$ and the resulting arithmetic-series sum over $k=0,1,\\ldots,999$ is $1001000$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'Integrate\n\n$$\n\\int_0^{\\pi / 2} \\cos ^2\\left(\\frac{\\pi}{2} \\cos ^2\\left(\\frac{\\pi}{2} \\cos ^2(x)\\right)\\right)\\, dx\n$$',
        options: [
          '$\\frac{\\pi}{8}$',
          '$\\frac{\\pi}{4}$',
          '$\\frac{\\pi}{3}$',
          '$\\frac{3\\pi}{8}$',
          '$\\frac{\\pi}{2}$',
        ],
        correct_answer: 'B',
        solution_markdown:
          'Repeatedly use the symmetry $x \\mapsto \\frac{\\pi}{2}-x$ and $\\cos ^2 u+\\sin ^2 u=1$ to pair the integrand with its complement. The average value over $[0,\\pi/2]$ is therefore $\\frac{1}{2}$, giving $\\frac{\\pi}{4}$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'When does the following generalized integral converge?\n\n$$\n\\int_0^1\\frac{1-\\cos x}{x^m}\\,dx\n$$',
        options: ['iff $m<1$', 'iff $m<2$', 'iff $m<3$', 'iff $m\\le 3$', 'iff $m>3$'],
        correct_answer: 'C',
        solution_markdown:
          'Near $0$, one has $1-\\cos x \\sim \\frac{x^2}{2}$, so the integrand behaves like $x^{2-m}$. This is integrable at $0$ exactly when $2-m>-1$, that is, $m<3$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'Find the area of the surface\n\n$$\ny-x\\tan \\frac{z}{h}=0,\\qquad |z|\\leq \\frac{\\pi h}{2},\n$$\n\nwhere\n\n$$\nr^2\\leq x^2+y^2\\leq R^2.\n$$',
        options: [
          '$\\pi\\left(R\\sqrt{R^2+h^2}-r\\sqrt{r^2+h^2}+h^2\\ln\\frac{R+\\sqrt{R^2+h^2}}{r+\\sqrt{r^2+h^2}}\\right)$',
          '$2\\pi\\left(R\\sqrt{R^2+h^2}-r\\sqrt{r^2+h^2}+h^2\\ln\\frac{R+\\sqrt{R^2+h^2}}{r+\\sqrt{r^2+h^2}}\\right)$',
          '$\\pi\\left(R\\sqrt{R^2+h^2}-r\\sqrt{r^2+h^2}-h^2\\ln\\frac{R+\\sqrt{R^2+h^2}}{r+\\sqrt{r^2+h^2}}\\right)$',
          '$\\pi\\left(R\\sqrt{R^2+h^2}-r\\sqrt{r^2+h^2}\\right)$',
          '$\\pi\\left(R\\sqrt{R^2+h^2}-r\\sqrt{r^2+h^2}+h\\ln\\frac{R+\\sqrt{R^2+h^2}}{r+\\sqrt{r^2+h^2}}\\right)$',
        ],
        correct_answer: 'A',
        solution_markdown:
          'Parametrize the surface as $(\\rho \\cos \\theta,\\rho \\sin \\theta,h\\theta)$ with $\\rho \\in [r,R]$ and $\\theta \\in [-\\pi/2,\\pi/2]$. Then $dS=\\sqrt{\\rho^2+h^2} \\, d\\rho \\, d\\theta$, so the area is $\\pi \\int_r^R \\sqrt{\\rho^2+h^2} \\, d\\rho$, which gives option A.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Calculus',
      {
        question_markdown:
          'Evaluate the limit:\n\n$$\n\\lim_{n\\rightarrow\\infty}n^2\\left(\\int_0^{\\pi/4}\\tan^n\\theta\\,d\\theta-\\frac1{2n}\\right)\n$$',
        options: [
          '$-\\frac12$',
          '$-\\frac14$',
          '0',
          '$\\frac14$',
          '$\\frac12$',
        ],
        correct_answer: 'C',
        solution_markdown:
          'With $u=\\tan \\theta$, the integral becomes $\\int_0^1 \\frac{u^n}{1+u^2} \\, du$. Expanding $\\frac{1}{1+u^2}$ near $u=1$ shows the asymptotic is $\\frac{1}{2n}+O(n^{-3})$, so after subtracting $\\frac{1}{2n}$ and multiplying by $n^2$ the limit is $0$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Algebra',
      {
        question_markdown:
          'Count the number of all $\\mathbb{Z}[i]$-modules with cardinality $8\\cdot 2025$.',
        options: ['18', '24', '30', '32', '36'],
        correct_answer: 'C',
        solution_markdown:
          'Since $\\mathbb{Z}[i]$ is a PID, finite modules are classified by partitions at Gaussian primes. The $2^3$ part contributes $p(3)=3$, the $3^4$ part contributes $p(2)=2$ because $3$ is inert, and the split $5^2$ part contributes $5$ possibilities. Thus the total is $3\\cdot 2\\cdot 5=30$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Algebra',
      {
        question_markdown:
          'Let\n\n$$\nf(X)=AX-XA\\qquad (X\\in M_{2\\times2}(\\mathbb R)),\n$$\n\nwhere\n\n$$\nA=\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}.\n$$\n\nCompute $\\ker f$.',
        options: [
          '$\\left\\{\\begin{pmatrix}u&v\\\\\\frac32v&u+\\frac32v\\end{pmatrix}:u,v\\in\\mathbb R\\right\\}$',
          '$\\left\\{\\begin{pmatrix}u&v\\\\-\\frac32v&u-\\frac32v\\end{pmatrix}:u,v\\in\\mathbb R\\right\\}$',
          '$\\left\\{\\begin{pmatrix}u&2v\\\\3v&u\\end{pmatrix}:u,v\\in\\mathbb R\\right\\}$',
          '$\\left\\{\\begin{pmatrix}u&v\\\\v&u\\end{pmatrix}:u,v\\in\\mathbb R\\right\\}$',
          '$\\{\\lambda I_2:\\lambda\\in\\mathbb R\\}$',
        ],
        correct_answer: 'A',
        solution_markdown:
          'The kernel is the commutant of $A$. Since $A$ is non-scalar, every commuting matrix has the form $uI+vA$, which is equivalent to option A after renaming parameters.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Algebra',
      {
        question_markdown:
          'Determine whether the following homogeneous linear systems have nontrivial solutions. If so, give the general solution.\n\n$$\n\\left\\{\n\\begin{aligned}\n3x_1-5x_2+x_3-2x_4&=0\\\\\n2x_1+3x_2-5x_3+x_4&=0\\\\\n-x_1+7x_2-4x_3+3x_4&=0\\\\\n4x_1+15x_2-7x_3+9x_4&=0\n\\end{aligned}\n\\right.\n$$\n\n$$\n\\left\\{\n\\begin{aligned}\n5x_1-2x_2+4x_3-3x_4&=0\\\\\n-3x_1+5x_2-x_3+2x_4&=0\\\\\nx_1-3x_2+2x_3+x_4&=0\n\\end{aligned}\n\\right.\n$$',
        options: [
          'The first system has only the trivial solution; the second has general solution $\\lambda(55,10,-33,41)$.',
          'The first has general solution $\\lambda(-1,-2,-1,3)$; the second has only the trivial solution.',
          'The first has general solution $\\lambda(-1,-2,-1,3)$; the second has general solution $\\mu(55,10,-33,41)$.',
          'Both systems have two-dimensional solution spaces.',
          'The first has general solution $\\lambda(1,2,1,3)$; the second has general solution $\\mu(55,10,-33,-41)$.',
        ],
        correct_answer: 'C',
        solution_markdown:
          'Row reduction gives a one-dimensional nullspace for each system. The first is spanned by $(-1,-2,-1,3)$ and the second by $(55,10,-33,41)$.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Algebra',
      {
        question_markdown:
          'Compute the determinant\n\n$$\nD=\\left|\\begin{array}{ccc}\n\\frac1{a_1+b_1}&\\cdots&\\frac1{a_1+b_n}\\\\\n\\vdots&&\\vdots\\\\\n\\frac1{a_n+b_1}&\\cdots&\\frac1{a_n+b_n}\n\\end{array}\\right|.\n$$',
        options: [
          '$\\displaystyle \\frac{\\prod_{1\\le i<j\\le n}(a_j-a_i)(b_j-b_i)}{\\prod_{i=1}^n\\prod_{j=1}^n(a_i+b_j)}$',
          '$\\displaystyle \\frac{\\prod_{1\\le i<j\\le n}(a_j-a_i)(b_j-b_i)}{\\prod_{1\\le i<j\\le n}(a_i+b_j)(a_j+b_i)}$',
          '$\\displaystyle \\frac{\\prod_{1\\le i<j\\le n}(a_i+a_j)(b_i+b_j)}{\\prod_{i=1}^n\\prod_{j=1}^n(a_i+b_j)}$',
          '$\\displaystyle \\frac{\\prod_{1\\le i<j\\le n}(a_j-a_i)(b_i-b_j)}{\\prod_{i=1}^n\\prod_{j=1}^n(a_i+b_j)}$',
          '$\\displaystyle \\frac{\\prod_{1\\le i<j\\le n}(a_j-a_i)(b_j-b_i)}{\\left(\\prod_{i=1}^n\\prod_{j=1}^n(a_i+b_j)\\right)^2}$',
        ],
        correct_answer: 'A',
        solution_markdown:
          'This is the classical Cauchy determinant formula.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Algebra',
      {
        question_markdown:
          'How many of the following rank inequalities are correct?\n\nI. If $A$ is $m\\times s$ and $B$ is $s\\times n$, then\n\n$$\n\\operatorname{rank} A+\\operatorname{rank} B-s\\leq\\operatorname{rank}(AB).\n$$\n\nII. For $A,B,C$ of size $n\\times n$, if $ABC=0$, then\n\n$$\n\\operatorname{rank}A+\\operatorname{rank}B+\\operatorname{rank}C\\leq2n.\n$$\n\nIII. If $AB=BA$ and $AC+BD=I$, then\n\n$$\n\\operatorname{rank}(AB)=\\operatorname{rank}A+\\operatorname{rank}B-n.\n$$\n\nIV. For an $n\\times n$ matrix $A$,\n\n$$\n\\operatorname{rank}A+\\operatorname{rank}(I+A)\\geq n.\n$$',
        options: ['1', '2', '3', '4', '0'],
        correct_answer: 'D',
        solution_markdown:
          'I is Sylvester rank inequality. II follows from I and $\\operatorname{rank}(AB)+\\operatorname{rank}(C)\\le n$. III is a standard consequence of the Bezout-type relation $AC+BD=I$ together with $AB=BA$. IV holds because $\\ker A\\cap\\ker(I+A)=\\{0\\}$. Hence all four are correct.',
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Probability, Combinatorics, Graphs, Algorithms',
      {
        question_markdown:
          'Four points are chosen independently and at random on the surface of a sphere using the uniform distribution. What is the probability that the center of the sphere lies inside the resulting tetrahedron?',
        options: [
          '$\\frac{1}{16}$',
          '$\\frac{1}{8}$',
          '$\\frac{1}{6}$',
          '$\\frac{1}{4}$',
          '$\\frac{3}{8}$',
        ],
        correct_answer: 'B',
        solution_markdown:
          "By Wendel's theorem, the probability that four random points on $S^{2}$ lie in some open hemisphere is $\\frac{7}{8}$. The complementary event is exactly that the origin lies inside their tetrahedron, so the probability is $\\frac{1}{8}$.",
      },
      ADDITIONS_SOURCE_NOTE,
    ),
    createManualQuestion(
      'Algebra',
      {
        question_markdown:
          'Let $A$ be a $3\\times 3$ matrix with $\\det(A)=2$. Compute\n\n$$\n\\det(2A^{-1}).\n$$',
        options: [
          '$\\frac{1}{2}$',
          '$2$',
          '$4$',
          '$6$',
          '$8$',
        ],
        correct_answer: 'C',
        solution_markdown:
          'Because $\\det(2A^{-1})=2^{3}\\det(A^{-1})=8\\cdot\\frac{1}{\\det(A)}=8\\cdot\\frac{1}{2}=4$, the answer is C.',
      },
      USER_SUPPLIED_SOURCE_NOTE,
      ['user-supplied'],
    ),
  ];

  const questions = [...packetQuestions, ...additionalQuestions];

  if (questions.length !== 66) {
    throw new Error(`Expected 66 questions before shuffling, found ${questions.length}`);
  }

  shuffleInPlace(questions, SHUFFLE_SEED);

  const finalizedQuestions = questions.map((question, index) => ({
    ...question,
    id: `revisit-problems-q${String(index + 1).padStart(2, '0')}`,
  }));

  const bank = {
    id: 'revisit-problems',
    title: 'Personal mGRE Mock Test 1',
    description:
      'A shuffled 66-question personal mock test assembled from problems.pdf, problems_add.md, and one user-supplied supplemental problem. The shuffle is deterministic so the generated JSON stays stable.',
    questions: finalizedQuestions,
  };

  await writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(bank, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${finalizedQuestions.length} questions to ${OUTPUT_JSON_PATH}`);
}

buildBank().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
