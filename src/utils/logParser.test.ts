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

import { describe, it, expect } from 'vitest';
import { parseLogs } from './logParser';
import { LogParserFactory } from './logs/LogParserFactory';
import { ChromeDriverLog } from './logs/ChromeDriverLog';
import { ProtocolMonitorLog } from './logs/ProtocolMonitorLog';

const MOCK_PUPPETEER_LOG = `
  puppeteer:protocol:SEND ► [ '{"method":"Browser.getVersion","id":1}' ] +0ms
  puppeteer:protocol:RECV ◀ [
  puppeteer:protocol:RECV ◀   '{"id":1,"result":{"protocolVersion":"1.3","product":"Chrome/119.0.6019.3"}}'
  puppeteer:protocol:RECV ◀ ] +0ms
  puppeteer:protocol:SEND ► [ '{"method":"Target.getBrowserContexts","id":2}' ] +0ms
  puppeteer:protocol:RECV ◀ [ '{"id":2,"result":{"browserContextIds":[]}}' ] +0ms
  puppeteer:protocol:RECV ◀ [
  puppeteer:protocol:RECV ◀   '{"method":"Target.targetCreated","params":{"targetInfo":{"targetId":"2419ADFC264","type":"page"}}}'
  puppeteer:protocol:RECV ◀ ] +0ms
`;

const MOCK_WPT_LOG = `Protocol message: {"id":1,"method":"Target.createTarget","params":{"url":"about:blank"}}
Protocol message: {"id":1,"result":{"targetId":"D847C693AFE81CF7C9BA982D50520530"}}
Protocol message: {"method":"Page.lifecycleEvent","params":{"name":"load","timestamp":26265.600564}}
Protocol message: {"id":2,"method":"Page.navigate","params":{"url":"http://example.com"}}
Protocol message: {"id":2,"result":{"frameId":"D847C693AF","loaderId":"4AE58507C5"}}`;

const MOCK_PROTOCOL_MONITOR_LOG = `[
  {
    "method": "Network.requestWillBeSent",
    "params": {
      "requestId": "123",
      "timestamp": 1000
    }
  },
  {
    "method": "Target.getTargets",
    "id": 1,
    "requestTime": 1700000,
    "wallTime": 1700000.123,
    "result": {
      "targetInfos": []
    }
  }
]`;

const MOCK_CHROMEDRIVER_LOG = `[01-01-2024 12:00:00.000000][INFO]: Starting ChromeDriver
[01-01-2024 12:00:00.001000][DEBUG]: DevTools WebSocket Command: Method: Target.createTarget (id=1)
[01-01-2024 12:00:00.002000][DEBUG]: DevTools WebSocket Response: Method: Target.createTarget (id=1) { "result": { "targetId": "123" } }`;

