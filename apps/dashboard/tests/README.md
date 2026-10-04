# Tests

This directory contains integration and contract tests for the Agent Ops Dashboard.

## Structure

- **integration/** - Integration tests for critical paths and error handling
  - `critical-path.test.ts` - Core user journey tests (agents, pipelines, alerts)
  - `error-handling.test.ts` - Error resilience and validation tests

- **contract/** - API contract tests to prevent breaking changes
  - `integrations.test.ts` - API response structure verification

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run tests/integration/critical-path.test.ts
```

## Test Categories

### Critical Path Tests
Verify core user journeys work end-to-end:
- Agent status dashboard
- Pipeline run history
- Alert system

### Error Handling Tests
Verify the system handles errors gracefully:
- Invalid endpoints (404)
- Malformed parameters
- Missing environment variables
- Data validation

### Contract Tests
Verify API boundaries remain stable:
- Response structure consistency
- Required fields presence
- Type correctness
- GitHub integration mapping

## Test Infrastructure

- **Framework:** Vitest
- **React Testing:** @testing-library/react
- **Environment:** jsdom
- **Setup:** tests/setup.ts

## Notes

The integration e2e tests probe `/api/health` on a running Next.js server and skip themselves when none is reachable, so `npm test` passes without one but then does not exercise them. To run them, start the dev server:
```bash
npm run dev
```

Then run tests in another terminal:
```bash
npm test
```

The server is expected at `http://localhost:3000`. Set `E2E_BASE_URL` to point the tests at a different base URL (see `tests/integration/_e2e-helpers.ts`):
```bash
E2E_BASE_URL=http://localhost:3100 npm test
```

For MVP, these tests provide basic coverage. Expand as needed for production.
