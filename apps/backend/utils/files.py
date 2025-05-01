"""
Dataset-related helpers:
  • insert_file_row         -> add row to Supabase.files (status="processing")
  • fetch_dataset           -> stream CSV from URL → Supabase Storage
  • extract_schema_sample   -> return DatasetProfile + insert meta row
All functions are independent of FastAPI routes.
"""

from __future__ import annotations
import uuid, io, time, typing as t, requests, polars as pl, duckdb
from datetime import datetime
from supabase import Client
from ..core.config import supabase   # already created in step-1
from ..core.models import DatasetProfile



import os

DATA_BUCKET = "test-bucket" if os.environ.get("ENVIRONMENT") == "DEV" else "datasets"

# ---------- DB helpers --------------------------------------------------

def insert_file_row(user_id: str, file_url: str) -> str:
    file_id = str(uuid.uuid4())
    supabase.table("files").insert({
        "id": file_id,
        "user_id": user_id,
        "file_type": "original",
        "storage_path": f"{DATA_BUCKET}/{file_id}.csv",
        "original_filename": file_url.split("/")[-1][:128],
        "status": "processing",
        "created_at": datetime.now(datetime.UTC).isoformat()
    }).execute()
    return file_id

# ---------- Network / Storage -------------------------------------------

def _stream_to_storage(resp: requests.Response, storage_path: str) -> None:
    bucket, key = storage_path.split("/", 1)
    # Upload in one go (Supabase python client supports bytes)
    supabase.storage.from_(bucket).upload(key, resp.content, file_options={"content-type": "text/csv"})

def fetch_dataset(url: str, file_id: str) -> str:
    """Download CSV & upload to supabase storage. Returns storage path."""
    t0 = time.perf_counter()
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    storage_path = f"{DATA_BUCKET}/{file_id}.csv"
    _stream_to_storage(resp, storage_path)

    # mark row ready
    supabase.table("files").update({
        "status": "ready"
    }).eq("id", file_id).execute()

    print(f"Fetched dataset in {time.perf_counter()-t0:.1f}s → {storage_path}")
    return storage_path

# ---------- Profiling ----------------------------------------------------

def extract_schema_sample(file_id: str) -> DatasetProfile:
    storage_path = f"{DATA_BUCKET}/{file_id}.csv"
    signed_url = supabase.storage.from_(DATA_BUCKET).get_public_url(f"{file_id}.csv")
    df_scan = pl.read_csv(signed_url, low_memory=True)

    profile = DatasetProfile(
        columns=df_scan.columns,
        dtypes=[str(dt) for dt in df_scan.dtypes],
        null_pct=[(df_scan[col].null_count() / df_scan.shape[0]) * 100 for col in df_scan.columns],
        sample=df_scan.head(5).to_dicts()
    )

    # write meta json as a separate files row
    supabase.table("files").insert({
        "user_id": supabase.table("files").select("user_id").eq("id", file_id).execute().data[0]["user_id"],
        "file_type": "meta",
        "storage_path": f"{DATA_BUCKET}/{file_id}.meta.json",
        "status": "ready",
        "created_at": datetime.now(datetime.UTC).isoformat()
    }).execute()
    supabase.storage.from_(DATA_BUCKET).upload(f"{file_id}.meta.json",
                                               profile.model_dump_json().encode(),
                                               file_options={"content-type": "application/json"})

    return profile 