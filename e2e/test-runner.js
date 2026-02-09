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

console.log('Test Runner Loaded');
import { setup, teardown } from './setup.js';
import { testUI } from './ui.test.js';

async function runTests() {
  console.log('Starting E2E Tests...');
  // Default to visual unless --headless is specified
  const visual = !process.argv.includes('--headless');
  let context;
  try {
    context = await setup({visual});
    console.log('Server and Browser started.');
    
    await testUI(context.page);
    
    console.log('✅ All Tests Passed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  } finally {
    if (context) {
      if (visual) {
        console.log('Visual mode: Browser staying open for 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Optional: await new Promise(resolve => process.stdin.once('data', resolve));
      }
      await teardown(context);
    }
  }
}

runTests();
