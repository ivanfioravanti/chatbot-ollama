import { FC, memo } from 'react';
import ReactMarkdown, { Options as ReactMarkdownOptions } from 'react-markdown';

// Extend the Options type to include className, which we'll handle separately
interface ExtendedOptions extends ReactMarkdownOptions {
  className?: string;
}

export const MemoizedReactMarkdown: FC<ExtendedOptions> = memo(
  ({ className, ...props }) => {
    // Use className in a wrapper div instead of directly on ReactMarkdown
    return (
      <div className={className}>
        <ReactMarkdown {...props} />
      </div>
    );
  },
  (prevProps, nextProps) => (
    prevProps.children === nextProps.children
  )
);

// Add display name to fix ESLint error
MemoizedReactMarkdown.displayName = 'MemoizedReactMarkdown';
