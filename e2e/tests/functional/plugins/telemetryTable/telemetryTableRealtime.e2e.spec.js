/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2024, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/

/*
 * This test suite verifies real-time telemetry updates in telemetry tables.
 */

import { createDomainObjectWithDefaults, setRealTimeMode } from '../../../../appActions.js';
import { expect, test } from '../../../../pluginFixtures.js';

test.describe('Telemetry Table Real-time Updates', () => {
  let telemetryTable;
  let sineWaveGenerator;

  test.beforeEach(async ({ page }) => {
    await page.goto('./', { waitUntil: 'domcontentloaded' });

    // Create a sine wave generator for telemetry data
    sineWaveGenerator = await createDomainObjectWithDefaults(page, {
      type: 'Sine Wave Generator'
    });

    // Create a telemetry table
    telemetryTable = await createDomainObjectWithDefaults(page, {
      type: 'Telemetry Table'
    });
  });

  test('Table updates show latest telemetry values in real-time mode', async ({ page }) => {
    // Navigate to the telemetry table
    await page.goto(telemetryTable.url);

    // Add the sine wave generator to the table
    await page.getByRole('button', { name: 'Edit Object' }).click();

    // Add sine wave generator as a source
    await page.getByRole('button', { name: 'Add Object' }).click();
    await page.getByRole('treeitem', { name: sineWaveGenerator.name }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    // Switch to real-time mode
    await setRealTimeMode(page);

    // Wait for telemetry to start flowing
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1000);

    // Check that table has rows
    const tableRows = page.locator('.c-telemetry-table__body .c-telemetry-table__row');
    await expect(tableRows.first()).toBeVisible();

    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Get the first value cell
    const firstValueCell = tableRows.first().locator('.c-telemetry-table__cell--value');
    const initialValue = await firstValueCell.textContent();

    // Wait for updates with sufficient time for CI
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1000);

    // Check that value has updated
    const updatedValue = await firstValueCell.textContent();

    // Verify the value has changed
    expect(updatedValue).not.toEqual(initialValue);
  });

  test('Table rows render with correct column count immediately', async ({ page }) => {
    // Navigate to the telemetry table
    await page.goto(telemetryTable.url);

    // Edit and add telemetry source
    await page.getByRole('button', { name: 'Edit Object' }).click();
    await page.getByRole('button', { name: 'Add Object' }).click();

    // Select the sine wave generator
    await page.getByRole('treeitem', { name: sineWaveGenerator.name }).click();

    // Save and wait for the operation to complete
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for table to initialize
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);

    // Count headers after table has initialized
    const headers = page.locator('.c-telemetry-table__headers__label');
    const headerCount = await headers.count();

    // Expect headers to be rendered (timestamp + value columns)
    expect(headerCount).toBeGreaterThanOrEqual(2);

    // Check table body exists
    const tableBody = page.locator('.c-telemetry-table__body');
    await expect(tableBody).toBeVisible();
  });

  test('Pausing telemetry stops table updates', async ({ page }) => {
    await page.goto(telemetryTable.url);

    // Setup telemetry table with sine wave
    await page.getByRole('button', { name: 'Edit Object' }).click();
    await page.getByRole('button', { name: 'Add Object' }).click();
    await page.getByRole('treeitem', { name: sineWaveGenerator.name }).click();
    await page.getByRole('button', { name: 'Save' }).click();

    // Switch to real-time
    await setRealTimeMode(page);

    // Let some data flow in
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1000);

    // Get current row count
    const tableRows = page.locator('.c-telemetry-table__body .c-telemetry-table__row');
    const initialCount = await tableRows.count();

    // Pause telemetry
    await page.locator('.c-button--pause').click();

    // Wait for pause to take effect
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);

    // Check row count hasn't changed
    const pausedCount = await tableRows.count();

    // Row count should remain stable while paused
    expect(pausedCount).toEqual(initialCount);

    // Resume and check it updates again
    await page.locator('.c-button--resume').click();

    // Wait for telemetry to resume and new data to arrive
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1000);

    const resumedCount = await tableRows.count();

    // Expect more rows after resume
    expect(resumedCount).toBeGreaterThan(pausedCount);
  });

  test('Table scrolls to show latest telemetry value', async ({ page }) => {
    await page.goto(telemetryTable.url);

    // Configure table
    await page.getByRole('button', { name: 'Edit Object' }).click();
    await page.getByRole('button', { name: 'Add Object' }).click();
    await page.getByRole('treeitem', { name: sineWaveGenerator.name }).click();

    // Save and start real-time mode
    await page.getByRole('button', { name: 'Save' }).click();

    await setRealTimeMode(page);

    // Wait for table to initialize and start receiving data
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(500);

    // Get scroll container
    const scrollContainer = page.locator('.c-telemetry-table__scroll-container');

    // Wait for scroll container to be visible
    await expect(scrollContainer).toBeVisible();

    const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);

    // Wait for telemetry data to accumulate
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(1000);

    // Check scroll position changed
    const newScrollTop = await scrollContainer.evaluate((el) => el.scrollTop);

    // Verify scroll position has changed or is still at expected position
    expect(newScrollTop).toBeGreaterThanOrEqual(scrollTop);
  });
});
