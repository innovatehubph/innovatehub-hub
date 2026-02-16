# Code Generation

The AI code generation system uses Claude AI to understand your requirements and generate complete, production-ready features.

## What Gets Generated

For each feature request, the AI produces:

- **React Page Component** — Full page with layout, data fetching, and UI
- **Route Registration** — Updates to App.tsx with new route
- **Navigation Item** — Sidebar link with appropriate icon
- **Back4App Schema** — Database class with fields (if needed)
- **Type Definitions** — TypeScript interfaces

## Generation Process

### 1. Source Analysis
The AI reads the entire dashboard source tree to understand:
- Existing components and patterns
- Current routes and navigation structure
- Available Parse SDK queries
- Tailwind CSS utility classes in use

### 2. Code Generation
Claude AI generates code following the established patterns:
- Uses `useParseQuery` hook for data fetching
- Uses `DataTable` component for lists
- Uses `StatCard` for metric displays
- Follows the dark theme color palette
- Includes loading and error states

### 3. Plan Output
Before writing code, the AI produces a plan showing:
- Files to create or modify
- New routes to add
- Navigation items to insert
- Database schemas to create

## Code Quality

Generated code includes:
- TypeScript type annotations
- Responsive design (mobile + desktop)
- Loading skeletons
- Error handling
- Proper Parse SDK usage with business filtering
