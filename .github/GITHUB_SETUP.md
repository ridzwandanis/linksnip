# GitHub Repository Setup Guide

This guide will help you prepare your LinkSnip repository for GitHub.

## Before Pushing to GitHub

### 1. ✅ Update Repository URLs (DONE!)

All repository URLs have been updated to use your GitHub username: `ridzwandanis`

### 2. Add Screenshots

Replace the placeholder image in `README.md` with actual screenshots:

1. Take screenshots of your application
2. Add them to a `docs/images/` folder or use GitHub's issue attachment feature
3. Update the image URL in README.md

Recommended screenshots:

- Main page (URL shortening interface)
- Analytics dashboard
- URL management page

### 3. Review and Update

Check these files and update as needed:

- [ ] `README.md` - Update demo URL, add your contact info
- [ ] `LICENSE` - Update copyright year and name if needed
- [ ] `CONTRIBUTING.md` - Add your contact information
- [ ] `SECURITY.md` - Add security contact email
- [ ] `.github/FUNDING.yml` - Add your sponsorship links (optional)

### 4. Test Locally

Before pushing, ensure everything works:

```bash
# Test with Docker
docker-compose up -d
# Visit http://localhost and test all features

# Run backend tests
cd backend && npm test

# Check for any hardcoded secrets
git grep -i "password\|secret\|key" | grep -v ".example\|README\|test"
```

### 5. Initialize Git (if not already done)

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: LinkSnip URL Shortener v1.0.0"

# Add remote
git remote add origin https://github.com/ridzwandanis/linksnip.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## After Pushing to GitHub

### 1. Repository Settings

Go to your repository settings and configure:

#### General

- [ ] Add description: "A minimalist, self-hosted URL shortening service with analytics"
- [ ] Add website URL (if deployed)
- [ ] Add topics: `url-shortener`, `nodejs`, `express`, `mongodb`, `react`, `docker`, `analytics`

#### Features

- [ ] Enable Issues
- [ ] Enable Discussions (optional)
- [ ] Enable Wiki (optional)

#### Security

- [ ] Enable Dependabot alerts
- [ ] Enable Dependabot security updates
- [ ] Enable Secret scanning (if available)

### 2. Create Releases

Create your first release:

1. Go to "Releases" → "Create a new release"
2. Tag: `v1.0.0`
3. Title: `LinkSnip v1.0.0 - Initial Release`
4. Description: Copy from CHANGELOG.md
5. Publish release

### 3. Add Repository Badges

Update README.md with actual badges:

```markdown
[![GitHub release](https://img.shields.io/github/release/ridzwandanis/linksnip.svg)](https://github.com/ridzwandanis/linksnip/releases)
[![GitHub issues](https://img.shields.io/github/issues/ridzwandanis/linksnip.svg)](https://github.com/ridzwandanis/linksnip/issues)
[![GitHub stars](https://img.shields.io/github/stars/ridzwandanis/linksnip.svg)](https://github.com/ridzwandanis/linksnip/stargazers)
```

### 4. Set Up GitHub Actions (Optional)

The repository includes a Docker build workflow. To enable it:

1. Go to "Actions" tab
2. Enable workflows
3. The workflow will run on every push and PR

### 5. Configure Branch Protection (Recommended)

For the `main` branch:

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - [ ] Require pull request reviews before merging
   - [ ] Require status checks to pass before merging
   - [ ] Require branches to be up to date before merging

### 6. Add Social Preview

1. Go to Settings → General
2. Scroll to "Social preview"
3. Upload an image (1280x640px recommended)

## Promoting Your Project

### 1. Write a Good README

Your README should include:

- Clear description
- Screenshots/GIF demos
- Quick start guide
- Feature list
- Documentation links

### 2. Share Your Project

Consider sharing on:

- Reddit: r/selfhosted, r/opensource
- Hacker News
- Product Hunt
- Dev.to
- Twitter/X
- LinkedIn

### 3. Add to Awesome Lists

Search for relevant "awesome" lists on GitHub:

- awesome-selfhosted
- awesome-nodejs
- awesome-docker

### 4. Documentation

Consider adding:

- GitHub Wiki for detailed documentation
- GitHub Pages for a project website
- Video tutorial or demo

## Maintenance

### Regular Tasks

- [ ] Respond to issues within 48 hours
- [ ] Review and merge pull requests
- [ ] Update dependencies monthly
- [ ] Release new versions following semantic versioning
- [ ] Update CHANGELOG.md for each release
- [ ] Monitor security advisories

### Version Numbering

Follow Semantic Versioning (semver):

- MAJOR version: Breaking changes
- MINOR version: New features (backward compatible)
- PATCH version: Bug fixes (backward compatible)

Example: `1.2.3` = Major.Minor.Patch

## Getting Help

If you need help with GitHub:

- [GitHub Docs](https://docs.github.com/)
- [GitHub Community](https://github.community/)
- [GitHub Skills](https://skills.github.com/)

## Checklist Summary

Before going public:

- [ ] All placeholder text replaced
- [ ] Screenshots added
- [ ] Tests passing
- [ ] No secrets in code
- [ ] Documentation complete
- [ ] License file present
- [ ] Contributing guidelines clear
- [ ] Security policy defined
- [ ] Repository settings configured
- [ ] First release created

Good luck with your open source project! 🚀
