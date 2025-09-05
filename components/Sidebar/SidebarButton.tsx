import { FC } from 'react';

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const SidebarButton: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <button
      className="flex w-full cursor-pointer select-none items-center gap-3 rounded-md py-3 px-3 text-[14px] leading-3 
      text-gray-700 hover:bg-blue-100 transition-colors duration-200
      dark:text-white dark:hover:bg-white/10"
      onClick={onClick}
    >
      <div>{icon}</div>
      <span>{text}</span>
    </button>
  );
};
