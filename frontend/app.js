document.getElementById("extract").addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    let currentUrl = tabs[0].url; 
    console.log("The user is currently visiting: " + currentUrl);

        // Send the raw HTML content to your local Python backend server
    fetch('http://127.0.0.1:8000/get-transcript', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ url: currentUrl })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Data processed by Python:', data);
    })
    .catch(err => {
        console.error('Failed to connect to Python backend:', err);
    });}); 
});
