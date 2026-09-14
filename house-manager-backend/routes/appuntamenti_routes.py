from flask import Blueprint, request, jsonify
from models.Appuntamenti import Appuntamento
from models.Annuncio import Annuncio
from models.Consulenze import Consulenza
from models.User import Utente
from datetime import  datetime
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

appuntamenti_bp = Blueprint('appuntamenti', __name__)

@appuntamenti_bp.route('/api/appuntamenti', methods=['POST'])
def crea_appuntamento():
    try:
        dati = request.json
        
        cliente = Utente.objects(id=dati.get('cliente_id')).first()
        agente = Utente.objects(id=dati.get('agente_id')).first()
        annuncio = Annuncio.objects(id=dati.get('annuncio_id')).first()
        
        if not all([cliente, agente, annuncio, dati.get('data_inizio')]):
            return jsonify({"errore": "Dati mancanti o invalidi"}), 400

        data_inizio_dt = datetime.strptime(dati.get('data_inizio'), '%Y-%m-%dT%H:%M')

        nuovo_appuntamento = Appuntamento(
            cliente_id=cliente.id,
            agente_id=agente.id,
            annuncio_id=annuncio.id,
            data_inizio=data_inizio_dt,
            stato="IN ATTESA"
        )
        nuovo_appuntamento.save()

        mittente = os.getenv('EMAIL_UTENET')
        password_app = os.getenv('EMAIL_PASSWORD')

        msg = MIMEMultipart()
        msg['From'] = mittente
        msg['To'] = agente.email
        msg['Subject'] = f"Nuova richiesta di appuntamento per {getattr(annuncio, 'titolo', 'Immobile')}"

        corpo_email = f"""Ciao {agente.nome},
        
        Hai ricevuto una nuova richiesta di appuntamento da {cliente.nome} {cliente.cognome}.
        Data richiesta: {data_inizio_dt.strftime('%d/%m/%Y %H:%M')}
        Email cliente: {cliente.email}
                
        Accedi alla tua Dashboard House Manager per confermare o rifiutare."""

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

        return jsonify({"messaggio": "Appuntamento creato e notifica inviata"}), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"errore": str(e)}), 500

@appuntamenti_bp.route('/api/appuntamenti/agente/<id_agente>', methods=['GET'])
def get_appuntamenti_agente(id_agente):
    try:
        appuntamenti = Appuntamento.objects(agente_id=id_agente)
        
        risultato = []
        for app in appuntamenti:
            cliente = Utente.objects(id=app.cliente_id).first()
            annuncio = Annuncio.objects(id=app.annuncio_id).first()
            
            nome_cliente = f"{cliente.nome} {cliente.cognome}" if cliente else "Utente Sconosciuto"
            titolo_annuncio = getattr(annuncio, 'titolo', 'Immobile') if annuncio else 'Immobile'
            
            dati_casa = getattr(annuncio, 'casa', None)
            indirizzo = getattr(dati_casa, 'indirizzo', '') if dati_casa else ''
            civico = getattr(dati_casa, 'civico', '') if dati_casa else ''
            citta = getattr(dati_casa, 'citta', '') if dati_casa else ''
            luogo_completo = f"{indirizzo} {civico}, {citta}".strip(', ')
            
            risultato.append({
                "id": str(app.id),
                "data_inizio": app.data_inizio.isoformat(),
                "stato": app.stato,
                "cliente_nome": nome_cliente,
                "annuncio_titolo": titolo_annuncio,
                "luogo": luogo_completo if luogo_completo else "Indirizzo non specificato"
            })
            
        return jsonify(risultato), 200

    except Exception as e:
        import traceback
        print("ERRORE CARICAMENTO CALENDARIO")
        traceback.print_exc()
        return jsonify({"errore": str(e)}), 500

@appuntamenti_bp.route('/api/appuntamenti/cliente/<id_cliente>', methods=['GET'])
def get_appuntamenti_cliente(id_cliente):
    try:
        risultato = []
        
        appuntamenti = Appuntamento.objects(cliente_id=id_cliente)
        for app in appuntamenti:
            agente = Utente.objects(id=app.agente_id).first()
            nome_prof = f"{agente.nome} {agente.cognome}" if agente else "Agente"
            risultato.append({
                "id": str(app.id),
                "data_inizio": app.data_inizio.isoformat(),
                "stato": app.stato,
                "cliente_nome": nome_prof,
                "annuncio_titolo": "Visita Immobile",
                "tipo_record": "appuntamento"
            })

        consulenze = Consulenza.objects(cliente_id=id_cliente)
        for cons in consulenze:
            prof = Utente.objects(id=cons.professionista_id).first()
            nome_prof = f"{prof.nome} {prof.cognome}" if prof else "Professionista"
            
            dati_casa = getattr(cons, 'casa', None)
            indirizzo = getattr(dati_casa, 'indirizzo', '') if dati_casa else ''
            citta = getattr(dati_casa, 'citta', '') if dati_casa else ''
            luogo_completo = f"{indirizzo}, {citta}".strip(', ')

            risultato.append({
                "id": str(cons.id),
                "data_inizio": cons.data_inizio.isoformat(),
                "stato": cons.stato,
                "cliente_nome": nome_prof,
                "annuncio_titolo": "Consulenza Online", 
                "luogo": luogo_completo,
                "tipo_record": "consulenza"
            })
            
        return jsonify(risultato), 200
    except Exception as e:
        return jsonify({"errore": str(e)}), 500

