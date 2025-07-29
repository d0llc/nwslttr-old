---
allowed-tools: ["Grep", "Read", "mcp__git__git_log", "mcp__ide__getDiagnostics", "Task"]
description: Create detailed map of code area dependencies and structure
---

# Map: $ARGUMENTS

Generate a comprehensive map of the specified code area.

## Mapping Dimensions

### 1. File Structure
Map the physical organization:
- All files in the specified area
- Folder hierarchy and organization
- File sizes and complexity indicators
- Related test files

### 2. Dependency Analysis
Trace relationships:
- **Imports**: What this area imports
- **Importers**: What imports this area
- **External deps**: npm packages used
- **Circular deps**: Any circular dependencies

### 3. Key Components
Identify critical elements:
- Main entry points
- Core functions/classes
- Exported interfaces
- Constants and configuration

### 4. Data Flow
Track how data moves:
- Input sources (user input, API, storage)
- Transformations applied
- Output destinations
- Side effects triggered

### 5. Recent Activity
Show current development:
- Last 10 commits touching area
- Active branches with changes
- Open PRs affecting this code
- Related GitHub issues

### 6. Integration Points
Map connections:
- Chrome APIs used
- Message passing endpoints
- Storage keys accessed
- External API calls

## Output Format

Present as structured map:
```
📁 Area: [name]
├── 📄 Core Files (X files, Y lines)
├── 🔗 Dependencies (X internal, Y external)
├── 📊 Usage (imported by X files)
├── 🔄 Recent Activity (X commits this week)
└── ⚡ Key Functions
    ├── entryPoint() - main function
    ├── processData() - transforms input
    └── handleError() - error boundary
```

Include visual representation if helpful.

## Verbosity Levels
- Standard: Core structure and key relationships
- With `--verbose`: Include all file details, full dependency chains
- Piped output: Machine-readable format for further processing

## Example
Mapping "tooltip" would show:
- tooltip.ts and related UI files
- Dependencies on React, DOM APIs
- Usage by main.ts and widget.ts
- Recent fixes for positioning bugs
- Key functions like show(), hide(), position()