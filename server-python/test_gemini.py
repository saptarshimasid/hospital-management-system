import os
from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

print("Initializing ChatGoogleGenerativeAI...")
try:
    gemini_model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)
    print("Calling gemini-2.5-flash model...")
    response = gemini_model.invoke([HumanMessage(content="Hello, answer in one word: OK")])
    print("Response:")
    print(response.content)
except Exception as e:
    print("Error calling model:", e)
