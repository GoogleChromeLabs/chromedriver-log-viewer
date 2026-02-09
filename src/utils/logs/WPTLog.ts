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
import type { LogEntry, LogType } from '../../types/log';

export class WPTLog extends GenericLog {
  parse(content: string): LogEntry[] {
    const lines = content.split('\n');
    const entries: LogEntry[] = [];
    let entryCounter = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Protocol message: ')) {
            const jsonPart = line.substring('Protocol message: '.length);
            try {
                const payload = JSON.parse(jsonPart);
                const isCommand = payload.method && payload.id;
                const isResponse = payload.id && (payload.result || payload.error);
                // Events have method but NO id usually? Or they are notifications?
                // WPT log example: {method: "Page.lifecycleEvent", ...} -> No ID.
                
                const logType: LogType = 'DevTools'; // WPT uses CDP
                const method = payload.method;
                const commandId = payload.id;

                const entry: LogEntry = {
                    id: entryCounter++,
                    lineNumber: i + 1,
                    timestamp: "", // WPT logs in this format don't seem to have a timestamp prefix per line?
                    // Actually example showed: "Protocol message: ..." no timestamp.
                    // We might need to fake one or leave empty.
                    level: "INFO",
                    message: jsonPart,
                    payload: payload,
                    isCommand: !!isCommand,
                    isResponse: !!isResponse,
                    logType: logType,
                    commandId: commandId,
                    method: method,
                    raw: line
                };
                
                // Extract metadata from payload
                this.extractMetadata(entry, payload);
                entries.push(entry);

            } catch (_e) {
                // formatting error, ignore
            }
        }
    }

    return this.postProcess(entries);
  }

  private extractMetadata(entry: LogEntry, payload: any) {
     const targetIds: string[] = [];
     const sessionIds: string[] = [];
     
     // Recursively find targetId / sessionId
     const find = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.targetId) targetIds.push(obj.targetId);
        if (obj.sessionId) sessionIds.push(obj.sessionId);
        for (const key in obj) {
            find(obj[key]);
        }
     };
     find(payload);

     entry.targetIds = Array.from(new Set(targetIds));
     entry.sessionIds = Array.from(new Set(sessionIds));
  }
}
