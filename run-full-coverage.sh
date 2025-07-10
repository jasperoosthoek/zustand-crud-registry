#!/bin/bash

cd /home/pro/zustand-crud-registry

echo "Running all tests with coverage to see improvement..."

# Install dependencies if needed
npm install --silent

# Run all tests with coverage
npm test -- --coverage --watchAll=false

echo "Coverage analysis completed."
