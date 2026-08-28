#!/usr/bin/env python3
"""
Embed the Rally activity taxonomy with OpenAI and load it into
ClickHouse's activity_taxonomy_src table, then reload the dictionary.

Env vars required:
  OPENAI_API_KEY
  CLICKHOUSE_HOST      e.g. https://<instance>.clickhouse.cloud:8443
  CLICKHOUSE_USER      e.g. default
  CLICKHOUSE_PASSWORD

Usage:
  pip install requests
  python scripts/embed_taxonomy.py
"""

import json
import os
import sys

import requests

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
CLICKHOUSE_HOST = os.environ.get("CLICKHOUSE_HOST")
CLICKHOUSE_USER = os.environ.get("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.environ.get("CLICKHOUSE_PASSWORD")

EMBEDDING_MODEL = "text-embedding-3-small"  # 1536 dims

# ---------------------------------------------------------------------------
# Taxonomy: (activity_key, family_key, display_name)
# family_key drives the "same family" scoring bonus AND the human-readable
# adjacency path shown on match cards, e.g. "pickleball -> Racquet Sports -> tennis".
# Mix target: ~55% fun, ~25% care/help, ~10% campus, ~10% senior/social.
# ---------------------------------------------------------------------------
FAMILY_DISPLAY = {
    "racquet_sports": "Racquet Sports",
    "team_sports": "Team Sports",
    "endurance": "Endurance & Outdoors",
    "tabletop_games": "Tabletop & Games",
    "food_social": "Food & Social",
    "care_help": "Neighborhood Help",
    "campus_need": "Campus Essentials",
    "senior_social": "Companionship",
}

TAXONOMY = [
    # racquet_sports (fun)
    ("pickleball", "racquet_sports", "Pickleball"),
    ("tennis", "racquet_sports", "Tennis"),
    ("badminton", "racquet_sports", "Badminton"),
    ("squash", "racquet_sports", "Squash"),
    ("table_tennis", "racquet_sports", "Table Tennis"),
    ("racquetball", "racquet_sports", "Racquetball"),
    # team_sports (fun)
    ("basketball_pickup", "team_sports", "Pickup Basketball"),
    ("soccer_pickup", "team_sports", "Pickup Soccer"),
    ("volleyball_beach", "team_sports", "Beach Volleyball"),
    ("flag_football", "team_sports", "Flag Football"),
    ("ultimate_frisbee", "team_sports", "Ultimate Frisbee"),
    ("softball_pickup", "team_sports", "Pickup Softball"),
    # endurance (fun)
    ("running_partner", "endurance", "Running Partner"),
    ("cycling_group_ride", "endurance", "Group Cycling Ride"),
    ("hiking", "endurance", "Hiking"),
    ("rock_climbing_gym", "endurance", "Indoor Rock Climbing"),
    ("swimming_laps", "endurance", "Lap Swimming"),
    ("yoga_outdoor", "endurance", "Outdoor Yoga"),
    # tabletop_games (fun)
    ("board_game_night", "tabletop_games", "Board Game Night"),
    ("chess", "tabletop_games", "Chess"),
    ("poker_casual", "tabletop_games", "Casual Poker"),
    ("dnd_oneshot", "tabletop_games", "D&D One-Shot"),
    ("trivia_night", "tabletop_games", "Trivia Night"),
    # food_social (fun)
    ("coffee_meetup", "food_social", "Coffee Meetup"),
    ("lunch_buddy", "food_social", "Lunch Buddy"),
    ("dinner_potluck", "food_social", "Dinner Potluck"),
    ("happy_hour", "food_social", "Happy Hour"),
    ("farmers_market_walk", "food_social", "Farmers Market Walk"),
    ("cooking_together", "food_social", "Cooking Together"),

    # care_help (impact -- neighborhoods)
    ("hang_shelf", "care_help", "Hanging a Shelf"),
    ("fix_leaky_faucet", "care_help", "Fixing a Leaky Faucet"),
    ("jump_start_car", "care_help", "Jump-Starting a Car"),
    ("move_furniture", "care_help", "Moving Furniture"),
    ("move_apartment_help", "care_help", "Apartment Move Help"),
    ("grocery_run", "care_help", "Grocery Run"),
    ("ride_to_medical_appointment", "care_help", "Ride to a Medical Appointment"),
    ("ride_to_airport", "care_help", "Ride to the Airport"),
    ("borrow_a_tool", "care_help", "Borrowing a Tool"),
    ("dog_walking_favor", "care_help", "Dog Walking Favor"),
    ("tech_setup_help", "care_help", "Tech Setup Help"),
    ("pet_sitting_favor", "care_help", "Pet Sitting Favor"),

    # campus_need (impact -- campus)
    ("borrow_charger", "campus_need", "Borrowing a Charger"),
    ("borrow_umbrella", "campus_need", "Borrowing an Umbrella"),
    ("textbook_loan", "campus_need", "Textbook Loan"),
    ("study_partner", "campus_need", "Study Partner"),
    ("spare_period_product", "campus_need", "Spare Period Product"),

    # senior_social (impact -- seniors)
    ("companionship_visit", "senior_social", "Companionship Visit"),
    ("phone_tech_help", "senior_social", "Phone Tech Help"),
    ("cribbage_partner", "senior_social", "Cribbage Partner"),
    ("garden_club", "senior_social", "Garden Club"),
    ("chair_yoga_partner", "senior_social", "Chair Yoga Partner"),
]


def build_embedding_text(activity_key, family_key, display_name, all_rows):
    """Enrich the embed text with family + sibling context so cosineDistance
    genuinely captures 'pickleball is close to tennis' rather than embedding
    a bare 2-word label."""
    siblings = [r[2] for r in all_rows if r[1] == family_key and r[0] != activity_key]
    family_label = FAMILY_DISPLAY[family_key]
    sibling_str = ", ".join(siblings[:5])
    return f"{display_name}. Category: {family_label}. Related activities: {sibling_str}."


def get_embeddings(texts):
    resp = requests.post(
        "https://api.openai.com/v1/embeddings",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={"model": EMBEDDING_MODEL, "input": texts},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()["data"]
    # API preserves input order, but sort by index defensively
    data.sort(key=lambda d: d["index"])
    return [d["embedding"] for d in data]


def ch_query(sql, data=None):
    resp = requests.post(
        CLICKHOUSE_HOST,
        params={"query": sql} if data is not None else None,
        data=data if data is not None else sql,
        auth=(CLICKHOUSE_USER, CLICKHOUSE_PASSWORD),
        timeout=60,
    )
    if not resp.ok:
        raise RuntimeError(f"ClickHouse error {resp.status_code}: {resp.text}")
    return resp.text


def main():
    missing = [
        name
        for name, val in [
            ("OPENAI_API_KEY", OPENAI_API_KEY),
            ("CLICKHOUSE_HOST", CLICKHOUSE_HOST),
            ("CLICKHOUSE_PASSWORD", CLICKHOUSE_PASSWORD),
        ]
        if not val
    ]
    if missing:
        print(f"Missing env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)

    print(f"Embedding {len(TAXONOMY)} taxonomy leaves with {EMBEDDING_MODEL}...")
    texts = [build_embedding_text(k, f, d, TAXONOMY) for (k, f, d) in TAXONOMY]
    embeddings = get_embeddings(texts)
    print(f"Got {len(embeddings)} embeddings, dim={len(embeddings[0])}")

    print("Truncating activity_taxonomy_src (idempotent re-run)...")
    ch_query("TRUNCATE TABLE activity_taxonomy_src")

    print("Inserting rows...")
    rows = []
    for (activity_key, family_key, display_name), emb in zip(TAXONOMY, embeddings):
        rows.append(
            json.dumps(
                {
                    "activity_key": activity_key,
                    "family_key": family_key,
                    "display_name": display_name,
                    "parent_path": FAMILY_DISPLAY[family_key],
                    "embedding": emb,
                }
            )
        )
    body = "\n".join(rows)
    ch_query("INSERT INTO activity_taxonomy_src FORMAT JSONEachRow", data=body)

    print("Reloading dictionary...")
    ch_query("SYSTEM RELOAD DICTIONARY activity_dict")

    count = ch_query("SELECT count() FROM activity_taxonomy_src FORMAT TSV").strip()
    print(f"Done. activity_taxonomy_src has {count} rows.")
    print("Sanity check:")
    print(ch_query(
        "SELECT activity_key, dictGet('activity_dict','parent_path',activity_key) "
        "FROM activity_taxonomy_src LIMIT 5 FORMAT PrettyCompact"
    ))


if __name__ == "__main__":
    main()
