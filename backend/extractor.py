from google import genai
from google.genai import types
from schema import Search, Read
from dotenv import load_dotenv
load_dotenv()
import os


def get_contextual_analysis(dic, schema):
    client = genai.Client(api_key=os.getenv('API_KEY'))
    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=['Analyse the transcript provided with the corresponding timestamps and extract the infromation according to the given schema.n',dic],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Read.model_json_schema() if schema == 'Read' else Search.model_json_schema(),
            temperature=0.1
        )
    )
    return response.text