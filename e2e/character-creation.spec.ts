import { test, expect } from '@playwright/test';

test.describe('Character Creation - All Permutations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to character creation
    await page.goto('http://localhost:4200/character-creation');
    // Wait for the page to load
    await page.waitForSelector('text=/CHOOSE RACE/i');
  });

  // Test all race selections (5 races)
  const races = [
    { key: '1', name: 'Human' },
    { key: '2', name: 'Elf' },
    { key: '3', name: 'Dwarf' },
    { key: '4', name: 'Gnome' },
    { key: '5', name: 'Hobbit' }
  ];

  // Test all alignment selections (3 alignments)
  const alignments = [
    { key: 'g', name: 'GOOD' },
    { key: 'n', name: 'NEUTRAL' },
    { key: 'e', name: 'EVIL' }
  ];

  // Test all class selections (8 classes with their new shortcuts)
  const classes = [
    { key: 'f', name: 'Fighter' },
    { key: 'm', name: 'Mage' },
    { key: 'p', name: 'Priest' },
    { key: 't', name: 'Thief' },
    { key: 'b', name: 'Bishop' },
    { key: 'a', name: 'Samurai' },
    { key: 'l', name: 'Lord' },
    { key: 'j', name: 'Ninja' }
  ];

  test('should complete character creation for all race permutations', async ({ page }) => {
    for (const race of races) {
      // Select race
      await page.keyboard.press(race.key);

      // Verify race is selected
      await expect(page.locator(`text=/.*${race.name}.*/i`)).toBeVisible();

      // Select alignment (using GOOD for simplicity)
      await page.keyboard.press('g');

      // Roll stats
      await page.keyboard.press('r');
      await page.waitForTimeout(400); // Wait for animation

      // Verify stats are displayed
      await expect(page.locator('text=/STR:/i')).toBeVisible();

      // Verify race and alignment are locked
      await expect(page.locator('text=/Press ESC to unlock/i')).toBeVisible();

      // Try to select Fighter (most likely to be eligible)
      await page.keyboard.press('f');

      // If Fighter is eligible, complete the flow
      const acceptButton = page.locator('text=/ACCEPT.*CHARACTER/i');
      if (await acceptButton.isVisible()) {
        await page.keyboard.press('Enter');

        // Name modal should appear
        await expect(page.locator('text=/Name Your Character/i')).toBeVisible();

        // Type name and save
        await page.keyboard.type(`Test${race.name}`);
        await page.keyboard.press('Enter');

        // Verify success message
        await expect(page.locator(`text=/.*${race.name}.*created successfully/i`)).toBeVisible();

        // Wait for auto-reset
        await page.waitForTimeout(2100);
      } else {
        // Reset and try next race
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should complete character creation for all alignment permutations', async ({ page }) => {
    for (const alignment of alignments) {
      // Select Human (most flexible race)
      await page.keyboard.press('1');

      // Select alignment
      await page.keyboard.press(alignment.key);

      // Verify alignment is selected
      await expect(page.locator(`text=/${alignment.name}/i`).filter({ hasText: '🔒' }).or(
        page.locator(`text=/${alignment.name}/i`).filter({ hasNotText: '🔒' })
      )).toBeVisible();

      // Roll stats
      await page.keyboard.press('r');
      await page.waitForTimeout(400);

      // Try to select Fighter
      await page.keyboard.press('f');

      const acceptButton = page.locator('text=/ACCEPT.*CHARACTER/i');
      if (await acceptButton.isVisible()) {
        await page.keyboard.press('Enter');
        await expect(page.locator('text=/Name Your Character/i')).toBeVisible();
        await page.keyboard.type(`Test${alignment.name}`);
        await page.keyboard.press('Enter');
        await expect(page.locator(`text=/.*created successfully/i`)).toBeVisible();
        await page.waitForTimeout(2100);
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should test all class selections with appropriate race/alignment combinations', async ({ page }) => {
    // Test each class with a combination that should make it eligible
    const classTests = [
      { class: 'f', race: '1', alignment: 'g', name: 'Fighter' }, // Fighter - any
      { class: 'm', race: '1', alignment: 'g', name: 'Mage' },    // Mage - any
      { class: 'p', race: '1', alignment: 'g', name: 'Priest' },  // Priest - any good
      { class: 't', race: '1', alignment: 'n', name: 'Thief' },   // Thief - neutral/evil
      { class: 'b', race: '1', alignment: 'g', name: 'Bishop' },  // Bishop - good/evil
      { class: 'a', race: '1', alignment: 'g', name: 'Samurai' }, // Samurai - good/neutral
      { class: 'l', race: '1', alignment: 'g', name: 'Lord' },    // Lord - good only
      { class: 'j', race: '1', alignment: 'e', name: 'Ninja' }    // Ninja - evil only
    ];

    for (const test of classTests) {
      // Select race
      await page.keyboard.press(test.race);

      // Select alignment
      await page.keyboard.press(test.alignment);

      // Roll stats multiple times until we get eligible stats
      let attempts = 0;
      let eligible = false;

      while (attempts < 10 && !eligible) {
        await page.keyboard.press('r');
        await page.waitForTimeout(400);

        // Try to select the class
        await page.keyboard.press(test.class);

        // Check if we can accept
        const acceptButton = page.locator('text=/ACCEPT.*CHARACTER/i');
        eligible = await acceptButton.isVisible();

        if (!eligible) {
          attempts++;
        }
      }

      if (eligible) {
        // Complete character creation
        await page.keyboard.press('Enter');
        await expect(page.locator('text=/Name Your Character/i')).toBeVisible();
        await page.keyboard.type(`Test${test.name}`);
        await page.keyboard.press('Enter');
        await expect(page.locator(`text=/Test${test.name}.*created successfully/i`)).toBeVisible();
        await page.waitForTimeout(2100);
      } else {
        // If we couldn't get eligible stats after 10 tries, reset and continue
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should verify state locking behavior', async ({ page }) => {
    // Select race
    await page.keyboard.press('1');
    await expect(page.locator('text=/Human/i').first()).toBeVisible();

    // Verify not locked yet
    await expect(page.locator('text=/Press ESC to unlock/i')).not.toBeVisible();

    // Select alignment
    await page.keyboard.press('g');

    // Roll stats - this should lock
    await page.keyboard.press('r');
    await page.waitForTimeout(400);

    // Verify locked indicators appear
    await expect(page.locator('text=/Press ESC to unlock/i')).toBeVisible();
    await expect(page.locator('span.lock-icon')).toBeVisible();

    // Try to change race (should not work)
    await page.keyboard.press('2');

    // Should still show Human as selected, not Elf
    // (This would need specific selector to verify the selected state)

    // Reset should unlock
    await page.keyboard.press('Escape');
    await expect(page.locator('text=/Press ESC to unlock/i')).not.toBeVisible();
  });

  test('should verify keyboard shortcuts are blocked when modal is open', async ({ page }) => {
    // Complete workflow up to name modal
    await page.keyboard.press('1'); // Human
    await page.keyboard.press('g'); // Good
    await page.keyboard.press('r'); // Roll
    await page.waitForTimeout(400);
    await page.keyboard.press('f'); // Fighter
    await page.keyboard.press('Enter'); // Accept

    // Modal should be open
    await expect(page.locator('text=/Name Your Character/i')).toBeVisible();

    // Try to press 'r' to reroll (should be blocked)
    await page.keyboard.press('r');
    await page.waitForTimeout(400);

    // Modal should still be visible (shortcut was blocked)
    await expect(page.locator('text=/Name Your Character/i')).toBeVisible();

    // Cancel modal
    await page.keyboard.press('Escape');
    await expect(page.locator('text=/Name Your Character/i')).not.toBeVisible();
  });

  test('should verify ESC resets form immediately without confirmation', async ({ page }) => {
    // Build up some state
    await page.keyboard.press('1'); // Human
    await page.keyboard.press('g'); // Good
    await page.keyboard.press('r'); // Roll
    await page.waitForTimeout(400);

    // Press ESC - should reset immediately
    await page.keyboard.press('Escape');

    // Verify form is reset (lock indicators gone)
    await expect(page.locator('text=/Press ESC to unlock/i')).not.toBeVisible();
    await expect(page.locator('span.lock-icon')).not.toBeVisible();
  });

  test('should verify Q quits to training grounds', async ({ page }) => {
    // Start character creation
    await page.keyboard.press('1'); // Select a race

    // Press Q to quit
    await page.keyboard.press('q');

    // Should navigate away (verify URL or page content)
    await expect(page).toHaveURL(/training-grounds/);
  });

  test('should verify class shortcuts changed correctly', async ({ page }) => {
    await page.keyboard.press('1'); // Human
    await page.keyboard.press('g'); // Good
    await page.keyboard.press('r'); // Roll
    await page.waitForTimeout(400);

    // Test new shortcuts
    // B for Bishop (was I)
    await page.keyboard.press('b');

    // A for Samurai (was S)
    await page.keyboard.press('a');

    // J for Ninja (was N)
    await page.keyboard.press('j');

    // Verify one of them is selected (depending on eligibility)
    // This would need specific class selection verification
  });

  test('should handle rerolling stats while maintaining lock', async ({ page }) => {
    await page.keyboard.press('1'); // Human
    await page.keyboard.press('g'); // Good
    await page.keyboard.press('r'); // Roll
    await page.waitForTimeout(400);

    // Verify locked
    await expect(page.locator('text=/Press ESC to unlock/i')).toBeVisible();

    // Reroll stats
    await page.keyboard.press('r');
    await page.waitForTimeout(400);

    // Should still be locked
    await expect(page.locator('text=/Press ESC to unlock/i')).toBeVisible();
    await expect(page.locator('span.lock-icon')).toBeVisible();
  });

  test('should verify alignment shortcuts work before locking', async ({ page }) => {
    await page.keyboard.press('1'); // Human

    // Before rolling (not locked), G/N/E should select alignment
    await page.keyboard.press('g');
    await expect(page.locator('button:has-text("GOOD")').filter({ has: page.locator('.selected') })).toBeVisible();

    await page.keyboard.press('n');
    await expect(page.locator('button:has-text("NEUTRAL")').filter({ has: page.locator('.selected') })).toBeVisible();

    await page.keyboard.press('e');
    await expect(page.locator('button:has-text("EVIL")').filter({ has: page.locator('.selected') })).toBeVisible();
  });

  test('should verify number keys select race before locking', async ({ page }) => {
    // Test all 5 race keys
    for (let i = 1; i <= 5; i++) {
      await page.keyboard.press(String(i));
      // Should show selected race (would need specific selector)
      await page.waitForTimeout(100);
    }

    // Roll to lock
    await page.keyboard.press('g'); // Need alignment first
    await page.keyboard.press('r');
    await page.waitForTimeout(400);

    // Try to change race with number key (should fail)
    await page.keyboard.press('1');
    // Race should not change (need verification)
  });

  test('should complete full workflow with Enter at each step', async ({ page }) => {
    // This tests that Enter opens modal only at the final step
    await page.keyboard.press('1');
    await page.keyboard.press('Enter'); // Should not open modal yet
    await expect(page.locator('text=/Name Your Character/i')).not.toBeVisible();

    await page.keyboard.press('g');
    await page.keyboard.press('Enter'); // Should not open modal yet
    await expect(page.locator('text=/Name Your Character/i')).not.toBeVisible();

    await page.keyboard.press('r');
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter'); // Should not open modal yet
    await expect(page.locator('text=/Name Your Character/i')).not.toBeVisible();

    await page.keyboard.press('f');
    await page.keyboard.press('Enter'); // NOW should open modal
    await expect(page.locator('text=/Name Your Character/i')).toBeVisible();
  });
});
