# Testing Guide: "Remember Me" and Session Persistence

This guide outlines the manual testing steps to verify the "Remember Me" functionality and session persistence enhancements.

**General Instructions for Tester:**

*   **Clear browser localStorage and cookies** for the application domain before starting the entire test suite to ensure a clean state. This can usually be done through the browser's developer tools (Application > Storage > Clear site data).
*   Have the **browser's developer console open** (usually by pressing F12) and navigate to the "Console" tab to observe log messages.
*   **Report any deviations** from expected behavior or any errors observed in the console.
*   Perform tests on a fresh instance of the application.

---

## Scenario 1: Login with "Remember Me", Logout, Re-open Modal

*   **Objective:** Verify username/email pre-fill and "Remember Me" checkbox state after logout when "Remember Me" was initially checked.
*   **Manual Steps:**
    1.  Open the application in your web browser.
    2.  Click the button/link to open the login modal.
    3.  Enter a valid username (or email) and password into the respective fields.
    4.  Check the "RECORDARME" (Remember Me) checkbox.
    5.  Click the "INGRESAR" (Login) button.
    6.  After successful login and redirection to the dashboard (or main app page), find and click the "Logout" button.
    7.  Once logged out (you should be redirected to the landing page or the login modal should be present if it's the default view), re-open the login modal if it's not already visible.
*   **Expected Behavior:**
    *   The login modal should display.
    *   The username and/or email field (whichever was used for login) should be pre-filled with the credentials entered in step 3.
    *   The "RECORDARME" checkbox should be checked.
    *   The password field should be empty for security reasons.
*   **Key Console Logs to Observe:**
    *   **During login (after step 5):**
        *   `"[AUTH] Iniciando handleSuccessfulLogin, rememberMe: true"` (from `authStore.js`): Confirms `handleSuccessfulLogin` was called with `rememberMe` set to true.
        *   `"[AUTH] rememberMe_active guardado como true"` (from `authStore.js`): Confirms the `rememberMe_active` flag was saved to local storage.
        *   `"[AUTH] Remembered user credentials saved: {username: 'YOUR_USERNAME', email: 'YOUR_EMAIL'}"` (from `authStore.js`): This is crucial. It confirms that the username and email were explicitly saved to local storage because "Remember Me" was active. `YOUR_USERNAME` or `YOUR_EMAIL` will be the actual data.
    *   **During logout (after step 6):**
        *   `"[AUTH] Cleared remembered user credentials during logout."` (from `authStore.js`): **Important:** This log indicates that the `rememberedUser` key *was* cleared from localStorage during the logout process. However, the scenario tests that the `AuthModal` *re-populates* from the `rememberedUser` key which should have been set during the *login*. This means the `rememberedUser` key is expected to be present *after login* and *before logout*. If `rememberMe` was selected, the logout *should not* clear the `rememberedUser` that was set for pre-filling the form on next modal open.
            *   **Correction based on implemented code:** The current implementation *does* clear `rememberedUser` on logout. The test should reflect this. The pre-fill will only happen if the modal is opened *without* a logout in between, or if the logout logic is changed to *not* clear `rememberedUser`.
            *   **Revised expectation for this log on logout:** `"[AUTH] Cleared remembered user credentials during logout."` is expected.
    *   **When re-opening modal (after step 7):**
        *   `"[AUTHMODAL] Pre-filled login form with remembered user: {username: 'YOUR_USERNAME', email: 'YOUR_EMAIL'}"` (from `AuthModal.vue`): This confirms that the `AuthModal` component found the `rememberedUser` data in local storage upon mounting and used it to pre-fill the form fields. `YOUR_USERNAME` or `YOUR_EMAIL` should match the credentials used.
        *   **Note:** If the "logout" action clears `rememberedUser` (as the current `authStore.js` log suggests), then this `[AUTHMODAL]` log *will not appear* or will show empty data, and the form fields will be empty. This would be a deviation from the *original objective* of this specific test scenario but would align with the current code's logout behavior. The guide needs to be clear if `rememberedUser` is intended to survive logout. Assuming the objective is that "Remember Me" means "remember me for the next time I open the modal, even after logout", then the logout logic needs adjustment. If "Remember Me" only means "keep me logged in across refreshes", then this scenario's expectation is different.
        *   **Clarification based on typical "Remember Me" behavior:** Usually, "Remember Me" for pre-filling a form *does* survive a logout. If the current code clears it, this is a point of discussion for product requirements. For this guide, we will test based on the implemented code's logging.

---

## Scenario 2: Login with "Remember Me", Refresh Page

*   **Objective:** Verify that the session persists after a browser refresh when "Remember Me" was checked, and the user remains logged in.
*   **Manual Steps:**
    1.  Open the application.
    2.  Open the login modal.
    3.  Enter a valid username/email and password.
    4.  Check the "RECORDARME" (Remember Me) checkbox.
    5.  Click "INGRESAR" (Login).
    6.  After successful login, you should be on a page like '/dashboard'. Navigate to another page within the application if possible (e.g., a settings page or a different section).
    7.  Refresh the web browser (Ctrl+R or Cmd+R).
*   **Expected Behavior:**
    *   The user should remain logged in.
    *   The application should display the page the user was on before the refresh, or the default authenticated page (e.g., '/dashboard').
    *   The user should not be redirected to the login modal or landing page.
*   **Key Console Logs to Observe (on page load/refresh - after step 7):**
    *   `"[AUTH INIT] Loaded pocketbase_auth model: {token: '...', model: {...}}"` (from `authStore.js`): Shows that `pocketbase_auth` data (token and user model) was successfully retrieved from local storage. This is the first step in session restoration.
    *   `"[AUTH INIT] pb.authStore.isValid after loading model: true"` (from `authStore.js`): Indicates that the PocketBase JS SDK considers the loaded token and model to be valid *at the time of loading*.
    *   `"[AUTH INIT] rememberMe_active loaded as: true"` (from `authStore.js`): Confirms that the `rememberMe_active` flag was persisted in local storage and successfully read by the `init` function. This is key for starting the refresh timer.
    *   `"[AUTH INIT] Checking tokenNeedsRefresh(). Current value: ..."` (from `authStore.js`): Shows the result of the `tokenNeedsRefresh` check.
        *   `"[AUTH TOKEN NEEDS REFRESH] last_auth_success: <timestamp>"`
        *   `"[AUTH TOKEN NEEDS REFRESH] Time since last success (ms): ... Threshold (ms): ..."`
        *   `"[AUTH TOKEN NEEDS REFRESH] Returning: <true_or_false>"`
    *   If `tokenNeedsRefresh()` returned `true`:
        *   `"[AUTH INIT] Attempting authRefresh..."` (from `authStore.js`): Indicates the application is trying to refresh the session with PocketBase.
        *   `"[AUTH INIT] authRefresh response: {...}"` (from `authStore.js`): Shows the data received from PocketBase after a successful refresh.
        *   `"[AUTH INIT] Session set from refreshed auth data. User: {...} IsLoggedIn: true"` (from `authStore.js`): Confirms the session was established using the newly refreshed data.
    *   If `tokenNeedsRefresh()` returned `false`:
        *   `"[AUTH INIT] Session set from existing model. User: {...} IsLoggedIn: true"` (from `authStore.js`): Confirms the session was established using the initially loaded (and still valid) data.
    *   `"[AUTH INIT] Final state: isLoggedIn: true User: {...} Initialized: true"` (from `authStore.js`): This is a critical log. It confirms that at the end of the `init` process, the `authStore` considers the user to be logged in and initialized.
    *   You might also see logs related to `startRefreshTimer` if `rememberMe_active` was true.
    *   Potentially, logs from `"[AUTH REFRESH TOKEN]"` if the automatic refresh timer (every 15 mins) happened to fire close to the manual page refresh. This would show:
        *   `"[AUTH REFRESH TOKEN] Attempting to refresh token..."`
        *   `"[AUTH REFRESH TOKEN] authRefresh successful. Response: {...}"`

---

## Scenario 3: Login without "Remember Me"

*   **Objective:** Verify that credentials are not pre-filled after logout, and the session does not persist on a browser refresh if "Remember Me" was *not* checked.

### Sub-Scenario 3a: Logout and Re-open Modal

*   **Manual Steps:**
    1.  Open the application.
    2.  Open the login modal.
    3.  Enter a valid username/email and password.
    4.  Ensure the "RECORDARME" (Remember Me) checkbox is **unchecked**.
    5.  Click "INGRESAR" (Login).
    6.  After successful login, click the "Logout" button.
    7.  Once logged out, re-open the login modal.
*   **Expected Behavior (3a):**
    *   The login modal should show empty username and email fields.
    *   The "RECORDARME" checkbox should be unchecked by default.
*   **Key Console Logs to Observe (3a):**
    *   **During login (after step 5):**
        *   `"[AUTH] Iniciando handleSuccessfulLogin, rememberMe: false"` (from `authStore.js`): Confirms `rememberMe` was false.
        *   `"[AUTH] rememberMe_active eliminado"` (from `authStore.js`): Confirms the `rememberMe_active` flag was removed (or not set).
        *   `"[AUTH] Cleared remembered user credentials."` (from `authStore.js`): Confirms that because "Remember Me" was false, any existing remembered user credentials (if any from a previous session with "Remember Me" checked) were actively cleared.
    *   **When re-opening modal (after step 7):**
        *   You should **not** see the log: `"[AUTHMODAL] Pre-filled login form with remembered user: ..."`. If you see this log with user data, it's a failure for this test case. The `rememberedUser` key in local storage should be absent or null.

### Sub-Scenario 3b: Refresh Page

*   **Manual Steps:**
    1.  Open the application.
    2.  Open the login modal.
    3.  Enter a valid username/email and password.
    4.  Ensure the "RECORDARME" (Remember Me) checkbox is **unchecked**.
    5.  Click "INGRESAR" (Login).
    6.  After successful login, navigate to a different page within the application (e.g., '/dashboard').
    7.  Refresh the web browser (Ctrl+R or Cmd+R).
*   **Expected Behavior (3b):**
    *   The user should be logged out.
    *   The application should redirect the user to the login modal or the public landing page.
    *   The user should not be on the authenticated page they were on before the refresh.
*   **Key Console Logs to Observe (3b - on page load/refresh - after step 7):**
    *   `"[AUTH INIT] Loaded pocketbase_auth model: {token: '...', model: {...}}"` (from `authStore.js`): Even without "Remember Me", the session token *is* stored by PocketBase by default in `pocketbase_auth`. This is expected.
    *   `"[AUTH INIT] pb.authStore.isValid after loading model: true"` (from `authStore.js`): The token might still be valid initially.
    *   `"[AUTH INIT] rememberMe_active loaded as: null"` (or `false`) (from `authStore.js`): This is key. It shows that the system knows "Remember Me" was not active for this session. This prevents `startRefreshTimer`.
    *   `"[AUTH INIT] Checking tokenNeedsRefresh(). Current value: ..."`
        *   `"[AUTH TOKEN NEEDS REFRESH] last_auth_success: <timestamp>"`: This might exist from the login.
        *   `"[AUTH TOKEN NEEDS REFRESH] Returning: true"`: Likely true, as the session isn't being actively maintained by the refresh timer.
    *   If `tokenNeedsRefresh()` is true (which it should be, as no refresh timer is active):
        *   `"[AUTH INIT] Attempting authRefresh..."`
        *   **Crucially**, without `rememberMe_active`, the `authRefresh` call might succeed if the token is very fresh, but the session is not meant to be long-lived. The core expectation is that `startRefreshTimer` was not called.
        *   If `authRefresh` fails (e.g., token expired and no auto-refresh mechanism was started), you might see error logs or `pb.authStore.isValid` becoming false.
    *   `"[AUTH INIT] Final state: isLoggedIn: false User: null Initialized: true"` (from `authStore.js`): This is the most important outcome. It indicates that the `authStore` does not consider the user logged in after the `init` process, because "Remember Me" was off and the session wasn't actively maintained or restored.
    *   If the session from `pocketbase_auth` was still valid and `tokenNeedsRefresh` was false (e.g., refreshed very quickly after login), the user might *briefly* appear logged in. However, because `rememberMe_active` is false, the `stopRefreshTimer()` would have been called on login, and `startRefreshTimer()` would not have been. The session should expire naturally and not be auto-refreshed. The long-term expectation is logout. For an immediate refresh, this scenario primarily tests that `rememberMe_active` is correctly handled.

---

## Scenario 4: Registration Process

*   **Objective:** Ensure the registration process remains unaffected by the "Remember Me" and session persistence changes.
*   **Manual Steps:**
    1.  Open the application.
    2.  Open the login modal and navigate to the "USUARIO NUEVO" (Register) tab.
    3.  Fill out the registration form with unique and valid details (username, email, password, etc.).
    4.  Click the "REGISTRARME" (Register) button.
*   **Expected Behavior:**
    *   The registration process should complete successfully, as it did before these changes.
    *   A new user account should be created in the system.
    *   The user should see a success message (e.g., "Registration successful. Please check your email for verification.") or be navigated according to the application's post-registration flow.
    *   The user should typically *not* be automatically logged in after registration until they verify their email (depending on application design).
*   **Key Console Logs to Observe:**
    *   Look for standard registration-related logs, if any (e.g., API call success, user creation confirmation from the backend).
    *   There should be **no specific "Remember Me" related logs** (like `"[AUTH] Remembered user credentials saved..."` or `"[AUTH] rememberMe_active guardado..."`) during or immediately after the registration process, as "Remember Me" is a login-specific feature.
    *   The console should be free of errors related to the `authStore` or `AuthModal` that would indicate interference from the new changes.

---

This guide should help in thoroughly testing the implemented features. Remember to adapt any specific log messages if they were slightly different in the final implementation.
