/**
 * Centralized auth storage utility.
 *
 * Each role stores its token under a separate localStorage key
 * (`customer_token`, `seller_token`, `rider_token`, `admin_token`)
 * so that multiple roles can be logged-in simultaneously
 * in different tabs of the same browser without overwriting each other.
 *
 * The `current_role` key is tracked in `sessionStorage` (per tab) rather than
 * `localStorage` (globally) so that different tabs in the same browser session
 * can run as different roles (e.g., one tab as customer, another as seller)
 * without conflict.
 */

const ROLE_TOKEN_KEYS: Record<string, string> = {
    customer: "customer_token",
    seller: "seller_token",
    rider: "rider_token",
    admin: "admin_token",
};

const CURRENT_ROLE_KEY = "current_role";
const LEGACY_TOKEN_KEY = "token"; // backwards compat

// ─── Role (sessionStorage isolated per tab) ───────────────────────────────────

export const getCurrentRole = (): string | null => {
    return sessionStorage.getItem(CURRENT_ROLE_KEY);
};

export const setCurrentRole = (role: string): void => {
    sessionStorage.setItem(CURRENT_ROLE_KEY, role);
};

// ─── Token ───────────────────────────────────────────────────────────────────

/**
 * Get token for a specific role (or the current role if omitted).
 * Falls back to legacy `token` key for backwards compatibility.
 */
export const getToken = (role?: string | null): string | null => {
    const r = role || getCurrentRole();

    if (r && ROLE_TOKEN_KEYS[r]) {
        const t = localStorage.getItem(ROLE_TOKEN_KEYS[r]);
        if (t) return t;
    }

    // Backwards compat: check legacy key
    return localStorage.getItem(LEGACY_TOKEN_KEY);
};

/**
 * Save token for the given role and set it as the current role.
 * Also removes the legacy key to prevent stale data.
 */
export const setToken = (token: string, role: string): void => {
    const key = ROLE_TOKEN_KEYS[role];
    if (key) {
        localStorage.setItem(key, token);
    } else {
        // Unknown role — fall back to legacy kei
        localStorage.setItem(LEGACY_TOKEN_KEY, token);
    }
    setCurrentRole(role);

    // Clean up legacy key if we have a role-specific one
    if (key) {
        localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
};

/**
 * Store a token before the role is known (fresh login, no role yet).
 * Uses the legacy `token` key temporarily.
 */
export const setTokenBeforeRole = (token: string): void => {
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
};

// ─── Logout ──────────────────────────────────────────────────────────────────

/**
 * Clear auth data for the given role (or current role).
 * Does NOT affect other roles.
 */
export const clearAuth = (role?: string | null): void => {
    const r = role || getCurrentRole();

    if (r && ROLE_TOKEN_KEYS[r]) {
        localStorage.removeItem(ROLE_TOKEN_KEYS[r]);
    }

    localStorage.removeItem(LEGACY_TOKEN_KEY);
    sessionStorage.removeItem(CURRENT_ROLE_KEY);
};

/**
 * Clear ALL auth data for every role. Used as a nuclear reset.
 */
export const clearAllAuth = (): void => {
    Object.values(ROLE_TOKEN_KEYS).forEach((key) =>
        localStorage.removeItem(key)
    );
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    sessionStorage.removeItem(CURRENT_ROLE_KEY);
};

// ─── Discovery ───────────────────────────────────────────────────────────────

/**
 * Find the first valid role-token stored in localStorage.
 * Useful on page load when `current_role` may not be set in sessionStorage.
 * Returns `{ role, token }` or `null`.
 */
export const discoverSession = (): { role: string; token: string } | null => {
    // Try current_role first
    const currentRole = getCurrentRole();
    if (currentRole && ROLE_TOKEN_KEYS[currentRole]) {
        const t = localStorage.getItem(ROLE_TOKEN_KEYS[currentRole]);
        if (t) return { role: currentRole, token: t };
    }

    // Scan all role keys
    for (const [role, key] of Object.entries(ROLE_TOKEN_KEYS)) {
        const t = localStorage.getItem(key);
        if (t) {
            setCurrentRole(role); // Set it in sessionStorage for this tab
            return { role, token: t };
        }
    }

    // Legacy fallback
    const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacyToken) return { role: "unknown", token: legacyToken };

    return null;
};
