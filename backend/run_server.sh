echo "Starting Uvicorn server..."
uvicorn main:app --host 127.0.0.1 --port 8001 &

sleep 5

echo "Starting ngrok tunnel on port 8000..."
ngrok http --domain=confident-refinish-amid.ngrok-free.dev 8001

echo "Stopping background processes..."
kill $(jobs -p)