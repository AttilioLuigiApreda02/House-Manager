from flask import Blueprint, request, jsonify
from models.Consulenze import Consulenza
from models.User import Utente
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

consulenze_bp = Blueprint('consulenze', __name__)

@consulenze_bp.route('/api/consulenze', methods=['POST'])
def crea_consulenza():
    try:
        dati = request.json
        
        cliente = Utente.objects(id=dati.get('cliente_id')).first()
        professionista = Utente.objects(id=dati.get('professionista_id')).first()
        
        if not cliente or not professionista:
            return jsonify({"errore": "Utenti non trovati"}), 404

        data_inizio_dt = datetime.datetime.strptime(dati.get('data_inizio'), '%Y-%m-%dT%H:%M')

        nuova_consulenza = Consulenza(
            cliente_id=cliente.id,
            professionista_id=professionista.id,
            data_inizio=data_inizio_dt,
            
            casa=dati.get('casa'), 
            caratteristiche=dati.get('caratteristiche'),
            
            stato="IN ATTESA"
        )
        nuova_consulenza.save()

        mittente = os.getenv('EMAIL_UTENET')
        password_app = os.getenv('EMAIL_PASSWORD')

        msg = MIMEMultipart()
        msg['From'] = mittente
        msg['To'] = professionista.email
        msg['Subject'] = f"Nuova richiesta di consulenza per {getattr(Consulenza, 'titolo', 'Immobile')}"

        corpo_email = f"""Ciao {professionista.nome},
        
        Hai ricevuto una nuova richiesta di consulenza da {cliente.nome} {cliente.cognome}.
        Data richiesta: {data_inizio_dt.strftime('%d/%m/%Y %H:%M')}
        Email cliente: {cliente.email}
                
        Accedi alla tua Dashboard House Manager per effettuarla."""

        msg.attach(MIMEText(corpo_email, 'plain'))

        try:
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(mittente, password_app) 
            server.send_message(msg)
            server.quit()
            print("====== EMAIL REALE INVIATA CON SUCCESSO ======")
            
        except Exception as e_mail:
            print(f"ERRORE INVIO EMAIL: {str(e_mail)}")
            return jsonify({"messaggio": "Appuntamento salvato, ma errore nell'invio della notifica."}), 201

        return jsonify({"messaggio": "Richiesta di consulenza e notifica inviata"}), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"errore": str(e)}), 500

@consulenze_bp.route('/api/consulenze/professionista/<id_prof>', methods=['GET'])
def get_consulenze_professionista(id_prof):
    try:
        consulenze = Consulenza.objects(professionista_id=id_prof)
        
        risultato = []
        for cons in consulenze:
            cliente = Utente.objects(id=cons.cliente_id).first()
            nome_cliente = f"{cliente.nome} {cliente.cognome}" if cliente else "Utente Sconosciuto"
            
            dati_casa = getattr(cons, 'casa', None)
            indirizzo = getattr(dati_casa, 'indirizzo', '') if dati_casa else ''
            citta = getattr(dati_casa, 'citta', '') if dati_casa else ''
            luogo_completo = f"{indirizzo}, {citta}".strip(', ')
            
            risultato.append({
                "id": str(cons.id),
                "data_inizio": cons.data_inizio.isoformat(),
                "stato": cons.stato,
                "cliente_nome": nome_cliente,
                "annuncio_titolo": "Consulenza Online", 
                "luogo": luogo_completo if luogo_completo else "Indirizzo non specificato",
                "tipo_record": "consulenza"
            })
            
        return jsonify(risultato), 200
    except Exception as e:
        return jsonify({"errore": str(e)}), 500

@consulenze_bp.route('/api/consulenze/<id_consulenza>/stato', methods=['PUT'])
def aggiorna_stato_consulenza(id_consulenza):
    try:
        nuovo_stato = request.json.get('stato')
        consulenza = Consulenza.objects(id=id_consulenza).first()
        
        if not consulenza:
            return jsonify({"errore": "Consulenza non trovata"}), 404

        consulenza.stato = nuovo_stato
        consulenza.save()

        cliente = Utente.objects(id=consulenza.cliente_id).first()
        prof = Utente.objects(id=consulenza.professionista_id).first()

        if cliente and cliente.email:
            mittente = os.getenv('EMAIL_UTENET')
            password_app = os.getenv('EMAIL_PASSWORD')
            
            msg = MIMEMultipart()
            msg['From'] = mittente
            msg['To'] = cliente.email
            
            data_form = consulenza.data_inizio.strftime('%d/%m/%Y alle %H:%M')
            
            if nuovo_stato == "CONFERMATO":
                msg['Subject'] = "Consulenza Confermata"
                corpo = f"Ciao {cliente.nome},\n\nLa tua consulenza online con {prof.nome} {prof.cognome} è stata CONFERMATA per il {data_form}."
            else:
                msg['Subject'] = "Consulenza Rifiutata"
                corpo = f"Ciao {cliente.nome},\n\nPurtroppo il professionista {prof.nome} {prof.cognome} non è disponibile per la consulenza del {data_form}."
                
            msg.attach(MIMEText(corpo, 'plain'))
            try:
                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(mittente, password_app)
                server.send_message(msg)
                server.quit()
            except Exception as e_mail:
                print(f"Errore invio email consulenza: {e_mail}")

        return jsonify({"messaggio": f"Stato consulenza aggiornato a {nuovo_stato}"}), 200

    except Exception as e:
        return jsonify({"errore": str(e)}), 500

@consulenze_bp.route('/api/professionisti_online/<tipo>', methods=['GET'])
def get_professionisti_online(tipo):
    try:
        profs = Utente.objects(
            ruolo__iexact="Professionista", 
            dati_professionali__tipo__iexact=tipo
        )
        
        lista = [{"id": str(p.id), "nome": p.nome, "cognome": p.cognome} for p in profs]
        
        return jsonify(lista), 200
    except Exception as e:
        print(f"Errore ricerca professionisti: {e}")
        return jsonify({"errore": str(e)}), 500