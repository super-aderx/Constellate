"""A small stand-in for the warehouse's serving contract, for the API tests.

Constellate's boundary with the data platform is the serving contract: the `serving` views (their
columns are enforced by dbt contracts in constella-data-platform, models/serving/_serving.yml),
`platform.tenants` and `meta.pipeline_runs`, read by a role that can see nothing else. This module
builds that contract in a throwaway database, with the same tenant filter on every view, and fills
it with deterministic, already aggregated data: two stores whose baskets come from themed product
groups, so the themes should come out as communities.

If the serving contract changes, change the DDL here in the same PR as the code that uses it.
"""

import random
import uuid
from collections import Counter
from datetime import UTC, date, datetime, timedelta
from itertools import combinations

import psycopg
from psycopg import sql

TEST_DB = "constella_api_test"
# A store the warehouse knows but that has no complete day yet (null last_complete_day).
QUIET_STORE = "quiet-corner"
READER = "constella_test_reader"
READER_PASSWORD = "constella_test_reader"
END = date(2026, 9, 26)
DAYS = 120
SEGMENTS = [
    (
        "champions",
        "Champions",
        "Bought recently, buy often and spend the most",
        1,
        0.35,
    ),
    ("loyal", "Loyal", "Buy often, spend a little less", 2, 0.25),
    (
        "potential",
        "Potential loyalists",
        "Recent customers buying more each month",
        3,
        0.15,
    ),
    ("new", "New customers", "First order in the last 30 days", 4, 0.1),
    ("at_risk", "At risk", "Used to buy often, less so lately", 5, 0.1),
    ("hibernating", "Hibernating", "Haven't ordered in a long while", 6, 0.05),
]

# (tenant key, name, timezone, orders a day, categories, products, themes)
# categories: slug -> (name, parent slug); products: sku -> (name, category slug, price cents)
# themes: name -> [(sku, chance of being picked when the theme is in a basket)]
STORES = [
    (
        "harbor-street",
        "Harbor Street Market",
        "Asia/Taipei",
        60,
        {
            "dairy": ("Dairy", None),
            "bakery": ("Bakery", None),
            "pantry": ("Pantry", None),
            "produce": ("Produce", None),
            "snacks": ("Snacks", None),
            "household": ("Household", None),
            "milk": ("Milk", "dairy"),
            "eggs": ("Eggs", "dairy"),
            "yogurt": ("Yogurt", "dairy"),
            "cheese": ("Cheese", "dairy"),
            "bread": ("Bread", "bakery"),
            "coffee": ("Coffee", "pantry"),
            "pasta-sauces": ("Pasta & sauces", "pantry"),
            "fruit": ("Fruit", "produce"),
            "chips-dips": ("Chips & dips", "snacks"),
            "kitchen": ("Kitchen", "household"),
        },
        {
            "HS-MILK": ("Whole Milk", "milk", 389),
            "HS-OAT": ("Oat Milk", "milk", 459),
            "HS-EGGS": ("Eggs (12)", "eggs", 449),
            "HS-YOGURT": ("Greek Yogurt", "yogurt", 529),
            "HS-PARMESAN": ("Parmesan", "cheese", 749),
            "HS-BREAD": ("Sourdough Bread", "bread", 549),
            "HS-BANANAS": ("Bananas", "fruit", 169),
            "HS-COFFEE": ("Ground Coffee", "coffee", 1199),
            "HS-FILTERS": ("Coffee Filters", "kitchen", 349),
            "HS-PASTA": ("Spaghetti", "pasta-sauces", 199),
            "HS-SAUCE": ("Tomato Sauce", "pasta-sauces", 329),
            "HS-CHIPS": ("Tortilla Chips", "chips-dips", 399),
            "HS-SALSA": ("Salsa", "chips-dips", 379),
            "HS-GUAC": ("Guacamole", "chips-dips", 549),
            # Never sold. Its SKU sorts after every "HS-" SKU byte by byte ("C"), but between
            # them under en_US collation, which is what catches cursor/ordering mismatches.
            "HSX-TOTE": ("Tote Bag", "kitchen", 299),
        },
        {
            "breakfast": [
                ("HS-MILK", 0.8),
                ("HS-EGGS", 0.6),
                ("HS-YOGURT", 0.4),
                ("HS-BREAD", 0.4),
                ("HS-BANANAS", 0.5),
            ],
            "coffee": [("HS-COFFEE", 0.9), ("HS-FILTERS", 0.4), ("HS-OAT", 0.5)],
            "pasta": [("HS-PASTA", 0.7), ("HS-SAUCE", 0.7), ("HS-PARMESAN", 0.5)],
            "game_day": [("HS-CHIPS", 0.8), ("HS-SALSA", 0.6), ("HS-GUAC", 0.4)],
        },
    ),
    (
        "maple-corner",
        "Maple Corner Grocery",
        "America/Los_Angeles",
        30,
        {"dairy": ("Dairy", None), "pantry": ("Pantry", None)},
        {
            "MC-0001": ("Whole Milk", "dairy", 249),
            "MC-0002": ("Greek Yogurt", "dairy", 499),
            "MC-0007": ("All-Purpose Flour", "pantry", 399),
            "MC-0008": ("Cane Sugar", "pantry", 349),
            "MC-0018": ("Spaghetti", "pantry", 199),
            "MC-0019": ("Marinara Sauce", "pantry", 399),
        },
        {
            "breakfast": [("MC-0001", 0.8), ("MC-0002", 0.6)],
            "baking": [("MC-0007", 0.8), ("MC-0008", 0.7)],
            "pasta": [("MC-0018", 0.8), ("MC-0019", 0.7)],
        },
    ),
]

