# Registration-only fix

## Findings and root-cause limits

The production form already awaited `POST /api/auth/register` and already built the four correct request fields. There was no production mock registration implementation. However, the helper trusted every Axios-successful response without checking status or response identity, and the automatic-login failure branch redirected to Login with an unconditional account-created flag. That combination allowed an unexpected 2xx response to reach the account-created confirmation path without a confirmed registration receipt.

The previous browser verification script also contained an intercepted synthetic 201 response to test the login-failure fallback. That simulated-success case has been removed. It ran only inside its Playwright test context; there is no evidence that it affected the user's ordinary browser.

The reported missing PostgreSQL account could not be reproduced on the current application. A read-only query confirmed that the earlier automated account `temporary.registration.1791284901745@example.com` still exists as user #4. Thus the exact cause of the user's original missing-account incident remains unconfirmed; the identified false-confirmation path was fixed and tested explicitly.

## Exact fix

- Registration API serializes an explicit allowlist: `first_name`, `last_name`, `email`, `password`. Confirmation and role cannot leak through additional caller properties.
- It requires **HTTP 201** and a valid response containing a positive user ID, matching normalized email and trimmed names, EMPLOYEE role, and valid created/updated timestamps. Unexpected 2xx/HTML/empty responses fail instead of starting login.
- Only after that receipt does the page immediately call the existing AuthContext `login` with the same email/password. Existing sessionStorage JWT and context handling remain intact.
- Registration errors remain on `/register`; no login, redirect or local user is created.
- If confirmed registration succeeds but real login fails, the page stays on `/register` with a clear sign-in failure message and its existing Sign in link.
- Removed the old route-state-driven account-created banner on Login.
- Password and confirmation fields are cleared after the submitted sequence finishes; no passwords or JWTs are stored in test artifacts.
- Duplicate and network errors retain the exact requested friendly messages.

## Files modified

- `src/api/auth.ts`
- `src/pages/register-page.tsx`
- `src/pages/login-page.tsx` (removes only the obsolete registration confirmation)
- `.local-tools/registration-smoke.mjs` (removes simulated registration success)
- `REGISTRATION.md` (links to the revised behavior)
- Production artifacts regenerated under `dist/`.

Created verification support: `.local-tools/registration-fix-real.mjs`, `.local-tools/read-backend-console.ps1`, `test-results/registration-fix-verification.json`, `test-results/registration-backend-access.log`, and this report.

FastAPI and all application modules outside authentication were unchanged. Existing users were not altered or deleted.

## Real browser verification

Used the **actual running frontend** at `http://127.0.0.1:5173`, backed by `http://127.0.0.1:8000`. Exactly one unique account was created through its `/register` form, with no successful-response interception:

- Email: **temporary.registration.fix.1791319266025@example.com**
- ID: **7**
- Role: **EMPLOYEE**
- Name: **Temporary RegistrationFix**

Verified:

1. Browser `POST /api/auth/register` returned **201**, carrying exactly the four requested fields.
2. Real `POST /api/auth/login` followed and returned **200**.
3. JWT existed in sessionStorage, not localStorage; AuthContext displayed the newly created user and redirected to Dashboard.
4. Direct real `/api/auth/me` returned **200** and the same user ID/email/EMPLOYEE role.
5. A read-only PostgreSQL SELECT using the existing database configuration independently confirmed user #7 persisted.
6. Sign out cleared the JWT. The same new credentials signed back in through the actual Login page, returning **200** and Dashboard.
7. Reload restored the session through real `/api/auth/me` **200**.
8. Duplicate registration returned real **409**, stayed on Register with the exact friendly message, cleared both password fields, and did not log in.
9. Failure-only intercepted HTML 200, empty 201 and network failure responses stayed on Register, displayed the requested connection error, cleared passwords, and made no login requests. These tests never simulated successful account creation.
10. No unexpected browser errors.

The console reader captured actual existing Uvicorn access-log lines for login **200**, `/me` **200** and duplicate registration **409**. The initial registration **201** line had already scrolled out of the console's available screen buffer before capture. Its 201 response was recorded directly from the unmocked browser request and persistence was independently confirmed in PostgreSQL; the captured log artifact does not claim to contain that initial line.

The temporary password was generated only in the test process's memory and was not recorded. No second account was created to recover a log line.

## Checks

TypeScript/typecheck, ESLint and production build passed. Vite retains the existing non-blocking main-chunk size advisory. No later-stage work was performed.
