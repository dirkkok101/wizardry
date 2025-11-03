# Tavern Redesign - Manual Testing Checklist

**Date:** 2025-11-03
**Branch:** feature/tavern-redesign
**Tester:** [Name]

---

## Test Environment

- [ ] Dev server running (`npm start`)
- [ ] Browser: Chrome/Firefox/Safari
- [ ] Console open (F12) to check for errors
- [ ] Clean browser cache

---

## Pre-Testing Setup

1. Start game and create at least 6 test characters with varied attributes:
   - Mix of Good, Neutral, and Evil alignments
   - Mix of classes (Fighter, Mage, Priest, Thief)
   - Different levels
2. Note: Some characters should remain in roster for testing

---

## Test 1: Visual Layout

**Objective:** Verify 2-column layout displays correctly

**Steps:**
1. Navigate to Castle Menu
2. Click or press 'G' to enter Gilgamesh's Tavern
3. Observe layout

**Expected Results:**
- [ ] Left column shows "Available Characters"
- [ ] Right column shows "Party Members" with "Party Gold: X GP" header
- [ ] Right column divided into "Front Row" and "Back Row" sections
- [ ] Character cards display in grid layout
- [ ] Cards show name, class, level, and key stats
- [ ] Action buttons visible on each card

**Issues Found:** _________________________

---

## Test 2: Add Character to Party

**Objective:** Verify adding characters works correctly

**Steps:**
1. In tavern, locate a Good-aligned character in left column
2. Click [Add] button
3. Observe result
4. Repeat with another Good or Neutral character

**Expected Results:**
- [ ] Success toast appears: "[Name] joined the party"
- [ ] Character moves from left to right column
- [ ] Character appears in Front Row (if first 3) or Back Row (if 4-6)
- [ ] Character disappears from Available Characters list
- [ ] Party gold remains unchanged

**Issues Found:** _________________________

---

## Test 3: Alignment Conflict

**Objective:** Verify Good vs Evil validation prevents invalid party

**Steps:**
1. Start with Good-aligned character in party
2. Try to add Evil-aligned character
3. Observe result

**Expected Results:**
- [ ] Error toast appears: "Good and Evil cannot party together"
- [ ] Evil character does NOT join party
- [ ] Evil character remains in Available Characters
- [ ] No state corruption

**Steps (Reverse):**
4. Remove Good character
5. Add Evil character
6. Try to add Good character

**Expected Results:**
- [ ] Error toast appears: "Good and Evil cannot party together"
- [ ] Good character does NOT join party

**Issues Found:** _________________________

---

## Test 4: Party Full (6 Members)

**Objective:** Verify 6-member limit enforced

**Steps:**
1. Add characters until party has 6 members
2. Attempt to add 7th character

**Expected Results:**
- [ ] Error toast: "Party is full (maximum 6 members)"
- [ ] 7th character does NOT join
- [ ] First 3 characters in Front Row
- [ ] Next 3 characters in Back Row

**Issues Found:** _________________________

---

## Test 5: Remove Character

**Objective:** Verify removing characters works

**Steps:**
1. With party of 3-6 members, click [Remove] on a character
2. Observe result

**Expected Results:**
- [ ] Success toast: "[Name] left the party"
- [ ] Character disappears from right column
- [ ] Character reappears in Available Characters (left column)
- [ ] Formation recalculates (remaining members stay in proper rows)
- [ ] Party gold unchanged

**Issues Found:** _________________________

---

## Test 6: Move Character Up

**Objective:** Verify character reordering up

**Steps:**
1. Create party with 4+ characters
2. Note the second character in party
3. Click [▲ Move Up] on that character
4. Observe result

**Expected Results:**
- [ ] Character swaps position with previous character
- [ ] Visual update happens immediately
- [ ] Formation recalculates (first 3 in front, next 3 in back)
- [ ] [▲ Move Up] button disabled on first character
- [ ] No errors in console

**Issues Found:** _________________________

---

## Test 7: Move Character Down

**Objective:** Verify character reordering down

**Steps:**
1. Create party with 4+ characters
2. Note the first character
3. Click [▼ Move Down] on that character
4. Observe result

**Expected Results:**
- [ ] Character swaps position with next character
- [ ] Visual update happens immediately
- [ ] Formation recalculates correctly
- [ ] [▼ Move Down] button disabled on last character
- [ ] No errors in console

**Issues Found:** _________________________

---

## Test 8: Formation Edge Cases

**Objective:** Verify formation logic with various party sizes

**Test 8a: 1-3 Members**
1. Create party with 1 character → should be in Front Row
2. Add 2nd character → both in Front Row
3. Add 3rd character → all 3 in Front Row
4. Back Row section should show "Back row is empty"

**Test 8b: 4-6 Members**
1. Add 4th character → should appear in Back Row
2. Add 5th character → should appear in Back Row
3. Add 6th character → should appear in Back Row
4. Move 4th character up → should swap with 3rd (stays in front row now)

**Expected Results:**
- [ ] First 3 members always in Front Row
- [ ] Members 4-6 always in Back Row
- [ ] Formation auto-recalculates on add/remove/move
- [ ] Empty state messages display when row empty

**Issues Found:** _________________________

---

## Test 9: Inspect Character

**Objective:** Verify character inspection navigation

**Steps:**
1. Click [Inspect] on any character (available or in party)
2. Observe navigation
3. Press ESC or click back
4. Verify return to tavern

**Expected Results:**
- [ ] Navigates to Character Inspection screen
- [ ] Character details display correctly
- [ ] Return navigation works (back to tavern)
- [ ] No state corruption

