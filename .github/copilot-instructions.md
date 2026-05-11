# Copilot Instructions

This file tracks implementation requirements and coding guidelines for the retro-collections project.

## Project Overview
- **Frontend**: retro-collections-web (React + TypeScript + Vite)
- **Backend**: firebase-admin (Firebase/Firestore)
- **Stack**: React, TypeScript, Tailwind CSS, Firebase/Firestore

## Implementation Tasks

### Completed Tasks
- [x] Add delete collection button to MyCollectionsPage with confirmation dialog
- [x] Restructure MyCollectionsPage to 3-column layout (left: collections management, center: items content, right: auth panel)
- [x] Convert collection and item creation to use forms with Enter key support
- [x] Replace item action buttons with ItemActions component using icons

### Current Tasks
- None

## Coding Guidelines
- TypeScript for all new code
- Functional components with hooks in React
- Follow existing project structure and naming conventions
- Firestore API abstraction layer in `src/api/firestore/`

## Notes
Last updated: {{DATE}}
