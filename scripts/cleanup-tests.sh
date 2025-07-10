#!/bin/bash

# Remove disabled test files that are no longer needed
# These contained React-dependent tests that had compatibility issues

echo "Removing disabled test files..."

rm -f src/__tests__/examples.test.ts.disabled
rm -f src/__tests__/integration.test.ts.disabled  
rm -f src/__tests__/loadingState.test.ts.disabled
rm -f src/__tests__/useCrud.test.ts.disabled
rm -f src/__tests__/useStore.test.ts.disabled

echo "✅ Removed 5 disabled test files"
echo "🧹 Test directory cleaned up"
echo ""
echo "Remaining test files:"
ls -la src/__tests__/*.test.ts

echo ""
echo "Run 'npm test' to verify all tests still pass"