DDL = """
create schema platform;
create schema serving;
create schema meta;
create schema fixture;  -- stands in for gold: the reader role can't see it

create table platform.tenants (
  tenant_id uuid primary key, tenant_key text unique not null, name text not null,
  timezone text not null, currency char(3) not null, created_at timestamptz not null default now()
);
create table meta.pipeline_runs (
  run_id uuid primary key, command text not null, started_at timestamptz not null,
  finished_at timestamptz not null, status text not null
);

create table fixture.categories (
  tenant_id uuid, category_id uuid, parent_id uuid, name text, slug text, top_category_id uuid
);
create table fixture.products (
  tenant_id uuid, product_id uuid, sku text, name text, brand text, category_id uuid,
  top_category_id uuid, unit text, size text, status text, price_cents bigint, currency char(3)
);
create table fixture.daily_orders (
  tenant_id uuid, day date, segment text, n_orders int, n_lines int, n_items int,
  subtotal_cents bigint, discount_cents bigint, revenue_cents bigint
);
create table fixture.daily_product (
  tenant_id uuid, day date, segment text, sku text, n_orders int, qty int, revenue_cents bigint
);
create table fixture.daily_pair (
  tenant_id uuid, day date, segment text, sku_a text, sku_b text, n_orders int
);
create table fixture.freshness (
  tenant_id uuid, first_day date, last_event_at timestamptz, last_complete_day date,
  refreshed_at timestamptz
);
create table fixture.segments (segment text, label text, description text, sort_order int);
"""

TENANT_VIEWS = [
    "categories",
    "products",
    "daily_orders",
    "daily_product",
    "daily_pair",
    "freshness",
]


def _views() -> str:
    tenant = "nullif(current_setting('app.tenant_id', true), '')::uuid"
    views = [
        f"create view serving.{v} with (security_barrier) as "
        f"select * from fixture.{v} where tenant_id = {tenant};"
        for v in TENANT_VIEWS
    ]
    views.append("create view serving.segments as select * from fixture.segments;")
    return "\n".join(views)


def _grants() -> sql.Composed:
    reader = sql.Identifier(READER)
    return sql.SQL(
        """
        grant usage on schema serving, meta, platform to {r};
        grant select on all tables in schema serving to {r};
        grant select on meta.pipeline_runs, platform.tenants to {r};
        """
    ).format(r=reader)


def _uuid(*parts: str) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, "constella-test:" + ":".join(parts))


