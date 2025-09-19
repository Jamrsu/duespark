# DueSpark E2E Testing

Comprehensive end-to-end testing suite for DueSpark using Playwright.

## 🚀 Quick Start

```bash
# Install dependencies and browsers
npm run e2e:install

# Run smoke tests (quick validation)
npm run e2e:smoke

# Run complete happy path test
npm run e2e:happy-path

# Run all E2E tests
npm run e2e

# Run with UI (debugging)
npm run e2e:ui
```

## 📋 Test Coverage

### Happy Path Test (`happy-path.spec.ts`)
The complete user journey from registration to payment completion:

1. **User Registration** - Create new account with email verification
2. **Email Verification** - Mock email link verification
3. **Dashboard Login** - Access authenticated dashboard
4. **Stripe Integration** - Connect Stripe account (mocked OAuth)
5. **Invoice Import** - Import sample invoices from Stripe
6. **Reminder Creation** - Create and schedule payment reminders
7. **Email Preview** - Preview reminder templates
8. **Time Advancement** - Simulate scheduler running over time
9. **Webhook Processing** - Handle email delivery/engagement webhooks
10. **Payment Processing** - Mark invoices as paid
11. **Analytics Verification** - Confirm metrics updates

### Additional Test Suites

- **Authentication Flow** (`auth.spec.ts`) - Login, registration, password reset
- **Critical Flows** (`critical-flows.spec.ts`) - Core business functionality
- **Mobile Navigation** (`mobile-navigation.spec.ts`) - Mobile-responsive testing
- **Form Workflows** (`form-workflows.spec.ts`) - Form validation and submission
- **Client Management** (`client-list-features.spec.ts`) - Client CRUD operations

## 🏗️ Architecture

```
e2e/
├── fixtures/           # Test data and sample data
│   ├── users.ts       # User accounts and registration data
│   ├── invoices.ts    # Invoice and client test data
│   └── reminders.ts   # Email templates and reminder data
├── utils/             # Test utilities and helpers
│   ├── api-mocks.ts   # API endpoint mocking
│   ├── time-utils.ts  # Time manipulation utilities
│   └── test-helpers.ts # Common test operations
├── scripts/           # CI/CD and automation scripts
│   └── ci-commands.sh # Main test automation script
├── happy-path.spec.ts # Main E2E user journey test
├── auth.setup.ts      # Authentication setup for other tests
└── playwright.config.ts # Playwright configuration
```

## 🔧 Configuration

### Environment Variables

```bash
# Frontend URL (default: http://localhost:5173)
FRONTEND_URL=http://localhost:5173

# Backend URL (default: http://localhost:8000)
BACKEND_URL=http://localhost:8000

# Skip service startup (for CI)
SKIP_BACKEND_START=true
SKIP_FRONTEND_START=true

# Test retry count (default: 2)
RETRY_COUNT=3
```

### Playwright Configuration

The `playwright.config.ts` includes:

- **Multi-browser testing** (Chromium, Mobile Chrome, Mobile Safari)
- **Authentication state** persistence
- **Web server** integration
- **Parallel execution** configuration
- **CI-specific** settings

## 🎯 Test Strategies

### API Mocking

All backend APIs are mocked for reliability:

```typescript
import { ApiMocker } from './utils/api-mocks'

const apiMocker = new ApiMocker(page)
await apiMocker.mockAllEndpoints()
```

### Time Manipulation

Time advancement for scheduler testing:

```typescript
import { TimeController } from './utils/time-utils'

const timeController = new TimeController(page)
await timeController.setSystemTime(new Date('2024-02-15T10:00:00Z'))
```

### Test Helpers

Common operations abstracted:

```typescript
import { TestHelpers } from './utils/test-helpers'

const helpers = new TestHelpers(page)
await helpers.registerUser(testData.validUser)
await helpers.createInvoice(invoiceData)
```

## 🏃‍♂️ Running Tests

### Local Development

```bash
# Start services and run tests
npm run e2e:ci

# Run specific test suites
npm run e2e:smoke        # Quick validation
npm run e2e:happy-path   # Main user journey
npm run e2e:critical     # Critical business flows
npm run e2e:mobile       # Mobile testing

# Debugging
npm run e2e:ui           # Interactive UI mode
npm run e2e:debug        # Step-by-step debugging
npm run e2e:headed       # Run with browser UI

# View results
npm run e2e:report       # Open HTML report
```

### CI/CD Integration

```bash
# Full CI test suite
./e2e/scripts/ci-commands.sh ci

# Docker-based testing
./e2e/scripts/ci-commands.sh docker

# Performance testing
./e2e/scripts/ci-commands.sh performance
```

### GitHub Actions

The GitHub Actions workflow (`.github/workflows/e2e-tests.yml`) includes:

- **Multi-browser testing** across Chromium
- **Test suite matrix** (smoke, happy-path, critical)
- **Performance testing** with Lighthouse
- **Mobile testing** on specific triggers
- **Automatic reporting** to GitHub Pages
- **Slack notifications** for failures

## 📊 Test Reports

### HTML Reports

Playwright generates comprehensive HTML reports with:

