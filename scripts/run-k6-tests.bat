@echo off
echo Running k6 Stress Tests

echo.
echo === Authentication Test ===
k6 run server\tests\k6\auth-test.js

echo.
echo === Product Listing Test ===
k6 run server\tests\k6\product-test.js

echo.
echo === Cart Operations Test ===
k6 run server\tests\k6\cart-test.js

echo.
echo All tests completed 