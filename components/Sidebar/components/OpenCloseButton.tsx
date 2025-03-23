import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';

interface Props {
  onClick: any;
  side: 'left' | 'right';
}

export const CloseSidebarButton = ({ onClick, side }: Props) => {
  return (
    <>
      <button
        className={`fixed top-5 ${
          side === 'right' ? 'right-[270px]' : 'left-[270px]'
        } z-50 h-8 w-8 rounded-md bg-gray-100/30 backdrop-blur-sm hover:bg-gray-200/50 text-gray-600 hover:text-gray-800 transition-all duration-200 dark:bg-gray-800/30 dark:text-white dark:hover:text-gray-300 dark:hover:bg-gray-700/50 sm:top-0.5 sm:${
          side === 'right' ? 'right-[270px]' : 'left-[270px]'
        } sm:h-8 sm:w-8 sm:text-neutral-700`}
        onClick={onClick}
      >
        {side === 'right' ? <IconArrowBarRight stroke={1.5} /> : <IconArrowBarLeft stroke={1.5} />}
      </button>
      <div
        onClick={onClick}
        className="absolute top-0 left-0 z-10 h-full w-full bg-black/60 backdrop-blur-sm sm:hidden"
      ></div>
    </>
  );
};

export const OpenSidebarButton = ({ onClick, side }: Props) => {
  return (
    <button
      className={`fixed top-2.5 ${
        side === 'right' ? 'right-2' : 'left-2'
      } z-50 h-8 w-8 rounded-md bg-gray-100/30 backdrop-blur-sm hover:bg-gray-200/50 text-gray-600 hover:text-gray-800 transition-all duration-200 dark:bg-gray-800/30 dark:text-white dark:hover:text-gray-300 dark:hover:bg-gray-700/50 sm:top-0.5 sm:${
        side === 'right' ? 'right-2' : 'left-2'
      } sm:h-8 sm:w-8 sm:text-neutral-700`}
      onClick={onClick}
    >
      {side === 'right' ? <IconArrowBarLeft stroke={1.5} /> : <IconArrowBarRight stroke={1.5} />}
    </button>
  );
};
