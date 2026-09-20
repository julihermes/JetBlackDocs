export interface RouteDef {
  path: string;
  label: string;
  primary: boolean; // shown directly in the bottom/top nav vs tucked under "More"
}

export const ROUTES: RouteDef[] = [
  { path: "/", label: "Home", primary: true },
  { path: "/pokedex", label: "Pokédex", primary: true },
  { path: "/encounters", label: "Encounters", primary: true },
  { path: "/trainers", label: "Trainers", primary: true },
  { path: "/items", label: "Items", primary: false },
  { path: "/moves", label: "Moves", primary: false },
  { path: "/evolutions", label: "Evolutions", primary: false },
  { path: "/legendaries", label: "Legendaries", primary: false },
  { path: "/nuzlocke", label: "Nuzlocke caps", primary: false },
  { path: "/history", label: "Version history", primary: false },
];

export const PRIMARY_ROUTES = ROUTES.filter((r) => r.primary);
export const MORE_ROUTES = ROUTES.filter((r) => !r.primary);
