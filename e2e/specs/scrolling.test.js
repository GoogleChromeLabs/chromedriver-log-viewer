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

describe('Log Viewer - Scrolling & Selection', () => {
  let env;
  
  beforeAll(async () => {
    env = await setupTestEnv();
  });

  afterAll(async () => {
    await env.teardown();
  });

  it('should maintain selection and scroll correctly', async () => {
    const { page, url } = env;
    await page.goto(url);
    
    const fileInput = await page.$('input[type="file"]');
    const logPath = path.join(__dirname, 'sample.log');
    await fileInput.uploadFile(logPath);
    await page.waitForSelector('.log-row', { timeout: 5000 });

    // Select first row
    await page.click('div[data-index="0"] .header');
    
    // Check selection
    const selected = await page.$('.log-row.selected');
    expect(selected).toBeTruthy();
    
    // Scroll down and verify we are still in a good state (no crash, rows still rendering)
     await page.evaluate(() => {
        const findScroller = () => {
            const viewport = document.querySelector('[data-viewport-type="element"]');
            if (viewport) {
                const style = getComputedStyle(viewport);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') return viewport;
            }
            const container = document.querySelector('.log-viewer-container');
            if (!container) return null;
            for (const div of container.querySelectorAll('div')) {
                const style = getComputedStyle(div);
                if (div.scrollHeight > div.clientHeight && (style.overflowY === 'auto' || style.overflowY === 'scroll')) return div;
            }
            return null;
        };
        const scroller = findScroller();
        if (scroller) scroller.scrollTop = 1000;
    });
    
    await new Promise(r => setTimeout(r, 200));
    
    // Verify rows exist at new scroll position (virtualization means indexes change)
    // We just check if *any* log row is present
    const rows = await page.$$('.log-row');
    expect(rows.length).toBeGreaterThan(0);
  });
});
