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

export class ChromeDriverLog extends GenericLog {
  parse(content: string): LogEntry[] {
    const lines = content.split('\n');
    const entries: LogEntry[] = [];
    const timestampRegex = /^\[(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}\.\d{6})\]\[(\w+)\]: (.+)$/;

    // Accumulate lines for a single entry
    let currentEntry: Partial<LogEntry> & { rawLines: string[] } | null = null;
    let entryCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(timestampRegex);

      if (match) {
        // New entry parsing starts, push previous if exists
        if (currentEntry) {
          entries.push(this.finalizeEntry(currentEntry, entryCounter++));
        }

        const [, timestamp, level, rest] = match;
        currentEntry = {
          lineNumber: i + 1,
          timestamp,
          level,
          message: rest, // Start with the first line's message
          rawLines: [line],
          // defaults
          isCommand: false,
          isResponse: false,
          targetIds: []
        };
      } else {
        // Continuation of previous entry
        if (currentEntry) {
          currentEntry.rawLines.push(line);
        }
      }
    }

    if (currentEntry) {
      entries.push(this.finalizeEntry(currentEntry, entryCounter++));
    }

    // Post-process for correlation (lanes, etc.)
    return this.postProcess(entries);
  }

  private finalizeEntry(entry: Partial<LogEntry> & { rawLines: string[] }, id: number): LogEntry {
    // Combine lines 1..n to form the payload if any
    const fullRaw = entry.rawLines.join('\n');
    
    // Try to extract JSON
    let payload: any = undefined;
    
    // Heuristic: Find first '{' or '['
    let startJson = fullRaw.indexOf('{');
    
    let bracketIdx = fullRaw.indexOf('[');
    while (bracketIdx !== -1) {
      const snippet = fullRaw.substring(bracketIdx, bracketIdx + 50);
      const isTimestamp = /^\d/.test(snippet.substring(1)); // [0...
      const isLevel = /^[A-Z]+\]/.test(snippet.substring(1)); // [INFO]
      const isTarget = /^[a-f0-9]{32}\]/.test(snippet.substring(1)); // [32chars]
      
      if (isTimestamp || isLevel || isTarget) {
         bracketIdx = fullRaw.indexOf('[', bracketIdx + 1);
      } else {
         break;
      }
    }
    
    const firstBracket = bracketIdx;
    
    if (startJson !== -1 && firstBracket !== -1) {
      startJson = Math.min(startJson, firstBracket);
    } else if (startJson === -1) {
      startJson = firstBracket;
    }
    
    if (startJson !== -1) {
      let potentialJson = fullRaw.substring(startJson);
      const lastBrace = potentialJson.lastIndexOf('}');
      const lastBracket = potentialJson.lastIndexOf(']');
      const lastEnd = Math.max(lastBrace, lastBracket);
      
      if (lastEnd !== -1) {
         potentialJson = potentialJson.substring(0, lastEnd + 1);
      }

      try {
        payload = JSON.parse(potentialJson);
      } catch (_e) {
        // Loose JSON parsing or ignore
      }
    }

    // Extract Metadata from message
    const msg = entry.message || "";
    
    const targetIdMatch = msg.match(/\[([a-f0-9]{32})\]/);
    const targetIds: string[] = [];
    if (targetIdMatch) {
      targetIds.push(targetIdMatch[1]);
    }

    // Extract Session ID from header
    // (session_id=E14BE525...)
    const sessionMatch = msg.match(/\(session_id=([a-zA-Z0-9]+)\)/);
    const sessionIds: string[] = [];
    if (sessionMatch) {
      sessionIds.push(sessionMatch[1]);
    }

    if (payload) {
      this.findMetadataInPayload(payload, targetIds, sessionIds);
    }

    // Command/Response detection and Type detection
    let isCommand = false;
    let isResponse = false;
    let commandId: number | undefined = undefined;
    let method: string | undefined = undefined;
    let logType: LogType = 'Other';

    if (msg.includes("DevTools WebSocket Command")) {
      isCommand = true;
      logType = 'DevTools';
    } else if (msg.includes("DevTools WebSocket Response")) {
      isResponse = true;
      logType = 'DevTools';
    } else if (msg.includes("DevTools WebSocket Event")) {
      logType = 'DevTools';
      // Event is neither command nor response in this context
    } else {
      // Check for WebDriver (allow substrings like "[id] COMMAND ...")
      const wdMatch = msg.match(/(?:^|\s)(COMMAND|RESPONSE)\s+([a-zA-Z0-9_.]+)/);
      if (wdMatch) {
         if (wdMatch[1] === 'COMMAND') isCommand = true;
         else isResponse = true;
         logType = 'WebDriver';
         method = wdMatch[2];
      }
    }

    // Extract ID
    const idMatch = msg.match(/\(id=(\d+)\)/);
    if (idMatch) {
      commandId = parseInt(idMatch[1], 10);
    }

    // Extract Method for DevTools (WebDriver already extracted)
    if (logType === 'DevTools') {
      const parts = msg.split(':');
      if (parts.length >= 2) {
         const afterColon = parts[1].trim();
         const methodMatch = afterColon.match(/^([\w.]+)/);
         if (methodMatch) {
           method = methodMatch[1];
         }
      }
    }

    return {
      id,
      lineNumber: entry.lineNumber!,
      timestamp: entry.timestamp!,
      level: entry.level!,
      message: msg, 
      raw: fullRaw,
      payload,
      tags: Array.from(new Set([...targetIds, ...sessionIds])),
      targetIds: Array.from(new Set(targetIds)),
      sessionIds: Array.from(new Set(sessionIds)),
      isCommand,
      isResponse,
      commandId,
      method,
      logType
    };
  }

  private findMetadataInPayload(obj: any, targetList: string[], sessionList: string[]) {
    if (!obj) return;
    if (typeof obj === 'object') {
      if (obj.targetId && typeof obj.targetId === 'string') {
        targetList.push(obj.targetId);
      }
      if (obj.sessionId && typeof obj.sessionId === 'string') {
        sessionList.push(obj.sessionId);
      }
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          this.findMetadataInPayload(obj[key], targetList, sessionList);
        }
      }
    }
  }

}
