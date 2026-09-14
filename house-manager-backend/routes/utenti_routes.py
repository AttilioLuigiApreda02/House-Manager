import smtplib
import secrets
import string
from flask import Blueprint, request, jsonify
from models.User import Utente, DatiProfessionali
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
from dotenv import load_dotenv


utenti_bp = Blueprint('utenti', __name__)

@utenti_bp.route('/api/registrazione', methods=['POST'])
def registrazione():
    try:
        dati = request.get_json()
        email = dati.get('email')
        if Utente.objects(email=email).first():
            return jsonify({"messaggio": "Email già registrata"}), 400
        ruolo = dati.get('ruolo', 'Acquirente')
        password_in_chiaro = ""
        dati_pro = dati.get('dati_professionali', {})
        tipo_pro = dati_pro.get('tipo', '')
        if not dati.get('password'):
            if ruolo == 'Professionista' and tipo_pro=='Agente Immobiliare':
                password_in_chiaro = genera_password_random()
                print(f"Password generata per l'agente: {password_in_chiaro}")
            else:
                return jsonify({"messaggio":"Password obbligatoria"}), 400
        else:
            password_in_chiaro = dati.get('password')
        password_hash = generate_password_hash(password_in_chiaro)

        dati_professionali_obj = None
        if dati.get('ruolo') == 'Professionista':
            info_prof = dati.get('dati_professionali', {})
            
            dati_professionali_obj = DatiProfessionali(
                tipo = info_prof.get('tipo', 'Agente Immobiliare'),
                citta_operativa = info_prof.get('citta_operativa') 
            )

        nuovo_utente = Utente(
            email=dati.get('email'),
            password=password_hash,
            nome=dati.get('nome'),
            cognome=dati.get('cognome'),
            data_di_nascita=dati.get('data_di_nascita'),
            codice_fiscale=dati.get('codice_fiscale'),
            numero_di_telefono=dati.get('numero_di_telefono'),
            via=dati.get('via'),
            civico=dati.get('civico'),
            citta=dati.get('citta'),
            ruolo=dati.get('ruolo', 'Acquirente'),
            dati_professionali=dati_professionali_obj,
            notifiche=[]
        )

        nuovo_utente.save()
        msg_risposta = "Registrazione avvenuta con successo!"
        if not dati.get('password'):
            inviata = invia_email_credenziali(email, dati.get('nome'), password_in_chiaro)
            if inviata:
                msg_risposta = "Credenziali inviate via email!"
            else:
                msg_risposta = "Utente creato, ma errore nell'invio email. Contatta l'assistenza."

        return jsonify({"messaggio": msg_risposta}), 201

    except Exception as e:
        print(f" ERRORE REGISTRAZIONE: {e}")
        return jsonify({"errore": str(e)}), 500


@utenti_bp.route('/api/login', methods=['POST'])
def login():
    try:
        dati = request.get_json()
        email = dati.get('email')
        password = dati.get('password')
        user = Utente.objects(email=email).first()
        if user and check_password_hash(user.password, password):
            access_token = create_access_token(identity=str(user.id))

            return jsonify({
                "access_token": access_token,
                "user": {
                    "id": str(user.id),
                    "nome": user.nome,
                    "cognome": user.cognome,
                    "email": user.email,
                    "ruolo": user.ruolo
                }
            }), 200
        else:
            return jsonify({"messaggio": "Email o password errati"}), 401

    except Exception as e:
        print(f"ERRORE LOGIN: {e}")
        return jsonify({"errore": str(e)}), 500

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = os.getenv('EMAIL_UTENTE')
SENDER_PASSWORD = os.getenv('EMAIL_PASSWORD')

def invia_email_credenziali(destinatario, nome, password_generata):
    try:
        msg=MIMEMultipart()
        msg['From']=SENDER_EMAIL
        msg['To']=destinatario
        msg['Subject'] = "Benvenuto Agente - Credenziali House Manager"
        body=f"""
        Ciao {nome},
        Benvenuto su House Manager come Agente Immobiliare!
        Ecco le tue credenziali di accesso generate automaticamente:
        
        Email: {destinatario}
        Password: {password_generata}
        
        Ti consigliamo di cambiarla al primo accesso.
        
        A presto,
        Il team di House Manager
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        txt = msg.as_string()
        server.sendmail(SENDER_EMAIL, destinatario, txt)
        server.quit()
        print(f"Emailinviata correttamente a {destinatario}")
        return True
    except Exception as e:
        print("Errore invio mail: {e}")
        return False

def genera_password_random(lunghezza=10):
    alfabeto = string.ascii_letters + string.digits +"!@#$%"
    return ''.join(secrets.choice(alfabeto) for i in range(lunghezza))

@utenti_bp.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        utente = Utente.objects.get(id=user_id)
        
        tipo_pro = ""
        citta_op = ""
        dati_pro = getattr(utente, 'dati_professionali', None)
        if dati_pro:
            tipo_pro = getattr(dati_pro, 'tipo', '')
            citta_op = getattr(dati_pro, 'citta_operativa', '')
            print(f"INVIANDO CITTÀ OPERATIVA: '{citta_op}' per l'utente {utente.email}")

        data_nascita = "N/D"
        if getattr(utente, 'data_di_nascita', None):
            data_nascita = str(utente.data_di_nascita)[:10]

        return jsonify({
            "nome": getattr(utente, 'nome', ''),
            "cognome": getattr(utente, 'cognome', ''),
            "email": utente.email,
            "ruolo": getattr(utente, 'ruolo', 'Privato'),
            "tipo_professionista": tipo_pro,
            "data_di_nascita": data_nascita,
            "via": getattr(utente, 'via', ''),
            "civico": getattr(utente, 'civico', ''),
            "citta": getattr(utente, 'citta', ''),
            "citta_operativa": citta_op 
        }), 200

    except Exception as e:
        print(f"Errore profile: {e}")
        return jsonify({"errore": str(e)}), 500