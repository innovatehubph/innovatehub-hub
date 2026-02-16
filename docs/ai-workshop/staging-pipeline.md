# Staging Pipeline

The staging pipeline ensures generated code is reviewed before reaching production.

## Pipeline Stages

### 1. Generate
- AI analyzes the prompt and current codebase
- Generates files, routes, and navigation updates
- Returns a plan and file previews

### 2. Stage
- Creates a git branch (`ai-staging-{timestamp}`)
- Writes generated files to the branch
- Runs the build to check for compilation errors
- Reports build success or failure

### 3. QA Review
- Sends generated code to Claude AI for expert review
- AI reviews for:
    - Code quality and best practices
    - Security vulnerabilities
    - Performance issues
    - Accessibility compliance
    - Consistency with existing patterns
- Returns a score (0-100) with specific issues and suggestions

### 4. Deploy to Production
- Merges staging branch to main
- Rebuilds the dashboard (`npm run build`)
- Deploys to Back4App (`b4a deploy`)
- Verifies deployment success

## Rollback

If something goes wrong after deployment:
- Click **Rollback** to discard the staging branch
- Previous production build remains intact
- No data is lost

## Force Deploy

If QA flags non-critical issues, you can **Force Deploy** to skip the QA gate and proceed directly to production.
