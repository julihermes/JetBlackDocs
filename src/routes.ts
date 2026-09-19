export interface RouteDef {
  path: string;
  code: string; // short "gate code" shown in the nav
  label: string;
  primary: boolean; // shown directly in the bottom/top nav vs tucked under "More"
}

export const ROUTES: RouteDef[] = [
  { path: "/", code: "HOME", label: "Home", primary: true },
  { path: "/pokedex", code: "DEX", label: "Pokédex", primary: true },
  { path: "/encounters", code: "RTES", label: "Encounters", primary: true },
  { path: "/trainers", code: "VS", label: "Trainers", primary: true },
  { path: "/items", code: "ITMS", label: "Items", primary: false },
  { path: "/moves", code: "MOVE", label: "Move changes", primary: false },
  { path: "/evolutions", code: "EVO", label: "Evolutions", primary: false },
  { path: "/legendaries", code: "LGND", label: "Legendaries", primary: false },
  { path: "/nuzlocke", code: "CAPS", label: "Nuzlocke caps", primary: false },
  { path: "/history", code: "LOG", label: "Version history", primary: false },
];

export const PRIMARY_ROUTES = ROUTES.filter((r) => r.primary);
export const MORE_ROUTES = ROUTES.filter((r) => !r.primary);
