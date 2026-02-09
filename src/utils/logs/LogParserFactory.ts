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
import { ChromeDriverLog } from './ChromeDriverLog';
import { WPTLog } from './WPTLog';
import { PuppeteerLog } from './PuppeteerLog';

import { ProtocolMonitorLog } from './ProtocolMonitorLog';

export class LogParserFactory {
  static createParser(content: string): GenericLog {
    const trimmed = content.trim();
    if (trimmed.startsWith('[')) {
        // It starts with [. Check if it is a JSON array or just a log with [timestamp]
        // If it starts with [digit, it is likely a timestamp, not a JSON array of objects.
        const isTimestamp = /^\[\d/.test(trimmed);
        
        if (!isTimestamp) {
            // Likely a JSON array. Check first char.
            // We could double check if it parses as JSON or if the first item looks like ProtocolMonitor entry
            try {
                // Peek at the first few chars to see if it looks like our JSON array
                // Optimization: Maybe just try parsing the first object?
                // But JSON.parse on huge string is expensive if we do it twice.
                // For now, let's assume if it starts with [ and has "method" in first 500 chars, it's a candidate.
                if (content.indexOf('"method"') !== -1) {
                    return new ProtocolMonitorLog();
                }
            } catch (_e) {
                // ignore
            }
        }
    }

    const firstLines = content.split('\n').slice(0, 50).join('\n'); // Check first 50 lines for heursitics

    if (firstLines.includes('puppeteer:protocol:SEND') || firstLines.includes('puppeteer:protocol:RECV')) {
        return new PuppeteerLog();
    }

    // WPT logs usually start with "Protocol message:" lines.
    // Check if we see multiple occurrences or just one
    if (firstLines.includes('Protocol message:')) {
        return new WPTLog();
    }

    // Default to ChromeDriver if it looks like it or fallback
    // ChromeDriver usually: [timestamp][INFO]: Starting ChromeDriver
    if (firstLines.includes('Starting ChromeDriver') || firstLines.includes('DevTools WebSocket')) {
        return new ChromeDriverLog();
    }
    
    // Fallback: If no clear identifier, maybe try ChromeDriverLog as it has some loose parsing?
    // Or WPTLog?
    // Let's default to ChromeDriverLog for now as it handles the "standard" format we had.
    return new ChromeDriverLog();
  }
}
