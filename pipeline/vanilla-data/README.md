# Vanilla reference data

`types.json` maps National Dex number → type(s), for #1–649, **as of Generation V**. It comes from [PokeAPI](https://pokeapi.co/), not from JetBlack's own documentation — JetBlack explicitly does not change Pokémon types ("no Type changes" per the author's feature list).

The Gen 5 part is the catch. PokéAPI reports a species' *current* typing, and Gen 6 retyped 22 of the species in this range to Fairy — Clefairy, Jigglypuff, Marill, Togepi, Gardevoir, Mawile, Cottonee and the rest. **Fairy does not exist in Black**, so those must be resolved back: each Pokémon carries a `past_types` array where an entry tagged `generation-N` holds the typing that applied *up to and including* generation N, exactly like `past_damage_relations` in `type-chart.json`. The Gen 5 typing is the earliest entry tagged at or after Gen 5, falling back to the current typing when a species has none.

An earlier version of this file was built by walking the `/type/{name}` endpoints and collecting their members, which returns *current* membership and so silently reported Clefable as Fairy. Build it from `/pokemon/{id}` instead, per species, so `past_types` is available. `src/lib/types5.ts` carries the matching 17-type list on the frontend and deliberately omits Fairy, so a regression renders as an unstyled badge rather than a convincing pink one.

To regenerate:

```bash
python3 - <<'EOF'
import json, urllib.request, time

HEADERS = {"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"}
ROMAN = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9}


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


out = {}
for dex in range(1, 650):
    d = get(f"https://pokeapi.co/api/v2/pokemon/{dex}")
    past = sorted(
        ((ROMAN[p["generation"]["name"].split("-")[1]], p) for p in d.get("past_types", [])
         if ROMAN[p["generation"]["name"].split("-")[1]] >= 5),
        key=lambda x: x[0],
    )
    source = past[0][1]["types"] if past else d["types"]
    out[str(dex)] = [t["type"]["name"] for t in sorted(source, key=lambda x: x["slot"])]
    time.sleep(0.02)

with open("pipeline/vanilla-data/types.json", "w") as f:
    json.dump(out, f, indent=0)
EOF
```

`evolutions.json` lists every vanilla Pokémon Black evolution edge (`fromId`/`from`/`toId`/`to`/`method`), also from PokéAPI. JetBlack's own "Evolution Changes" doc only lists methods it *altered*, so this fills in the rest — see `buildEvolutionLookup` in `pipeline/vanilla-data.ts` for how the two are merged (hack-documented pair always wins).

`species-info.json` maps National Dex number → height, weight, gender ratio, egg groups, catch rate, hatch cycle, dex category ("genus"), whether the species is legendary or mythical, and Gen 5 Pokédex flavor text (filtered to the *Black* version specifically, not a later remake). None of these are documented anywhere in JetBlack's own `.txt` files — the hack's feature list never claims to change them — so, like `types.json`, this is safe to treat as static and never regenerate for a new hack version.

To regenerate:

```bash
python3 - <<'EOF'
import json, urllib.request, time

HEADERS = {"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"}


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


result = {}
for dex in range(1, 650):
    species = get(f"https://pokeapi.co/api/v2/pokemon-species/{dex}")
    mon = get(f"https://pokeapi.co/api/v2/pokemon/{dex}")

    genus = next((g["genus"] for g in species["genera"] if g["language"]["name"] == "en"), "")

    flavor_text = ""
    for entry in species["flavor_text_entries"]:
        if entry["language"]["name"] == "en" and entry["version"]["name"] == "black":
            flavor_text = " ".join(entry["flavor_text"].replace("\n", " ").replace("\x0c", " ").split())
            break

    result[str(dex)] = {
        "genus": genus,
        "heightM": mon["height"] / 10,
        "weightKg": mon["weight"] / 10,
        "genderRate": species["gender_rate"],
        "eggGroups": [g["name"] for g in species["egg_groups"]],
        "catchRate": species["capture_rate"],
        "hatchSteps": (species["hatch_counter"] + 1) * 255,
        "flavorText": flavor_text,
        # JetBlack houses every legendary it doesn't place by hand in the Relic
        # Castle Obelisks — see buildObeliskList in pipeline/obelisks.ts.
        "legendary": species["is_legendary"] or species["is_mythical"],
    }
    time.sleep(0.02)

with open("pipeline/vanilla-data/species-info.json", "w") as f:
    json.dump(result, f, indent=0, ensure_ascii=False)
EOF
```

