# Manual Testing Guide: Character Creation Wizard Redesign

**Purpose:** Validate the two-column wizard implementation through manual interaction.

**Prerequisites:**
- Development server running (`npm start`)
- Browser with DevTools open
- Navigate to Character Creation scene

---

## Test 1: Happy Path (Complete Character Creation)

**Objective:** Create a character from start to finish using keyboard shortcuts.

**Steps:**
1. Navigate to Character Creation scene
2. Press **1** to select Human race
3. Verify: Human is highlighted/selected in left column
4. Verify: "Race: Human" appears in right column character display
5. Press **Enter**
6. Verify: Wizard advances to Step 2 (Choose Your Alignment)
7. Press **G** for Good alignment
8. Verify: Good is highlighted/selected
9. Verify: "Alignment: Good" appears in right column
10. Press **Enter**
11. Verify: Wizard advances to Step 3 (Roll Your Attributes)
12. Press **R** to roll dice
13. Wait for animation (300ms)
14. Verify: Auto-advance to Step 4 (Choose Your Class)
15. Verify: Stats appear in right column with formula (base + roll = final)
16. Verify: Bonus points displayed
17. Verify: Eligible classes are enabled, ineligible classes are disabled with ✗
18. Press **F** for Fighter (assuming eligible)
19. Verify: Fighter is highlighted
20. Verify: "Class: Fighter" appears in right column
21. Press **Enter**
22. Verify: Wizard advances to Step 5 (Name Your Character)
23. Type: "TestChar"
24. Verify: Character counter shows "8 / 15"
25. Press **Enter**
26. Verify: Success message appears
27. Verify: **IMMEDIATE reset to Step 1** (no delay)
28. Verify: All form fields cleared
29. Verify: Right column character display empty

**Expected Result:** ✅ Character created, wizard resets immediately

---

## Test 2: Reroll Stats Flow

**Objective:** Test unlimited stat rerolling on class selection step.