describe('LogParser', () => {
  describe('PuppeteerLog', () => {
    it('should parses multiline puppeteer logs', () => {
      const entries = parseLogs(MOCK_PUPPETEER_LOG);
      expect(entries).toHaveLength(5);

      const firstCmd = entries[0];
      expect(firstCmd.isCommand).toBe(true);
      expect(firstCmd.method).toBe('Browser.getVersion');
      expect(firstCmd.payload).toEqual({ method: 'Browser.getVersion', id: 1 });

      const firstRes = entries[1];
      expect(firstRes.isResponse).toBe(true);
      expect(firstRes.payload.result.protocolVersion).toBe('1.3');
    });

    it('should detect events', () => {
      const entries = parseLogs(MOCK_PUPPETEER_LOG);
      const event = entries.find((e) => e.method === 'Target.targetCreated');
      expect(event).toBeDefined();
      expect(event?.isCommand).toBe(false);
      expect(event?.isResponse).toBe(false);
    });
  });

  describe('WPTLog', () => {
    it('should parse WPT protocol messages', () => {
      const entries = parseLogs(MOCK_WPT_LOG);
      expect(entries).toHaveLength(5);

      const createTarget = entries[0];
      expect(createTarget.method).toBe('Target.createTarget');
      expect(createTarget.isCommand).toBe(true);
    });

    it('should correlate IDs', () => {
      const entries = parseLogs(MOCK_WPT_LOG);
      // id=1
      const cmd = entries[0];
      const res = entries[1];
      expect(cmd.id).not.toBe(res.id); // Entry IDs are different
      expect(cmd.commandId).toBe(1);
      expect(res.commandId).toBe(1);

      // Should be linked via relatedIds/postProcess logic
      // (Note: postProcess connects them)
      expect(cmd.relatedIds).toContain(res.id);
      expect(res.relatedIds).toContain(cmd.id);
    });
  });

  describe('LogParserFactory', () => {
    it('should identify ChromeDriver log even if it contains "method" keyword', () => {
      const log = `[01-01-2024 12:00:00.000000][INFO]: Starting ChromeDriver
[01-01-2024 12:00:00.001000][DEBUG]: DevTools WebSocket Command: Method: Target.createTarget (id=1)
`;
      const parser = LogParserFactory.createParser(log);
      expect(parser).toBeInstanceOf(ChromeDriverLog);
    });

    it('should identify ProtocolMonitor log', () => {
      const log = `[
            {
                "method": "Target.createTarget",
                "params": {}
            }
        ]`;
      const parser = LogParserFactory.createParser(log);
      expect(parser).toBeInstanceOf(ProtocolMonitorLog);
    });
  });

  describe('ProtocolMonitorLog', () => {
    it('should parse JSON array logs', () => {
      const entries = parseLogs(MOCK_PROTOCOL_MONITOR_LOG);
      // 1 event + 1 command (split into 2 entries: command and response) = 3 entries
      expect(entries).toHaveLength(3);
    });

    it('should split commands into request and response', () => {
      const entries = parseLogs(MOCK_PROTOCOL_MONITOR_LOG);

      // Find Target.getTargets
      const cmd = entries.find((e) => e.method === 'Target.getTargets' && e.isCommand);
      const res = entries.find((e) => e.method === 'Target.getTargets' && e.isResponse);

      expect(cmd).toBeDefined();
      expect(res).toBeDefined();

      // They should share commandId
      expect(cmd?.commandId).toBe(1);
      expect(res?.commandId).toBe(1);

      // Check timestamps (mocked)
      expect(cmd?.timestamp).toBe('[01-20-1970 08:13:20.123]');
    });
  });

  describe('ChromeDriverLog', () => {
    it('should parse standard ChromeDriver logs', () => {
      const entries = parseLogs(MOCK_CHROMEDRIVER_LOG);
      expect(entries).toHaveLength(3);
      expect(entries[0].message).toContain('Starting ChromeDriver');
      expect(entries[1].isCommand).toBe(true);
      expect(entries[2].isResponse).toBe(true);
    });

    it('should extract tags from payload and message', () => {
      const log = `[01-01-2024 12:00:00.000000][INFO]: [abc12345abc12345abc12345abc12345] COMMAND Navigate { "url": "http://example.com" }
[01-01-2024 12:00:00.010000][INFO]: (session_id=session123) Response { "status": 0 }
[01-01-2024 12:00:00.020000][DEBUG]: DevTools WebSocket Command: Method: Target.createTarget (id=1) { "targetId": "target789" }`;

      const entries = parseLogs(log);

      // Entry 1: WebDriver command with targetId in message (as [32chars])
      expect(entries[0].tags).toContain('abc12345abc12345abc12345abc12345');

      // Entry 2: Session ID
      expect(entries[1].tags).toContain('session123');

      // Entry 3: Target ID in payload
      // Note: parser.finalizeEntry calls findMetadataInPayload which populates targetIds -> tags
      expect(entries[2].tags).toContain('target789');
    });
  });
});
