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
- [ ] Implement admin-only access for config and test data paths
- [ ] Enable and test collections rules with {env}/data prefix
- [ ] Enable and test items rules with {env}/data prefix

## Coding Guidelines
- TypeScript for all new code
- Functional components with hooks in React
- Follow existing project structure and naming conventions
- Firestore API abstraction layer in `src/api/firestore/`
- In Firestore API logging, do not duplicate document or collection refs just for logging. Use `path` and `segmentPaths` in the context, and only include `requestPayload` when it is the actual data or query object passed to Firebase.

## Notes
Last updated: {{DATE}}
