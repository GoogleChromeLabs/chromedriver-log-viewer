/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useEffect, useRef } from 'react';
import './FilterBar.css';

interface FilterBarProps {
  filterText: string;
  onFilterChange: (text: string) => void;
  matchesCount?: number;
  totalCount?: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filterText,
  onFilterChange,
  matchesCount,
  totalCount,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus on '/'
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // Clear on 'Escape'
      if (e.key === 'Escape') {
        if (document.activeElement === inputRef.current) {
          // If we have text, clear it. If empty, blur.
          if (filterText) {
            onFilterChange('');
          } else {
            inputRef.current?.blur();
          }
        } else if (filterText) {
          // If not focused but we have filter, clear it
          onFilterChange('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filterText, onFilterChange]);

  return (
    <div className="filter-bar">
      <input
        ref={inputRef}
        type="text"
        className="filter-input"
        placeholder="Filter logs by tag, message, or ID... (Press '/' to focus)"
        value={filterText}
        onChange={(e) => onFilterChange(e.target.value)}
      />
      {filterText && matchesCount !== undefined && totalCount !== undefined && (
        <span className="filter-stats">
          Showing {matchesCount} of {totalCount} events
        </span>
      )}
    </div>
  );
};
