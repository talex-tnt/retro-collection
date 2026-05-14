# Copilot Instructions

This file tracks implementation requirements and coding guidelines for the retro-collections project.

## Project Overview
- **Frontend**: retro-collections-web (React + TypeScript + Vite)
- **Backend**: firebase-admin (Firebase/Firestore)
- **Stack**: React, TypeScript, Tailwind CSS, Firebase/Firestore

## Implementation Tasks
-  Update this file with new implementation tasks as they arise, and mark them as completed when done. This will help maintain a clear record of what has been implemented and what is currently being worked on.

### Completed Tasks
- [x] Add delete collection button to MyCollectionsPage with confirmation dialog
- [x] Restructure MyCollectionsPage to 3-column layout (left: collections management, center: items content, right: auth panel)
- [x] Convert collection and item creation to use forms with Enter key support
- [x] Replace item action buttons with ItemActions component using icons
- [x] Add item counters next to collection names
- [x] Refactor MyCollectionsPage into separate components (CollectionsPanel, ItemsPanel)
- [x] Implement orphaned items feature: special non-deletable collection showing items with non-existent parent collectionId

### Current Tasks
- [x] Implement admin-only access for config and test data paths (4/7 tests)
  - ✅ Admin-only rules:
    - `match /main/config/{document=**}` - admin read/write only
    - `match /test/data/{document=**}` - admin read/write only
- [x] Implement dataFolder configuration and access control (7/7 tests passing on emulator & live)
  - ✅ Architecture:
    - Config stored at `/main/config/public/runtime` with `{dataFolder: 'default'}` value
    - Users can only write to `/main/data/{folder}/{resourceType}/docs/{document}` paths
    - Direct writes to `/main/data/{folder}/**` are blocked (requires nested resourceType)
  - ✅ Smoke test suite with 7 assertions:
    - Admin can write to test/data/rulesSmoke (admin-only test path)
    - Non-admin cannot write to test data
    - Admin can write to test/config/public/runtime
    - Non-admin cannot write to test config
    - User can write to matched dataFolder path
    - User cannot write to non-matched dataFolder (e.g., writing to `items` when `dataFolder='default'`)
    - Authenticated user can read data
- [ ] Implement resource type rules (collections, items, users) with validation
- [ ] Implement authorization rules for multi-user access patterns
- [ ] **NICKNAME FEATURE** — Add nickname support to users (Spark-compatible, Cloud Functions ready)
  - Current Plan (Spark, before plan upgrade):
    - [ ] Add `nickname` field to user public profile schema validation in rules
    - [ ] Require `nickname` when `visibility.public == true` on user public profiles
    - [ ] Create `nicknameIndex` collection rules at `/{env}/data/{folder}/public/nicknameIndex/{nickname}`
    - [ ] Rules: user can only read/write nicknameIndex docs if they contain their own userId
    - [ ] Client-side transaction: atomic update of user profile + nicknameIndex
    - [ ] Frontend: nickname UI component for users to set/change nickname
  - Future Plan (after upgrading to Blaze):
    - [ ] Create Cloud Function `setUserNickname` callable that validates uniqueness
    - [ ] Cloud Function: check if nickname already exists before transaction
    - [ ] Prevent users from creating multiple nicknames via direct Firebase writes
    - [ ] No data structure changes needed — function wraps existing transaction
- [ ] **ITEM LIMITS FEATURE** — Add max items per user limit (Cloud Functions required)
  - Blocked by: Firebase Blaze plan upgrade (Cloud Functions not available on Spark)
  - Implementation (future, Blaze only):
    - [ ] Create Cloud Function to count user's existing items before create/update
    - [ ] Enforce limit via function, return error if limit exceeded
    - [ ] Add `itemLimit` field to user config (default ~100 or configurable per user)
    - [ ] Log attempts to exceed limit for analytics

## Firestore Architecture

### User Types
- **Admin**: Can read/write anywhere (config, test data, any data path)
- **Common User**: Can read authenticated data, can only write to `/main/data/{folder}/{resourceType}/**` paths

### Path Structure
```
/main/config/{document=**}                  # Admin-only main configuration
/main/config/public/runtime                 # Config metadata: {dataFolder: 'default'}
/test/data/{document=**}                    # Admin-only test data
/main/data/{folder}/                        # Common users cannot write here (requires resourceType)
/main/data/{folder}/{resourceType}/docs/{docId}  # Common users can write here (only if folder matches dataFolder config)
```

### Database Hierarchy
- `main` / `test`: Static top-level environments (main for production, test for testing)
- `{folder}`: Configurable data folder from `/main/config/public/runtime.dataFolder` (currently 'default')
- `{resourceType}`: Resource type like collections, items, users - users can only write to matched resourceType paths
- `{docId}`: Individual document ID

### Rules Structure
- **Config rules** (`/main/config/**`): Admin-only read/write
- **Test data rules** (`/test/data/**`): Admin-only read/write (for testing admin isolation)
- **Direct folder write block** (`/main/data/{folder}/**`): Blocked for everyone - requires resourceType nesting
- **Resource type rules** (`/main/data/{folder}/{resourceType}/**`): 
  - Common users: can write only if `{folder}` matches `config.public/runtime.dataFolder`
  - Admins: can write anywhere
- **Future resource-specific rules**: Will validate each resourceType (collections, items, users) with field validation and ownership rules

## Coding Guidelines
- TypeScript for all new code
- Functional components with hooks in React
- Follow existing project structure and naming conventions
- Firestore API abstraction layer in `src/api/firestore/`
- In Firestore API logging, do not duplicate document or collection refs just for logging. Use `path` and `segmentPaths` in the context, and only include `requestPayload` when it is the actual data or query object passed to Firebase.

## Notes
- **2026-05-14**: Decided on Spark-compatible nickname implementation with future Cloud Function path. Using separate `nicknameIndex` collection + client-side transaction. This prevents data structure lock-in and allows easy migration to Cloud Functions when upgrading to Blaze plan. Item limits deferred until Blaze plan upgrade (requires Cloud Functions for server-side enforcement).

Last updated: 2026-05-14
