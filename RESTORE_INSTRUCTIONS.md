# Claude Configuration Restore Instructions

After resetting your laptop, follow these steps to restore your Claude configuration:

## 1. Clone the backup repository
```bash
git clone https://github.com/d0llc/nwslttr-old.git
cd nwslttr-old
git checkout develop
```

## 2. Restore Claude configuration directory
```bash
# Create Claude config directory
mkdir -p ~/.claude/agents
mkdir -p ~/.claude/commands

# Copy global CLAUDE.md
# Extract the content from BACKUP_CLAUDE_CONFIG.md between "## Global CLAUDE.md" and "## Project CLAUDE.md"
# and save it as ~/.claude/CLAUDE.md

# Copy agent files
cp .claude/agents/* ~/.claude/agents/

# Copy custom commands
cp BACKUP_CLAUDE_COMMANDS/* ~/.claude/commands/

# Copy settings
cp BACKUP_CLAUDE_SETTINGS.json ~/.claude/settings.json
```

## 3. Restore environment files
```bash
# Copy environment files to project root
cp .env.local .
cp .env.production .
```

## 4. Install dependencies
```bash
# Install pnpm if needed
npm install -g pnpm

# Install project dependencies
pnpm install
```

## 5. Files backed up in this repository:
- **BACKUP_CLAUDE_CONFIG.md** - Contains all CLAUDE.md files and agent definitions
- **BACKUP_CLAUDE_COMMANDS/** - All custom Claude commands
- **BACKUP_CLAUDE_SETTINGS.json** - Claude settings
- **.env.local** - Local development environment variables
- **.env.production** - Production environment variables
- **.claude/agents/** - Agent configuration files
- All other project files including build artifacts

## 6. Additional notes:
- The project CLAUDE.md is already in the repo root
- All agent markdown files are in .claude/agents/
- Your global ~/.claude/CLAUDE.md content is preserved in BACKUP_CLAUDE_CONFIG.md