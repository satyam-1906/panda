import chromadb
import os
from dotenv import load_dotenv
load_dotenv()

client = chromadb.CloudClient(
    api_key=os.getenv("CHROMA_KEY"),
    tenant=os.getenv("TENANT"),
    database=os.getenv("DATABASE")
)

def add_to_collection(coll_name, doc_ids, docs, metadata):
    coll = client.get_or_create_collection(name=coll_name[:coll_name.index('@')])
    coll.upsert(ids=doc_ids,
                metadatas=[metadata]*len(docs),
                documents=docs)

def semantic_retrieve(coll_name, texts):
    coll = client.get_or_create_collection(name=coll_name[:coll_name.index('@')])
    return coll.query(query_texts=texts, include=['documents', 'distances'], n_results=1)
