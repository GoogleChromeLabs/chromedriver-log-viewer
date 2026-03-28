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

import React, { useState } from 'react';
import { LogRow } from './LogRow';
import type { LogEntry } from '../utils/logParser';

interface StickyHeaderOverlayProps {
  entries: LogEntry[];
  onToggleExpand: (id: number) => void;
  expandedIds: Set<number>;
  onToggleRaw: (id: number) => void;
  rawViewExpandedIds: Set<number>;
  hoveredCorrelationId?: number;
  onHoverCorrelation: (id?: number) => void;
}

export const StickyHeaderOverlay = React.forwardRef<HTMLDivElement, StickyHeaderOverlayProps>(
  (
    {
      entries,
      onToggleExpand,
      expandedIds,
      onToggleRaw,
      rawViewExpandedIds,
      hoveredCorrelationId,
      onHoverCorrelation,
    },
    ref,
  ) => {
    const [isExpandedAll, setIsExpandedAll] = useState(false);

    if (entries.length === 0) return null;

    const renderEntry = (entry: LogEntry) => (
      <div key={entry.id} style={{ pointerEvents: 'auto' }}>
        <LogRow
          entry={entry}
          style={{
            backgroundColor: 'var(--bg-surface-highlighted)',
            borderBottom: '1px solid var(--border-color)',
          }}
          onToggleExpand={() => {
            onToggleExpand(entry.id);
          }}
          isExpanded={expandedIds.has(entry.id)}
          onToggleRaw={onToggleRaw}
          isRawExpanded={rawViewExpandedIds.has(entry.id)}
          highlightedCorrelationId={hoveredCorrelationId}
          onHoverCorrelation={onHoverCorrelation}
        />
      </div>
    );

    let content;
    if (entries.length <= 10 || isExpandedAll) {
      content = entries.map(renderEntry);
    } else {
      const topEntries = entries.slice(0, 2);
      const bottomEntries = entries.slice(-8);
      const hiddenCount = entries.length - 10;

      content = (
        <>
          {topEntries.map(renderEntry)}
          <div
            style={{
              pointerEvents: 'auto',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface-alt)',
              borderBottom: '1px solid var(--border-color)',
              textAlign: 'center',
              fontSize: '0.85em',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              userSelect: 'none',
              fontWeight: 500,
            }}
            onClick={() => setIsExpandedAll(true)}
            title="Click to expand all collapsed commands"
          >
            ... {hiddenCount} commands hidden ...
          </div>
          {bottomEntries.map(renderEntry)}
        </>
      );
    }

    return (
      <div
        ref={ref}
        className="sticky-header-overlay"
        style={{
          zIndex: 10,
          width: '100%',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          ...(isExpandedAll && entries.length > 10
            ? {
                maxHeight: '40vh',
                overflowY: 'auto',
              }
            : {}),
        }}
      >
        {isExpandedAll && entries.length > 10 && (
          <div
            style={{
              pointerEvents: 'auto',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface-hover)',
              borderBottom: '1px solid var(--border-color)',
              textAlign: 'center',
              fontSize: '0.85em',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              position: 'sticky',
              top: 0,
              zIndex: 11,
              fontWeight: 500,
              userSelect: 'none',
              boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)',
            }}
            onClick={() => setIsExpandedAll(false)}
          >
            Collapse Stack ↑
          </div>
        )}
        {content}
      </div>
    );
  },
);
