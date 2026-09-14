from flask import Flask, render_template
from mongoengine import connect
from flask_cors import CORS
import certifi
from flask_jwt_extended import JWTManager
from datetime import timedelta
import os
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
connect(
    host=os.getenv('MONGO_URI'),
    tlsCAFile=certifi.where()
)

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
CORS(app)


jwt = JWTManager(app)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
def home():
    return render_template('index.html')
try:
    from routes.annunci_routes import annunci_bp
    app.register_blueprint(annunci_bp)
    print(" Rotte Annunci caricate")
except ImportError as e:
    print(f" Attenzione: Impossibile caricare annunci_routes: {e}")

try:
    from routes.utenti_routes import utenti_bp
    app.register_blueprint(utenti_bp)
    print(" Rotte Utenti caricate")
except ImportError as e:
    print(f" Attenzione: Impossibile caricare utenti_routes: {e}")

try:
    from routes.offerte_routes import offerte_bp
    app.register_blueprint(offerte_bp)
    print(" Rotte Offerte caricate")
except ImportError as e:
    print(f" Attenzione: Impossibile caricare offerte_routes: {e}")

try:
    from routes.appuntamenti_routes import appuntamenti_bp
    app.register_blueprint(appuntamenti_bp)
    print(" Rotte Appuntamenti caricate")
except ImportError as e: print(f" Errore Appuntamenti: {e}")

try:
    from routes.consulenze_routes import consulenze_bp
    app.register_blueprint(consulenze_bp)
    print(" Rotte Consulenze caricate")
except ImportError as e: print(f" Errore Consulenze: {e}")

@app.route('/registrazione')
def pagina_registrazione():
    return render_template('registrazione.html')

@app.route('/dashboard')
def pagina_dashboard():
    return render_template('dashboard.html')

@app.route('/pubblica')
def pagina_pubblica():
    return render_template('pubblica_annuncio.html')

@app.route('/annuncio/<id>')
def pagina_dettaglio(id):
    return render_template('dettagli_annuncio.html')

@app.route('/')
def index():
    return{"status": "Server House Manager attivo", "versione": "1.0"}
if __name__ == '__main__':
    print("Avvio del server in corso...")
    app.run(port=5000, debug=True)