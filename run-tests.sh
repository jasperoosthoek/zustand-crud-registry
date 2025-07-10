#!/bin/bash

# Navigate to the project directory
cd /home/pro/zustand-crud-registry

echo "Installing dependencies..."
npm install

echo "Running tests..."
npm test

echo "Test run completed."
