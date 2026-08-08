from fastapi import FastAPI, Request, Response, HTTPException, status
from datetime import datetime, timedelta, timezone
from fastapi.middleware.cors import CORSMiddleware
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
import extractor
import rag
import requests
from pytubefix import YouTube 
import json
import pandas as pd
import redis
from dotenv import load_dotenv
import os
import database
import schema
import keepalive
from schema import RegSchema, LoginSchema
import jwt
load_dotenv()

app = FastAPI()
origins = ['http://localhost:5503', 'http://127.0.0.1:5501', 'http://127.0.0.1:5502', 'http://127.0.0.1', '0.0.0.0', 'http://localhost:3000']

app.add_middleware(CORSMiddleware,
                   allow_origins = ['*'],
                   allow_credentials = True,
                   allow_methods = ['*'],
                   allow_headers = ['*'])

redis_client = redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=int(os.getenv('REDIS_PORT', 6379)), password=os.getenv('REDIS_PASSWORD'), decode_responses=True)

keepalive.ping()

def get_video_title(video_id):
    url = f"https://noembed.com/embed?url=https://www.youtube.com/watch?v={video_id}"
    response = requests.get(url).json()
    
    # Check if title exists in the JSON response
    if "title" in response:
        #print(response)
        return response['title']
    else:
        return "Video not found or is restricted."

@app.head("")
@app.get("/")
def health():
    return {"status": "healthy"}

@app.post("/read")
async def check_and_add(payload: Request):
    yt_api = YouTubeTranscriptApi(
        proxy_config=WebshareProxyConfig(
            proxy_username=os.getenv("PROXY_USERNAME", ''),
            proxy_password=os.getenv("PROXY_PASSWORD",'')
        ))
    data = await payload.json()
    vidId = data['url'][data['url'].index('v=')+2:data['url'].index('v=')+13]
    user = data['email']
    transcript = yt_api.fetch(video_id=vidId, languages=['en', 'hi']).to_raw_data()
    url = f'https://www.youtube.com/v={vidId}'

    try:
        ytube = YouTube(url)
        time = ytube.length
        yt = get_video_title(vidId)
        #print(yt)
    except Exception as e:
        print(f'Error: {e}')

    cache_string = redis_client.get(user+':'+str(yt))
    cache_string_unfound = redis_client.get(user+':'+str(yt)+':unfound')
    if cache_string:
        redis_client.delete(user+':'+yt)
    if cache_string_unfound:
        redis_client.delete(user+':'+str(yt)+':unfound')
    res = json.dumps(transcript)

    '''for i in transcript.snippets:
        res += f' transcript: "{i.text}", timestamp: "{i.start}"'''

    #df = pd.DataFrame(dic)

    ex_doc = json.loads(extractor.get_contextual_analysis(res, payload.headers['Schema']) or '')
    #print(ex_doc)

    ids = [keyword for keyword in ex_doc['keywords']]
    docs = [desc for desc in ex_doc['summaries']] if ex_doc is not None else ''
    metadata = {
        "video_name": yt,
        "video_id": vidId,
        "video_length": time
        }
    rag.add_to_collection(user, ids, docs, metadata)
    print('done')
    
    return {"status": "success"}