`type-chart.json` maps each **defending** type → the attacking types that hit it for double, half and no damage, for the 17 types that exist in Gen 5.

Two things make this Gen-5-specific rather than a copy of PokéAPI's current chart. **Fairy does not exist in Gen 5**, so it is filtered out of every list. And **Steel still resists Dark and Ghost** — Gen 6 removed both. PokéAPI carries the old relations in each type's `past_damage_relations`, where an entry tagged `generation-N` holds the relations that applied *up to and including* generation N; the Gen 5 set is therefore the earliest entry tagged at or after Gen 5, falling back to the current relations when a type has none. Only `ghost`, `dark` and `steel` have such an entry, which is exactly the set of types Gen 6 changed.

Spot-checked against Scizor (Bug/Steel): 4× from Fire, ¼× from Grass, 0× from Poison, and ½× from Dark and Ghost — those last two are the Gen-5-only part, and would be 1× on a Gen 6+ chart.

To regenerate:

```bash
python3 - <<'EOF'
import json, urllib.request

HEADERS = {"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"}
ROMAN = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9}

GEN5_TYPES = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
              "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel"]


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


out = {}
for t in GEN5_TYPES:
    d = get(f"https://pokeapi.co/api/v2/type/{t}")
    past = sorted(
        ((ROMAN[p["generation"]["name"].split("-")[1]], p) for p in d["past_damage_relations"]
         if ROMAN[p["generation"]["name"].split("-")[1]] >= 5),
        key=lambda x: x[0],
    )
    rel = past[0][1]["damage_relations"] if past else d["damage_relations"]
    pick = lambda k: sorted(x["name"] for x in rel[k] if x["name"] != "fairy")
    out[t] = {"doubleFrom": pick("double_damage_from"),
              "halfFrom": pick("half_damage_from"),
              "noFrom": pick("no_damage_from")}

with open("pipeline/vanilla-data/type-chart.json", "w") as f:
    json.dump(out, f, indent=0, ensure_ascii=False)
EOF
```

`later-gen-moves.json` maps move name → type, damage class, power, accuracy, PP, effect and flavor text for the 15 post-Gen-5 moves JetBlack imports ("Moves from later Gens" in the move-changes doc). It is a separate file from `moves.json` precisely because these moves do **not** exist in Gen 5, so the Gen-5 `past_values` resolution that `moves.json` depends on does not apply — these take PokéAPI's current values, which is what the hack inherits.

The doc only writes a stats block for the moves it marks `**` (Infernal Parade, Ceaseless Edge, Triple Arrows, Flower Trick, and the v1.7 pair); the others it merely names alongside the move they replace, so their mainline figures stand. `buildMoveList` layers the doc's explicit values over this baseline — Flower Trick is the clearest case, where the doc says 60 Power and Special and annotates its own row "(70 in mainline titles)" / "is physical in the mainline titles", matching this file exactly.

To regenerate:

```bash
python3 - <<'EOF'
import json, urllib.request

HEADERS = {"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"}


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


slugs = ["liquidation", "lumina-crash", "mystical-fire", "high-horsepower", "power-up-punch",
         "parabolic-charge", "infernal-parade", "boomburst", "ceaseless-edge", "triple-arrows",
         "torch-song", "flower-trick", "aqua-step", "trailblaze", "eerie-spell"]

out = {}
for slug in slugs:
    d = get(f"https://pokeapi.co/api/v2/move/{slug}")
    name = next((n["name"] for n in d["names"] if n["language"]["name"] == "en"), d["name"])
    flavor = ""
    for e in reversed(d["flavor_text_entries"]):
        if e["language"]["name"] == "en":
            flavor = e["flavor_text"].replace("\n", " ").replace("\f", " ").strip()
            break
    out[name] = {
        "type": d["type"]["name"],
        "damageClass": d["damage_class"]["name"],
        "power": d["power"],
        "accuracy": d["accuracy"],
        "pp": d["pp"],
        "flavorText": flavor,
        "effect": next((e["short_effect"] for e in d["effect_entries"] if e["language"]["name"] == "en"), ""),
    }

with open("pipeline/vanilla-data/later-gen-moves.json", "w") as f:
    json.dump(out, f, indent=0, ensure_ascii=False)
EOF
```

