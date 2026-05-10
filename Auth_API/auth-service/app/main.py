from fastapi import FastAPI
from .routers.auth import router as auth_router
from .routers.oauth import router as oauth_router

# Import Base and all models
from .core.database import engine, Base
from .models.user import User
from .models.system_log import SystemLog

app = FastAPI(title="Hospital Auth Service")

app.include_router(auth_router)
app.include_router(oauth_router)

@app.get("/")
def root():
    return {"service": "auth-service", "status": "running"}