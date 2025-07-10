#!/bin/bash

cd /home/pro/zustand-crud-registry

echo "Running simple coverage tests..."

# Run just the simple coverage test
npm test -- --testPathPattern="useCrud-simple" --verbose

echo "Simple test completed."
