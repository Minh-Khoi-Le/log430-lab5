# K6 Stress Tests

This directory contains stress tests for the main application features using [k6](https://k6.io/).

## Setup

1. Install k6 from [https://k6.io/docs/get-started/installation/](https://k6.io/docs/get-started/installation/)
2. Ensure your application server is running locally (or update the BASE_URL in config.js)

## Available Tests

- **auth-test.js**: Tests user authentication (login) under load
- **product-test.js**: Tests product listing and detail views
- **cart-test.js**: Tests cart operations (requires authentication)

## Running Tests

### Windows

``` bash
run-k6-tests.bat
```

### Individual Tests

``` bash
k6 run server/tests/k6/auth-test.js
k6 run server/tests/k6/product-test.js
k6 run server/tests/k6/cart-test.js
```

## Test Configuration

You can adjust test parameters in each file:

- Number of virtual users (VUs)
- Test duration
- Thresholds for acceptable performance

The main configuration is in `config.js` where you can set the base URL and global thresholds.