`moves.json` maps move name → type, damage class, power, accuracy, PP, Gen 5 (Black/White) flavor text, and effect description, for every move that exists through Gen 5 (559 moves — the well-known canonical Gen 5 move count; PokéAPI's `generation` filter alone isn't enough, since it also returns Pokémon Colosseum/XD-exclusive "shadow"-type moves tagged as Gen 3, which never appear in a mainline game and are explicitly excluded). Merged with JetBlack's own "Move changes" doc in `buildMoveList` (`pipeline/vanilla-data.ts`) the same way `evolutions.json` is — the hack's doc only lists what it changed, so an unlisted move keeps its vanilla figures.

**PokéAPI's move endpoint returns *current* (latest-generation) power/accuracy/pp/type**, which is wrong for moves rebalanced after Gen 5 (e.g. Ice Beam/Flamethrower/Thunderbolt 95→90 in Gen 6, Tackle 35→50→40 across Gen 5 then Gen 6). The Gen-5-accurate value is resolved per-field from each move's `past_values` array. A `past_values` entry stores the value that applied *before* its tagged version group, changing to the next entry's value (or the current top-level value, if it's the last entry) starting at that version group — verified against Tackle, where the entry tagged `black-white` (Gen 5) holds power 35 (the Gen 1-4 value), and the *next* entry, tagged `sun-moon` (Gen 7), holds power 50 — the value Tackle actually had in Gen 5 Black/White. So: to resolve a field for Gen 5, take the `past_values` entry with the smallest generation *strictly greater than 5*; if none exists, Gen 5 already matches the current top-level value.

To regenerate:

```bash
python3 - <<'EOF'
import json, urllib.request, time

HEADERS = {"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"}
TARGET_GEN = 5


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


vg_gen = {}
for vg in get("https://pokeapi.co/api/v2/version-group?limit=100")["results"]:
    detail = get(vg["url"])
    roman = detail["generation"]["name"].split("-")[-1]
    roman_to_int = {"i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9}
    vg_gen[vg["name"]] = roman_to_int[roman]
    time.sleep(0.01)

GEN_ORDER = {"generation-i": 1, "generation-ii": 2, "generation-iii": 3, "generation-iv": 4, "generation-v": 5}


def resolve_field(current_value, past_values, field):
    candidates = []
    for pv in past_values:
        val = pv.get(field)
        if val is None:
            continue
        gen = vg_gen.get(pv["version_group"]["name"])
        if gen is not None and gen > TARGET_GEN:
            candidates.append((gen, val))
    if not candidates:
        return current_value
    return min(candidates, key=lambda c: c[0])[1]


result = {}
for entry in get("https://pokeapi.co/api/v2/move?limit=1000")["results"]:
    data = get(entry["url"])
    if data["generation"]["name"] not in GEN_ORDER:
        continue  # introduced after Gen 5 — doesn't exist in Black
    if data["type"]["name"] == "shadow":
        continue  # Pokémon Colosseum/XD-exclusive move — never appears in a mainline game

    name = next((n["name"] for n in data["names"] if n["language"]["name"] == "en"), entry["name"])
    past = data.get("past_values", [])
    move_type = resolve_field(data["type"]["name"] if data["type"] else None, past, "type")
    if isinstance(move_type, dict):
        move_type = move_type["name"]

    flavor_text = ""
    for fte in data["flavor_text_entries"]:
        if fte["language"]["name"] == "en" and fte["version_group"]["name"] == "black-white":
            flavor_text = " ".join(fte["flavor_text"].replace("\n", " ").replace("\x0c", " ").split())
            break

    effect = ""
    for ee in data["effect_entries"]:
        if ee["language"]["name"] == "en":
            effect = " ".join(ee["short_effect"].replace("$effect_chance%", f"{data.get('effect_chance') or ''}%").split())
            break

    result[name] = {
        "type": move_type,
        "damageClass": data["damage_class"]["name"] if data["damage_class"] else "status",
        "power": resolve_field(data["power"], past, "power"),
        "accuracy": resolve_field(data["accuracy"], past, "accuracy"),
        "pp": resolve_field(data["pp"], past, "pp"),
        "flavorText": flavor_text,
        "effect": effect,
    }
    time.sleep(0.02)

with open("pipeline/vanilla-data/moves.json", "w") as f:
    json.dump(result, f, indent=0, ensure_ascii=False)
EOF
```

