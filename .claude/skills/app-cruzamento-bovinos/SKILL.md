```markdown
# app-cruzamento-bovinos Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `app-cruzamento-bovinos` TypeScript codebase. It covers file organization, import/export styles, commit practices, and testing patterns, providing clear examples and actionable commands for efficient collaboration and code maintenance.

## Coding Conventions

### File Naming
- **Style:** Snake case
- **Example:**  
  ```plaintext
  animal_controller.ts
  cruzamento_service.ts
  ```

### Import Style
- **Relative imports are used throughout the codebase.**
- **Example:**
  ```typescript
  import AnimalController from './animal_controller';
  import { cruzarBovinos } from '../services/cruzamento_service';
  ```

### Export Style
- **Default exports are preferred.**
- **Example:**
  ```typescript
  // animal_controller.ts
  export default class AnimalController { ... }
  ```

### Commit Patterns
- **Type:** Freeform, no enforced prefix
- **Example:**  
  ```
  Adiciona lógica de cruzamento para bovinos leiteiros
  Corrige bug na validação de dados de entrada
  ```

## Workflows

### Add New Feature
**Trigger:** When implementing a new feature or module  
**Command:** `/add-feature`

1. Create a new file using snake_case naming.
2. Implement the feature using TypeScript.
3. Use relative imports for dependencies.
4. Export the main class or function as default.
5. Write corresponding tests in a `.test.ts` file.
6. Commit changes with a clear, descriptive message.

### Fix a Bug
**Trigger:** When resolving a bug in the codebase  
**Command:** `/fix-bug`

1. Locate the problematic code.
2. Apply the fix, maintaining code style conventions.
3. Update or add relevant tests.
4. Commit with a descriptive message explaining the fix.

### Run Tests
**Trigger:** To verify code correctness before merging or deploying  
**Command:** `/run-tests`

1. Identify all files matching `*.test.*`.
2. Run the test suite using the project's test runner (framework unknown; check project docs or package.json).
3. Review results and address any failures.

## Testing Patterns

- **Test files use the pattern:** `*.test.*`
- **Testing framework:** Not explicitly detected; check for configuration in project files.
- **Example test file:**  
  ```typescript
  // animal_controller.test.ts
  import AnimalController from './animal_controller';

  describe('AnimalController', () => {
    it('should create a new animal', () => {
      // test logic here
    });
  });
  ```

## Commands
| Command       | Purpose                                   |
|---------------|-------------------------------------------|
| /add-feature  | Scaffold and implement a new feature      |
| /fix-bug      | Apply and commit a bug fix                |
| /run-tests    | Execute all test files in the project     |
```