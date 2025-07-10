#!/bin/bash

cd /home/pro/zustand-crud-registry

echo "Running tests to check current coverage..."

# Run just the useCrud tests with coverage
npm test -- --coverage --testPathPattern="useCrud" --watchAll=false --collectCoverageFrom="src/useCrud.ts"

echo "Test completed."
