def dollars(cents: int) -> float:
    """The warehouse keeps money in integer cents; the API speaks decimals."""
    return round(cents / 100, 2)
