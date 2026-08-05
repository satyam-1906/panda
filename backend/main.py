from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
import pandas as pd

app = FastAPI()
origins = ['http://localhost:5503', 'http://127.0.0.1:5501', 'http://127.0.0.1:5502', 'http://127.0.0.1', '0.0.0.0', 'http://localhost:3000']

app.add_middleware(CORSMiddleware,
                   allow_origins = ['*'],
                   allow_credentials = True,
                   allow_methods = ['*'],
                   allow_headers = ['*'])

@app.head("")
@app.get("/")
def health():
    return {"status": "healthy"}

@app.post("/get-transcript")
async def parse_html(payload: Request):
    yt_api = YouTubeTranscriptApi()
    data = await payload.json()
    vidId = data['url'][data['url'].index('v=')+2:data['url'].index('v=')+13]
    transcript = yt_api.fetch(video_id=vidId, preserve_formatting=True)

    dic = {
        "transcript": [i.text for i in transcript.snippets],
        "time-stamp": [i.start for i in transcript.snippets]
    }

    df = pd.DataFrame(dic)

    print(df.to_string())
    
    return {"status": "success"}