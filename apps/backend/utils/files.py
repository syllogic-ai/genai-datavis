"""
Dataset-related helpers:
  • insert_file_row         -> add row to Supabase.files (status="processing")
  • fetch_dataset           -> stream CSV from URL → Supabase Storage
  • extract_schema_sample   -> return DatasetProfile + insert meta row
All functions are independent of FastAPI routes.
"""

from __future__ import annotations
import uuid, io, time, typing as t, requests, polars as pl, duckdb
from datetime import datetime, timezone
from supabase import Client
from ..core.config import supabase   # already created in step-1
from ..core.models import DatasetProfile



import os

DATA_BUCKET = "test-bucket" if os.environ.get("ENVIRONMENT") == "DEV" else "datasets"

# ---------- Network / Storage -------------------------------------------

def _stream_to_storage(resp: requests.Response, storage_path: str) -> None:
    bucket, key = storage_path.split("/", 1)
    # Upload in one go (Supabase python client supports bytes)
    supabase.storage.from_(bucket).upload(key, resp.content, file_options={"content-type": "text/csv"})

def fetch_dataset(file_id: str) -> str:
    """Download CSV & upload to supabase storage. Returns storage path."""
    t0 = time.perf_counter()
    
    file_record = supabase.table("files").select("storage_path").eq("id", file_id).execute().data
    
    if not file_record or len(file_record) == 0:
        raise ValueError(f"File with ID {file_id} not found in database")
    
    storage_path = file_record[0]["storage_path"]
    
    
    return storage_path

# ---------- Profiling ----------------------------------------------------

def extract_schema_sample(file_id: str) -> DatasetProfile:
    # Get the file record from the database to retrieve storage_path
    
    storage_path = fetch_dataset(file_id)
    
    # Read the CSV data
    df_scan = pl.read_csv(storage_path, low_memory=True)

    # Transform columns to a dictionary of column_name: data_type
    columns_dict = {col: str(df_scan[col].dtype) for col in df_scan.columns}
    
    profile = DatasetProfile(
        columns=columns_dict,
        sample_rows=df_scan.head(5).to_dicts()
    )

   
    return profile 

def get_column_unique_values(file_id: str, column_name: str) -> list[str]:
    """
    Get unique values for a given column.
    """
    storage_path = fetch_dataset(file_id)
    df_scan = pl.read_csv(storage_path, low_memory=True)
    print(df_scan[column_name].unique().to_list())
    return df_scan[column_name].unique().to_list()


