import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface MarkdownMathProps {
  content: string;
}

export default function MarkdownMath({ content }: MarkdownMathProps) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeKatex]}
      remarkPlugins={[remarkGfm, remarkMath]}
    >
      {content}
    </ReactMarkdown>
  );
}
