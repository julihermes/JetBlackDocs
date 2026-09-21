/**
 * The hack's own changelog carries no release dates, so this is the one fact on
 * the site that isn't derived from data-source/. It comes from the Hackdex
 * listing (https://www.hackdex.app/hack/pokemon-jetblack) and has to be updated
 * by hand.
 *
 * `version` is checked against the newest changelog entry before the date is
 * shown, so a forgotten update here goes quiet rather than dating v1.8 as v1.7.
 */
export const LATEST_RELEASE = { version: "v1.7", date: "2026-08-16" };

export const releaseDateFor = (version: string): string | null =>
  version === LATEST_RELEASE.version
    ? new Date(`${LATEST_RELEASE.date}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;
