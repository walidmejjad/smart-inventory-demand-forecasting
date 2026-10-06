# Registration password value flow

## Confirmed defect

Before the fix, submit used `values.password` and `values.confirm_password` from React state. A browser/autofill update to the visible inputs without a React change event left those state values stale. A development-only probe reproduced a mismatch at the `registerAccount` boundary and stopped before making any registration request. This is a confirmed stale-state defect, rather than evidence of lowercasing, hashing, encoding, or special-character replacement. Whether this exact autofill path caused the previously reported account failure cannot be established retrospectively.

The old `onChange` updater also read the live `event.target.value` inside a deferred state callback. It now captures the string synchronously before scheduling the update.

## Production changes

Modified only:

- `src/pages/register-page.tsx`: capture input changes synchronously; read a single `FormData` snapshot at submission before disabling/clearing fields. Trim names/email only; preserve the password string verbatim; confirmation is used only for validation. The same immutable password snapshot is passed to registration and automatic login.
- `src/lib/registration.ts`: replace the non-mutating whitespace predicate using `password.trim()` with a whitespace regex. Validation only checks the original string and never changes it.

`src/api/auth.ts`, `RegisterRequest`, Axios configuration/interceptors and AuthContext were inspected and were not changed. The API's explicit four-field allowlist sends the supplied password unchanged. Type annotations do not transform runtime strings. Axios performs normal JSON serialization only.

FastAPI and unrelated frontend modules were not modified. Existing accounts were not altered or deleted. Build output in `dist/` was regenerated.

## Full value flow

1. Input change captures `event.currentTarget.value` immediately into a string, then updates React state.
2. Submit snapshots actual input values from the form, handling password-manager/autofill changes that did not update React state.
3. Password and confirmation remain exactly their input strings; only name/email are trimmed.
4. Validation inspects the snapshot without mutating it.
5. `registerAccount` receives that exact password.
6. Axios sends only `first_name`, `last_name`, `email`, and unchanged `password`.
7. Automatic login uses the same snapshot; completion clears password and confirmation state.

## Development-safe verification

`.local-tools/registration-password-flow.mjs` adds a test-only Vite transform that probes the registration helper boundary. It compares the helper argument with the live password input and records only equality/count metadata. No production logging or instrumentation was added.

Checks cover mixed case, digits, a special character, leading/trailing whitespace, password visibility toggles, and the reproduced stale-state/autofill scenario. Probe-only checks stop before any API request. The final live browser flow continues to the real FastAPI backend without mocked success. The outbound JSON password is compared with the expected fixture using a boolean assertion; plaintext passwords and JWTs are not printed or saved.

Created support/evidence:

- `.local-tools/registration-password-flow.mjs`
- `.local-tools/read-password-backend-console.ps1`
- `test-results/registration-password-verification.json`
- `test-results/password-registration-backend-access.log`
- This report.

The real verification script refuses to create another account once its recorded test user exists.

## Real account results

Exactly one new account was created through the actual React registration form, using the requested sample credential in memory and FastAPI at `http://127.0.0.1:8000`:

- Email: **mehdi.verify1006@example.com**
- Name: **Mehdi Verify**
- ID: **9**
- Role: **EMPLOYEE**

Passed:

- Helper argument equals the actual visible password despite deliberately stale React state.
- Axios JSON body equals the entered password and contains exactly the four schema fields; no role or confirmation.
- Real browser registration returned **201**. The actual Uvicorn console log line was captured immediately, before continuing the real automatic login request.
- Automatic login returned **200**, populated the existing session/context and redirected to Dashboard.
- Read-only PostgreSQL SELECT independently confirmed the new account exists with the matching ID/email/EMPLOYEE role.
- Immediate sign out cleared the JWT. Normal frontend login with the same credentials returned **200** and redirected to Dashboard.
- The actual Swagger UI's `POST /api/auth/login` with the same credentials returned **200** and the same user.
- Duplicate registration returned real **409** with “An account with this email already exists.” and remained on Register.
- No browser JavaScript exceptions. No existing user modification or deletion.

The test did not save its password or JWT. No Swagger screenshots were taken that could expose credentials.

## Quality checks

- TypeScript/typecheck: **passed**.
- ESLint: **passed**, zero warnings.
- Production build: **passed**.
- Existing non-blocking Vite chunk advisory: approximately **614.63 kB** minified, **188.61 kB gzip**.

No Inventory Movements or later-stage work was performed.
