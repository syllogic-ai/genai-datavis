import pytest
from apps.backend.services.sql import guard_sql

def test_guard_allows_select():
    safe = guard_sql("SELECT 1;")
    assert safe.startswith("SELECT")

@pytest.mark.parametrize("bad", [
    "DROP TABLE users;",
    "DELETE FROM v;",
    "SELECT * FROM v; DROP TABLE v;"
])
def test_guard_blocks_ddl(bad):
    with pytest.raises(ValueError):
        guard_sql(bad) 