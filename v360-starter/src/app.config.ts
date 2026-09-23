/**
 * Single source of truth for this app's identity.
 * `scripts/new-project.mjs` rewrites these values when it stamps out a new project,
 * so keep every user-visible name referencing this object instead of hardcoding it.
 */
export const APP = {
  slug: 'v360-starter',
  name: 'V360 Starter',
  tagline: 'Vision 360 app scaffold',
  version: '1.0.0',
} as const
