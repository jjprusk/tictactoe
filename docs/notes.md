# Notes

## Localhost client/server configuration

- For local development with Vite preview/static hosting, configure the client to point at the local API/server.
- Set the following environment variable for the client build/preview:

  - `VITE_SERVER_URL=http://localhost:3001`

- Ensure the server allows the client origin:

  - `CORS_ORIGIN=http://localhost:5173`

This allows all browser windows to connect to Socket.IO without relying on per-window localStorage overrides.

## Deployment follow-up

- On deployment, update envs to proper domains:
  - Client: `VITE_SERVER_URL=https://api.yourdomain.com`
  - Server: `CORS_ORIGIN=https://app.yourdomain.com`

# Implementation Notes

Use this file to record decisions, rationale, and important changes as the project evolves.

## How to use
- Add a new dated entry for each meaningful change or decision.
- Keep entries concise and link to related commits or PRs when possible.

## Entries

### [YYYY-MM-DD] Title
- Context:
- Decision:
- Implications:
- Links: (commit/PR/issue)

