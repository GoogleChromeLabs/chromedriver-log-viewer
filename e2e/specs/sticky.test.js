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


import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnv, path, __dirname} from '../test-utils';

describe('Log Viewer - Sticky Headers', () => {
  let env;

  beforeAll(async () => {
    env = await setupTestEnv();
  });

  afterAll(async () => {
    await env.teardown();
  });

  it('should verify sticky header presence during scroll', async () => {
    const {page, url} = env;
    await page.goto(url);

    // Upload sticky.log (robust data)
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error('File input not found');
    const logPath = path.join(__dirname, 'sample.log');
    await fileInput.uploadFile(logPath);

    await page.waitForSelector('.log-row', {timeout: 30000});

    // Scroll to line 530 using the jump command
    await page.type('.filter-input', ':530');

    // Wait for scroll animation/virtual rendering
    await new Promise(r => setTimeout(r, 1000));

    // Wait for sticky header to appear
    await new Promise(r => setTimeout(r, 500));

    // Check for sticky overlay presence (it might need a specific class if not already added, but we can check visual overlay or specific DOM structure)
    // Assuming .sticky-header-overlay is the class we are looking for based on previous conversation
    const stickyOverlay = await page.$('.sticky-header-overlay');
    expect(stickyOverlay).toBeTruthy();

    if (stickyOverlay) {
      const box = await stickyOverlay.boundingBox();
      expect(box.height).toBeGreaterThan(0);
    }
  });
});
