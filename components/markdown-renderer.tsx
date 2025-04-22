'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content text-sm ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse border border-border" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-background-2" {...props} />,
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => <tr className="border-b border-border" {...props} />,
          th: ({ node, ...props }) => <th className="p-2 text-left border-r border-border last:border-r-0" {...props} />,
          td: ({ node, ...props }) => <td className="p-2 border-r border-border last:border-r-0" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-8 mb-4" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mt-6 mb-3" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-base font-semibold mt-4 mb-2" {...props} />,
          p: ({ node, ...props }) => <p className="my-4" {...props} />,
          a: ({ node, ...props }) => <a className="text-text hover:underline" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-4" {...props} />,
          li: ({ node, ...props }) => <li className="my-1" {...props} />,
          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-border pl-4 my-4 italic" {...props} />,
          hr: ({ node, ...props }) => <hr className="my-8 border-t border-border" {...props} />,
          aside: ({ node, ...props }) => <aside className="bg-background-2 p-4 my-4 text-text/70" {...props} />,
          details: ({ node, ...props }) => <details className="my-4" {...props} />,
          summary: ({ node, ...props }) => <summary className="cursor-pointer font-medium text-text/70 hover:text-text transition-colors duration-200" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
