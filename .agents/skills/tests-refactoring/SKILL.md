---
name: tests-refactoring
description: Update and refactor tests for better maintainability and readability
---

When you're refactoring tests, it's important to focus on improving the structure, readability, and maintainability of your test code. Here are some steps you can take to achieve this:

- Make sure all the tests are passing before you start refactoring.
- if not, inform me about the failing tests and we can work together to fix them before refactoring.
- Identify any duplicate code in your tests and extract it into helper functions or setup methods.
- Use descriptive names for your test functions to clearly indicate what they are testing.
- Organize your tests into logical groups or test suites to improve readability.
- Before completing the refactoring, run all the tests to ensure that they still pass and that you haven't introduced any new issues.
- On top of the test file add a comment with a list of all the test cases in the suite, this will help you to keep track of the tests and ensure that you have covered all the necessary scenarios.
- Also number tests with x.y.z format, where x is the test suite number, y is the logical group number, and z is the test case number. This will help you to keep track of the tests and ensure that you have covered all the necessary scenarios.
- the number as the appear in the commented list on top of the file, this will help you to keep track of the tests and ensure that you have covered all the necessary scenarios.
- add the number of the test suite in the file name as well. For example, if you have a test suite for users, you could name the file `1-firestore.rules.users.test.mjs`. This will make it easier to identify the purpose of the test file and its relation to the test suite.