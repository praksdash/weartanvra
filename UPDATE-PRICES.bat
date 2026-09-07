@echo off
python scripts\build_products.py
if errorlevel 1 pause
echo.
echo TANVRA prices rebuilt from pricing.json
pause
