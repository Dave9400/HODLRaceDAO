#!/bin/bash
# Fix npm install by forcing development mode

export NODE_ENV=development
npm install --legacy-peer-deps --force --include=dev

echo ""
echo "Checking if tsx was installed..."
npx tsx --version

echo ""
echo "Checking if vite was installed..."
npx vite --version

echo ""
echo "If both commands above showed version numbers, the fix worked!"
echo "Now click the RUN button to start your app."
