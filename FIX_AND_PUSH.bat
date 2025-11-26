@echo off
echo ========================================
echo Fixing Git Issues and Pushing to GitHub
echo ========================================
echo.

echo Step 1: Cleaning up...
git reset
echo.

echo Step 2: Adding all files...
git add .
echo.

echo Step 3: Creating commit...
git commit -m "Initial commit: LinkSnip URL Shortener v1.0.0"
echo.

echo Step 4: Pushing to GitHub...
git push -u origin main
echo.

echo ========================================
echo Done! Check your repository at:
echo https://github.com/ridzwandanis/linksnip
echo ========================================
pause
