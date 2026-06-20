from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from agent import run_copilot
from langchain_core.messages import HumanMessage, AIMessage

app = FastAPI(title="Health Copilot AI Service", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessageModel(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    prompt: str
    history: Optional[List[ChatMessageModel]] = []

@app.get("/")
def read_root():
    return {"status": "online", "service": "Health Copilot AI Engine"}

@app.post("/api/chat")
def chat_endpoint(request: ChatRequest):
    try:
        # Convert history model into Langchain messages format
        chat_history = []
        for msg in request.history:
            if msg.role == "user":
                chat_history.append(HumanMessage(content=msg.content))
            else:
                chat_history.append(AIMessage(content=msg.content))
        
        result = run_copilot(request.prompt, chat_history)
        return {
            "success": True,
            "category": result["category"],
            "response": result["response"]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        err_str = str(e)
        is_quota = "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower() or "429" in err_str
        is_unavailable = "UNAVAILABLE" in err_str or "503" in err_str or "high demand" in err_str.lower()
        
        if is_quota:
            response_text = (
                "### ⚠️ System Advisory: AI Rate Limit Encountered\n\n"
                "The clinical command center AI Copilot is currently experiencing provider-side rate limits on the Free Tier API quota.\n\n"
                "> **Action Required:** Please wait 30–60 seconds and submit your query again.\n\n"
                "**Clinical Directive:** Attending staff must monitor patient status and vital telemetry directly via bedside monitors and the central EHR command board."
            )
        elif is_unavailable:
            response_text = (
                "### ⚠️ System Advisory: AI Engine Under High Demand\n\n"
                "The AI Copilot services are temporarily experiencing a spike in model demand from the API gateway.\n\n"
                "> **Action Required:** Please wait a moment and try your query again.\n\n"
                "**Clinical Directive:** Attending staff must monitor patient status and vital telemetry directly via bedside monitors and the central EHR command board."
            )
        else:
            response_text = (
                f"### ⚠️ System Advisory: AI Copilot Offline\n\n"
                f"An unexpected internal error occurred: `{err_str}`\n\n"
                "> **Action Required:** Please retry in a few moments.\n\n"
                "**Clinical Directive:** Please verify patient chart data directly with the command console."
            )
            
        return {
            "success": True,
            "category": "general",
            "response": response_text
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
