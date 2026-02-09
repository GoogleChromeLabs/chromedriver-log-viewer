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


import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnv, path, __dirname } from '../test-utils';

describe('Log Viewer - Upload & Rendering', () => {
  let env;
  
  beforeAll(async () => {
    // Check if running in visual mode
    env = await setupTestEnv();
  });

  afterAll(async () => {
    await env.teardown();
  });

  it('should load the app and verify title', async () => {
    await env.page.goto(env.url);
    const title = await env.page.title();
    expect(title).toBe('ChromeDriver Log Viewer');
  });

  it('should upload a log file', async () => {
    const fileInput = await env.page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');

    const logPath = path.join(__dirname, 'sample.log');
    await fileInput.uploadFile(logPath);
    
    // Wait for at least one log row
    await env.page.waitForSelector('.log-row', { timeout: 5000 });
    
    // Verify some content
    const rows = await env.page.$$('.log-row');
    expect(rows.length).toBeGreaterThan(0);
  });
});
