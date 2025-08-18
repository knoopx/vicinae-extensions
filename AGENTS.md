# AGENTS.md

Mono-repo of Raycast extensions (https://developers.raycast.com/)

- LINUX ONLY SUPPORT, NO MAC/DARWIN SUPPORT

**Build, Lint, and Test:**

- `cd [extension-folder] && bun run build`
- `cd [extension-folder] && bunx ray lint --fix`

**Install Deps:**

- `cd [extension-folder] && bun add [--dev] [dep]`

## Code Style Guidelines

- **Imports:**
  - Use named imports.
  - Use ES module imports (not CommonJS require()).
  - Alphabetize imports and add newlines between groups (enforced by ESLint).
- **Formatting:**
  - Use Prettier for auto-formatting.
  - 2-space indentation, no semicolons (unless required).
- **Types:**
  - Use TypeScript strict mode.
  - Prefer explicit types and interfaces for objects, props, and state.
- **Naming Conventions:**
  - camelCase for variables/functions.
  - PascalCase for React components.
- **Error Handling:**
  - Use try/catch for async operations.
  - Show user feedback via Raycast `showToast` API.
- **General:**
  - Follow Raycast ESLint config and React Hooks best practices.
  - Keep code in `src/` directory.

## Data Structure Patterns

- **Raycast List.Dropdown**: Always include `value` prop for controlled components
