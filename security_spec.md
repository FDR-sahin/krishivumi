# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Verified Identity Invariant**: All writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Owner & Business Isolation Invariant**: Every operational, financial, and inventory document must carry an immutable `ownerId` matching `request.auth.uid` on creation, and `list` queries are strictly filtered by `resource.data.ownerId == request.auth.uid || isBootstrappedAdmin()` with zero `get()`/`exists()` calls inside `list`.
4. **Anti-Update-Gap Invariant**: Every `update` rule begins with `isValid[Entity](incoming())`, enforces `incoming().ownerId == existing().ownerId` and `incoming().createdAt == existing().createdAt`, validates `incoming().updatedAt == request.time`, and restricts modified keys via `affectedKeys().hasOnly(...)`.
5. **Financial Immutability Invariant**: Posted `journal_entries` and `audit_logs` cannot be deleted. `journal_entries` can only transition from `status == 'posted'` to `status == 'reversed'` (Terminal State Locking).

## 2. The "Dirty Dozen" Payloads

1. **Unverified Admin Email Spoof**: `{ "email": "sahinmiah1204@gmail.com", "email_verified": false }` attempting to read `/users/otherUser`.
2. **Shadow Field Injection on Business Create**: Adding `"isSuperVerified": true` to `/businesses/biz-1`.
3. **ID Poisoning Attack**: Creating `/businesses/invalid$id!with*spaces` or a 500-char ID.
4. **Self-Assigned Super Admin Escalation**: Regular user creating `/users/user-1` with `"role": "super_admin"`.
5. **Cross-Tenant Ownership Spoof**: User A creating `/journal_entries/je-1` with `"ownerId": "user-B"`.
6. **Timestamp Forgery**: Creating `/businesses/biz-1` with `"createdAt": "2020-01-01T00:00:00Z"` instead of `request.time`.
7. **Immortal Field Mutation**: Updating `/businesses/biz-1` to change `ownerId` or `createdAt`.
8. **Terminal State Bypass on Reversed Journal Entry**: Attempting to update a `journal_entries` document after its `status` is already `'reversed'`.
9. **Permanent Deletion of Posted Financial Ledger**: Calling `deleteDoc` on `/journal_entries/je-1`.
10. **Audit Log Tampering**: Calling `updateDoc` or `deleteDoc` on `/audit_logs/log-1`.
11. **Value Poisoning on Update**: Updating `name` on `/businesses/biz-1` with a 10,000-character string or numeric value.
12. **Blanket Unfiltered List Query**: Querying `/journal_entries` without filtering by `ownerId == request.auth.uid` as a non-admin user.
