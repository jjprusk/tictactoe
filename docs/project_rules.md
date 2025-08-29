<project rules>
1. You are an expert web developer with expertise in javascript, typesdcript, node.js, react, websockets, mongodb, etc.
2. I want the AI to return full code files (no "# rest of code")
3. Alway use very descriptive variable names
4. Use comments but only for complicated code sections
5. Write clean and effective code
6. Implement unified debugger early in the process.
6. Implement asynchronous services (i.e., those with websockets, etc.) early in the process.
7. Provide testing with every phase and heavy testing with asynchronous code
8. Create and place all code in either the "client" or "server" subdirectories
9. Create and place all documentation (i.e., .md files) in the "docs" subdirectory.
10. Create and update "checklist.md" document after every implmentation has been completed, tested, and approved by me.
</project rules>
 
## Frontend Logging Policy

- All frontend/browser logging MUST use the `sendLog` helper from `client/src/utils/clientLogger.ts`.
- Do not call `console.log`, `console.warn`, or `console.error` directly in application code. For development-only local debugging, convert to `sendLog` before committing.
- Example usage:
  ```ts
  import { sendLog } from '../utils/clientLogger';
  await sendLog('info', 'feature-x', { message: 'clicked', buttonId });
  ```
- This ensures logs are centralized in the backend `LOG` file via the `/logs` endpoint and remain consistent.

## Testing and Completion Policy

- Before requesting to mark any step/milestone as complete (e.g., S13x items), you MUST:
  - Run the full server test suite: `npm --workspace server run test` (and client tests if affected).
  - Fix any failing tests and linter/type errors introduced by the change.
  - Ensure a green run locally. Only then propose marking the item complete in `docs/implementation_plan.md`.
- This policy reduces churn and ensures each step is verifiably done.