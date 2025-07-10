#!/bin/bash

cd /home/pro/zustand-crud-registry

echo "Running specific failing tests..."

# Run just the failing test
npm test -- --testNamePattern="should not have state properties when no state is defined"

echo "Test completed."