**Steps:**
1. Complete steps 1-13 from Happy Path (reach class selection)
2. Note the current stats and eligible classes
3. Press **R** to reroll stats
4. Wait for animation
5. Verify: Stats change in right column
6. Verify: Eligible classes may change based on new stats
7. Verify: Still on Step 4 (didn't advance)
8. Press **R** again (2nd reroll)
9. Verify: Stats change again
10. Press **R** again (3rd reroll)
11. Verify: Can reroll unlimited times
12. Select a class when satisfied
13. Complete character creation

**Expected Result:** ✅ Unlimited rerolls work, stats update each time

---

## Test 3: Backward Navigation (ESC Key)

**Objective:** Test going back through wizard steps and data clearing rules.

### 3a: Go Back from Alignment Selection

**Steps:**
1. Select Human race → Press Enter
2. Verify: On Step 2 (alignment selection)
3. Press **Escape**
4. Verify: Back to Step 1 (race selection)
5. Verify: Race is still selected (Human)

**Expected Result:** ✅ Alignment cleared, race persists

### 3b: Go Back from Roll Stats

**Steps:**
1. Select Human → Enter → Select Good → Enter
2. Verify: On Step 3 (Roll Your Attributes)
3. Press **Escape**
4. Verify: Back to Step 2 (alignment selection)
5. Verify: Alignment still selected (Good)
6. Verify: Stats cleared from right column (if rolled)

**Expected Result:** ✅ Stats cleared, alignment persists

### 3c: Go Back from Class Selection (Nuclear Option)

**Steps:**
1. Complete race → alignment → roll stats
2. Verify: On Step 4 with stats displayed
3. Optionally select a class
4. Press **Escape**
5. Verify: Back to Step 2 (alignment selection) - **skips Roll Stats step**
6. Verify: Stats cleared from right column
7. Verify: Class cleared (if selected)
8. Verify: Alignment still selected

**Expected Result:** ✅ "Nuclear option" - loses both stats AND class, must re-roll

### 3d: Go Back from Name Character

**Steps:**
1. Complete through class selection
2. Verify: On Step 5 (Name Your Character)
3. Press **Escape**
4. Verify: Back to Step 4 (class selection)
5. Verify: Class still selected
6. Verify: Stats still displayed

**Expected Result:** ✅ All data preserved, just goes back one step

---

## Test 4: Visual Polish Verification

**Objective:** Verify visual design and animations.

**Steps:**
1. Verify two-column layout is 50/50 split
2. Verify left column has:
   - Step title and "Step X of 5" indicator
   - Current step controls only (other steps hidden)
   - Keyboard hints at bottom
3. Verify right column has:
   - "YOUR CHARACTER" header
   - Progressive build-up as selections made
4. Verify animations:
   - Right column sections slide in from right (300ms)
   - Buttons have hover effects (lift 2px)
   - Selected buttons have glow effect
5. Verify button states:
   - Hover: Blue border + background
   - Selected: Blue background + glow
   - Disabled: 40% opacity + ✗ marker (for classes)
6. Verify step hints update per step:
   - Step 1: "ENTER: Continue | ESC: Cancel | Q: Quit"
   - Step 2: "ENTER: Continue | ESC: Go back | Q: Quit"
   - Step 3: "R: Roll dice | ESC: Go back | Q: Quit"
   - Step 4: "ENTER: Continue | R: Reroll stats | ESC: Start over | Q: Quit"
   - Step 5: "ENTER: Create character | ESC: Go back | Q: Quit"

**Expected Result:** ✅ All visual elements render correctly

---

## Test 5: Edge Cases

### 5a: Cannot Advance Without Required Data

**Steps:**
1. On Step 1 (race selection), press **Enter** without selecting a race
2. Verify: Does not advance
3. Select a race, press Enter
4. On Step 2, press **Enter** without selecting alignment
5. Verify: Does not advance

**Expected Result:** ✅ Validation guards work

### 5b: Ineligible Class Display

**Steps:**
1. Complete through stat rolling
2. Note which classes are enabled vs disabled
3. Verify: Disabled classes show ✗ marker
4. Try to select a disabled class (click or keyboard)
5. Verify: Cannot select disabled class

**Expected Result:** ✅ Ineligible classes cannot be selected

### 5c: Quit to Training Grounds

**Steps:**
1. On any step, press **Q**
2. Verify: Returns to Training Grounds scene
3. Navigate back to Character Creation
4. Verify: Wizard reset to Step 1

**Expected Result:** ✅ Quit works from any step

---

## Test 6: Console Errors Check

**Objective:** Verify no JavaScript errors occur.

**Steps:**
1. Open browser DevTools → Console tab
2. Complete a full character creation flow
3. Test backward navigation
4. Test rerolling multiple times
5. Test quitting and returning

**Expected Result:** ✅ No errors or warnings in console

---

## Test 7: Success/Error Messages

**Objective:** Verify feedback messages display correctly.

**Steps:**
1. Complete character creation
2. Verify: Green success message appears at bottom of left column
3. Verify: Message text: "[Name] created successfully!"
4. Verify: Wizard resets immediately after message

**Expected Result:** ✅ Success message appears and wizard resets

---

## Issues to Document

If any issues are found during manual testing, document them with:
- **Issue:** Brief description
- **Steps to reproduce:**
- **Expected behavior:**
- **Actual behavior:**
- **Severity:** Critical / High / Medium / Low

---

## Manual Testing Completion Checklist

- [ ] Test 1: Happy Path ✓
- [ ] Test 2: Reroll Stats Flow ✓
- [ ] Test 3a-d: All Backward Navigation Tests ✓
- [ ] Test 4: Visual Polish ✓
- [ ] Test 5a-c: Edge Cases ✓
- [ ] Test 6: Console Errors ✓
- [ ] Test 7: Success Messages ✓
- [ ] No issues found / All issues documented ✓

**Tester Signature:** _________________
**Date:** _________________
