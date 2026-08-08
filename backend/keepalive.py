import requests
import threading

def ping():
    res = requests.head(url='https://lazy-panda-qlos.onrender.com/')
    threading.Timer(600.0, ping).start()
