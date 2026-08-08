import requests

def get_video_title(video_id):
    url = f"https://noembed.com/embed?url=https://www.youtube.com/watch?v={video_id}"
    response = requests.get(url).json()
    
    # Check if title exists in the JSON response
    if "title" in response:
        #print(response)
        return response['title']
    else:
        return "Video not found or is restricted."


print(get_video_title('yD34oXKyB2E')[0])