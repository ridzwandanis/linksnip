# Contributing to LinkSnip

Thank you for your interest in contributing to LinkSnip! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:

- A clear description of the problem
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (OS, Node.js version, etc.)

### Suggesting Features

We love new ideas! Please create an issue with:

- A clear description of the feature
- Why it would be useful
- Any implementation ideas you have

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** with clear, descriptive commits
3. **Test your changes** thoroughly
4. **Update documentation** if needed
5. **Submit a pull request** with a clear description

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/linksnip.git
cd linksnip

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start development servers
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Code Style

- Follow the existing code style
- Use ESLint and Prettier configurations provided
- Write clear, self-documenting code
- Add comments for complex logic

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Run `npm test` in backend directory

### Commit Messages

Use clear, descriptive commit messages:

- `feat: add custom URL validation`
- `fix: resolve redirect loop issue`
- `docs: update API documentation`
- `test: add analytics service tests`

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing opinions

## Questions?

Feel free to open an issue for any questions about contributing!
