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

import React from 'react';
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
    if (entries.length === 0) return null;

    return (
      <div
        ref={ref}
        className="sticky-header-overlay"
        style={{
          zIndex: 10,
          width: '100%',
          backgroundColor: 'white',
          borderBottom: '1px solid #ddd',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {entries.map((entry) => (
          <div key={entry.id} style={{ pointerEvents: 'auto' }}>
            <LogRow
              entry={entry}
              style={{
                backgroundColor: '#fffbeb',
                borderBottom: '1px solid #ddd',
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
        ))}
      </div>
    );
  },
);
