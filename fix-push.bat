@echo off
REM Run this inside the "server" folder (the Git repo). It removes .env from what you push, then pushes.
git fetch origin || goto :fail
git reset --soft origin/main || goto :fail
git rm --cached -f --ignore-unmatch .env
git add .
git rm --cached -f --ignore-unmatch .env

echo.
echo Checking that no secret is staged...
git diff --cached | findstr /C:"gsk_" /C:"GROQ_API_KEY=gsk" >nul
if %errorlevel%==0 (
  echo STOP: a Groq key is still staged. Do not push. Open FIX-GUIDE.md.
  goto :fail
)
git diff --cached --name-only | findstr /R /C:"^\.env$" >nul
if %errorlevel%==0 (
  git diff --cached --name-status | findstr /R /C:"^[AM].*\.env$" >nul
  if not errorlevel 1 (
    echo STOP: .env is still staged for commit.
    goto :fail
  )
)
echo OK: no secrets staged.
git commit -m "Add chat assistant, stop tracking .env" || goto :fail
git push origin main || goto :fail
echo.
echo DONE. Now add GROQ_API_KEY in Render - Environment, then open /api/health.
exit /b 0
:fail
echo.
echo Something failed. Nothing secret was pushed.
exit /b 1
