"""In-memory stand-in for the dbt mart tables until the warehouse exists."""

import random
from dataclasses import dataclass, field
from datetime import date, timedelta
from functools import cache
from itertools import combinations


@dataclass(frozen=True)
class Category:
    id: int
    name: str
    parent_id: int | None = None


@dataclass(frozen=True)
class Product:
    id: int
    sku: str
    name: str
    category_id: int
    price: float


@dataclass
class ProductDayStats:
    n_orders: int = 0
    qty: int = 0
    revenue: float = 0.0


@dataclass
class Warehouse:
    categories: dict[int, Category]
    products: dict[int, Product]
    daily_orders: dict[date, int] = field(default_factory=dict)
    daily_product_stats: dict[date, dict[int, ProductDayStats]] = field(
        default_factory=dict
    )
    # Keys are (product_a, product_b) with product_a < product_b.
    daily_pair_stats: dict[date, dict[tuple[int, int], int]] = field(
        default_factory=dict
    )


CATEGORIES = [
    Category(1, "Dairy"),
    Category(2, "Bakery"),
    Category(3, "Produce"),
    Category(4, "Beverages"),
    Category(5, "Snacks"),
    Category(6, "Pantry"),
    Category(7, "Household"),
]

# (name, category_id, price, basket theme). Themes cut across categories so the
# network shows clusters that category reports alone would miss.
_CATALOG = [
    ("Whole Milk", 1, 2.49, "breakfast"),
    ("Greek Yogurt", 1, 4.99, "breakfast"),
    ("Sourdough Bread", 2, 5.49, "breakfast"),
    ("Bananas", 3, 1.29, "breakfast"),
    ("Ground Coffee", 4, 9.99, "breakfast"),
    ("Granola", 6, 6.49, "breakfast"),
    ("All-Purpose Flour", 6, 3.99, "baking"),
    ("Cane Sugar", 6, 3.49, "baking"),
    ("Eggs (12)", 1, 4.29, "baking"),
    ("Unsalted Butter", 1, 5.99, "baking"),
    ("Baking Soda", 6, 1.49, "baking"),
    ("Chocolate Chips", 5, 4.49, "baking"),
    ("Tortilla Chips", 5, 3.99, "party"),
    ("Salsa", 6, 4.49, "party"),
    ("Cola 6-Pack", 4, 6.99, "party"),
    ("Guacamole", 3, 5.49, "party"),
    ("Paper Plates", 7, 4.99, "party"),
    ("Spaghetti", 6, 1.99, "pasta"),
    ("Marinara Sauce", 6, 3.99, "pasta"),
    ("Parmesan", 1, 6.99, "pasta"),
    ("Garlic", 3, 0.99, "pasta"),
    ("Basil", 3, 2.49, "pasta"),
    ("Dish Soap", 7, 3.49, "cleaning"),
    ("Sponges", 7, 2.99, "cleaning"),
    ("Paper Towels", 7, 7.99, "cleaning"),
    ("Trash Bags", 7, 8.99, "cleaning"),
    ("Apples", 3, 3.99, None),
    ("Sparkling Water", 4, 4.99, None),
    ("Peanut Butter", 6, 3.79, None),
    ("Cheddar", 1, 5.49, None),
]

END_DAY = date(2026, 9, 24)
N_DAYS = 120


def _generate(seed: int = 42) -> Warehouse:
    rng = random.Random(seed)
    products = {
        i: Product(i, f"SKU-{i:04d}", name, cat, price)
        for i, (name, cat, price, _) in enumerate(_CATALOG, start=1)
    }
    themes: dict[str, list[int]] = {}
    for pid, (_, _, _, theme) in enumerate(_CATALOG, start=1):
        if theme:
            themes.setdefault(theme, []).append(pid)
    theme_names = list(themes)
    all_ids = list(products)

    wh = Warehouse(categories={c.id: c for c in CATEGORIES}, products=products)
    for offset in range(N_DAYS):
        day = END_DAY - timedelta(days=N_DAYS - 1 - offset)
        n_orders = rng.randint(120, 180)
        stats: dict[int, ProductDayStats] = {}
        pairs: dict[tuple[int, int], int] = {}
        for _ in range(n_orders):
            basket: set[int] = set()
            if rng.random() < 0.75:
                members = themes[rng.choice(theme_names)]
                basket.update(rng.sample(members, rng.randint(2, min(4, len(members)))))
            basket.update(rng.sample(all_ids, rng.randint(0 if basket else 1, 2)))
            for pid in basket:
                qty = rng.randint(1, 3)
                s = stats.setdefault(pid, ProductDayStats())
                s.n_orders += 1
                s.qty += qty
                s.revenue += round(qty * products[pid].price, 2)
            for a, b in combinations(sorted(basket), 2):
                pairs[(a, b)] = pairs.get((a, b), 0) + 1
        wh.daily_orders[day] = n_orders
        wh.daily_product_stats[day] = stats
        wh.daily_pair_stats[day] = pairs
    return wh


@cache
def warehouse() -> Warehouse:
    return _generate()
