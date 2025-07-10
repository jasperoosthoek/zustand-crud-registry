#!/bin/bash

cd /home/pro/zustand-crud-registry

echo "Running config tests..."

# Run config tests
npm test -- --testNamePattern="should validate basic config with default values"

echo "Config test completed."
