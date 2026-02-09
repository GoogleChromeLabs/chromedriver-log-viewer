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
import {createServer} from 'vite';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to start the app server for a test
export async function setupTestEnv(options = {}) {
  const {visual = process.env.VISUAL === 'true', slowMo} = options;

  // Start Vite server
  const server = await createServer({
    configFile: path.resolve(__dirname, '../vite.config.ts'),
    server: {
      port: 0 // Random free port
    }
  });
  await server.listen();
  const port = server.config.server.port;
  const url = `http://localhost:${port}`;

  // Launch Browser
  const browser = await puppeteer.launch({
    headless: !visual,
    slowMo: slowMo !== undefined ? slowMo : (visual ? 100 : 0),
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  return {
    server,
    browser,
    page,
    url,
    teardown: async () => {
      if (browser) await browser.close();
      if (server) await server.close();
    }
  };
}

// Re-export needed utils
export {path, __dirname};
