import rag

res = rag.get_all_data('scientificsatyam1906@gmail.com')
dic = {}
for metadata in res['metadatas'] or []:
    dic[f'{metadata['video_id']}'] = {'topic': [], 'description': []}
for id, document, metadata in zip(res['ids'], res['documents'] or [], res['metadatas'] or []):
    dic[f'{metadata['video_id']}']['topic'].append(id)
    dic[f'{metadata['video_id']}']['description'].append(document)
print(dic)