from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import detect, recipes

app = FastAPI(title="Ingredient Scanner API")

# Allow requests from your React dev server and, later, your packaged app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your real frontend URL before going public
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detect.router)
app.include_router(recipes.router)


@app.get("/")
async def root():
    return {"status": "ok", "service": "ingredient-scanner-backend"}
