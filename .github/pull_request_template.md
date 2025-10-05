# Pull Request

## 📋 Summary
<!-- Brief description of the changes -->

## 🔄 Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Code refactoring (no functional changes)
- [ ] 🎨 UI/UX improvements
- [ ] ⚡ Performance improvements
- [ ] 🔒 Security improvements

## 🧪 Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] OCR functionality tested (if applicable)
- [ ] Mobile testing completed (if UI changes)
- [ ] Guest user flow tested
- [ ] Registered user flow tested
- [ ] Error scenarios tested

## ✅ Pre-merge Checklist
- [ ] Self-review completed
- [ ] Code follows project conventions
- [ ] No hardcoded secrets or API keys
- [ ] Error handling implemented where needed
- [ ] Loading states added for async operations
- [ ] Mobile responsive (if UI changes)
- [ ] Accessibility considered
- [ ] Performance impact assessed
- [ ] Documentation updated (if needed)

## 🔍 CarPlate-Specific Checks
- [ ] Plate normalization working correctly (uppercase, trimmed)
- [ ] Message validation in place
- [ ] Trust score logic preserved
- [ ] User permission levels respected (guest vs registered)
- [ ] API rate limiting considered
- [ ] Database queries optimized
- [ ] PlateRecognizer API integration intact (if applicable)

## 📱 Testing Environments
- [ ] Local development environment
- [ ] Chrome/Safari/Firefox tested
- [ ] Mobile browsers tested
- [ ] API endpoints tested with Postman/curl

## 📸 Screenshots (if applicable)
<!-- Add before/after screenshots for UI changes -->

## 📝 Additional Notes
<!-- Any additional context, concerns, or notes for reviewers -->

## 🔗 Related Issues
<!-- Link to related issues, e.g., "Closes #123" or "Related to #456" -->

---

**Review Guidelines:**
- Focus on security, especially for API endpoints
- Verify error handling is comprehensive
- Check mobile responsiveness for UI changes
- Ensure no performance regressions
- Validate that user flows work end-to-end