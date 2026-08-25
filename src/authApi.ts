// Authentication has been removed from the application.
// This compatibility module prevents legacy profile calls from blocking the app build.
// It intentionally returns no authenticated profile.
export async function getMyProfile() {
  return null
}
