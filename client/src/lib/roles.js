// Single source of truth for "where does this role live" — used by the
// router, the post-login redirect, and the nav bar, so the mapping only
// exists in one place.
export const ROLE_HOME = {
  STUDENT: '/student',
  TEACHER: '/teacher',
  ADMIN: '/admin',
}