@app.post("/search")
async def search_topic(payload: Request):
    yt_api = YouTubeTranscriptApi(
        proxy_config=WebshareProxyConfig(
            proxy_username=os.getenv("PROXY_USERNAME", ''),
            proxy_password=os.getenv("PROXY_PASSWORD",'')
        ))
    data = await payload.json()
    vidId = data['url'][data['url'].index('v=')+2:data['url'].index('v=')+13]
    user = data['email']
    transcript = yt_api.fetch(video_id=vidId, languages=['en', 'hi']).to_raw_data()
    url = f'https://www.youtube.com/v={vidId}'

    try:
        ytube = YouTube(url)
        time = ytube.length
        yt = get_video_title(vidId)
        #print(yt)
    except Exception as e:
        print(f'Error: {e}')

    cache_string = redis_client.get(user+':'+str(yt))
    cache_string_unfound = redis_client.get(user+':'+str(yt)+':unfound')
    if cache_string and cache_string_unfound:
        cache_dict = json.loads(cache_string or '')
        cache_dict_unfound = json.loads(cache_string_unfound or '')
        return {"status": "successful", "data_found": cache_dict, 'data_unfound': cache_dict_unfound}

    res = json.dumps(transcript)
    
    '''for i in transcript.snippets:
        res += f' transcript: "{i.text}", timestamp: "{i.start}"'''

    ex_doc = json.loads(extractor.get_contextual_analysis(res, payload.headers['Schema']) or '')
    #print(ex_doc)
    keywords = ex_doc['keywords']
    data = [chapter['summary'] for chapter in ex_doc['chapters_list']]
    time_start = [chapter['start'] for chapter in ex_doc['chapters_list']]
    time_end = [chapter['end'] for chapter in ex_doc['chapters_list']]
    #print(data)
    dic = {
        'keyword': [],
        'description': [],
        'distance': [],
        'time_start': [],
        'time_end': []
    }
    
    dic_unfound = {
        'keywords': [],
        'descriptions': [],
        'time_start': [],
        'time_end': []
    }
    
    c = 0
    results = rag.semantic_retrieve(user, data) or {}
    #print(results)
    for distance in results['distances'] if results['distances'] else []:
        if len(distance) > 0 and distance[0] < 1:
            dic['keyword'].append(f'{results['ids'][c][0]}')
            dic['description'].append(f'{results['documents'][c][0] if results['documents'] else ''}')
            dic['distance'].append(f'{distance[0]}')
            dic['time_start'].append(f'{time_start[c]}')
            dic['time_end'].append(f'{time_end[c]}')
        else:
            dic_unfound['keywords'].append(f'{keywords[c]}')
            dic_unfound['descriptions'].append(f'{data[c]}')
            dic_unfound['time_start'].append(f'{time_start[c]}')
            dic_unfound['time_end'].append(f'{time_end[c]}')
        c += 1

    if len(dic['keyword']) > 0:
        redis_client.set(user+':'+str(yt), json.dumps(dic), ex=600)
        redis_client.set(user+':'+str(yt)+':unfound', json.dumps(dic_unfound), ex=600)
    df = pd.DataFrame(dic)
    print(df)

    return {"status": "successful", "data_found": dic, "data_unfound": dic_unfound}

@app.post("/register")
def register(payload: RegSchema, response: Response):
    database.reg(payload)
    if payload.email != None and payload.password != None:
        expires_delta = timedelta(days=30)
        max_age = 30*24*60*60

        expire = datetime.now(timezone.utc) + expires_delta
        token_data = {
            "sub": payload.email,
            "exp": expire
        }
        token = jwt.encode(payload=token_data, key=os.getenv("SALT", ''), algorithm=os.getenv("ALGORITHM"))

        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            secure=True,
            samesite='lax',
            max_age=max_age
        )
        # Also return token in body so extension can store it in chrome.storage.local
        return {"success": True, "message": "Registered", "token": token}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Invalid Credentials'
    )

@app.post("/login")
def login(payload: LoginSchema, response: Response):
    if database.login(payload)['successful']:
        expires_delta = timedelta(days=30)
        max_age = 30*24*60*60
        
        expire = datetime.now(timezone.utc) + expires_delta
        token_data = {
            "sub": payload.email,
            "exp": expire
        }
        token = jwt.encode(payload=token_data, key=os.getenv("SALT", ''), algorithm=os.getenv("ALGORITHM"))
        
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            secure=True,
            samesite='lax',
            max_age=max_age
        )
        # Also return token in body so extension can store it in chrome.storage.local
        return {"success": True, "message": "Login successful", "token": token}
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Invalid Credentials'
    )
    
    

@app.get("/auto-login")
def auto_login(request: Request):
    # Try cookie first, then fall back to Authorization: Bearer <token> header
    token = request.cookies.get("auth_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[len("Bearer "):]
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No session token found, try manual Login"
        )

    try:
        payload = jwt.decode(jwt=token, key=os.getenv("SALT", ''), algorithms=[str(os.getenv("ALGORITHM"))])
        username: str = payload.get("sub", '')
        return {"logged_in": True, "user": username}

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="session expired"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="session invalid"
        )
