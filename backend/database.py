import supabase
import hashlib
from dotenv import load_dotenv
import os
import schema
from supabase import FunctionsHttpError
load_dotenv()

def reg(data):
    client = supabase.Client(supabase_url=os.getenv("SUPABASE_URL", ''), supabase_key=os.getenv("SUPABASE_KEY", ''))
    res = client.table('panda_users').select('*').eq('email', data.email).execute()
    if len(res.data) == 0:
        hash_pass = hashlib.sha256((data.password).encode('utf-8'))
        hex_hash_pass = hash_pass.hexdigest()
        user_dict = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
        user_dict['password'] = hex_hash_pass
        client.table('panda_users').insert(user_dict).execute()
    else:
        raise FunctionsHttpError(
            message='user already exists',
            code=409
        )

def login(data):
    client = supabase.Client(supabase_url=os.getenv("SUPABASE_URL", ''), supabase_key=os.getenv("SUPABASE_KEY", ''))
    hash_pass = hashlib.sha256((data.password).encode('utf-8'))
    hex_hash_pass = hash_pass.hexdigest()
    res = client.table('panda_users').select('*').eq('email', data.email).eq('password', hex_hash_pass).execute()
    if len(res.data) == 1:
        return {'successful': True}
    else:
        return {'successful': False}

