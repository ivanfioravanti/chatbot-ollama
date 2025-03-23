import { IconRobot } from '@tabler/icons-react';
import { FC } from 'react';

interface Props { }

export const ChatLoader: FC<Props> = () => {
  return (
    <div
      className="group border-b border-black/10 bg-gray-50/90 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654]/95 dark:text-gray-100"
      style={{ overflowWrap: 'anywhere' }}
    >
      <div className="m-auto flex gap-4 p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
        <div className="min-w-[40px] items-end">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r from-purple-500/70 to-blue-500/70 text-white">
            <IconRobot size={20} stroke={2.5} />
          </div>
        </div>
        <span className="animate-pulse cursor-default mt-1">▍</span>
      </div>
    </div>
  );
};
