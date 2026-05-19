---
name: firestore-tests
description: Implement and refactor firestore tests for better maintainability and readability
---

When you're implementing or refactoring tests, it's important to focus on improving the structure, readability, and maintainability of your test code. Here are some steps you can take to achieve this:

## Phase 1: Verify Tests
- Make sure all the tests are passing before you start refactoring.
- If not, inform me about the failing tests and we can work together to fix them before refactoring.

## Phase 2: Implement or Refactor Test Code
- Identify any duplicate code in your tests and extract it into helper functions or setup methods.
- Use descriptive names for your test functions to clearly indicate what they are testing.
- Organize your test suites into logical groups, e.g., a group is a CRUD operation or a specific feature, to improve readability.

## Phase 3: Add Test Documentation
- On top of the test file, add a comment with a numbered list of all test cases using x.y.z format (x = suite, y = group, z = case).
- Name each test case with its number and description (e.g., `1.1.1 - user can read own collections`).
- Ensure the numbering in test function names and inline comments exactly matches the format and sequence of the commented list at the top.

## Phase 4: Organize Files
- Add the test suite number to the file name (e.g., `1-firestore.rules.users.test.mjs`).

## Phase 5: Document Rules
- Create a reference document mapping each rule to its test case number (x.y.z format).
- Ensure rule conditions are on separate lines for adding comments:
```
 match /public/items/{itemId} {
        allow get: if 
          isAdmin() || // Rule 1.1.2
          (folderMatchesConfig() && // Rule 1.1.3
          (isOwner(resource.data.userId) || // Rule 1.1.1
          isPubliclyVisible()) // Rule 1.2.1
        );
 }
```
- Create a mapping table at the top of the Firestore rules file referencing each rule number to its test case and description.

## Phase 6: Final Verification
- Run all tests to ensure they pass and no new issues were introduced.
- Run linting tools to ensure code quality and consistency.