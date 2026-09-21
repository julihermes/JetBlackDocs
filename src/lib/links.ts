/**
 * Every off-site URL the docs link to, in one place.
 *
 * A link the project doesn't have yet is `null` rather than missing, and the UI
 * skips the button for it — so an unset link is a quiet gap, never a dead href.
 */
export interface ExternalLink {
  label: string;
  detail: string;
  url: string | null;
}

export const LINKS = {
  download: { label: "Download the patch", detail: "Latest JetBlack release", url: null },
  hackdex: { label: "Hackdex", detail: "Hack profile and screenshots", url: null },
  discord: { label: "Discord", detail: "Join the community", url: null },
  thread: {
    label: "PokeCommunity thread",
    detail: "Announcements and discussion",
    url: "https://www.pokecommunity.com/threads/introducing-pokemon-jetblack-a-romhack-of-pokemon-black.535562/",
  },
  author: { label: "EstrethAthema", detail: "Hack author", url: null },
} satisfies Record<string, ExternalLink>;

export const ctaLinks = (): ExternalLink[] =>
  [LINKS.download, LINKS.hackdex, LINKS.discord, LINKS.thread].filter((l) => l.url !== null);
