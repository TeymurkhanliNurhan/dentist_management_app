# Jest Unit Testing Setup

This document describes the Jest unit testing setup for both frontend and backend.

## Backend Testing

The backend already has Jest configured with NestJS testing utilities.

### Running Backend Tests

```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:cov      # Run tests with coverage
```

### Test Structure

- Test files should be named `*.spec.ts` and placed next to the source files
- Example: `src/auth/auth.service.spec.ts` tests `src/auth/auth.service.ts`

### Example Test

See `backend/src/auth/auth.service.spec.ts` for a comprehensive example of:
- Mocking dependencies (repositories, services, Redis)
- Testing service methods
- Testing error cases

## Frontend Testing

Jest has been configured for the React frontend with React Testing Library.

### Running Frontend Tests

```bash
cd frontend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Test Structure

- Test files should be placed in `__tests__` directories or named `*.test.tsx`
- Example: `src/services/__tests__/api.test.ts` or `src/components/__tests__/Login.test.tsx`

### Configuration Files

- `frontend/jest.config.cjs` - Jest configuration
- `frontend/src/setupTests.ts` - Test setup and global mocks

### Example Tests

1. **Service Tests**: `frontend/src/services/__tests__/api.test.ts`
   - Tests API service methods
   - Mocks axios calls

2. **Component Tests**: `frontend/src/components/__tests__/Login.test.tsx`
   - Tests React components
   - Uses React Testing Library for DOM interactions

### Testing Utilities

- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - Additional DOM matchers
- `@testing-library/user-event` - User interaction simulation

## Writing Tests

### Frontend Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Backend Service Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

## Notes

- The backend has many existing test files that may need dependency mocking to pass
- Frontend tests require proper mocking of axios, React Router, and i18n
- Both test suites are configured to work with TypeScript





