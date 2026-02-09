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

export class PuppeteerLog extends GenericLog {
  parse(content: string): LogEntry[] {
    const lines = content.split('\n');
    const entries: LogEntry[] = [];
    let entryCounter = 0;

    // Puppeteer logs are multiline.
    // Start pattern:
    // puppeteer:protocol:SEND ► [
    // puppeteer:protocol:RECV ◀ [
    
    let currentEntry: {
        rawLines: string[];
        isSend: boolean;
        lineNumber: number;
        timestampStr?: string;
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for start
        const sendMatch = line.match(/puppeteer:protocol:SEND ► \[(.*)/);
        const recvMatch = line.match(/puppeteer:protocol:RECV ◀ \[(.*)/);
        
        if (sendMatch || recvMatch) {
            if (currentEntry) {
                this.finalizeEntry(entries, currentEntry, entryCounter++);
                currentEntry = null;
            }
            
            const isSend = !!sendMatch;
            
            // Check if it closes on the same line
            // e.g. [ '{"id":1...}' ] +0ms
            
            
            currentEntry = {
                rawLines: [line],
                isSend: isSend,
                lineNumber: i + 1,
            };
        } else if (currentEntry) {
            currentEntry.rawLines.push(line);
        }
    }
    
    if (currentEntry) {
        this.finalizeEntry(entries, currentEntry, entryCounter++);
    }

    return this.postProcess(entries);
  }

  private finalizeEntry(entries: LogEntry[], rawData: { rawLines: string[], isSend: boolean, lineNumber: number }, id: number) {
      // Filter out usage of the prefix on every line to reconstruct the actual content
      // Prefix regex: /puppeteer:protocol:(SEND|RECV) . /
      const cleanLines = rawData.rawLines.map(line => {
          // Remove the prefix part if present
          return line.replace(/^.*?puppeteer:protocol:(?:SEND|RECV) [►◀]\s*/, '');
      });
      
      const fullText = cleanLines.join('\n');
      const rawText = rawData.rawLines.join('\n'); // Keep original for 'raw' field
      
      // We need to extract the content inside [ ... ]
      // The format is often: [ 'JSON_STRING' ]
      
      let payload: any = null;
      let method: string | undefined = undefined;
      let commandId: number | undefined = undefined;
      
      try {
          const startBracket = fullText.indexOf('[');
          const endBracket = fullText.lastIndexOf(']');
          
          if (startBracket !== -1 && endBracket !== -1 && endBracket > startBracket) {
              let inner = fullText.substring(startBracket + 1, endBracket).trim();
              
              // If it starts with ' and ends with ', strip them
              if (inner.startsWith("'") && inner.endsWith("'")) {
                  inner = inner.substring(1, inner.length - 1);
                  inner = inner.replace(/\\'/g, "'");
              } else if (inner.startsWith('"') && inner.endsWith('"')) {
                   // Double quoted might be valid JSON string?
                   // Try to parse it as a string first if it looks like one
                   try {
                       const parsedString = JSON.parse(inner);
                       if (typeof parsedString === 'string') {
                           inner = parsedString;
                       }
                   } catch (_e) {
                       // ignore
                   }
              }
              
              try {
                payload = JSON.parse(inner);
              } catch (_e) {
                  // ignore
              }
          }
      } catch (_e) {
          // ignore
      }

      if (payload) {
          if (payload.method) method = payload.method;
          if (payload.id) commandId = payload.id;
          
          const isCommand = rawData.isSend; 
          const isResponse = !isCommand && (payload.result !== undefined || payload.error !== undefined);
          
          const entry: LogEntry = {
              id,
              lineNumber: rawData.lineNumber || 0,
              timestamp: "", 
              level: "INFO",
              message: method || (isResponse ? "Response" : "Event"),
              payload,
              isCommand: isCommand,
              isResponse: isResponse,
              logType: 'DevTools',
              commandId: commandId,
              method: method,
              raw: rawText
          };
          
          this.extractMetadata(entry, payload);
          entries.push(entry);
      }
  }

  private extractMetadata(entry: LogEntry, payload: any) {
     const targetIds: string[] = [];
     const sessionIds: string[] = [];
     
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
