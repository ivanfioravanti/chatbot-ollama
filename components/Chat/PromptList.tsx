import { FC, MutableRefObject } from 'react';

import { Prompt } from '@/types/prompt';

interface Props {
  prompts: Prompt[];
  activePromptIndex: number;
  onSelect: () => void;
  onMouseOver: (index: number) => void;
  promptListRef: MutableRefObject<HTMLUListElement | null>;
}

export const PromptList: FC<Props> = ({
  prompts,
  activePromptIndex,
  onSelect,
  onMouseOver,
  promptListRef,
}) => {
  return (
    <ul
      ref={promptListRef}
      className="z-10 max-h-52 w-full overflow-scroll rounded border border-gray-200 bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-[#1b2a4a] dark:bg-[#0f1d35] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]"
    >
      {prompts.map((prompt, index) => (
        <li
          key={prompt.id}
          className={`${
            index === activePromptIndex
              ? 'bg-gray-200 dark:bg-[#202123] dark:text-black'
              : ''
          } cursor-pointer px-3 py-2 text-sm text-black dark:text-white`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect();
          }}
          onMouseEnter={() => onMouseOver(index)}
        >
          {prompt.name}
        </li>
      ))}
    </ul>
  );
};
