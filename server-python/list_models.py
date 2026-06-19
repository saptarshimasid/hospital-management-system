import os
from dotenv import load_dotenv
load_dotenv()

from google import genai

api_key = os.getenv("GOOGLE_API_KEY")
print("API KEY length:", len(api_key) if api_key else 0)
print("API KEY prefix:", api_key[:10] if api_key else "")

try:
    client = genai.Client(api_key=api_key)
    print("Available models:")
    for m in client.models.list():
        print(m.name)
except Exception as e:
    print("Error listing models:", e)