`trainer-portraits.json` maps a notable trainer's first name (as it appears after their title in the trainer roster doc — "Leader Lenora" or "Champion Alder" both key on just "Lenora"/"Alder") to a portrait image URL, for the Trainers page. This is the one file in this directory **not** sourced from PokéAPI — PokéAPI has no trainer/NPC artwork at all (only Pokémon, items, types), so this hotlinks each trainer's official Black/White artwork from Bulbapedia instead. Every URL was verified reachable (HTTP 200, `image/png`) before being committed.

To regenerate (each URL was found via Bulbapedia's own API rather than guessed — do the same if a trainer's file ever moves):

```bash
python3 - <<'EOF'
import json, urllib.request, urllib.parse

HEADERS = {"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"}
API = "https://bulbapedia.bulbagarden.net/w/api.php"
TRAINERS = ["Chili", "Cress", "Cilan", "Lenora", "Burgh", "Elesa", "Clay", "Skyla", "Drayden", "Iris", "Brycen", "Alder"]


def api_get(params):
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


result = {}
for name in TRAINERS:
    data = api_get({"action": "query", "titles": f"File:Black White {name}.png", "prop": "imageinfo", "iiprop": "url", "format": "json"})
    page = next(iter(data["query"]["pages"].values()), {})
    imageinfo = page.get("imageinfo")
    if imageinfo:
        result[name] = imageinfo[0]["url"]

with open("pipeline/vanilla-data/trainer-portraits.json", "w") as f:
    json.dump(result, f, indent=2)
EOF
```

