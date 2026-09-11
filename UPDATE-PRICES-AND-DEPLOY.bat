@echo off
setlocal
cd /d %~dp0
python scripts\build_products.py || exit /b 1
python scripts\validate_release.py || exit /b 1
git add -A
git commit -m "Update TANVRA pricing" || echo No new commit needed.
git push origin master || exit /b 1
cd cloudflare-worker
npm run deploy || exit /b 1
echo.
echo TANVRA pricing and Worker deployment complete.
pause
