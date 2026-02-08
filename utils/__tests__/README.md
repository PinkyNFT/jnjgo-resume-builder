# Running Gap Detection Tests

## Quick Start

Jest is now configured and ready to use. Run tests with:

```bash
npm test                  # Run all tests
npm run test:watch        # Run in watch mode  
npm run test:coverage     # Run with coverage report
```

Or run specific test files:
```bash
npm test gapDetection     # Run only gap detection tests
npm test -- --verbose     # Run with detailed output
```

## Expected Output

```
🧪 Running Gap Detection Tests

✓ should detect unanswered gap questions
✓ should recognize adequate gap explanations
✓ should avoid false positives on non-gap contexts
✓ should handle multiple gap questions
✓ should handle no gap questions
✓ should recognize various gap answer formats
✓ should detect voluntary gap mentions
✓ should detect when model asked gap questions
✓ should return false when no gaps discussed

📊 Results: 9 passed, 0 failed
```

## Test Coverage Goals

- **Current:** 9 test cases covering core functionality
- **Target:** 95%+ code coverage
- **Areas to expand:**
  - Edge cases (empty arrays, null values)
  - Performance benchmarks
  - Multi-language support (future)
  - Integration tests with real conversations

## Troubleshooting

### Error: Cannot find module 'tsx'
Install tsx globally or use npx:
```bash
npm install -g tsx
# OR
npx tsx utils/__tests__/gapDetection.test.ts
```

### Error: Cannot find module '../gapDetection'
Make sure you're running from the project root directory.

### Tests fail with "require is not defined"
The test file uses CommonJS (`require.main`). To fix, either:
1. Keep using the built-in runner (it handles this)
2. Or convert to ESM and remove the `require.main` check
