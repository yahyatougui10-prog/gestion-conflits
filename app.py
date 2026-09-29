from flask import Flask, render_template, jsonify
import webbrowser
from threading import Timer

app = Flask(__name__)

# Slide metadata for API
SLIDES_DATA = [
    {"id": 1, "title": "Cover", "type": "cover"},
    {"id": 2, "title": "Définition", "type": "educational"},
    {"id": 3, "title": "Naissance", "type": "story"},
    {"id": 4, "title": "Causes", "type": "educational"},
    {"id": 5, "title": "Émotions", "type": "action"},
    {"id": 6, "title": "Écoute Active", "type": "educational"},
    {"id": 7, "title": "Communication Assertive", "type": "comparison"},
    {"id": 8, "title": "Solution", "type": "educational"},
    {"id": 9, "title": "Transformation", "type": "summary"},
    {"id": 10, "title": "Conclusion", "type": "conclusion"},
]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/slides')
def get_slides():
    return jsonify(SLIDES_DATA)

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

def open_browser():
    webbrowser.open_new('http://127.0.0.1:5000')

if __name__ == '__main__':
    # Open browser after 1 second
    Timer(1, open_browser).start()
    app.run(host='127.0.0.1', port=5000, debug=True)
