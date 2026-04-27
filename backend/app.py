from flask import Flask
# 1. ADD THIS IMPORT
from flask_cors import CORS 

app = Flask(__name__)

# 2. ADD THIS LINE right after defining 'app'
# This tells your server to accept requests from your ngrok URL
CORS(app, resources={r"/api/*": {"origins": "https://prance-captivate-bling.ngrok-free.dev"}})

@app.route('/api/auth/login', methods=['POST'])
def login():
    # Your existing login logic
    return {"message": "Logged in!"}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)