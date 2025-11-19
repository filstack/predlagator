# Predlagator Project Cheat Sheet

This document provides a high-level overview of the `predlagator` project, its architecture, and key components. It is intended to help new developers quickly understand the project structure and how different parts of the system interact.

## Core Architecture: A Tale of Two Services

The `predlagator` project is not a single, monolithic application. It is composed of two distinct, decoupled services that work in tandem:

1.  **`telegram-sender-bot` (The Stateless Worker)**: A simple Node.js/Express API that acts as a wrapper around the GramJS Telegram library. Its only job is to receive an API request containing a message and a session string, and then send that message to Telegram. This service isolates the complexities of the Telegram protocol from the main application logic.

2.  **`backend` (The Stateful Brain)**: A more complex TypeScript/Express application that serves as the central hub for all business logic. It manages:
    *   User accounts
    *   Broadcast campaigns
    *   Message templates
    *   Channel lists
    *   All data is persisted in a Supabase (PostgreSQL) database.

### The Architectural Flow

1.  **User Interaction**: A user interacts with the `frontend` application to manage their broadcast campaigns.
2.  **Authentication**: To authorize the application to send messages on their behalf, the user goes through an interactive, multi-step authentication process via the `backend`'s API. This process involves providing their phone number, an SMS code, and a 2FA password.
3.  **Session Generation**: Upon successful authentication, the `backend` generates a `sessionString`. This string is the key that allows the `telegram-sender-bot` to send messages on the user's behalf.
4.  **Campaign Execution**: When a user starts a campaign, the `backend` creates jobs in a `pg-boss` job queue.
5.  **Worker Process**: A separate `worker` process dequeues these jobs.
6.  **Message Sending**: For each job, the `worker` makes an HTTP call to the `telegram-sender-bot` service, providing the appropriate `sessionString` and the message to be sent.

## Key Files and Locations

Here are some of the most important files and directories in the project:

### `telegram-sender-bot`

*   **`predlagator/package.json`**: Defines the `telegram-sender-bot` service and its dependencies (`express`, `telegram`).
*   **`predlagator/src/index.js`**: The implementation of the `telegram-sender-bot`. It exposes REST endpoints (`/send`, `/resolve`) that wrap GramJS functionality.

### `backend`

*   **`predlagator/backend/package.json`**: Defines the main backend application's dependencies, including `@supabase/supabase-js`, `pg-boss`, `express`, and `telegram`.
*   **`predlagator/backend/src/app.ts`**: The main Express application file for the backend. It sets up middleware and mounts the main API router.
*   **`predlagator/backend/src/api/index.ts`**: The master API router for the backend. It aggregates all the different resource routes (campaigns, channels, etc.).
*   **`predlagator/backend/src/api/auth-telegram.ts`**: **This is a critical file.** It implements the complex, multi-step interactive flow for a user to authorize the application with their Telegram account.
*   **`predlagator/backend/src/worker-server.ts`**: The entry point for the background worker process. This file is responsible for processing long-running jobs, like sending broadcast campaigns.

## Getting Started

To get started with the `predlagator` project, a new developer should:

1.  **Understand the Two-Service Architecture**: Recognize that the `backend` is for logic and state, while the `telegram-sender-bot` is a stateless worker for sending messages.
2.  **Study the Authentication Flow**: Pay close attention to `predlagator/backend/src/api/auth-telegram.ts` to understand how the application authenticates with Telegram.
3.  **Examine the Job Queue**: Look at the interaction between the `backend`'s job queue (`pg-boss` in `worker-server.ts`) and the `telegram-sender-bot`'s `/send` endpoint.

**Note**: This document provides a high-level overview. For a complete understanding, you will need to explore the `frontend` codebase, the `worker-server.ts` implementation, the `shared` directory types, and the database `migrations`.
