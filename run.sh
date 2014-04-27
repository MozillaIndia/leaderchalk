#!/bin/sh
# This script pulls data and commit back to GitHub repo.

TIMESTAMP=$(date)
node index.js
git add stats.json
git commit -m "Update stats.json - ${TIMESTAMP}"
git push -u origin gh-pages