**Issues Found:** _________________________

---

## Test 10: ESC Key Navigation

**Objective:** Verify ESC key returns to castle menu

**Steps:**
1. In tavern scene
2. Press ESC key
3. Observe result

**Expected Results:**
- [ ] Immediately navigates to Castle Menu
- [ ] No errors
- [ ] Party state persists correctly

**Issues Found:** _________________________

---

## Test 11: Party Gold Display

**Objective:** Verify party gold displays correctly

**Steps:**
1. Note initial party gold amount in tavern header
2. Go to Shop and make purchase
3. Return to tavern
4. Observe gold amount

**Expected Results:**
- [ ] Party gold displays in right column header: "Party Gold: X GP"
- [ ] Amount updates after purchases
- [ ] Amount persists across navigation

**Issues Found:** _________________________

---

## Test 12: Toast Messages

**Objective:** Verify feedback messages work

**Steps:**
1. Perform various actions (add, remove, invalid operations)
2. Observe toast messages

**Expected Results:**
- [ ] Success messages (green) appear for successful actions
- [ ] Error messages (red) appear for failed operations
- [ ] Messages auto-dismiss after ~3 seconds
- [ ] Messages don't stack/overlap inappropriately
- [ ] Text is readable and clear

**Issues Found:** _________________________

---

## Test 13: Empty States

**Objective:** Verify empty state messages

**Test 13a: Empty Party**
1. Remove all characters from party

**Expected Results:**
- [ ] "Front row is empty" displayed
- [ ] "Back row is empty" displayed
- [ ] No errors

**Test 13b: No Available Characters**
1. Add all eligible characters to party

**Expected Results:**
- [ ] "No characters available to join the party" message
- [ ] Left column not empty (shows message)

**Issues Found:** _________________________

---

## Test 14: Button States

**Objective:** Verify buttons enable/disable correctly

**Steps:**
1. Add first character
2. Verify [▲ Move Up] disabled
3. Verify [▼ Move Down] enabled (if 2+ in party)
4. Add more characters
5. Check last character's buttons
6. Fill party to 6 members
7. Check [Add] buttons on available characters

**Expected Results:**
- [ ] [▲ Move Up] disabled for first character
- [ ] [▼ Move Down] disabled for last character
- [ ] [Add] disabled when party full
- [ ] Disabled buttons have visual indication (grayed out)
- [ ] Disabled buttons don't respond to clicks

**Issues Found:** _________________________

---

## Test 15: Rapid Actions

**Objective:** Test for race conditions or state corruption

**Steps:**
1. Rapidly click [Add] multiple times on same character
2. Rapidly click [Move Up] and [Move Down]
3. Quickly add and remove characters

**Expected Results:**
- [ ] No duplicate characters in party
- [ ] No state corruption
- [ ] No console errors
- [ ] Actions process correctly even when rapid
- [ ] UI remains responsive

**Issues Found:** _________________________

---

## Test 16: Browser Compatibility

**Objective:** Verify works across browsers

**Test in each browser:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Expected Results:**
- [ ] Layout renders correctly in all browsers
- [ ] Buttons work in all browsers
- [ ] ESC key works in all browsers
- [ ] No browser-specific errors

**Issues Found:** _________________________

---

## Test 17: Responsive Design

**Objective:** Verify layout adapts to different screen sizes

**Steps:**
1. Resize browser window to various widths
2. Test on mobile viewport (DevTools)

**Expected Results:**
- [ ] Columns stack vertically on narrow screens
- [ ] Cards remain readable at all sizes
- [ ] Buttons remain clickable on mobile
- [ ] No horizontal scrolling on small screens

**Issues Found:** _________________________

---

## Test 18: Performance

**Objective:** Verify no performance issues

**Steps:**
1. Monitor FPS during interactions (DevTools > Performance)
2. Add/remove/move characters multiple times
3. Check memory usage

**Expected Results:**
- [ ] No lag or stuttering
- [ ] Smooth animations/transitions
- [ ] No memory leaks
- [ ] State updates feel instant (<100ms)

**Issues Found:** _________________________

---

## Test 19: Console Errors

**Objective:** Verify no errors in console

**Steps:**
1. Keep console open during entire test session
2. Perform all above tests
3. Check for errors, warnings, or logs

**Expected Results:**
- [ ] No red errors in console
- [ ] No unexpected warnings
- [ ] No console.log statements (debug logs)
- [ ] No React/Angular warnings

**Issues Found:** _________________________

---

## Test 20: State Persistence

**Objective:** Verify party state persists correctly

**Steps:**
1. Create party with specific members and order
2. Navigate to another scene (e.g., Inn)
3. Return to tavern
4. Verify party unchanged

**Expected Results:**
- [ ] Party members persist
- [ ] Formation persists
- [ ] Party gold persists
- [ ] Character order unchanged

**Issues Found:** _________________________

---

## Post-Testing Checklist

- [ ] All tests passed
- [ ] Issues documented above
- [ ] Screenshots captured for any bugs
- [ ] Critical issues filed
- [ ] Testing session time: _______ minutes
- [ ] Overall impression: ________________

---

## Testing Summary

**Total Tests:** 20
**Passed:** _____
**Failed:** _____
**Blocked:** _____

**Critical Issues:** _____
**Minor Issues:** _____

**Recommendation:**
- [ ] Ready to merge
- [ ] Needs fixes before merge
- [ ] Needs discussion

**Tester Signature:** ________________
**Date Completed:** ________________

---

## Notes

_Use this space for any additional observations, suggestions, or concerns:_
