# Kebdao — implementation readiness review

Reviewed 2026-09-27 against local source only; no production or remote-host verification and no database connection.

## Scope and evidence

Goal: employees register their issued CSR code, branch reviewers verify ownership, and company-confirmed registrations determine rewards.
The supplied photos both display outlet ID 0394 and CSR ID 039401, with different QR artwork (LINE / Kebdao). QR payloads have not been decoded; artwork alone does not establish whether either URL is employee-specific.
Existing employee entity is User (prisma/schema.prisma:10), with internal id and employeeId. Station.code uses internal labels such as WKO/PAP/SPC in prisma/seed.ts; do not equate it to the provider outlet ID. No Campaign/Kebdao model was found in the schema.
Reuse existing login, dashboard, Permission/RolePermission, AuditLog and asset storage infrastructure; extend their rules explicitly for campaigns. Existing gas cashier scope helpers only restrict selected cashiers, so they cannot alone enforce all campaign reviewers being branch-scoped.

## Proposed corrections before implementation

- Add a campaign/outlet mapping to Station; store outlet and CSR IDs as strings to preserve leading zeros. Do not infer the CSR length or outlet-prefix rule from one example.
- Separate registration requests from approved code ownership so rejected or withdrawn typos do not permanently reserve someone else's code. Resolve conflicts without exposing the other employee's identity.
- Enforce one approved owner per campaign/code and one current approved code per employee at database level; handle simultaneous submissions and approval races in a transaction.
- Allow pending submissions to be corrected or withdrawn, preserve revision history, and require reviewer approval for changes after activation. Keep approver/time/reason and prevent self-approval.
- Phase one should prohibit reassigning an approved CSR code to another person within the same campaign, since aggregated provider reports may not distinguish prior and new owners. Replace with a new code and preserve history.
- Capture branch at assignment time, retain historical ownership, and enforce campaign-specific permissions plus branch scope on reads, approvals and evidence access. StoredAsset permissions currently use the owner's current branch and need campaign-aware handling for transfers.
- Start with CSR entry and card-photo evidence; multiple photos belong to the same registration. Camera QR decoding can follow later and must not block registration. Do not reject matching QR URLs globally until the actual payloads are understood.
- Preserve source report rows and import batches; define daily versus cumulative totals before importing. Preview matching, quarantine unknown codes, and make repeat imports idempotent. Corrections must be auditable.
- Store the applicable reward rate and exact monetary amount per result/settlement; changing campaign settings must not rewrite historical earnings. Do not automatically post campaign amounts to payroll before a payment workflow and duplicate-posting guard exist.

## Readiness

Local implementation of registration, verification, branch mapping and employee status display can start from these rules. Actual result import requires a sample company report; production availability requires schema/permissions deployment and end-to-end validation.
AGENTS.md requires explicit confirmation before commands connecting to production endpoint ep-delicate-sound-a1mi5n1t; prepare code and offline verification first.
Validation planned: leading-zero preservation; concurrent duplicate claims/approvals; rejected-code release; branch isolation and self-approval; historical ownership after transfer; evidence access/retention; repeated and cumulative report imports.
No application code/schema changed and no runtime tests executed during this review.


## Implemented locally — 2026-09-27

