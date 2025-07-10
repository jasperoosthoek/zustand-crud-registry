#!/bin/bash

cd /home/pro/zustand-crud-registry

echo "Running tests with just the simple coverage test..."

# Run coverage with just useCrud tests
npm test -- --coverage --testPathPattern="useCrud" --watchAll=false

echo "Coverage test completed."
