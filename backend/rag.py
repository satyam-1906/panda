import chromadb

client = chromadb.PersistentClient("rag_mem/")

def create_collection(coll_name):
    coll = client.create_collection(name=coll_name)

def semantic_retrieve(coll_name, texts):
    coll = client.get_collection(name=coll_name)
    return coll.query(query_texts=texts)['documents']
