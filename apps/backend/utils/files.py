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
from ..core.config import async_supabase   # already created in step-1
from ..core.models import DatasetProfile



import os

DATA_BUCKET = "test-bucket" if os.environ.get("ENVIRONMENT") == "DEV" else "datasets"

# ---------- Network / Storage -------------------------------------------

def _stream_to_storage(resp: requests.Response, storage_path: str) -> None:
    bucket, key = storage_path.split("/", 1)
    # Upload in one go (Supabase python client supports bytes)
    async_supabase.storage.from_(bucket).upload(key, resp.content, file_options={"content-type": "text/csv"})

def fetch_dataset(file_id: str) -> str:
    """Download CSV & upload to supabase storage. Returns storage path."""
    t0 = time.perf_counter()
    
    file_record = async_supabase.table("files").select("storage_path").eq("id", file_id).execute().data
    
    if not file_record or len(file_record) == 0:
        raise ValueError(f"File with ID {file_id} not found in database")
    
    storage_path = file_record[0]["storage_path"]
    
    
    return storage_path

# ---------- Profiling ----------------------------------------------------

def extract_schema_sample(file_id: str) -> DatasetProfile:
    # Get the file record from the database to retrieve storage_path
    
    storage_path = fetch_dataset(file_id)
    
    # Construct the full public URL
    bucket_name, file_key = storage_path.split('/', 1)
    public_url = async_supabase.storage.from_(bucket_name).get_public_url(file_key)
    
    # Read the CSV data from the public URL with encoding handling
    try:
        df_scan = pl.read_csv(public_url, low_memory=True, encoding="utf8")
    except Exception as utf8_error:
        print(f"UTF-8 encoding failed for {public_url}, trying utf8-lossy: {utf8_error}")
        try:
            # Try with lossy UTF-8 encoding that replaces invalid chars
            df_scan = pl.read_csv(public_url, low_memory=True, encoding="utf8-lossy")
        except Exception as lossy_error:
            print(f"UTF-8 lossy encoding failed, trying latin-1: {lossy_error}")
            try:
                # Fallback to latin-1 which can read any byte sequence
                df_scan = pl.read_csv(public_url, low_memory=True, encoding="latin-1")
            except Exception as final_error:
                print(f"All encoding attempts failed: {final_error}")
                raise ValueError(f"Unable to read CSV file due to encoding issues. Original error: {utf8_error}")

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
    
    # Construct the full public URL
    bucket_name, file_key = storage_path.split('/', 1)
    public_url = async_supabase.storage.from_(bucket_name).get_public_url(file_key)
    
    # Read the CSV data from the public URL with encoding handling
    try:
        df_scan = pl.read_csv(public_url, low_memory=True, encoding="utf8")
    except Exception as utf8_error:
        print(f"UTF-8 encoding failed for {public_url}, trying utf8-lossy: {utf8_error}")
        try:
            # Try with lossy UTF-8 encoding that replaces invalid chars
            df_scan = pl.read_csv(public_url, low_memory=True, encoding="utf8-lossy")
        except Exception as lossy_error:
            print(f"UTF-8 lossy encoding failed, trying latin-1: {lossy_error}")
            try:
                # Fallback to latin-1 which can read any byte sequence
                df_scan = pl.read_csv(public_url, low_memory=True, encoding="latin-1")
            except Exception as final_error:
                print(f"All encoding attempts failed: {final_error}")
                raise ValueError(f"Unable to read CSV file due to encoding issues. Original error: {utf8_error}")
    print(df_scan[column_name].unique().to_list())
    return df_scan[column_name].unique().to_list()