def _store_rows(rng: random.Random, store) -> dict[str, list[tuple]]:
    key, name, tz, per_day, categories, products, themes = store
    tenant = _uuid(key)
    cat_id = {slug: _uuid(key, "category", slug) for slug in categories}
    rows: dict[str, list[tuple]] = {
        "tenants": [(tenant, key, name, tz, "USD")],
        "categories": [
            (
                tenant,
                cat_id[slug],
                cat_id[parent] if parent else None,
                cat_name,
                slug,
                cat_id[parent or slug],
            )
            for slug, (cat_name, parent) in categories.items()
        ],
        "products": [
            (
                tenant,
                _uuid(key, "product", sku),
                sku,
                p_name,
                "Test Brand",
                cat_id[cat],
                cat_id[categories[cat][1] or cat],
                "each",
                "1 ct",
                "active",
                price,
                "USD",
            )
            for sku, (p_name, cat, price) in products.items()
        ],
    }

    orders: Counter = Counter()
    lines: Counter = Counter()
    items: Counter = Counter()
    revenue: Counter = Counter()
    product: Counter = Counter()
    qty_by: Counter = Counter()
    product_revenue: Counter = Counter()
    pairs: Counter = Counter()
    theme_names = list(themes)
    seg_ids = [s[0] for s in SEGMENTS]
    seg_weights = [s[4] for s in SEGMENTS]
    for offset in range(DAYS):
        day = END - timedelta(days=DAYS - 1 - offset)
        for _ in range(per_day + rng.randint(-5, 5)):
            segment = rng.choices(seg_ids, seg_weights)[0]
            picked = rng.sample(theme_names, 2 if rng.random() < 0.15 else 1)
            basket: set[str] = set()
            for theme in picked:
                chosen: set[str] = set()
                while not chosen:
                    chosen = {sku for sku, p in themes[theme] if rng.random() < p}
                basket |= chosen
            k = (day, segment)
            orders[k] += 1
            lines[k] += len(basket)
            for sku in sorted(basket):
                qty = rng.choice([1, 1, 1, 2, 3])
                cents = qty * products[sku][2]
                items[k] += qty
                revenue[k] += cents
                product[(day, segment, sku)] += 1
                qty_by[(day, segment, sku)] += qty
                product_revenue[(day, segment, sku)] += cents
            for a, b in combinations(sorted(basket), 2):
                pairs[(day, segment, a, b)] += 1

    rows["daily_orders"] = [
        (
            tenant,
            d,
            s,
            n,
            lines[(d, s)],
            items[(d, s)],
            revenue[(d, s)],
            0,
            revenue[(d, s)],
        )
        for (d, s), n in orders.items()
    ]
    rows["daily_product"] = [
        (tenant, d, s, sku, n, qty_by[(d, s, sku)], product_revenue[(d, s, sku)])
        for (d, s, sku), n in product.items()
    ]
    rows["daily_pair"] = [(tenant, d, s, a, b, n) for (d, s, a, b), n in pairs.items()]
    last_event = datetime.combine(END + timedelta(days=1), datetime.min.time(), UTC)
    rows["freshness"] = [
        (
            tenant,
            END - timedelta(days=DAYS - 1),
            last_event,
            END,
            last_event + timedelta(hours=2),
        )
    ]
    return rows


def build(admin_url: str) -> str:
    """(Re)creates the test database and returns a connection string for the reader role."""
    with psycopg.connect(admin_url, autocommit=True) as admin:
        admin.execute(
            sql.SQL("drop database if exists {} with (force)").format(
                sql.Identifier(TEST_DB)
            )
        )
        admin.execute(sql.SQL("create database {}").format(sql.Identifier(TEST_DB)))
        exists = admin.execute(
            "select 1 from pg_roles where rolname = %s", (READER,)
        ).fetchone()
        verb = "alter" if exists else "create"
        admin.execute(
            sql.SQL(verb + " role {} login password {}").format(
                sql.Identifier(READER), sql.Literal(READER_PASSWORD)
            )
        )

    db_url = psycopg.conninfo.make_conninfo(admin_url, dbname=TEST_DB)
    rng = random.Random(7)
    with psycopg.connect(db_url) as conn:
        conn.execute(DDL)
        conn.execute(_views())
        conn.execute(_grants())
        for store in STORES:
            rows = _store_rows(rng, store)
            with conn.cursor() as cur:
                cur.executemany(
                    "insert into platform.tenants (tenant_id, tenant_key, name, timezone, currency)"
                    " values (%s, %s, %s, %s, %s)",
                    rows.pop("tenants"),
                )
                for table, table_rows in rows.items():
                    with cur.copy(
                        sql.SQL("copy fixture.{} from stdin").format(
                            sql.Identifier(table)
                        )
                    ) as copy:
                        for row in table_rows:
                            copy.write_row(row)
        quiet = _uuid(QUIET_STORE)
        conn.execute(
            "insert into platform.tenants (tenant_id, tenant_key, name, timezone, currency)"
            " values (%s, %s, 'Quiet Corner', 'UTC', 'USD')",
            (quiet, QUIET_STORE),
        )
        conn.execute(
            "insert into fixture.freshness values (%s, null, null, null, now())",
            (quiet,),
        )
        with conn.cursor() as cur, cur.copy("copy fixture.segments from stdin") as copy:
            for seg_id, label, description, order, _ in SEGMENTS:
                copy.write_row((seg_id, label, description, order))
        conn.execute(
            "insert into meta.pipeline_runs values (%s, 'build', %s, %s, 'success')",
            (uuid.uuid4(), datetime.now(UTC) - timedelta(minutes=1), datetime.now(UTC)),
        )
    return psycopg.conninfo.make_conninfo(
        admin_url, dbname=TEST_DB, user=READER, password=READER_PASSWORD
    )
