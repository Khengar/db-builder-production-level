from pydantic import BaseModel
from typing import List, Optional

class Column(BaseModel):
    name: str
    type: str
    is_primary_key: bool = False
    is_foreign_key: bool = False

class Table(BaseModel):
    name: str
    columns: List[Column]

class Relationship(BaseModel):
    from_table: str
    from_column: str
    to_table: str
    to_column: str
    type: str  # e.g., "1:1", "1:N", "N:M"

class DatabaseSchema(BaseModel):
    tables: List[Table]
    relationships: List[Relationship]