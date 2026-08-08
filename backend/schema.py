from pydantic import BaseModel, Field
from typing import Any, List, Optional, Dict

class Chapter(BaseModel):
    name: str = Field(description='Name of the topic discussed in the chapter.', default='')
    summary: str = Field(description='The summary of all the topics and content discussed in the entire chapter.', default='')
    start: str = Field(description='The starting timestamp in seconds of the chapter.', default='')
    end: str = Field(description='The ending timestamp in seconds of the chapter.', default='')

class Search(BaseModel):
    chapters_list: List[Chapter]
    keywords: List[str] = Field(description='List of all the main keywords and concepts used across the entire video.', default=[])

class Read(BaseModel):
    keywords: List[str] = Field(description='List of all the keywords and major concepts mentioned in the video.', default=[])
    summaries: List[str] = Field(description='List of the summaries or descriptions of each keyword and concept mentioned in the video. Give a description for each extracted concept or keyword mentioned in the above list.', default=[])

class RegSchema(BaseModel):
    full_name: str = Field(default='')
    email: str = Field(default='')
    mobile_no: str = Field(default='')
    username: str = Field(default='')
    password: str = Field(default='')

class LoginSchema(BaseModel):
    email: str = Field(default='')
    password: str = Field(default='')
