---
allowed-tools: ["mcp__Ref__ref_search_documentation", "mcp__ide__getDiagnostics", "Read", "Grep"]
description: Quality assurance validation for code and implementations
---

# QA: $ARGUMENTS

Run quality assurance checks on current code or implementation plan.

## Input Methods
- Direct: `/qa tooltip-performance`
- Piped: `git diff | claude -p "/qa performance"`
- Interactive: Paste code/screenshots during conversation

## Image Analysis Support
You can paste screenshots of:
- Console errors for debugging
- Network tab results for performance review
- UI rendering issues for visual validation
- Performance profiler results

## Review Checklist

### 1. Code Quality Validation
- Check TypeScript compilation status
- Verify naming conventions match codebase
- Ensure no magic numbers (use constants)
- Validate error handling patterns
- Check for console.log or debugger statements

### 2. Pattern Compliance
- Compare implementation with documented patterns
- Verify consistent use of existing utilities
- Check if similar code exists that should be reused
- Ensure follows project architecture

### 3. Best Practices Check
Search current documentation for:
- Is this pattern still recommended in 2025?
- Any deprecation warnings?
- Performance best practices being followed?
- Security guidelines being met?

### 4. Integration Points
- API contracts maintained?
- Message passing between components correct?
- State management follows established patterns?
- Side effects properly managed?

### 5. Specific Focus Areas
If additional context provided in $ARGUMENTS:
- Deep dive into mentioned concerns
- Extra validation on specified components
- Performance analysis if requested
- Security audit if needed

## Output Format

Report issues found as:
1. **Critical**: Must fix before proceeding
2. **Important**: Should address soon
3. **Suggestions**: Nice to have improvements

Include specific references to documentation or code examples.

## Example
QA for "tooltip performance" would check:
- Unnecessary re-renders in React components
- DOM manipulation efficiency
- Event listener cleanup
- Memory leak prevention
- Debouncing/throttling of events