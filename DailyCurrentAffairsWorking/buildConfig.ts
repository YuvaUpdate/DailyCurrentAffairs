// Build-time configuration for special builds (admin-enabled variant)
// NOTE: Storing credentials in source is insecure; this file exists because you
// explicitly requested the admin auto-login for the admin-included build.
// Disable admin panel for public builds. Set to true only for private/admin debug builds.
export const INCLUDE_ADMIN_PANEL = false;

// Admin credentials for the admin-enabled build. These are required only for
// private/admin builds. Do NOT commit these values to a public repository.
export const ADMIN_EMAIL = 'admin@yuvaupdate.com';
export const ADMIN_PASSWORD = 'YuvaAdmin2025!';

// Toggle admin auto-login for convenience in admin builds.
export const ENABLE_ADMIN_AUTO_LOGIN = true;

// Optional runtime API base used by mobile/native builds to resolve proxied
// playback URLs that start with `/api/...`. Set this in buildConfig for
// production mobile builds or set `globalThis.API_BASE` at startup.
export const API_BASE = '';
