# Contributing to Interviews.tv

Thank you for your interest in contributing to Interviews.tv! This guide will help you get started with contributing to our platform.

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🚀 Getting Started

### Prerequisites
- Read the [Setup Guide](docs/SETUP.md) to get your development environment running
- Familiarize yourself with the [Architecture](docs/ARCHITECTURE.md)
- Review the [API Documentation](docs/api/README.md)

### Development Workflow

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/interviews-tv.git
   cd interviews-tv
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**
   ```bash
   # Run backend tests
   composer test
   
   # Run frontend tests
   npm test
   
   # Run linting
   composer run phpcs
   npm run lint
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new interview filtering feature"
   ```

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Coding Standards

### PHP Standards (PSR-12)

```php
<?php

namespace App\Services;

use App\Models\User;
use App\Exceptions\ValidationException;

class UserService
{
    private UserRepository $repository;
    
    public function __construct(UserRepository $repository)
    {
        $this->repository = $repository;
    }
    
    public function createUser(array $data): User
    {
        $this->validateUserData($data);
        
        return $this->repository->create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }
    
    private function validateUserData(array $data): void
    {
        if (empty($data['email'])) {
            throw new ValidationException('Email is required');
        }
        
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('Invalid email format');
        }
    }
}
```

### JavaScript/TypeScript Standards

```javascript
// Use ES6+ features
class ApiService {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getUser(userId) {
    try {
      const response = await fetch(`${this.baseUrl}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch user:', error);
      throw error;
    }
  }
}

// Use descriptive variable names
const userProfileData = await apiService.getUser(currentUserId);
const isUserAuthenticated = Boolean(authToken);
```

### CSS/SCSS Standards

```scss
// Use BEM methodology
.interview-card {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  &__title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  
  &__meta {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }
  
  &--featured {
    border: 2px solid var(--color-primary);
  }
}

// Use CSS custom properties
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

## 🧪 Testing Guidelines

### Backend Testing

#### Unit Tests
```php
<?php

namespace Tests\Unit\Services;

use PHPUnit\Framework\TestCase;
use App\Services\UserService;
use App\Repositories\UserRepository;
use App\Exceptions\ValidationException;

class UserServiceTest extends TestCase
{
    private UserService $userService;
    private UserRepository $userRepository;
    
    protected function setUp(): void
    {
        $this->userRepository = $this->createMock(UserRepository::class);
        $this->userService = new UserService($this->userRepository);
    }
    
    public function testCreateUserWithValidData(): void
    {
        $userData = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'SecurePass123!',
        ];
        
        $this->userRepository
            ->expects($this->once())
            ->method('create')
            ->willReturn(new User($userData));
        
        $user = $this->userService->createUser($userData);
        
        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('john@example.com', $user->email);
    }
    
    public function testCreateUserWithInvalidEmailThrowsException(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Invalid email format');
        
        $this->userService->createUser([
            'name' => 'John Doe',
            'email' => 'invalid-email',
            'password' => 'SecurePass123!',
        ]);
    }
}
```

#### Integration Tests
```php
<?php

namespace Tests\Integration\API;

use Tests\TestCase;
use App\Models\User;

class AuthenticationTest extends TestCase
{
    public function testUserCanRegister(): void
    {
        $userData = [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'SecurePass123!',
        ];
        
        $response = $this->postJson('/api/auth/register', $userData);
        
        $response->assertStatus(201)
                ->assertJsonStructure([
                    'success',
                    'user_id',
                    'verification_token',
                    'message',
                ]);
        
        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'name' => 'John Doe',
        ]);
    }
    
    public function testUserCanLogin(): void
    {
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'password' => password_hash('SecurePass123!', PASSWORD_DEFAULT),
        ]);
        
        $response = $this->postJson('/api/auth/login', [
            'email' => 'john@example.com',
            'password' => 'SecurePass123!',
        ]);
        
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'user',
                    'session',
                ]);
    }
}
```

### Frontend Testing

#### Component Tests
```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InterviewCard } from '../InterviewCard';

describe('InterviewCard', () => {
  const mockInterview = {
    id: 1,
    title: 'JavaScript Developer Interview',
    description: 'Comprehensive JS interview',
    user: { name: 'John Doe' },
    created_at: '2024-01-01T12:00:00Z',
  };

  test('renders interview information correctly', () => {
    render(<InterviewCard interview={mockInterview} />);
    
    expect(screen.getByText('JavaScript Developer Interview')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive JS interview')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('calls onLike when like button is clicked', async () => {
    const mockOnLike = jest.fn();
    render(<InterviewCard interview={mockInterview} onLike={mockOnLike} />);
    
    const likeButton = screen.getByRole('button', { name: /like/i });
    fireEvent.click(likeButton);
    
    await waitFor(() => {
      expect(mockOnLike).toHaveBeenCalledWith(mockInterview.id);
    });
  });
});
```

#### Service Tests
```javascript
import { ApiService } from '../services/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('ApiService', () => {
  let apiService;

  beforeEach(() => {
    apiService = new ApiService('https://api.test.com', 'test-token');
    fetch.mockClear();
  });

  test('getUser returns user data on success', async () => {
    const mockUser = { id: 1, name: 'John Doe' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const user = await apiService.getUser(1);

    expect(fetch).toHaveBeenCalledWith('https://api.test.com/users/1', {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });
    expect(user).toEqual(mockUser);
  });

  test('getUser throws error on HTTP error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(apiService.getUser(1)).rejects.toThrow('HTTP error! status: 404');
  });
});
```

## 📋 Pull Request Guidelines

### PR Title Format
Use conventional commit format:
- `feat: add user profile editing`
- `fix: resolve video upload timeout issue`
- `docs: update API documentation`
- `test: add integration tests for notifications`
- `refactor: improve database query performance`

### PR Description Template
```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process
1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Manual testing for UI changes
4. **Documentation**: Update docs for new features
5. **Security Review**: Security-sensitive changes require additional review

## 🐛 Bug Reports

### Bug Report Template
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 🏷️ Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority: high`: High priority issue
- `priority: medium`: Medium priority issue
- `priority: low`: Low priority issue

## 📞 Getting Help

- **Documentation**: Check [docs/](docs/) directory
- **Discord**: Join our [Discord community](https://discord.gg/interviews-tv)
- **GitHub Discussions**: Use [GitHub Discussions](https://github.com/interviews-tv/platform/discussions)
- **Email**: Contact us at dev-support@interviews.tv

## 🎉 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Annual contributor appreciation posts

Thank you for contributing to Interviews.tv! 🚀
