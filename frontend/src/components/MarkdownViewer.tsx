import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

type Props = {
  content: string
}

export function MarkdownViewer({ content }: Props) {
  const components: Components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-semibold mt-8 mb-4">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold mt-7 mb-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold mt-6 mb-2">{children}</h3>
    ),

    // ✅ 正文：对齐 GitHub README
    p: ({ children }) => (
      <p className="text-base text-gray-800 leading-relaxed mb-4">{children}</p>
    ),

    ul: ({ children }) => (
      <ul className="list-disc pl-6 mb-4 space-y-2 text-base">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-6 mb-4 space-y-2 text-base">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-base text-gray-800">{children}</li>
    ),

    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-5 text-base">
        {children}
      </blockquote>
    ),

    code: ({ className, children, ...props }) => {
      const text = String(children ?? '')
      const isBlock = Boolean(className) || text.includes('\n')

      if (!isBlock) {
        return (
          <code
            className="px-1 py-0.5 bg-gray-100 rounded text-[0.95em] font-mono"
            {...props}
          >
            {children}
          </code>
        )
      }

      return (
        <pre className="bg-[#f6f8fa] border rounded-md p-4 overflow-x-auto my-5">
          <code
            className={['text-sm font-mono', className]
              .filter(Boolean)
              .join(' ')}
            {...props}
          >
            {children}
          </code>
        </pre>
      )
    },

    table: ({ children }) => (
      <div className="overflow-x-auto my-5">
        <table className="border-collapse border border-gray-300 text-base">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-gray-300 px-3 py-2">{children}</td>
    ),

    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {children}
      </a>
    ),
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
