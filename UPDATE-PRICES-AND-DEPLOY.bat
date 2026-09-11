@echo off
setlocal
cd /d %~dp0
python scripts\build_products.py
if errorlevel 1 exit /b 1
python scripts\validate_release.py
if errorlevel 1 exit /b 1
git add pricing.json assets\generated-pricing.js assets\generated-products.js assets\generated-products.json cloudflare-worker\src\catalog.js
git commit -m "Update TANVRA prices"
git push origin master
cd cloudflare-worker
call npm run deploy
pause
