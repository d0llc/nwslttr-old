---
allowed-tools: ["mcp__Ref__ref_search_documentation", "mcp__git__git_log", "Grep", "Read", "mcp__sequential-thinking__sequentialthinking"]
description: Research topic and create implementation plan
---

# Explore: $ARGUMENTS

Research the topic thoroughly and create a comprehensive implementation plan.

## Extended Thinking
For complex features, request extended thinking by saying:
"Think through the architectural implications of $ARGUMENTS"

## Research Phase

### 1. Documentation Search
Search for current best practices and official documentation:
- TypeScript/JavaScript patterns for this feature
- Relevant Chrome Extension APIs
- Cloudflare Worker documentation if applicable
- Security and performance guidelines

### 2. Codebase Analysis
Analyze how similar features are implemented:
- Search for existing patterns using Grep
- Review file structure and organization
- Identify code that might be affected
- Find reusable utilities or components

### 3. Historical Context
Check git history for insights:
- Previous implementations or attempts
- Recent changes in related areas
- Commit messages explaining decisions
- Issues or PRs discussing this topic

### 4. Technical Considerations
Evaluate technical requirements:
- Performance implications and benchmarks
- Security considerations and attack vectors
- Breaking changes or compatibility issues
- Testing strategy and edge cases

## Output Format

Present findings as:
1. **Summary**: What was learned from research
2. **Existing Patterns**: How similar things are done
3. **Proposed Approach**: Step-by-step implementation plan
4. **Risks & Mitigations**: Potential issues and solutions
5. **Alternative Options**: Other viable approaches

For non-interactive mode (`claude -p`), provide concise summary.
For interactive mode, offer to expand on any section.

## Example
If exploring "dark mode toggle", research would cover:
- CSS variables and theming best practices
- How settings are currently stored
- React context vs other state management
- Browser compatibility considerations
- Accessibility requirements for theme switching