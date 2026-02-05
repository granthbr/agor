/**
 * Search and filter controls for the Prompt Library.
 */

import type { PromptTemplateCategory } from '@agor/core/types';
import { SearchOutlined } from '@ant-design/icons';
import { Input, Segmented } from 'antd';
import { useEffect, useRef, useState } from 'react';

interface TemplateSearchProps {
  onSearchChange: (search: string) => void;
  onCategoryChange: (category: PromptTemplateCategory | 'all') => void;
  onSortChange: (sort: string) => void;
  category: PromptTemplateCategory | 'all';
  sort: string;
}

export const TemplateSearch: React.FC<TemplateSearchProps> = ({
  onSearchChange,
  onCategoryChange,
  onSortChange,
  category,
  sort,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search templates..."
        value={searchValue}
        onChange={(e) => handleSearch(e.target.value)}
        allowClear
      />
      <Segmented
        value={category}
        onChange={(value) => onCategoryChange(value as PromptTemplateCategory | 'all')}
        options={[
          { label: 'All', value: 'all' },
          { label: 'Zone', value: 'zone' },
          { label: 'Session', value: 'session' },
          { label: 'Scheduler', value: 'scheduler' },
          { label: 'Generic', value: 'generic' },
        ]}
        block
        size="small"
      />
      <Segmented
        value={sort}
        onChange={(value) => onSortChange(value as string)}
        options={[
          { label: 'Best', value: 'quality_score' },
          { label: 'Most Used', value: 'usage_count' },
          { label: 'Newest', value: 'created_at' },
          { label: 'Top Rated', value: 'avg_rating' },
        ]}
        block
        size="small"
      />
    </div>
  );
};
