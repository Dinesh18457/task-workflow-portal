import os
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

# --- Microservice URLs Configuration ---
# 1. Spring Boot handles Authentication & Roles (PostgreSQL)
SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "http://localhost:8081").rstrip("/")
# 2. Node.js handles Tasks Workflows & CRUD (MongoDB)
NODE_JS_URL = os.getenv("NODE_JS_URL", "http://localhost:5000").rstrip("/")

app = FastAPI(
    title="Intelligent Polyglot API Gateway",
    version="2.0.0",
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
    return {
        "status": "gateway up",
        "routing_targets": {
            "auth_service": SPRING_BOOT_URL,
            "task_service": NODE_JS_URL
        }
    }


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_api(path: str, request: Request):
    
    # -------------------------------------------------------------
    # CRITICAL WORKFLOW ROUTING INTELLIGENCE
    # -------------------------------------------------------------
    # If the path concerns auth (login, signup, user accounts), direct it to Spring Boot.
    # If the path concerns tasks, divert it entirely to the Node.js / MongoDB service.
    # -------------------------------------------------------------
    if "auth" in path or "user" in path or "members" in path:
        target_backend = SPRING_BOOT_URL
        # Ensure the sub-path formatting matches Spring Boot expectations
        formatted_path = path if path.startswith("api/") else f"api/{path}"
        target_url = f"{target_backend}/{formatted_path}"
    else:
        target_backend = NODE_JS_URL
        # Maps directly to Node.js /api/node/tasks structure
        target_url = f"{target_backend}/api/node/tasks"
        
        # If the frontend passes a specific document ID target (e.g., /api/tasks/5)
        path_segments = path.strip("/").split("/")
        if len(path_segments) > 1 and path_segments[-1].isdigit():
            target_url = f"{target_url}/{path_segments[-1]}"

    # Attach query parameters if they exist
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"

    # Exclude protocol headers to avoid h11 issues
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
            content={"error": f"Target microservice down", "target": target_url},
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