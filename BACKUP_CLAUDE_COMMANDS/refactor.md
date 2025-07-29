---
allowed-tools: ["mcp__Ref__ref_search_documentation", "Grep", "Read", "mcp__git__git_log", "mcp__sequential-thinking__sequentialthinking"]
description: Plan and execute safe code refactoring
---

# Refactor: $ARGUMENTS

Plan and execute safe refactoring of code while maintaining functionality.

## Extended Thinking
For complex refactoring, use extended thinking:
"Think through how to safely refactor $ARGUMENTS"

## Pre-Refactoring Analysis

### 1. Current State Assessment
Understand what exists:
- Map current implementation structure
- Identify all usages and dependencies
- Document current behavior/API
- Note existing tests coverage
- Check performance baseline

### 2. Pattern Research
Find best practices:
- Search documentation for recommended patterns
- Review how similar code is structured elsewhere
- Check for existing utilities to leverage
- Identify anti-patterns to avoid
- Consider framework conventions

### 3. Impact Analysis
Determine scope:
- **Direct impacts**: Files that must change
- **Indirect impacts**: Files that might break
- **API changes**: Public interfaces affected
- **Breaking changes**: What consumers must update
- **Performance impact**: Better or worse?

### 4. Risk Assessment
Identify dangers:
- Race condition potential
- State management complications
- Error handling edge cases
- Browser compatibility issues
- Memory leak possibilities

## Refactoring Strategy

### Safe Refactoring Steps
1. **Parallel Implementation**
   - Build new alongside old
   - Maintain old interface temporarily
   - Allow gradual migration

2. **Incremental Migration**
   - Change internal implementation first
   - Update consumers one by one
   - Maintain backward compatibility
   - Remove old code last

3. **Verification Points**
   - TypeScript compiles after each step
   - Existing tests still pass
   - No new console errors
   - Performance not degraded
   - Bundle size acceptable

### Common Refactoring Patterns
- **Extract Function**: Pull out reusable logic
- **Extract Component**: Separate UI concerns
- **Introduce Parameter Object**: Group related args
- **Replace Conditionals**: Use polymorphism/maps
- **Consolidate Duplication**: Create shared utilities

## Output Format

Present plan as:
1. **Current Problems**: Why refactoring needed
2. **Proposed Structure**: Target architecture
3. **Migration Steps**: Ordered safe changes
4. **Verification Plan**: How to ensure safety
5. **Rollback Strategy**: How to revert if needed

## Example
Refactoring "tooltip positioning" might involve:
- Extract position calculation to pure function
- Separate DOM manipulation from logic
- Create position strategy pattern
- Add comprehensive position tests
- Migrate callers incrementally