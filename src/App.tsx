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

import { useState, useMemo, useRef, useEffect } from 'react';
import { DropZone } from './components/DropZone';
import { LogViewer, type LogViewerHandle } from './components/LogViewer';
import { FilterBar } from './components/FilterBar';
import { parseLogs, type LogEntry } from './utils/logParser';
import './App.css';

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // filteredLogs is now derived, we don't need state for it
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [filterText, setFilterText] = useState('');

  // Selection and View state
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const logViewerRef = useRef<LogViewerHandle>(null);

  const handleFileLoaded = async (content: string, name: string) => {
    setIsParsing(true);
    setFileName(name);

    // Defer parsing to next tick to allow UI to update
    setTimeout(() => {
      const parsed = parseLogs(content);
      setLogs(parsed);
      setFilterText('');
      setSelectedId(null);
      setIsParsing(false);
    }, 100);
  };

  // Filter logs purely based on current state (Derived State)
  const filteredLogs = useMemo(() => {
    if (!filterText.trim()) {
      return logs;
    }
    const query = filterText.toLowerCase();

    // Jump to line number feature: if query starts with : and is followed by digits, don't filter
    if (/^:\d+$/.test(query)) {
      return logs;
    }

    return logs.filter((entry) => {
      if (entry.message.toLowerCase().includes(query)) return true;
      if (entry.tags && entry.tags.some((tag) => tag.toLowerCase().includes(query))) return true;
      if (entry.method && entry.method.toLowerCase().includes(query)) return true; // Method search
      return false;
    });
  }, [logs, filterText]);

  // Maintain selection index
  const selectedIndex = useMemo(() => {
    if (selectedId === null) return -1;
    return filteredLogs.findIndex((l) => l.id === selectedId);
  }, [filteredLogs, selectedId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere if modifier keys are pressed (except generic ones)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const isUp = e.key === 'ArrowUp';
      const isDown = e.key === 'ArrowDown';
      const isPageUp = e.key === 'PageUp';
      const isPageDown = e.key === 'PageDown';
      const isRight = e.key === 'ArrowRight';
      const isLeft = e.key === 'ArrowLeft';

      if (!isUp && !isDown && !isPageUp && !isPageDown && !isRight && !isLeft) return;

      e.preventDefault();

      const total = filteredLogs.length;
      if (total === 0) return;

      let nextIndex = selectedIndex;

      // Handle Expand/Collapse for Left/Right
      if ((isRight || isLeft) && selectedId !== null) {
        const currentEntry = filteredLogs.find((l) => l.id === selectedId);
        if (currentEntry) {
          logViewerRef.current?.setExpanded(selectedId, isRight);
        }
        return; // Don't scroll or change selection
      }

      // Initialize selection if none
      if (selectedIndex === -1) {
        if (isUp || isPageUp) nextIndex = total - 1;
        else nextIndex = 0;
      } else {
        if (isUp) nextIndex = Math.max(0, selectedIndex - 1);
        if (isDown) nextIndex = Math.min(total - 1, selectedIndex + 1);
        if (isPageUp) nextIndex = Math.max(0, selectedIndex - 10);
        if (isPageDown) nextIndex = Math.min(total - 1, selectedIndex + 10);
      }

      const nextEntry = filteredLogs[nextIndex];
      if (nextEntry) {
        setSelectedId(nextEntry.id);

        // Use ensureVisible to handle scrolling
        // If moving down, fallback align 'end'. If moving up, fallback align 'start'.
        const align = isDown || isPageDown ? 'end' : 'start';
        logViewerRef.current?.ensureVisible(nextIndex, align);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredLogs, selectedIndex, selectedId]);

  // Ensure selection is visible when the list changes (e.g. filter cleared or applied)
  useEffect(() => {
    if (selectedIndex !== -1) {
      // Use 'center' to provide context when jumping to a new position after filter change
      requestAnimationFrame(() => {
        logViewerRef.current?.ensureVisible(selectedIndex, 'center');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredLogs]);

  // Handle "Jump to Line" command
  useEffect(() => {
    const match = filterText.match(/^:(\d+)$/);
    if (match) {
      const targetLine = parseInt(match[1], 10);

      // Binary search for the closest line number <= targetLine
      let low = 0;
      let high = logs.length - 1;
      let bestIndex = -1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const midVal = logs[mid].lineNumber;

        if (midVal === targetLine) {
          bestIndex = mid;
          break;
        } else if (midVal < targetLine) {
          bestIndex = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      if (bestIndex === -1 && logs.length > 0) {
        bestIndex = 0;
      }

      if (bestIndex !== -1) {
        const entry = logs[bestIndex];
        setSelectedId(entry.id);
        logViewerRef.current?.ensureVisible(bestIndex, 'center');
      }
    }
  }, [filterText, logs]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ChromeDriver Log Viewer</h1>
        {fileName && (
          <span className="filename">
            Viewing: {fileName} ({filteredLogs.length} visible)
          </span>
        )}
        {logs.length > 0 && (
          <button
            className="reset-btn"
            onClick={() => {
              setLogs([]);
              setFileName('');
              setFilterText('');
              setSelectedId(null);
            }}
          >
            Open Different File
          </button>
        )}
      </header>

      <main className="app-main">
        {isParsing && <div className="parsing-indicator">Parsing logs... please wait.</div>}

        {!isParsing && logs.length === 0 && (
          <div className="upload-section">
            <DropZone onFileLoaded={handleFileLoaded} />
          </div>
        )}

        {!isParsing && logs.length > 0 && (
          <>
            <FilterBar
              filterText={filterText}
              onFilterChange={setFilterText}
              matchesCount={filteredLogs.length}
              totalCount={logs.length}
            />
            <LogViewer
              ref={logViewerRef}
              logs={filteredLogs}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
