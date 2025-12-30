# Use official lightweight Python image
FROM python:3.11-slim

# Set working directory inside container
WORKDIR /app

# 1. Install dependencies first (Caching layer)
# This prevents re-installing all pip packages every time you change 1 line of code.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 8000

# Start the application
# host 0.0.0.0 is required for Docker to expose the server outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]