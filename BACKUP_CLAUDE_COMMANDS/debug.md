---
allowed-tools: ["Read", "Grep", "mcp__git__git_log", "mcp__git__git_diff", "Bash", "mcp__sequential-thinking__sequentialthinking"]
description: Systematic debugging approach for finding root causes
---

# Debug: $ARGUMENTS

Systematically debug issues to find root causes and implement fixes.

## Extended Thinking
For complex bugs, engage extended thinking:
"Think through possible causes of $ARGUMENTS"

## Input Methods
- Direct: `/debug tooltip not showing`
- With context: `/debug auth fails after 5 minutes`
- With reproduction: Paste error messages or screenshots

## Debugging Phases

### 1. Problem Characterization
Understand the issue:
- **Symptoms**: What exactly happens?
- **Frequency**: Always, sometimes, or rarely?
- **Environment**: Dev, prod, specific browsers?
- **Regression**: When did it start? (check git log)
- **Scope**: One user or everyone?

### 2. Reproduction Strategy
Create reliable reproduction:
- Minimal steps to reproduce
- Required data/state setup
- Environmental requirements
- Edge cases that trigger it
- Cases where it does NOT occur

### 3. Hypothesis Generation
Possible root causes:
- Recent code changes (git diff analysis)
- Race conditions or timing issues
- State management problems
- External dependency changes
- Environment-specific issues
- Data validation failures

### 4. Investigation Techniques
Systematic exploration:
- **Code Archaeology**: When was this code last touched?
- **Data Flow Tracing**: Follow data from source to error
- **Binary Search**: Find commit that introduced bug
- **Logging Strategy**: Where to add debug logs
- **State Inspection**: What to monitor in DevTools

### 5. Root Cause Analysis
Identify the real problem:
- Surface symptom vs actual cause
- Why did existing tests not catch this?
- What assumptions were violated?
- Which safeguards were missing?

## Debugging Tools Setup

### Browser Debugging
```javascript
// Strategic console logs
console.log('[DEBUG] Function entry:', {args});
console.trace('[DEBUG] Call stack');
console.time('[DEBUG] Operation duration');

// Conditional breakpoints
if (unexpectedCondition) debugger;
```

### State Debugging
- Chrome DevTools for React components
- Network tab for API issues
- Performance profiler for slowness
- Memory profiler for leaks

## Fix Implementation

### Fix Strategy
1. **Minimal Fix**: Address immediate issue
2. **Root Fix**: Prevent recurrence
3. **Defensive Fix**: Add guards/validation
4. **Test Addition**: Prevent regression

### Verification Steps
- Reproduction no longer works
- No new issues introduced
- Performance unchanged
- Tests added for this case

## Output Format

Present findings as:
1. **Root Cause**: The actual problem
2. **Why It Happened**: Contributing factors
3. **Immediate Fix**: Stop the bleeding
4. **Proper Solution**: Long-term fix
5. **Prevention**: How to avoid similar issues

## Example
Debugging "tooltip shows stale data":
- Symptom: Old translation appears
- Cause: Race condition in async updates
- Fix: Cancel pending requests
- Prevention: Add request lifecycle management
- Test: Verify rapid hover behavior