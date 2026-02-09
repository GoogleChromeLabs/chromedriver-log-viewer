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

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setup({visual = false} = {}) {
  const server = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore', // 'inherit' for debugging
    shell: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const browser = await puppeteer.launch({
    headless: !visual, // Set to false to see it happen
    slowMo: visual ? 100 : 0, // Slow down operations if visual
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  
  return { server, browser, page };
}

export async function teardown({ server, browser }) {
  if (browser) await browser.close();
  if (server) server.kill();
}