Story bosses the Nuzlocke level-cap list counts as checkpoints — N, Ghetsis, the Subway Bosses and Cynthia — were added the same way, keyed on the name left after stripping "Team Plasma"/"Subway Boss"/"Pokemon Trainer". One exception: Cynthia has no Black/White artwork (she's a Sinnoh character appearing in Undella Town), so she uses her Sugimori portrait, `Diamond_Pearl_Cynthia.png`. The Team Plasma sage Alerith has no individual artwork at all — only a group "Seven Sages" image — so that battle falls back to a class icon like any other trainer.

Since this file was extended with the rival/Elite Four names too (also full official Black/White artwork, for the same "important trainer" big-portrait treatment), note the doc's own spelling sometimes differs from Bulbapedia's canonical one (`Marshal`/`Marshall` both point at Bulbapedia's `Marshal` file, `Caitlyn` at Bulbapedia's `Caitlin` file) — same kind of doc-vs-canonical mismatch already handled for move names in `moves.json`.

`trainer-class-icons.json` maps a *generic* trainer class, exactly as it appears before the personal name in the roster doc (typos and all — e.g. `"Blackbelt"`, `"Black belt"`, and `"Black Belt"` are three separate keys, all pointing at the same icon), to a small official Black/White trainer-class icon from Bulbapedia — 96 files exist for Gen 5 covering every class (with separate male/female sprites for unisex classes). Every key here was resolved against that verified 96-file list, not guessed. **Note on gender:** for a unisex class (Ace Trainer, Backpacker, Cyclist, Pokéfan, Pokémon Breeder/Ranger, Preschooler, Psychic, School Kid, Scientist, Swimmer, Veteran), the actual trainer's in-game gender isn't recoverable from the roster doc's first name alone without guessing — so these all default to the male sprite as a documented, purely decorative simplification (it has no bearing on any gameplay-relevant data on the site). Classes that already encode gender in the doc's own text (Clerk F/M, Waiter/Waitress) use the matching sprite. A few classes have no dedicated Gen 5 sprite at all ("Subway Boss", "The Riches", a couple of one-off Team Plasma names) and are simply left out — the page falls back to no icon for those, same as it already does for any unmatched species elsewhere.

**Important:** unlike `list=allimages` on `bulbapedia.bulbagarden.net` itself (which returns nothing for these — the images live on a separate, shared image repository), you have to query the archive wiki's own API directly: `https://archives.bulbagarden.net/w/api.php`.

To regenerate:

```bash
python3 - <<'EOF'
import json, urllib.request

HEADERS = {"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"}
req = urllib.request.Request(
    "https://archives.bulbagarden.net/w/api.php?action=query&list=allimages&aiprefix=Spr_BW_&format=json&ailimit=500",
    headers=HEADERS,
)
with urllib.request.urlopen(req, timeout=15) as r:
    data = json.load(r)
urls = {img["name"]: img["url"] for img in data["query"]["allimages"]}


def u(filename):
    return urls[f"Spr_BW_{filename}.png"]


# Raw class string (as it appears in the roster doc, typos included) -> canonical Spr_BW_ filename.
CLASS_MAP = {
    "Ace Trainer": "Ace_Trainer_M", "Artist": "Artist", "Backers": "Backers_M",
    "Backpacker": "Backpacker_M", "Baker": "Baker", "Battle Girl": "Battle_Girl",
    "Biker": "Biker", "Black Belt": "Black_Belt", "Black belt": "Black_Belt",
    "Blackbelt": "Black_Belt", "Clerk F": "Clerk_F", "Clerk M": "Clerk_M_A",
    "ClerkF": "Clerk_F", "ClerkM": "Clerk_M_A", "Cyclist": "Cyclist_M",
    "Dancer": "Dancer", "Depot Agent": "Depot_Agent", "Doctor": "Doctor",
    "Fisher": "Fisherman", "Fisherman": "Fisherman", "Gentleman": "Gentleman",
    "Harlequin": "Harlequin", "Hike": "Hiker", "Hiker": "Hiker",
    "Hooligans": "Hooligans", "Hoopster": "Hoopster", "Infielder": "Infielder",
    "Janitor": "Janitor", "Lady": "Lady", "Lass": "Lass",
    "Linebacker": "Linebacker", "Maid": "Maid", "Motorcyclist": "Biker",
    "Musician": "Musician", "Nurse": "Nurse", "Nursery Aide": "Nursery_Aide",
    "Parasol Lady": "Parasol_Lady", "Pilot": "Pilot", "Pokefan": "Pokéfan_M",
    "Pokemon Breeder": "Pokémon_Breeder_M", "Pokemon Ranger": "Pokémon_Ranger_M",
    "Policeman": "Policeman", "Preschooler": "Preschooler_M", "Psychic": "Psychic_M",
    "Rich Boy": "Rich_Boy", "Roughneck": "Roughneck", "School Kid": "School_Kid_M",
    "Schoolkid": "School_Kid_M", "Scientist": "Scientist_M", "Smasher": "Smasher",
    "Socialite": "Socialite", "Striker": "Striker", "Swimmer": "Swimmer_M",
    "Twins": "Twins", "Veteran": "Veteran_M", "Waiter": "Waiter",
    "Waitress": "Waitress", "Worker": "Worker", "Youngster": "Youngster",
    "Team Plasma Ghetsis": "Ghetsis", "Team Plasma N": "N",
    "Team Plasma Grunt": "Plasma_Grunt_M", "Pokemon Trainer N": "N",
    "Pokemon Trainer Cynthia": "Cynthia",
}

result = {raw: u(filename) for raw, filename in CLASS_MAP.items()}
with open("pipeline/vanilla-data/trainer-class-icons.json", "w") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)
EOF
```

`tm-compatibility.json` maps National Dex number → the TMs and HMs that species
can learn in vanilla Pokémon Black, as `{ "tm": "TM83", "move": "Work Up" }`
entries. The hack's own docs only mention machines it *adds* to a species
("Can learn TM83 Work Up via TM"), so without this the site's "Compatible TMs"
panel listed one or two entries per species instead of the real list — see
`attachTmCompatibility` in `pipeline/vanilla-data.ts` for the merge (a hack
addition is renumbered from this file when its move name is a Gen 5 machine,
because the doc's hand-written TM numbers are occasionally wrong).

Machine → move assignment is version-group specific, so both the item lookup
and the per-species filter are pinned to `black-white`.

To regenerate:

```bash
python3 - <<'EOF'
import json, urllib.request, time

HEADERS = {"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"}
VG = "black-white"


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


move_to_tm = {}
for name in [f"tm{i:02d}" for i in range(1, 96)] + [f"hm{i:02d}" for i in range(1, 7)]:
    item = get(f"https://pokeapi.co/api/v2/item/{name}")
    entry = next((m for m in item["machines"] if m["version_group"]["name"] == VG), None)
    if entry:
        move_to_tm[get(entry["machine"]["url"])["move"]["name"]] = name.upper()
    time.sleep(0.02)

result = {}
for dex in range(1, 650):
    mon = get(f"https://pokeapi.co/api/v2/pokemon/{dex}")
    entries = [
        {"tm": move_to_tm[m["move"]["name"]], "move": " ".join(w.capitalize() for w in m["move"]["name"].split("-"))}
        for m in mon["moves"]
        if m["move"]["name"] in move_to_tm
        and any(d["version_group"]["name"] == VG and d["move_learn_method"]["name"] == "machine" for d in m["version_group_details"])
    ]
    result[str(dex)] = sorted(entries, key=lambda e: e["tm"])
    time.sleep(0.02)

with open("pipeline/vanilla-data/tm-compatibility.json", "w") as f:
    json.dump(result, f, indent=0)
EOF
```

`items.json` is every item that exists in Pokémon Black, keyed by PokeAPI slug →
display name, category, one-line effect, and the Black/White bag description.
An item qualifies when PokeAPI has an English flavor-text entry for the
`black-white` version group — checked against the alternative signal
(`generation-v` among its `game_indices`) on event items and a Gen 6 control,
and the two agree. 606 items.

It does two jobs: it resolves the item names in JetBlack's own doc
(`pipeline/lib/items.ts`, with an `ITEM_ALIASES` map for the doc's spellings like
`RageCandyBar`) so each changed item carries its real name, icon and effect, and
it ships whole as the Items page's reference catalog. Item *locations* are not in
PokeAPI at all, so every location on that page still comes from the hack's doc.

Item sprites aren't stored here — they're derived from the slug in
`src/lib/sprites.ts`, off the same CDN as the Pokémon sprites.

To regenerate:

```bash
python3 - <<'EOF'
import json, urllib.request, time
from concurrent.futures import ThreadPoolExecutor

HEADERS = {"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"}
VG = "black-white"


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def fetch(url):
    d = get(url)
    flavor = next((e["text"] for e in d["flavor_text_entries"]
                   if e["language"]["name"] == "en" and e["version_group"]["name"] == VG), None)
    if flavor is None:
        return None  # not in Pokémon Black
    effect = next((e["short_effect"] for e in d["effect_entries"] if e["language"]["name"] == "en"), "")
    return d["name"], {
        "name": next((n["name"] for n in d["names"] if n["language"]["name"] == "en"), d["name"]),
        "category": d["category"]["name"],
        "effect": " ".join(effect.split()),
        "flavorText": " ".join(flavor.replace("\n", " ").replace("\x0c", " ").split()),
    }


urls = [e["url"] for e in get("https://pokeapi.co/api/v2/item?limit=3000")["results"]]
with ThreadPoolExecutor(max_workers=8) as pool:
    result = {out[0]: out[1] for out in pool.map(fetch, urls) if out}

with open("pipeline/vanilla-data/items.json", "w") as f:
    json.dump(dict(sorted(result.items())), f, indent=0, ensure_ascii=False)
EOF
```