@appuntamenti_bp.route('/api/agenti_vicini/<id_annuncio>', methods=['GET'])
def trova_agenti_vicini(id_annuncio):
    try:
        annuncio = Annuncio.objects(id=id_annuncio).first()
        if not annuncio:
            return jsonify({"errore": "Annuncio non trovato"}), 404

        dati_casa = getattr(annuncio, 'casa', None)
        citta_annuncio = getattr(dati_casa, 'citta', '').strip() if dati_casa else ''
        
        print(f"Cerco agenti immobiliari per la città esatta: '{citta_annuncio}'")

        agenti = Utente.objects(
            ruolo__iexact="Professionista",
            dati_professionali__tipo__iexact="Agente Immobiliare",
            dati_professionali__citta_operativa__iexact=citta_annuncio        
        )
        
        print(f"👉 Numero di agenti trovati: {agenti.count()}")

        lista_agenti = []
        for a in agenti:
            dati_pro = getattr(a, 'dati_professionali', None)
            citta_op = getattr(dati_pro, 'citta_operativa', '') if dati_pro else ''
            
            lista_agenti.append({
                "id": str(a.id), 
                "nome": getattr(a, 'nome', ''), 
                "cognome": getattr(a, 'cognome', ''), 
                "citta": citta_op
            })

        return jsonify(lista_agenti), 200

    except Exception as e:
        import traceback
        print("ERRORE ROUTE AGENTI VICINI")
        traceback.print_exc() 
        return jsonify({"errore": str(e)}), 500

@appuntamenti_bp.route('/api/appuntamenti/<id_appuntamento>/stato', methods=['PUT'])
def aggiorna_stato_appuntamento(id_appuntamento):
    try:
        nuovo_stato = request.json.get('stato')

        appuntamento = Appuntamento.objects(id=id_appuntamento).first()
        if not appuntamento:
            return jsonify({"errore": "Appuntamento non trovato"}), 404

        appuntamento.stato = nuovo_stato
        appuntamento.save()

        cliente = Utente.objects(id=appuntamento.cliente_id).first()
        annuncio = Annuncio.objects(id=appuntamento.annuncio_id).first()
        agente = Utente.objects(id=appuntamento.agente_id).first()

        if cliente and cliente.email:
            mittente = os.getenv('EMAIL_UTENET')
            password_app = os.getenv('EMAIL_PASSWORD')
            
            msg = MIMEMultipart()
            msg['From'] = mittente
            msg['To'] = cliente.email
            
            titolo_ann = getattr(annuncio, 'titolo', 'Immobile') if annuncio else 'Immobile'
            data_formattata = appuntamento.data_inizio.strftime('%d/%m/%Y alle %H:%M')
            
            if nuovo_stato == "CONFERMATO":
                msg['Subject'] = f"Appuntamento Confermato: {titolo_ann}"
                corpo = f"Ciao {cliente.nome},\n\nIl tuo appuntamento per l'immobile '{titolo_ann}' è stato CONFERMATO dall'agente {agente.nome} {agente.cognome}.\n\nTi aspettiamo il {data_formattata}.\nA presto!"
            else:
                msg['Subject'] = f"Appuntamento Rifiutato: {titolo_ann}"
                corpo = f"Ciao {cliente.nome},\n\nPurtroppo l'agente {agente.nome} {agente.cognome} non è disponibile per l'appuntamento relativo a '{titolo_ann}' richiesto per il {data_formattata}.\n\nTi invitiamo a contattarlo per proporre un'altra data."
                
            msg.attach(MIMEText(corpo, 'plain'))
            
            try:
                server = smtplib.SMTP('smtp.gmail.com', 587)
                server.starttls()
                server.login(mittente, password_app)
                server.send_message(msg)
                server.quit()
            except Exception as e_mail:
                print(f"Errore invio email al cliente: {e_mail}")
                
        return jsonify({"messaggio": f"Stato aggiornato a {nuovo_stato}"}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"errore": str(e)}), 500