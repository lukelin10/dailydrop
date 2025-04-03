#!/bin/bash
set -e

echo "Building application for production testing..."
bash build-server.sh

echo "Running application in production mode..."
NODE_ENV=production node dist/server/index.js