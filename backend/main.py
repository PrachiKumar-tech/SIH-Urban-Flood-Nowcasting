import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router

app = FastAPI(
    title="Urban Flood Nowcasting System (Drainage & Rainfall Coupling)",
    description="Real-time street-level flood nowcasting (0-3 hours ahead) for Smart India Hackathon 2026",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {
        "project": "Urban Flood Nowcasting System",
        "description": "Drainage and Rainfall Coupling Prototype for Smart India Hackathon 2026",
        "docs_url": "/docs",
        "api_prefix": "/api"
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
