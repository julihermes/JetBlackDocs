import type { SourceFile } from "../lib/source.ts";
import { assertParse } from "../lib/errors.ts";
import { isBlank, isDashLine, paragraphs } from "../lib/text.ts";
import type { FeaturesData } from "../types.ts";

const SOURCE_LABEL = "Features";

const NPC_ROW_RE = /^([A-Za-z][\w' ]+?),\s*([\w' .]+?)\s*-\s*(.+)$/;
const ROYAL_ROW_RE = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*=\s*(.+)$/i;
const BERRY_ROW_RE = /^(.+?)\s{2,}-\s*(.+)$/;
const LEVEL_CAP_RE = /^(.+?)\s+Lvl\.?\s*(\d+)(\*)?\s*$/;

function toBlockLines(lines: string[], startLineNo: number) {
  return lines.map((text, i) => ({ n: startLineNo + i, text }));
}

function stripBulletMarker(text: string): string {
  return text.trim().replace(/^-+\s*/, "");
}

export function parseFeatures(file: SourceFile): FeaturesData {
  const { lines } = file;
  const dividerIndex = lines.findIndex((l) => /^-{15,}$/.test(l.trim()));
  assertParse(dividerIndex !== -1, SOURCE_LABEL, 1, "", "divider between Features and Nuzlocke Info not found");

  const featuresLines = lines.slice(0, dividerIndex);
  const nuzlockeLines = lines.slice(dividerIndex);

  // --- Features half ---
  const featureBlocks = paragraphs({
    headerText: "",
    headerLineNumber: 1,
    contentLines: toBlockLines(featuresLines, 1),
  });

  assertParse(featureBlocks.length > 2, SOURCE_LABEL, 1, "", "too few paragraphs found in the features section");

  const [titlePara, introPara, ...bulletParas] = featureBlocks;
  assertParse(
    /Goals with this RomHack/i.test(titlePara[0].text),
    SOURCE_LABEL,
    titlePara[0].n,
    titlePara[0].text,
    '"-Goals with this RomHack-" title not found at the top of the file',
  );

  const intro = [introPara.map((l) => l.text.trim()).join(" ")];

  const bullets: { text: string }[] = [];
  const bonusTrainers: FeaturesData["bonusTrainers"] = [];
  const berryVendors: FeaturesData["berryVendors"] = [];
  const royalUnovaRewards: FeaturesData["royalUnovaRewards"] = [];

  for (const para of bulletParas) {
    if (para.length === 0) continue;
    const firstLineText = stripBulletMarker(para[0].text);
    const proseLines = [firstLineText];

    for (const line of para.slice(1)) {
      const npc = NPC_ROW_RE.exec(line.text.trim());
      const royal = ROYAL_ROW_RE.exec(line.text.trim());
      const berry = BERRY_ROW_RE.exec(line.text.trim());
      if (npc) {
        bonusTrainers.push({ name: npc[1].trim(), location: npc[2].trim(), reward: npc[3].trim() });
      } else if (royal) {
        royalUnovaRewards.push({ day: royal[1], item: royal[2].trim() });
      } else if (berry) {
        berryVendors.push({ location: berry[1].trim(), kind: berry[2].trim() });
      } else {
        proseLines.push(line.text.trim());
      }
    }

    bullets.push({ text: proseLines.join(" ") });
  }

  assertParse(bonusTrainers.length === 4, SOURCE_LABEL, 1, "", `expected 4 bonus NPCs, found ${bonusTrainers.length}`);
  assertParse(royalUnovaRewards.length === 7, SOURCE_LABEL, 1, "", `expected 7 Royal Unova rewards, found ${royalUnovaRewards.length}`);
  assertParse(berryVendors.length >= 5, SOURCE_LABEL, 1, "", `expected >=5 berry vendors, found ${berryVendors.length}`);

  // --- Nuzlocke half ---
  const nuzlockeBlocks = paragraphs({
    headerText: "",
    headerLineNumber: dividerIndex + 1,
    contentLines: toBlockLines(nuzlockeLines, dividerIndex + 1),
  });

  const levelCapHeaderIdx = nuzlockeBlocks.findIndex((p) => /^-Level Caps-$/i.test(p[0]?.text.trim() ?? ""));
  assertParse(levelCapHeaderIdx !== -1, SOURCE_LABEL, dividerIndex + 1, "", '"-Level Caps-" not found');

  const nuzlockeIntro = nuzlockeBlocks
    .slice(1, levelCapHeaderIdx) // skip "-Nuzlocking Info-" title paragraph
    .filter((p) => !isBlank(p[0]?.text ?? "") && !isDashLine(p[0]?.text ?? ""))
    .map((p) => p.map((l) => l.text.trim()).join(" "));

  const levelCapLines = nuzlockeBlocks
    .slice(levelCapHeaderIdx + 1)
    .flat()
    .filter((l) => !isBlank(l.text));

  const levelCaps = levelCapLines.map((l) => {
    const m = LEVEL_CAP_RE.exec(l.text.trim());
    assertParse(m, SOURCE_LABEL, l.n, l.text, 'level cap line didn\'t match "Name  Lvl NN"');
    return { boss: m[1].trim(), level: Number(m[2]), optional: Boolean(m[3]) };
  });

  assertParse(levelCaps.length >= 10, SOURCE_LABEL, 1, "", `expected several level caps, found ${levelCaps.length}`);

  return {
    intro,
    bullets,
    bonusTrainers,
    berryVendors,
    royalUnovaRewards,
    nuzlocke: { intro: nuzlockeIntro, levelCaps },
  };
}
