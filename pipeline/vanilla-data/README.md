# Vanilla reference data

`types.json` maps National Dex number → type(s), for #1–649. It comes from
[PokeAPI](https://pokeapi.co/), not from JetBlack's own documentation — JetBlack
explicitly does not change Pokémon types ("no Type changes" per the author's
feature list), so this is safe, unlike everything else in `pipeline/`, to treat
as static and never regenerate when a new hack version's `.txt` files drop in.

To regenerate (only needed if this file is ever lost or PokeAPI corrects a
historical type assignment):

```bash
python3 - <<'EOF'
import json, urllib.request, time

TYPES = ["normal","fighting","flying","poison","ground","rock","bug","ghost","steel",
         "fire","water","grass","electric","psychic","ice","dragon","dark","fairy"]

result = {}
for t in TYPES:
    req = urllib.request.Request(f"https://pokeapi.co/api/v2/type/{t}",
                                  headers={"User-Agent": "Mozilla/5.0 (jetblack-docs data pipeline)"})
    with urllib.request.urlopen(req, timeout=15) as r:
        data = json.load(r)
    for entry in data["pokemon"]:
        pid = int(entry["pokemon"]["url"].rstrip("/").split("/")[-1])
        if pid <= 649:
            result.setdefault(pid, {})[entry["slot"]] = t
    time.sleep(0.05)

out = {str(pid): [slots[s] for s in sorted(slots)] for pid, slots in result.items()}
with open("pipeline/vanilla-data/types.json", "w") as f:
    json.dump(out, f, indent=0)
EOF
```

`evolutions.json` lists every vanilla Pokémon Black evolution edge (`fromId`/`from`/`toId`/`to`/`method`), also from PokéAPI. JetBlack's own "Evolution Changes" doc only lists methods it *altered*, so this fills in the rest — see `buildEvolutionLookup` in `pipeline/vanilla-data.ts` for how the two are merged (hack-documented pair always wins).

`species-info.json` maps National Dex number → height, weight, gender ratio, egg groups, catch rate, hatch cycle, dex category ("genus"), and Gen 5 Pokédex flavor text (filtered to the *Black* version specifically, not a later remake). None of these are documented anywhere in JetBlack's own `.txt` files — the hack's feature list never claims to change them — so, like `types.json`, this is safe to treat as static and never regenerate for a new hack version.

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
    }
    time.sleep(0.02)

with open("pipeline/vanilla-data/species-info.json", "w") as f:
    json.dump(result, f, indent=0, ensure_ascii=False)
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
