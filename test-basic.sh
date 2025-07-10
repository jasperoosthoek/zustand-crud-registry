#!/bin/bash

cd /home/pro/zustand-crud-registry

echo "Running a quick test to check our setup..."

# Run just the callIfFunc test first to check if basic setup works
npm test -- --testNamePattern="callIfFunc utility"

echo "Basic test completed."
