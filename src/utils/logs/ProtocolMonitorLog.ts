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

import { GenericLog } from './GenericLog';
import type { LogEntry } from '../../types/log';

interface ProtocolMonitorEntry {
  method: string;
  params?: any;
  result?: any;
  error?: any;
  id?: number;
  sessionId?: string;
  target?: string; // targetId
  requestTime?: number; // Monotonic?
  wallTime?: number; // Unix timestamp (seconds)
  elapsedTime?: number; // ms?
}

export class ProtocolMonitorLog extends GenericLog {
  parse(content: string): LogEntry[] {
    let rawEntries: ProtocolMonitorEntry[] = [];
    try {
        rawEntries = JSON.parse(content);
    } catch (_e) {
        // Fallback or returned empty if not JSON
        return [];
    }

    if (!Array.isArray(rawEntries)) {
        return [];
    }

    const entries: LogEntry[] = [];
    let entryCounter = 0;

    for (const raw of rawEntries) {
        const isCommand = raw.id !== undefined;
        const method = raw.method;
        const sessionId = raw.sessionId;
        const targetId = raw.target;
        
        // Timestamp handling
        // wallTime is in seconds, e.g. 1770319988.176693
        const timestamp = raw.wallTime 
            ? this.formatTimestamp(raw.wallTime * 1000) 
            : "";

        const common = {
            level: "INFO",
            logType: 'DevTools' as const,
            sessionIds: sessionId ? [sessionId] : [],
            targetIds: targetId ? [targetId] : [],
        };

        if (isCommand) {
            // It's a command AND its result/error in one object
            // We split into Command and Response entries for better visualization
            
            // 1. Command
            entries.push({
                ...common,
                id: entryCounter++,
                lineNumber: 0,
                timestamp: timestamp,
                message: method,
                payload: raw.params,
                isCommand: true,
                isResponse: false,
                commandId: raw.id,
                method: method,
                raw: JSON.stringify(raw) // or just part of it? Keeping full raw is safer
            });

            // 2. Response
            // Calculate response timestamp
            let responseTimestamp = timestamp;
            if (raw.wallTime && raw.elapsedTime) {
                // elapsedTime seems to be in ms (e.g. 1.0) based on log snippet (1)
                responseTimestamp = this.formatTimestamp((raw.wallTime * 1000) + (raw.elapsedTime || 0));
            }

            const isError = !!raw.error;
            const payload = isError ? raw.error : raw.result;
            const msg = isError ? "Error" : "Response";

            entries.push({
                ...common,
                id: entryCounter++,
                lineNumber: 0,
                timestamp: responseTimestamp,
                message: msg,
                payload: payload,
                isCommand: false,
                isResponse: true,
                commandId: raw.id,
                method: method,
                raw: JSON.stringify(raw.result || raw.error)
            });

        } else {
            // Event
            // In this format, checks show 'result' often holds the params for events
            const payload = raw.params || raw.result;
            
            entries.push({
                ...common,
                id: entryCounter++,
                lineNumber: 0,
                timestamp: timestamp,
                message: method, // Event name
                payload: payload,
                isCommand: false,
                isResponse: false,
                method: method,
                raw: JSON.stringify(raw)
            });
        }
    }

    // We don't need GenericLog.postProcess for correlation IF we already assigned commandIds relative to each other?
    // Actually GenericLog.postProcess calculates LANES which is very useful.
    // It relies on `isCommand` and `isResponse` and `commandId` (for ID-based).
    // Our split entries HAVE `commandId`. So `postProcess` should work fine to link them!
    
    return this.postProcess(entries);
  }

  private formatTimestamp(ms: number): string {
      const date = new Date(ms);
      // Format: [MM-DD-YYYY HH:mm:ss.SSS]
      const pad = (n: number, width = 2) => n.toString().padStart(width, '0');
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const year = date.getFullYear();
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      const seconds = pad(date.getSeconds());
      const millis = pad(date.getMilliseconds(), 3);
      return `[${month}-${day}-${year} ${hours}:${minutes}:${seconds}.${millis}]`;
  }
}
