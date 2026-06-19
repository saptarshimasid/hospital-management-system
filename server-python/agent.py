import os
from typing import TypedDict, List, Dict, Any
from dotenv import load_dotenv
load_dotenv()

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from pymongo import MongoClient

# Define Agent State
class AgentState(TypedDict):
    messages: List[BaseMessage]
    category: str
    intermediate_response: str
    final_response: str

# Initialize LLMs
gemini_model = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.2, max_retries=1)
openai_model = gemini_model

# Initialize MongoDB & local vector search collection
mongo_client = MongoClient(os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017"))
db = mongo_client["health_copilot"]
vector_collection = db["chat_vectors"]

# Initialize Google Generative AI Embeddings
embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")

def cosine_similarity(v1, v2):
    dot_product = sum(x * y for x, y in zip(v1, v2))
    magnitude_v1 = sum(x * x for x in v1) ** 0.5
    magnitude_v2 = sum(y * y for y in v2) ** 0.5
    if not magnitude_v1 or not magnitude_v2:
        return 0.0
    return dot_product / (magnitude_v1 * magnitude_v2)

def get_relevant_context(query: str, limit: int = 1) -> str:
    try:
        query_vector = embeddings.embed_query(query)
        docs = list(vector_collection.find({"embedding": {"$exists": True}}))
        if not docs:
            return ""
            
        results = []
        for doc in docs:
            sim = cosine_similarity(query_vector, doc["embedding"])
            results.append((sim, doc))
            
        results.sort(key=lambda x: x[0], reverse=True)
        relevant_docs = results[:limit]
        
        context_parts = []
        for sim, doc in relevant_docs:
            if sim > 0.65: # set reasonable threshold for similarity
                context_parts.append(
                    f"Previous Query (Similarity: {sim:.2f}):\n"
                    f"User: {doc['prompt']}\n"
                    f"AI: {doc['response']}\n"
                )
        if context_parts:
            return "\n=== RELEVANT HISTORICAL AI CONTEXT ===\n" + "\n".join(context_parts) + "\n=======================================\n"
    except Exception as e:
        print(f"[VectorDB] Similarity search error: {e}", flush=True)
    return ""

def get_content_str(content) -> str:
    if isinstance(content, str):
        return content
    elif isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and "text" in part:
                parts.append(part["text"])
        return "".join(parts)
    return str(content)

# 1. Triage Node (Classify user query)
def triage_node(state: AgentState) -> Dict[str, Any]:
    print("[Agent] Entering triage_node...", flush=True)
    last_message = state["messages"][-1].content
    
    triage_prompt = (
        "You are an AI Triage assistant for a clinical command center.\n"
        "Classify the following user message into one of three categories:\n"
        "1. 'clinical' - General medical inquiries, symptom interpretation, patient vital alerts, medication questions.\n"
        "2. 'diagnostic' - Requesting a step-by-step diagnostic plan, complex case analysis, or treatment scheduling guidelines.\n"
        "3. 'general' - General greetings, administrative questions, dashboard guide, or standard chat.\n\n"
        f"User Message: {last_message}\n\n"
        "Respond with exactly one word: 'clinical', 'diagnostic', or 'general'."
    )
    
    # Use Gemini for fast classification
    print("[Agent] Invoking gemini_model for triage...", flush=True)
    response = gemini_model.invoke([HumanMessage(content=triage_prompt)])
    print("[Agent] Gemini response received.", flush=True)
    category = get_content_str(response.content).strip().lower()
    print(f"[Agent] Classified category: {category}", flush=True)
    
    # Fallback/validation
    if category not in ["clinical", "diagnostic", "general"]:
        category = "general"
        
    return {"category": category}

# 2. Clinical Expert Node
def clinical_expert_node(state: AgentState) -> Dict[str, Any]:
    print("[Agent] Entering clinical_expert_node...", flush=True)
    last_message = state["messages"][-1].content
    
    # Retrieve relevant historical vector context
    history_context = get_relevant_context(last_message)
    
    system_prompt = (
        "You are an expert Clinical Decision Support Agent.\n"
        "Analyze the clinical question or patient vitals. Provide accurate, evidence-based guidance.\n"
        "Keep your output clear, concise, and structured for quick reading under high-pressure clinical shifts.\n"
        "Always prepend a brief high-priority alert status if vitals are out of bounds.\n"
        "Crucial: End with a warning that the final decision rests with the attending medical professional."
    )
    
    prompt_content = f"{system_prompt}\n\n"
    if history_context:
        prompt_content += f"{history_context}\n"
    prompt_content += f"Clinical prompt: {last_message}"
    
    messages = [
        HumanMessage(content=prompt_content)
    ]
    
    print("[Agent] Invoking gemini_model for clinical expert...", flush=True)
    response = gemini_model.invoke(messages)
    print("[Agent] Clinical response received.", flush=True)
    return {"intermediate_response": get_content_str(response.content)}

# 3. Diagnostic Planner Node
def diagnostic_planner_node(state: AgentState) -> Dict[str, Any]:
    last_message = state["messages"][-1].content
    
    # Retrieve relevant historical vector context
    history_context = get_relevant_context(last_message)
    
    system_prompt = (
        "You are an AI Diagnostic Pathways Architect.\n"
        "Build a comprehensive, step-by-step diagnostic and treatment assessment pathway for the described case.\n"
        "Incorporate triage steps, laboratory requests, imaging studies, and differential diagnosis considerations.\n"
        "Structure the steps logically (Step 1, Step 2, Step 3) with clinical rationale for each step."
    )
    
    prompt_content = f"{system_prompt}\n\n"
    if history_context:
        prompt_content += f"{history_context}\n"
    prompt_content += f"Case Detail: {last_message}"
    
    messages = [
        HumanMessage(content=prompt_content)
    ]
    
    response = openai_model.invoke(messages)
    return {"intermediate_response": get_content_str(response.content)}

# 4. General Support Node
def general_support_node(state: AgentState) -> Dict[str, Any]:
    last_message = state["messages"][-1].content
    
    system_prompt = (
        "You are the Health Copilot Command assistant.\n"
        "Help the user navigate the platform or answer general hospital admin/operation questions.\n"
        "Be professional, friendly, and brief."
    )
    
    messages = [
        HumanMessage(content=f"{system_prompt}\n\nUser request: {last_message}")
    ]
    
    response = gemini_model.invoke(messages)
    return {"intermediate_response": get_content_str(response.content)}

# 5. Standardizer / Formatting Node
def standardizer_node(state: AgentState) -> Dict[str, Any]:
    print("[Agent] Entering standardizer_node...", flush=True)
    raw_response = state.get("intermediate_response", "")
    category = state.get("category", "general").upper()
    
    formatting_prompt = (
        "You are a Clinical UI Copywriter.\n"
        "Take the following clinical response and format it beautifully with clean Markdown.\n"
        "Ensure there are clear headers, bold keywords, and bullet points where appropriate.\n"
        "Do not alter the medical core message or clinical warnings, but make it fit a modern dark-theme dashboard UI.\n"
        "Wrap key warning messages in blockquotes or clean containers.\n\n"
        f"Category: {category}\n"
        f"Raw Response:\n{raw_response}"
    )
    
    print("[Agent] Invoking gemini_model for standardizer...", flush=True)
    response = gemini_model.invoke([HumanMessage(content=formatting_prompt)])
    print("[Agent] Standardizer response received.", flush=True)
    return {"final_response": get_content_str(response.content)}

# Route after triage
def triage_router(state: AgentState) -> str:
    category = state.get("category", "general")
    if category == "clinical":
        return "clinical_expert"
    elif category == "diagnostic":
        return "diagnostic_planner"
    else:
        return "general_support"

# Compile LangGraph Workflow
def build_workflow():
    workflow = StateGraph(AgentState)
    
    # Add Nodes
    workflow.add_node("triage", triage_node)
    workflow.add_node("clinical_expert", clinical_expert_node)
    workflow.add_node("diagnostic_planner", diagnostic_planner_node)
    workflow.add_node("general_support", general_support_node)
    workflow.add_node("standardizer", standardizer_node)
    
    # Define Edges
    workflow.set_entry_point("triage")
    
    workflow.add_conditional_edges(
        "triage",
        triage_router,
        {
            "clinical_expert": "clinical_expert",
            "diagnostic_planner": "diagnostic_planner",
            "general_support": "general_support"
        }
    )
    
    workflow.add_edge("clinical_expert", "standardizer")
    workflow.add_edge("diagnostic_planner", "standardizer")
    workflow.add_edge("general_support", "standardizer")
    
    workflow.add_edge("standardizer", END)
    
    return workflow.compile()

# Build client-facing execution function
graph = build_workflow()

def run_copilot(prompt: str, chat_history: List[BaseMessage] = None) -> Dict[str, Any]:
    if chat_history is None:
        chat_history = []
    
    inputs = {
        "messages": chat_history + [HumanMessage(content=prompt)]
    }
    
    result = graph.invoke(inputs)
    response_text = result.get("final_response", "")

    # Save to MongoDB local Vector collection
    try:
        if response_text:
            vector = embeddings.embed_query(prompt)
            vector_collection.insert_one({
                "prompt": prompt,
                "response": response_text,
                "category": result.get("category"),
                "embedding": vector
            })
            print("[VectorDB] Inserted Q&A vector into MongoDB collection", flush=True)
    except Exception as e:
        print(f"[VectorDB] Save vector error: {e}", flush=True)

    return {
        "category": result.get("category"),
        "response": response_text,
    }
