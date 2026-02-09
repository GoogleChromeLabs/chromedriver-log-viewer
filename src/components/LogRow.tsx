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
import type { LogEntry } from '../utils/logParser';
import { getInlineLogSummary } from '../utils/logFormatter';
import {
  Info,
  AlertCircle,
  Bug,
  ChevronRight,
  ChevronDown,
  ArrowRightCircle,
  ArrowLeftCircle,
  SquareArrowLeft,
  SquareArrowRight,
} from 'lucide-react';
import clsx from 'clsx';
import './LogRow.css';

interface LogRowProps {
  entry: LogEntry;
  style: React.CSSProperties;
  onToggleExpand: (id: number) => void;
  isExpanded: boolean;
  onToggleRaw: (id: number) => void;
  isRawExpanded: boolean;
  highlightedCorrelationId?: number;
  onHoverCorrelation: (id: number | undefined) => void;
  isSelected?: boolean;
  onRowClick?: (id: number) => void;
}

export const LogRow: React.FC<LogRowProps> = ({
  entry,
  style,
  onToggleExpand,
  isExpanded,
  onToggleRaw,
  isRawExpanded,
  highlightedCorrelationId,
  onHoverCorrelation,
  isSelected,
  onRowClick,
}) => {
  const isHighlighted =
    highlightedCorrelationId !== undefined &&
    (entry.commandId === highlightedCorrelationId ||
      entry.relatedIds?.includes(highlightedCorrelationId));

  const getIcon = () => {
    if (entry.logType === 'DevTools') {
      if (entry.isCommand) return <ArrowLeftCircle className="arrow-cmd" size={14} />; // Command: Left/Red
      if (entry.isResponse) return <ArrowRightCircle className="arrow-res" size={14} />; // Response: Right/Green
    } else if (entry.logType === 'WebDriver') {
      if (entry.isCommand) return <SquareArrowLeft className="arrow-cmd" size={14} />;
      if (entry.isResponse) return <SquareArrowRight className="arrow-res" size={14} />;
    }

    // Fallback or generic
    if (entry.isCommand) return <ArrowLeftCircle className="arrow-cmd" size={14} />;
    if (entry.isResponse) return <ArrowRightCircle className="arrow-res" size={14} />;

    if (entry.level === 'INFO') return <Info size={14} color="#2196f3" />;
    if (entry.level === 'WARN') return <AlertCircle size={14} color="#ff9800" />;
    if (entry.level === 'ERROR') return <Bug size={14} color="#f44336" />;
    return <Info size={14} color="#9e9e9e" />;
  };

  const handleCorrelationMouseEnter = () => {
    if (entry.commandId !== undefined && onHoverCorrelation) {
      onHoverCorrelation(entry.commandId);
    }
  };

  const handleCorrelationMouseLeave = () => {
    if (onHoverCorrelation) {
      onHoverCorrelation(undefined);
    }
  };

  const handleRowMouseEnter = () => {
    // If this row has a commandId (Command or Response), highlight it
    if (entry.commandId !== undefined && onHoverCorrelation) {
      onHoverCorrelation(entry.commandId);
    }
  };

  const handleRowMouseLeave = () => {
    if (onHoverCorrelation) {
      onHoverCorrelation(undefined);
    }
  };

  const displayTime = entry.timestamp.split(' ')[1]; // Just HH:mm:ss.SSSSSS

  return (
    <div
      style={style}
      className={clsx('log-row', {
        expanded: isExpanded,
        highlighted: isHighlighted,
        selected: isSelected,
      })}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={handleRowMouseLeave}
      onClick={() => onRowClick?.(entry.id)}
    >
      <div className="gutter">
        {/* Lane Visualization */}
        {entry.laneConfig ? (
          <div className="lane-container">
            {Array.from({
              length:
                Math.max(
                  ...entry.laneConfig.activeLanes,
                  entry.laneConfig.startLane ?? -1,
                  entry.laneConfig.endLane ?? -1,
                ) + 1,
            }).map((_, laneIndex) => {
              const isActive = entry.laneConfig?.activeLanes.includes(laneIndex);
              const isStart = entry.laneConfig?.startLane === laneIndex;
              const isEnd = entry.laneConfig?.endLane === laneIndex;

              const laneCommandId = entry.laneConfig?.laneDetails?.[laneIndex];
              const isLaneHighlighted =
                laneCommandId !== undefined && laneCommandId === highlightedCorrelationId;

              return (
                <div
                  key={laneIndex}
                  className={clsx('lane-column', { highlighted: isLaneHighlighted })}
                >
                  {/* Vertical Line Parts */}
                  {isActive && !isStart && !isEnd && <div className="lane-segment full" />}
                  {isStart && (
                    <>
                      <div className="lane-segment bottom" />
                      <div className="lane-connector" />
                    </>
                  )}
                  {isEnd && (
                    <>
                      <div className="lane-segment top" />
                      <div className="lane-connector" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback or if no lanes (e.g. before parsing update takes effect or non-correlated) */
          entry.commandId !== undefined && (
            <div
              className="correlation-marker"
              onMouseEnter={handleCorrelationMouseEnter}
              onMouseLeave={handleCorrelationMouseLeave}
              title={
                entry.relatedIds && entry.relatedIds.length > 0
                  ? `Related to ID(s) ${entry.relatedIds.join(', ')}`
                  : `Command ID ${entry.commandId}`
              }
            >
              {entry.isCommand && <span className="arrow-cmd">←</span>}
              {entry.isResponse && <span className="arrow-res">→</span>}
              <span className="cmd-id">{entry.commandId}</span>
            </div>
          )
        )}
      </div>

      <div className="content">
        <div className="header" onClick={() => entry.payload && onToggleExpand(entry.id)}>
          <div className="icon-wrapper">{getIcon()}</div>
          <span className="timestamp" title={entry.timestamp}>
            {displayTime}
          </span>

          {/* Tags */}
          {entry.logType === 'WebDriver' && (
            <span className="tag wd" title="WebDriver Command">
              WebDriver
            </span>
          )}

          {entry.logType === 'DevTools' && (
            <span className="tag cdp" title="Chrome DevTools Protocol">
              CDP
            </span>
          )}

          {entry.commandId !== undefined && entry.commandId >= 0 && (
            <span className="tag id" title={`Command ID: ${entry.commandId}`}>
              {entry.commandId}
            </span>
          )}

          {entry.sessionIds &&
            entry.sessionIds.length > 0 &&
            entry.sessionIds.map((sid) => (
              <span key={sid} className="session-badge" title={`Session ID: ${sid}`}>
                ..{sid.slice(-4)}
              </span>
            ))}

          {entry.targetIds && entry.targetIds.length > 0 && (
            <div className="targets">
              {entry.targetIds.map((tid) => (
                <span key={tid} className="target-badge" title={tid}>
                  ..{tid.slice(-4)}
                </span>
              ))}
            </div>
          )}

          <span className="message-preview">
            {entry.logType === 'DevTools' &&
            !entry.isCommand &&
            !entry.isResponse &&
            entry.method ? (
              <>
                <span className="event-prefix">Event:</span>
                <span className="method-name event-method">{entry.method}</span>
              </>
            ) : entry.method ? (
              <span className="method-name">{entry.method}</span>
            ) : null}

            {/* Empty Payload Indicator */}
            {entry.payload &&
              typeof entry.payload === 'object' &&
              Object.keys(entry.payload).length === 0 && (
                <span className="tag empty" title="Empty Payload">
                  {'{}'}
                </span>
              )}

            {!entry.method && entry.message}
            {entry.payload && (
              <span className="expand-indicator">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}

            {/* Inline Summary */}
            {(() => {
              const summary = getInlineLogSummary(
                entry.method,
                entry.isCommand ? 'command' : entry.isResponse ? 'response' : 'event',
                entry.payload,
              );
              return summary ? <span className="summary-text">{summary}</span> : null;
            })()}
          </span>

          <span className="line-number">#{entry.lineNumber}</span>

          <div
            className={clsx('raw-toggle-icon', { active: isRawExpanded })}
            onClick={(e) => {
              e.stopPropagation();
              onToggleRaw(entry.id);
            }}
            title="Toggle Raw View"
          >
            <span className="icon-i">i</span>
          </div>
        </div>

        {isExpanded && entry.payload && (
          <div className="payload-viewer">
            <pre>{JSON.stringify(entry.payload, null, 2)}</pre>
          </div>
        )}

        {isRawExpanded && (
          <div className="raw-viewer">
            <pre>{entry.raw}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
