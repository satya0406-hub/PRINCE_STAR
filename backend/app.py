from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import time
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Prince Star Neural API", version="3.2.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your GitHub Pages URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str
    history: Optional[List[dict]] = None
    system_instruction: Optional[str] = None
    systemInstruction: Optional[str] = None # Support camelCase
    custom_api_key: Optional[str] = None
    customApiKey: Optional[str] = None # Support camelCase

class ChatResponse(BaseModel):
    text: str
    latency: float

@app.get("/api/health")
async def health_check():
    return {
        "status": "Neural Core Active",
        "protocol": "3.2.0-Python",
        "uptime": time.time(),
        "node": "Render-Neural-Cluster"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    start_time = time.time()
    
    # Prioritize custom keys and handle both naming conventions
    api_key = request.custom_api_key or request.customApiKey or os.getenv("GEMINI_API_KEY")
    system_instr = request.system_instruction or request.systemInstruction or "You are Prince Star AI assistant."
    
    if not api_key:
        raise HTTPException(status_code=401, detail="Neural Core Key Missing")

    try:
        client = genai.Client(api_key=api_key)
        
        # Use the latest gemini-2.0-flash for high efficiency
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=request.prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instr,
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
        )
        
        latency = time.time() - start_time
        return ChatResponse(text=response.text, latency=latency)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/network-status")
async def network_status():
    return {
        "latency": 0,
        "node": "Global-Neural-Mesh",
        "status": "Optimal"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
