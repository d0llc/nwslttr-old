---
allowed-tools: ["Grep", "Read", "mcp__git__git_log", "mcp__ide__getDiagnostics", "Bash"]
description: Find and remove dead code, duplicates, and technical debt
---

# Cleanup: $ARGUMENTS

Identify and clean up technical debt, dead code, and redundancies in the codebase.

## Extended Thinking
For large-scale cleanup, request extended thinking:
"Think through the implications of removing $ARGUMENTS"

## Analysis Phase

### 1. Dead Code Detection
Identify unused elements:
- Functions never called
- Variables never read
- Imports never used
- Commented out code blocks
- Feature flags that are always on/off

### 2. Duplicate Pattern Search
Find repeated code:
- Similar function implementations
- Copy-pasted logic blocks
- Repeated constant definitions
- Similar error handling patterns
- Duplicate type definitions

### 3. Dependency Analysis
Check package health:
- Unused dependencies in package.json
- Multiple packages doing same thing
- Outdated packages with security issues
- Heavy dependencies for simple features
- Dev dependencies in production

### 4. Code Smell Detection
Identify problematic patterns:
- Files too large (>300 lines)
- Functions too complex (>50 lines)
- Deeply nested code (>4 levels)
- God objects doing too much
- Circular dependencies

### 5. Performance Bottlenecks
Find inefficiencies:
- Synchronous operations that could be async
- Unnecessary re-renders or recalculations
- Memory leaks or retained references
- Unoptimized loops or algorithms
- Missing caching opportunities

## Cleanup Strategy

### Safe Removal Process
1. Verify truly unused (not dynamically called)
2. Check git history for context
3. Run TypeScript check after removal
4. Update relevant documentation
5. Test affected features

### Refactoring Approach
- Extract common patterns to utilities
- Consolidate duplicate implementations
- Update all references systematically
- Maintain backward compatibility if needed

## Output Format

Present findings as:
1. **Critical**: Dead code safe to remove immediately
2. **Recommended**: Duplicates that should be consolidated
3. **Consider**: Improvements worth discussing
4. **Metrics**: Before/after impact on bundle size

Include specific file locations and line numbers.

## Example
Cleanup for "unused utils" would find:
- Functions in utils/ never imported
- Deprecated helpers still in codebase
- Test utilities in production code
- Duplicate string/array manipulations
- Old polyfills no longer needed