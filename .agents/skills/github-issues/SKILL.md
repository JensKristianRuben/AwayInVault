---
name: github-issues
description: Create GitHub issues using the github CLI (gh) tool
---

# GitHub Issues Skill

This skill allows the agent to create GitHub issues in the current repository using the GitHub CLI (`gh`).

## How to use this skill
Execute the helper script [create_issue.ps1](file:///C:/Users/Jensk/node-js-projects/login-form/.agents/skills/github-issues/scripts/create_issue.ps1) using the `run_command` tool.

### Command Example:
```powershell
powershell -ExecutionPolicy Bypass -File "C:/Users/Jensk/node-js-projects/login-form/.agents/skills/github-issues/scripts/create_issue.ps1" -Title "Issue Title" -Body "Issue description details." -Labels "bug,refactor"
```

### Pre-requisites
- The GitHub CLI (`gh`) must be installed on the system.
- The user must be authenticated (e.g. via running `gh auth login` in terminal).
