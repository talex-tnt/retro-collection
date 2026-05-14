# Pending Tasks & Future Work

This document tracks features that are planned, blocked, or pending implementation.

## NICKNAME FEATURE

### Current Status: Spark-compatible (Client-side transaction)

**Completed:**
- [x] Firestore rules updated to support nickname field in user profile
- [x] Firestore rules for `nicknameIndex` collection created

**Pending (Current Implementation - Spark):**
- [x] Add `nickname` field to user profile service layer
- [x] Implement client-side transaction for updating nickname + nicknameIndex atomically
- [x] Frontend: nickname input component for users to set/change nickname
- [x] Frontend: nickname display on user profiles
- [x] Error handling for duplicate nicknames (race condition warning to user)

**Future (After Blaze Plan Upgrade):**
- [ ] Create Cloud Function `setUserNickname` callable
- [ ] Cloud Function: validate nickname uniqueness by checking if nicknameIndex document exists
- [ ] Cloud Function: perform atomic transaction server-side
- [ ] Update client to call Cloud Function instead of direct Firestore transaction
- [ ] Remove race condition vulnerability

**Notes:**
- Data structure is designed to be compatible with Cloud Functions
- No schema changes needed when migrating to Blaze
- Client-side transaction accepts rare race conditions (acceptable for Spark)

---

## ITEM LIMITS FEATURE

### Current Status: Blocked (Requires Blaze Plan)

**Blocker:** Firebase Blaze plan required (Cloud Functions not available on Spark)

**Future Implementation (Blaze only):**
- [ ] Create Cloud Function `validateItemCreation` callable
- [ ] Cloud Function: count existing items for user before allowing write
- [ ] Add `itemLimit` field to user config (default ~100, configurable per user)
- [ ] Cloud Function: return error if user exceeds limit
- [ ] Frontend: display item count and limit to user
- [ ] Analytics: log attempts to exceed limit

**Notes:**
- Requires server-side validation (Cloud Functions)
- Cannot be enforced with Firestore Rules alone
- Deferred until plan upgrade decision is made

---

## Reference: Firestore Rules Updates

Latest rules changes support:
- `nickname` field in user public profile (optional, non-empty string)
- `nicknameIndex` collection at `/{env}/data/{folder}/public/nicknameIndex/{nickname}`
- Users can only manage their own nickname entries
- Full admin access

Last updated: 2026-05-14
