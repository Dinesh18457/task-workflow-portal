import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8081").rstrip("/")

app = FastAPI(
    title="Task Workflow API Gateway",
    version="1.0.0",
)

# Fix CORS rules to allow both Vite (5173) and Create React App (3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "gateway up"}


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_api(path: str, request: Request):
    # Route mapping to direct requests smoothly down to port 8081
    if path.startswith("api/"):
        target_url = f"{BACKEND_URL}/{path}"
    else:
        target_url = f"{BACKEND_URL}/api/{path}"

    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    # CRITICAL FIX: Exclude Content-Length and Host headers to avoid h11 protocol errors
    excluded_forward_headers = ["host", "content-length", "connection"]
    headers = {
        k: v for k, v in request.headers.items() 
        if k.lower() not in excluded_forward_headers
    }

    # Fetch the exact incoming raw body payload stream
    body_content = await request.body()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            backend_response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body_content if request.method in ["POST", "PUT", "PATCH"] else None,
            )
    except httpx.ConnectError:
        return JSONResponse(
            status_code=503,
            content={"error": "Backend service unavailable", "backend": BACKEND_URL},
        )
    except httpx.HTTPError as exc:
        return JSONResponse(status_code=502, content={"error": str(exc)})

    # Filter out system hop headers from backend response mapping 
    excluded_response_headers = ["content-encoding", "content-length", "transfer-encoding", "connection"]
    response_headers = {
        k: v for k, v in backend_response.headers.items() 
        if k.lower() not in excluded_response_headers
    }

    return Response(
        content=backend_response.content,
        status_code=backend_response.status_code,
        headers=response_headers,
        media_type=backend_response.headers.get("content-type"),
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("GATEWAY_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)