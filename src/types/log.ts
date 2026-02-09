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

export interface LaneConfig {
  activeLanes: number[]; // Indices of lanes passing through this row
  laneDetails: Record<number, number>; // Lane Index -> Command ID
  laneEntryIndices?: Record<number, number>; // Lane Index -> Entry Index (Unique, for sticky headers)
  startLane?: number; // Lane starting at this row (Command)
  endLane?: number; // Lane ending at this row (Response)
}

export type LogType = 'DevTools' | 'WebDriver' | 'Other';

export interface LogEntry {
  id: number;
  lineNumber: number;
  timestamp: string;
  level: string;
  source?: string; // e.g. [targetId] or internal source
  message: string;
  payload?: any;
  targetIds?: string[];
  commandId?: number; // If this is a command
  sessionIds?: string[];
  relatedIds?: number[]; // IDs of related entries (e.g. command <-> response)
  method?: string;

  isCommand: boolean;
  isResponse: boolean;
  raw?: string;
  laneConfig?: LaneConfig;
  logType?: LogType;
  tags?: string[];
}
