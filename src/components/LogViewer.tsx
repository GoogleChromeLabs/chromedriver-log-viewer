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

import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import type { LogEntry } from '../utils/logParser';
import { LogRow } from './LogRow';
import { StickyHeaderOverlay } from './StickyHeaderOverlay';
import './LogViewer.css';

export interface LogViewerHandle {
  ensureVisible: (index: number, align: 'start' | 'end' | 'center') => void;
  setExpanded: (id: number, expanded: boolean) => void;
}

interface LogViewerProps {
  logs: LogEntry[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  virtuosoRef?: React.Ref<VirtuosoHandle>;
  onVisibleRangeChange?: (range: { startIndex: number; endIndex: number }) => void;
}

export const LogViewer = forwardRef<LogViewerHandle, LogViewerProps>(
  ({ logs, selectedId, onSelect, virtuosoRef: externalVirtuosoRef, onVisibleRangeChange }, ref) => {
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [rawViewExpandedIds, setRawViewExpandedIds] = useState<Set<number>>(new Set());
    const [hoveredCorrelationId, setHoveredCorrelationId] = useState<number | undefined>(undefined);
    const [stickyIndices, setStickyIndices] = useState<number[]>([]);

    const internalVirtuosoRef = useRef<VirtuosoHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const stickyHeaderRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      ensureVisible: (index: number, align: 'start' | 'end' | 'center') => {
        // Measure sticky header height
        const headerHeight = stickyHeaderRef.current?.offsetHeight || 0;

        const el = containerRef.current?.querySelector(`[data-index="${index}"]`);
        if (el) {
          // If explicitly centering, skip "is already visible" check
          if (align === 'center') {
            el.scrollIntoView({ block: 'center' });
            return;
          }

          // Precise scroll check
          const rect = el.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();

          if (containerRect) {
            const topSpace = rect.top - containerRect.top;
            const bottomSpace = rect.bottom - containerRect.bottom;

            // Check if obscured by header (top)
            if (topSpace < headerHeight) {
              internalVirtuosoRef.current?.scrollToIndex({
                index,
                align: 'start',
                offset: -headerHeight,
              });
              return;
            }

            // Check if below bottom
            if (bottomSpace > 0) {
              el.scrollIntoView({ block: 'nearest' });
              return;
            }
          }
          // If visible, do nothing
        } else {
          // Fallback to virtuoso scroll
          // If aligning start, we definitely want to account for header
          if (align === 'start') {
            internalVirtuosoRef.current?.scrollToIndex({ index, align, offset: -headerHeight });
          } else {
            internalVirtuosoRef.current?.scrollToIndex({ index, align });
          }
        }
      },
      setExpanded: (id: number, expanded: boolean) => {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          if (expanded) {
            next.add(id);
          } else {
            next.delete(id);
          }
          return next;
        });
      },
    }));

    const toggleExpand = (id: number) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      onSelect?.(id); // Auto-select on click
    };

    const toggleRawExpand = (id: number) => {
      setRawViewExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      onSelect?.(id);
    };

    const handleRangeChanged = React.useCallback(
      (range: { startIndex: number; endIndex: number }) => {
        onVisibleRangeChange?.(range);
        const { startIndex } = range;
        if (logs.length === 0 || startIndex >= logs.length) {
          setStickyIndices([]);
          return;
        }

        const topEntry = logs[startIndex];
        if (!topEntry || !topEntry.laneConfig) {
          setStickyIndices([]);
          return;
        }

        const activeEntryIndices = topEntry.laneConfig.laneEntryIndices
          ? Object.values(topEntry.laneConfig.laneEntryIndices)
          : [];

        const indices: number[] = [];
        for (const idx of activeEntryIndices) {
          if (idx < startIndex) {
            indices.push(idx);
          }
        }

        indices.sort((a, b) => a - b);
        setStickyIndices(indices);
      },
      [logs, onVisibleRangeChange],
    );

    const stickyEntries = stickyIndices.map((idx) => logs[idx]).filter(Boolean);

    return (
      <div className="log-viewer-container" ref={containerRef}>
        <StickyHeaderOverlay
          ref={stickyHeaderRef}
          entries={stickyEntries}
          onToggleExpand={toggleExpand}
          expandedIds={expandedIds}
          onToggleRaw={toggleRawExpand}
          rawViewExpandedIds={rawViewExpandedIds}
          hoveredCorrelationId={hoveredCorrelationId}
          onHoverCorrelation={setHoveredCorrelationId}
        />

        <Virtuoso
          ref={(instance) => {
            internalVirtuosoRef.current = instance;
            if (typeof externalVirtuosoRef === 'function') {
              externalVirtuosoRef(instance);
            } else if (externalVirtuosoRef) {
              // eslint-disable-next-line react-hooks/immutability
              externalVirtuosoRef.current = instance;
            }
          }}
          style={{ flex: 1 }}
          data={logs}
          rangeChanged={handleRangeChanged}
          itemContent={(index, entry) => (
            <div data-index={index} style={{ width: '100%' }}>
              <LogRow
                key={entry.id}
                entry={entry}
                style={{}}
                onToggleExpand={toggleExpand}
                isExpanded={expandedIds.has(entry.id)}
                onToggleRaw={toggleRawExpand}
                isRawExpanded={rawViewExpandedIds.has(entry.id)}
                highlightedCorrelationId={hoveredCorrelationId}
                onHoverCorrelation={setHoveredCorrelationId}
                isSelected={selectedId === entry.id}
                onRowClick={onSelect}
              />
            </div>
          )}
        />
      </div>
    );
  },
);
