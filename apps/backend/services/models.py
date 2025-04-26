"""
Extended models for services module that complement the core models.
These models are specifically used by the services functionality.
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, ConfigDict


class DatasetProfile(BaseModel):
    """
    Enhanced version of the DatasetProfile with additional analytics fields.
    Used for providing detailed information about dataset columns including
    data types and null value percentages.
    """
    columns: List[str] # Column names
    dtypes: List[str] # Column data types
    null_pct: List[float] # how many nulls
    sample: List[Dict[str, Any]] # Sample rows
    model_config = ConfigDict(extra="forbid") 