import { IconCircleX } from '@tabler/icons-react';
import { FC } from 'react';

import { ErrorMessage } from '@/types/error';

interface Props {
  error: ErrorMessage;
}

export const ErrorMessageDiv: FC<Props> = ({ error }) => {
  return (
    <div className="mx-6 flex h-full flex-col items-center justify-center text-red-500">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <IconCircleX size={32} stroke={1.5} className="text-red-500 dark:text-red-400" />
      </div>
      <div className="mb-3 text-2xl font-medium">{error.title}</div>
      <div className="max-w-md rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
        {error.messageLines.map((line, index) => (
          <div key={index} className="text-center">
            {line}
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs opacity-70 dark:text-red-400">
        {error.code ? <i>Code: {error.code}</i> : ''}
      </div>
    </div>
  );
};
