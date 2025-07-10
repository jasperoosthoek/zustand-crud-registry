#!/bin/bash

cd /home/pro/zustand-crud-registry

echo "Installing new dependencies if needed..."
npm install

echo "Running tests with coverage..."
npm test -- --coverage --testPathPattern="useCrud" --verbose

echo "Coverage test completed."
