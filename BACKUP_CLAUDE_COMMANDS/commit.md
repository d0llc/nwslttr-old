---
allowed-tools: ["mcp__git__git_status", "mcp__git__git_diff", "mcp__git__git_add", "mcp__git__git_commit", "Bash"]
description: Create conventional commit with validation
---

# Commit: $ARGUMENTS

Create a properly formatted conventional commit after validation.

## Pre-commit Checks

### 1. Code Quality Checks
Run these checks first (using pnpm in monorepo):
- `pnpm run lint` - ESLint with autofix
- `pnpm run format` - Prettier formatting
- `pnpm run typecheck` - TypeScript compilation
- Search for console.log and debugger statements
- Verify no TODO comments being committed

### 2. Analyze Changes
Review what's being committed:
- List all modified files
- Understand the primary change
- Identify if this is a breaking change
- Check for files that shouldn't be committed

## Commit Message Generation

### 3. Determine Commit Type
Based on changes, select appropriate type:
- `feat`: New feature added
- `fix`: Bug fix
- `refactor`: Code restructuring (no behavior change)
- `perf`: Performance improvement
- `docs`: Documentation only
- `test`: Test additions or changes
- `chore`: Maintenance tasks
- `style`: Code formatting only

### 4. Format Message
Structure: `type(scope): description`

Rules:
- Use imperative mood ("add" not "added")
- No period at end of subject
- Subject under 72 characters
- Scope based on changed files
- Add ! for breaking changes

### 5. Execute Commit
- Stage appropriate files
- Create commit with generated message
- Include issue references if applicable
- Push to current branch

## Output Format

Display:
1. Files being committed
2. Generated commit message
3. Confirmation of push success
4. Next steps (create PR, update docs, etc.)

## Example
For adding error handling to auth module:
```
fix(auth): handle undefined user gracefully

- Add null check before accessing user properties
- Return early with appropriate error message
- Prevent crash reported in production

Closes #156
```

## Session Continuity
If you need to return to this commit later:
- Use `claude -c` to continue where you left off
- Previous analysis and commit message preserved