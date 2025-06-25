@echo off
echo Testing Redis cache performance...
echo.
echo First request (not cached)...
echo.

set start=%time%
curl -s -o nul -w "Status: %%{http_code}, Time: %%{time_total}s\n" http://localhost:3000/api/v1/products
set end=%time%

echo.
echo Second request (should be cached)...
echo.

set start=%time%
curl -s -o nul -w "Status: %%{http_code}, Time: %%{time_total}s\n" http://localhost:3000/api/v1/products
set end=%time%

echo.
echo Testing store endpoint...
echo.

echo First request (not cached)...
set start=%time%
curl -s -o nul -w "Status: %%{http_code}, Time: %%{time_total}s\n" http://localhost:3000/api/v1/stores
set end=%time%

echo.
echo Second request (should be cached)...
set start=%time%
curl -s -o nul -w "Status: %%{http_code}, Time: %%{time_total}s\n" http://localhost:3000/api/v1/stores
set end=%time%

echo.
echo Cache test complete. The second request for each endpoint should be significantly faster. 