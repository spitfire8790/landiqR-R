import { test, expect } from '@playwright/test';

// Helper function to log in a user
async function loginUser(page: any) {
  await page.goto('/login');
  
  // Use existing credentials
  const testEmail = 'james.strutt@dpie.nsw.gov.au';
  const testPassword = 'B6pwt266!';

  await page.getByLabel('Email').fill(testEmail);
  await page.getByLabel('Password').fill(testPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Should be redirected to dashboard after successful login
  await expect(page).toHaveURL('/', { timeout: 15000 });
  await expect(page.locator('h1').first()).toContainText('Land iQ - Project Management');
  
  return { email: testEmail, password: testPassword };
}

test.describe('Land iQ - Project Management E2E Tests', () => {
  test('login and navigation flow', async ({ page }) => {
    // Test login flow
    await test.step('User can log in', async () => {
      await loginUser(page);
    });

    // Test navigation to groups tab
    await test.step('User can navigate to groups', async () => {
      await page.getByRole('button', { name: 'Groups' }).click();
      await expect(page.getByText('Responsibility Groups')).toBeVisible();
    });

    // Test creating a group (only if user is admin)
    await test.step('User can create a group if admin', async () => {
      // Check if "Add New" button exists (admin feature)
      const addButton = page.getByRole('button', { name: 'Add New' });
      
      if (await addButton.isVisible()) {
        // User is admin, test group creation
        await addButton.click();
        await page.getByRole('menuitem', { name: 'Add Group' }).click();

        // Fill the group form
        await page.getByLabel('Name').fill('Test Group');
        await page.getByLabel('Description').fill('This is a test group for E2E testing');
        await page.getByRole('button', { name: 'Save' }).click();

        // Verify the group appears in the table
        await expect(page.locator('text=Test Group')).toBeVisible();
        await expect(page.locator('text=This is a test group for E2E testing')).toBeVisible();

        // Test editing the group
        const groupRow = page.locator('tr').filter({ hasText: 'Test Group' });
        await groupRow.getByRole('button', { name: 'Edit' }).click();

        // Modify the group
        await page.getByLabel('Name').fill('Updated Test Group');
        await page.getByLabel('Description').fill('This is an updated test group');
        await page.getByRole('button', { name: 'Save' }).click();

        // Verify the changes appear
        await expect(page.locator('text=Updated Test Group')).toBeVisible();
        await expect(page.locator('text=This is an updated test group')).toBeVisible();

        // Test deleting the group
        const updatedGroupRow = page.locator('tr').filter({ hasText: 'Updated Test Group' });
        await updatedGroupRow.getByRole('button', { name: 'Delete' }).click();

        // Confirm deletion in the alert dialog
        await page.getByRole('button', { name: 'Delete' }).click();

        // Verify the group is removed
        await expect(page.locator('text=Updated Test Group')).not.toBeVisible();
      } else {
        console.log('User is not admin, skipping group CRUD operations');
      }
    });

    // Test keyboard shortcut for How to Use modal
    await test.step('User can open How to Use modal with keyboard shortcut', async () => {
      // Press the ? key
      await page.keyboard.press('?');

      // Verify the How to Use modal opens
      await expect(page.getByText('Welcome to Land iQ - Project Management')).toBeVisible();

      // Close the modal
      await page.keyboard.press('Escape');
      await expect(page.getByText('Welcome to Land iQ - Project Management')).not.toBeVisible();
    });

    // Test logout
    await test.step('User can logout', async () => {
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Should be redirected to login page
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test('user can navigate between different tabs', async ({ page }) => {
    // Login first
    await loginUser(page);
    
    // Test navigation between different tabs
    const tabs = [
      { name: 'Org Chart', expectedContent: 'Org Chart' },
      { name: 'Groups', expectedContent: 'Responsibility Groups' },
      { name: 'Categories', expectedContent: 'Categories' },
      { name: 'People', expectedContent: 'People' },
      { name: 'Tasks', expectedContent: 'Tasks' },
      { name: 'Analytics', expectedContent: 'Analytics' },
    ];

    for (const tab of tabs) {
      await page.getByRole('button', { name: tab.name }).click();
      // Wait a bit for content to load
      await page.waitForTimeout(500);
      await expect(page.getByText(tab.expectedContent)).toBeVisible({ timeout: 10000 });
    }
  });

  test('mobile responsive navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login first
    await loginUser(page);

    // On mobile, sidebar should be hidden and mobile tabs should be visible
    await expect(page.locator('.w-64.bg-white.shadow-lg')).not.toBeVisible(); // Desktop sidebar
    await expect(page.locator('.fixed.bottom-0')).toBeVisible(); // Mobile tab bar
    
    // Test mobile navigation - target the mobile tab bar specifically
    await page.locator('.fixed.bottom-0 button').filter({ hasText: 'People' }).click();
    await expect(page.getByText('People')).toBeVisible({ timeout: 10000 });
    
    await page.locator('.fixed.bottom-0 button').filter({ hasText: 'Tasks' }).click();
    await expect(page.getByText('Tasks')).toBeVisible({ timeout: 10000 });
    
    await page.locator('.fixed.bottom-0 button').filter({ hasText: 'Chart' }).click();
    await expect(page.getByText('Org Chart')).toBeVisible({ timeout: 10000 });
  });
}); 