import { IconX } from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslation } from 'next-i18next';

interface Props {
  placeholder: string;
  searchTerm: string;
  onSearch: (searchTerm: string) => void;
}
const Search: FC<Props> = ({ placeholder, searchTerm, onSearch }) => {
  const { t } = useTranslation('sidebar');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const clearSearch = () => {
    onSearch('');
  };

  return (
    <div className="relative flex items-center">
      <input
        className="w-full flex-1 rounded-md border px-4 py-3 pr-10 text-[14px] leading-3 
          border-blue-200 bg-white text-gray-700 placeholder-gray-400
          dark:border-white/20 dark:bg-[#0e1728] dark:text-white dark:placeholder-white/60"
        type="text"
        placeholder={t(placeholder) || ''}
        value={searchTerm}
        onChange={handleSearchChange}
      />

      {searchTerm && (
        <IconX
          className="absolute right-4 cursor-pointer text-gray-400 hover:text-gray-500 dark:text-neutral-300 dark:hover:text-neutral-400"
          size={18}
          onClick={clearSearch}
        />
      )}
    </div>
  );
};

export default Search;