- Test execution timeline
- Screenshots and videos
- Network activity logs
- Console output
- Error traces

### CI Integration

- **GitHub Actions** comments on PRs with results
- **GitHub Pages** deployment for report hosting
- **Artifact uploads** for debugging
- **Slack notifications** for failures

## 🐳 Docker Testing

### Local Docker Testing

```bash
# Build test image
docker build -t duespark-e2e-tests -f e2e/Dockerfile .

# Run tests in container
docker run --rm duespark-e2e-tests

# Development mode with volume mounts
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  duespark-e2e-tests bash
```

### CI Docker Testing

```bash
npm run e2e:docker
```

## 🔍 Debugging

### Common Issues

1. **Flaky Tests**
   - Check network conditions
   - Verify API mock responses
   - Increase wait timeouts

2. **Time-based Failures**
   - Ensure time controller is properly set
   - Check scheduler simulation logic
   - Verify relative time calculations

3. **Authentication Issues**
   - Verify auth token generation
   - Check storage state persistence
   - Validate mock user data

### Debug Tools

```bash
# Interactive debugging
npm run e2e:debug

# Run with browser visible
npm run e2e:headed

# Generate trace files
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Automatic capture on failures:

- Screenshots: `test-results/`
- Videos: `test-results/`
- Traces: `test-results/`

## 📈 Performance Testing

### Lighthouse Integration

```bash
# Run performance tests
npm run e2e:performance

# CI performance testing (on schedule or [perf] commit)
```

Performance metrics tracked:
- First Contentful Paint
- Largest Contentful Paint
- Time to Interactive
- Cumulative Layout Shift

### Custom Performance Tests

```typescript
// In your tests
const metrics = await page.evaluate(() => {
  return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')))
})
```

## 🔐 Security Testing

### Authentication Testing

- JWT token validation
- Session persistence
- Role-based access control
- Password security requirements

### Data Protection

- Sensitive data masking
- SQL injection prevention
- XSS protection
- CSRF token validation

## 📱 Mobile Testing

### Responsive Design Testing

```typescript
// Mobile viewport testing
test.use({ viewport: { width: 375, height: 667 } })

// Touch target validation
const boundingBox = await element.boundingBox()
expect(boundingBox?.height).toBeGreaterThanOrEqual(44)
```

### Device-specific Testing

- Mobile Chrome
- Mobile Safari
- Tablet layouts
- Touch interactions

## 🚀 Continuous Integration

### GitHub Actions Integration

The E2E tests run on:
- **Push to main/develop** branches
- **Pull requests** to main/develop
- **Nightly schedule** at 2 AM UTC
- **Manual triggers** with workflow dispatch

### Test Matrix

```yaml
strategy:
  matrix:
    browser: [chromium]
    test-suite: [smoke, happy-path, critical]
```

### Parallel Execution

Tests run in parallel across:
- Different browsers
- Different test suites
- Different environments

## 📚 Best Practices

### Test Organization

1. **Page Object Model** - Encapsulate page interactions
2. **Fixtures** - Use consistent test data
3. **Utilities** - Share common operations
4. **Mocking** - Isolate frontend from backend changes

### Reliability

1. **Deterministic** - Use time control and mocking
2. **Independent** - Each test can run in isolation
3. **Idempotent** - Tests can be run multiple times
4. **Fast** - Optimized for quick feedback

### Maintainability

1. **Clear naming** - Descriptive test and function names
2. **Documentation** - Comment complex logic
3. **Modular** - Break down large tests
4. **Version control** - Track test changes with code

## 🤝 Contributing

### Adding New Tests

1. Create test file in appropriate category
2. Use existing fixtures and utilities
3. Follow naming conventions
4. Add to CI matrix if needed
5. Update documentation

### Updating Fixtures

1. Modify fixture files in `fixtures/`
2. Update dependent tests
3. Ensure backwards compatibility
4. Test with CI pipeline

### Mobile QA Cadence

- Leverage shared viewport and touch-target data in `fixtures/mobile.ts` for any mobile-first assertions.
- Run `./scripts/ci-commands.sh mobile` each week to cover `mobile-navigation.spec.ts` and the mobile flows embedded in `happy-path.spec.ts`.
- When backend response contracts change, refresh the fixture constants and rerun the mobile suite to guard against regressions.

### Extending Utilities

1. Add to appropriate utility file
2. Include TypeScript types
3. Write JSDoc comments
4. Add usage examples

## 📞 Support

For E2E testing issues:

1. Check existing test output and reports
2. Review debugging guide above
3. Check GitHub Actions logs
4. Create issue with:
   - Test failure details
   - Environment information
   - Steps to reproduce
   - Expected vs actual behavior

---

## 🎉 Success Metrics

When all tests pass, you'll have confidence that:

✅ **User registration and verification** works end-to-end
✅ **Stripe integration** connects and imports correctly
✅ **Reminder system** schedules and sends emails
✅ **Payment processing** updates invoice status
✅ **Analytics tracking** reflects user actions
✅ **Mobile experience** is fully functional
✅ **Performance** meets acceptable standards

The E2E test suite provides comprehensive validation of the entire DueSpark user experience!