This section supersedes the earlier review-only readiness status.
- Employee page `/kebdao`: provider outlet ID from station mapping, CSR string entry, one/two card images, attestation, pending withdrawal and resubmission, replacement request while the previous approved code stays active, and history with reviewer/time.
- Reviewer page `/admin/kebdao`: station-scoped list and counts, status filtering, employees without a pending/active registration, approval, rejection with a required reason, and ADMIN/HR outlet mapping.
- One ongoing Kebdao registration program; no invented campaign dates, rate configuration, result import, signup count or payroll posting. New campaigns will need explicit scope before reusing codes.
- `KebdaoOutlet`, `KebdaoRegistration`, `KebdaoCodeOwner` added to schema; nullable unique pending-user/pending-code/active-user keys plus serializable transactions protect concurrent submissions and approvals. Historical CSR ownership remains reserved after replacement.
- `KEBDAO_CARD` uses existing image validation/storage with one/two attachments; requests atomically attach images and clear orphan expiry, reject images belonging to another user, and retain attached evidence. Generic delete denies this evidence; reviewer reads use the registration branch snapshot and freshly loaded account/permissions.
- Fresh account status and `kebdao.register/review/manage` permissions are checked on the server; all non-ADMIN/HR reviewers are scoped to their own branch and nobody can approve their own request. All writes retain audit records.
- Source: `src/app/api/kebdao/route.ts`, `src/lib/kebdao-{rules,server}.ts`, `src/components/kebdao/KebdaoPage.tsx`, existing asset APIs/helpers and employee/admin navigation.
- Validation: 38 tests passed across route, UI, pure rules and existing asset-access tests; TypeScript and scoped ESLint passed; generated Prisma client and SQL preview offline. UI tests use mocked fetch and database tests use mocked Prisma, so real database locking and browser/storage integration remain unverified.
- UI-test ledger: two initial failures occurred before submission because jsdom's synthetic file list leaves native required-file validity empty; asserted this condition and submitted the form event directly, after which both upload-success and upload-error paths passed without changing production form validation.
- Production is NOT updated and the feature is NOT deployed; see Runbook for the approval gate and deployment sequence.


### Production status — 2026-09-27 (supersedes earlier pending-schema notes)

User approved the disclosed production host; guarded schema push and permission setup succeeded, and read-only `scripts/verify-kebdao.cjs` confirmed three accessible empty Kebdao tables, the asset relation column, three unique registration indexes and all eight role grants. Application changes are still local and not deployed; outlet mapping and live browser/upload verification remain outstanding.


### Live release — 2026-09-27

Kebdao is deployed to https://timetrack-lake.vercel.app (production deployment `dpl_rPYKxz2WfLXqpXL1eE4vGYZ3y5Hd`, READY). Build including TypeScript and 195 static pages passed. Verified outlet 0394 is linked to WKO / วัชรเกียรติออยล์; other branches require their actual provider IDs.
Authenticated production browser checks passed for `/kebdao` (correct station/0394, CSR input, evidence chooser, attestation and history) and `/admin/kebdao` (review list, settings and status filters). Anonymous `/api/kebdao` returned HTTP 401. No real employee registration was submitted just to test, so full production upload/approval writes have not been exercised; 38 focused automated tests cover those behaviors with mocks. Source remains in this workspace; direct CLI deployment was used and no Git commit/push was made.


### UI polish verification — 2026-09-27
- Employee registration UI redesigned as a mobile-first red Kebdao campaign surface with explicit outlet/CSR status, three-step guidance, evidence upload affordance, active/pending states and readable history.
- Reviewer UI redesigned as an operational dashboard with queue statistics, status chips, outlet mapping, card-image previews and an isolated approval/rejection decision panel.
- Dashboard/menu entry points now visually match the feature instead of using plain bordered links. Accessible names were added for CSR and evidence file fields.
- Focused verification after redesign: 20 Kebdao tests passed, TypeScript passed, and scoped ESLint passed with zero warnings.
- Full Next build compiled and completed TypeScript, then failed during unrelated existing `/apply/status` prerender with a null `useState` error; Kebdao did not produce a build/type error.
- This polish is local only until explicitly pushed/deployed.


### VGCloud station ID rule — 2026-09-27
- Kebdao `ID` is now derived from the same canonical station/site code used by VGCloud instead of a separately editable Kebdao outlet mapping.
- Mapping used by TimeTrack: WKO → VGCloud site `394` → display/store `0394`; PAP → `1204`; SPC → `656` → display/store `0656`.
- Codes stay as strings so leading zeroes are preserved. Employee submission is rejected if the client sends a stale/different station ID.
- Reviewer UI is read-only for station IDs and explicitly states that the value comes from VGCloud mapping; no Kebdao station-ID setup form remains.
- Focused verification after the change: 22/22 tests passed, TypeScript passed, and scoped ESLint passed.
