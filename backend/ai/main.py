import os
import base64
import logging
import io
import asyncio
from typing import List, Literal

import instructor
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from PIL import Image, ImageOps
from openai import AsyncOpenAI  # Standard client for Instructor

# --- 1. CONFIGURATION ---
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    HF_ACCESS_TOKEN: str
    CORS_ORIGINS: List[str] = ["*"]
    
    # We use the OpenAI-compatible endpoint from Hugging Face
    HF_BASE_URL: str = "https://api-inference.huggingface.co/v1/"
    
    VISION_MODEL_ID: str = "Qwen/Qwen2.5-VL-7B-Instruct"
    BRAIN_MODEL_ID: str = "Qwen/Qwen2.5-Coder-7B-Instruct"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

try:
    settings = Settings()
except Exception as e:
    logger.critical("❌ CONFIG ERROR: Missing .env or HF_ACCESS_TOKEN.")
    raise

# --- 2. INSTRUCTOR DATA MODELS ---
# We define STRICT types here. The LLM cannot output anything else.
SQLiteType = Literal["UUID", "TEXT", "INTEGER", "BOOLEAN", "TIMESTAMP", "JSON"]

class Column(BaseModel):
    name: str
    # THIS REPLACES THE SANITIZER FUNCTION
    # The description acts as a rule for the AI.
    type: SQLiteType = Field(
        ..., 
        description="SQL Type. CRITICAL RULES: Use 'TEXT' for URLs, Emails, Hex Colors, Names, and Keys. Use 'INTEGER' only for counts or IDs."
    )
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
    type: Literal["1:1", "1:N", "N:N"] = "1:N"

class DatabaseSchema(BaseModel):
    tables: List[Table]
    relationships: List[Relationship]

# --- 3. CLIENT SETUP ---

# Patch the OpenAI client with Instructor
# This adds the magical `response_model` argument
client = instructor.patch(
    AsyncOpenAI(
        base_url=settings.HF_BASE_URL,
        api_key=settings.HF_ACCESS_TOKEN
    ),
    mode=instructor.Mode.JSON
)

app = FastAPI(title="DB Builder AI (Instructor Powered)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. CORE LOGIC ---

def process_image(image_bytes: bytes) -> str:
    """Optimizes image for OCR (Dark Mode Inversion)."""
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        if sum(image.convert("L").resize((1,1)).getpixel((0,0))) < 128: # Fast brightness check
            logger.info("🌑 Dark mode detected. Inverting.")
            image = ImageOps.invert(image)
        image = ImageOps.autocontrast(image)
        
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
    except Exception:
        return base64.b64encode(image_bytes).decode("utf-8")

@app.post("/generate-schema", response_model=DatabaseSchema)
async def generate_schema(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(400, "Invalid file type.")

    try:
        # 1. Vision Stage (Get Description)
        # We still use standard ChatCompletion here for the "Vision" part
        content = await file.read()
        b64_img = process_image(content)
        data_url = f"data:image/png;base64,{b64_img}"
        
        logger.info("👀 Stage 1: Vision Model analyzing...")
        vision_res = await client.chat.completions.create(
            model=settings.VISION_MODEL_ID,
            messages=[{
                "role": "user", 
                "content": [
                    {"type": "text", "text": "List all tables, columns (with inferred types), and relationships in this ER diagram."},
                    {"type": "image_url", "image_url": {"url": data_url}}
                ]
            }],
            max_tokens=2000
        )
        description = vision_res.choices[0].message.content

        # 2. Instructor Stage (Strict Schema Generation)
        logger.info("🧠 Stage 2: Instructor validating...")
        
        # MAGIC HAPPENS HERE:
        # We pass the 'response_model' class directly.
        # Instructor guarantees the output matches 'DatabaseSchema' or it raises an error.
        schema = await client.chat.completions.create(
            model=settings.BRAIN_MODEL_ID,
            response_model=DatabaseSchema, 
            messages=[
                {
                    "role": "system", 
                    "content": "You are a senior Data Engineer. Extract the database schema strictly."
                },
                {
                    "role": "user", 
                    "content": f"Create the schema based on this description:\n\n{description}"
                }
            ],
            max_retries=2, # If AI messes up validation, Instructor auto-retries
        )
        
        logger.info(f"🎉 Success! Generated {len(schema.tables)} tables.")
        return schema

    except Exception as e:
        logger.error(f"AI Error: {e}")
        raise HTTPException(500, f"Processing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)