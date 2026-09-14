from flask import Blueprint, request, jsonify
from models.Offerte import Offerta
from models.Annuncio import Annuncio
import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity
import traceback
from bson import ObjectId
import smtplib
from email.mime.text import MIMEText
from threading import Thread
from models.User import Utente
from mongoengine.queryset.visitor import Q
import os
from dotenv import load_dotenv



def email_nuova_offerta(destinatario, importo, titolo_annuncio, link_dashboard):
    mittente = os.getenv('EMAIL_UTENTE')
    password_app = os.getenv('EMAIL_PASSWORD')

    oggetto = f"Hai ricevuto una nuova offerta per: {titolo_annuncio}!"
    corpo =  f"""
    <html>
    <body>
        <p> Ciao, </p>
        <p>Ottime notizie! Hai appena ricevuto una nuova offerta di <strong>{importo}€</strong> per il tuo annuncio: <strong>{titolo_annuncio}</strong>.</p>
        <p><a href="{link_dashboard}" style="color: #2c3e50; font-weight: bold;"> Clicca qui per visualizzarla</a> e decidere se accettarla o rifiutarla. </p>
        <br>
        <p> Il team di House Manager.</p>
    </body>
    </html>    
    """
    msg = MIMEText(corpo, 'html')
    msg['Subject'] = oggetto
    msg['From'] = mittente
    msg['To'] = destinatario

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(mittente, password_app)
            server.sendmail(mittente, destinatario, msg.as_string())
            print(f"Email HTML inviata al venditore: {destinatario}")
    except Exception as e:
        print(f"Errore invio email HMTL: {str(e)}")

def notifica_nuova_offerta_async(destinatario, importo, titolo_annuncio, link_dashboard):
    Thread(target=email_nuova_offerta, args=(destinatario, importo, titolo_annuncio, link_dashboard)).start()

def invia_mail_notifica(destinatario, stato_offerta):
    mittente = "attilioluigi2002@gmail.com"
    password_app = "uair pzou zyie hasb"
    oggetto = f"Esito della tua offerta: {stato_offerta}"
    corpo = f"Ciao,\n\nTi informiamo che la tua offerta su House Manager è stata {stato_offerta}.\n\nCordiali saluti,\nIl team."
    msg = MIMEText(corpo)
    msg['Subject'] = oggetto
    msg['From'] = mittente
    msg['To'] = destinatario
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(mittente, password_app)
            server.sendmail(mittente, destinatario, msg.as_string())
            print(f"Email inviata con successo a {destinatario}")
    except Exception as e:
        print(f"Errore invio email: {str(e)}")

def invia_email_async(destinatario, stato_offerta):
    Thread(target=invia_mail_notifica, args=(destinatario, stato_offerta)).start()

offerte_bp = Blueprint('offerte', __name__)

@offerte_bp.route('/api/offerte', methods=['POST'], strict_slashes=False)
@jwt_required()
def crea_offerta():
    dati = request.get_json()
    acquirente_id = get_jwt_identity()

    try:
        annuncio = Annuncio.objects.get(id=dati['annuncio_id'])

        nuova_offerta = Offerta(
            importo=float(dati['importo']),
            messaggio=dati.get('messaggio', ''),
            data=datetime.datetime.utcnow(),
            stato_corrente="IN ATTESA",
            acquirente_id=str(acquirente_id),
            venditore_id=str(annuncio.venditore_id),
            annuncio_id=str(annuncio.id),
            osservatori=[str(acquirente_id), str(annuncio.venditore_id)]
        )

        nuova_offerta.save()

        try:
            annuncio_collegato = Annuncio.objects(id=nuova_offerta.annuncio_id).first()
            if annuncio_collegato:
                venditore = Utente.objects(id=annuncio_collegato.venditore_id).first()
                
                if venditore and venditore.email:
                    titolo = annuncio_collegato.titolo 
                    link = "http://127.0.0.1:5000/dashboard"
                    
                    notifica_nuova_offerta_async(
                        venditore.email, 
                        nuova_offerta.importo, 
                        titolo, 
                        link
                    )
        except Exception as e:
            print(f"Errore durante l'avviso al venditore: {str(e)}")

        return jsonify({"messaggio": "Offerta inviata con successo!", "id": str(nuova_offerta.id)}), 201
    
    except Exception as e:
        print("ERRORE OFFERTA:", e)
        traceback.print_exc()
        return jsonify({"errore": str(e)}), 400


@offerte_bp.route('/api/offerte', methods=['GET'])
@jwt_required()
def get_offerte():
    try:
        user_id = get_jwt_identity()
        tipo = request.args.get('tipo')

        print(f"DEBUG: Cerco offerte '{tipo}' per utente {user_id}")

        if tipo == 'inviate':
            offerte = Offerta.objects(acquirente_id=user_id).order_by('-data')
        else:
            mie_case = Annuncio.objects(venditore_id=str(user_id))

            ids_mie_case = [c.id for c in mie_case]

            ids_mie_case_str = [str(c.id) for c in mie_case]

            print(f"DEBUG: Trovati {len(ids_mie_case)} annunci. Cerco offerte collegate...")


            offerte = Offerta.objects(
                Q(annuncio_id__in=ids_mie_case) | Q(annuncio_id__in=ids_mie_case_str)
            ).order_by('-data')

            print(f"DEBUG: Trovate {len(offerte)} offerte totali.")

        lista = []
        for off in offerte:
            try:
                titolo = "Annuncio non disponibile"
                try:
                    ann = Annuncio.objects.get(id=off.annuncio_id)
                    titolo = ann.titolo
                except:
                    pass

                if ann and hasattr(ann, 'foto') and len(ann.foto) > 0:
                    foto_url = ann.foto[0].url if hasattr(ann.foto[0], 'url') else ann.foto[0]

                acquirente = Utente.objects(id=off.acquirente_id).first()
                nome_acquirente = f"{acquirente.nome} {acquirente.cognome}" if acquirente else "Utente"

                lista.append({
                    "id": str(off.id),
                    "importo": off.importo,
                    "messaggio": off.messaggio,
                    "data": off.data,
                    "stato": getattr(off, 'stato_corrente', 'IN ATTESA'),
                    "titolo_annuncio": titolo,
                    "annuncio_id": str(off.annuncio_id),
                    "foto": [{"url": foto_url}] if foto_url else [],
                    "nome_acquirente": nome_acquirente
                })
            except Exception as e_inner:
                print(f"Skip offerta corrotta: {e_inner}")
                continue

        return jsonify(lista), 200

    except Exception as e:
        print(f"ERRORE: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"errore": str(e)}), 500



@offerte_bp.route('/api/offerte/<id_offerta>', methods=['PUT'])
@jwt_required()
def gestisci_offerta(id_offerta):
    try:
        user_id = get_jwt_identity()
        dati = request.get_json()
        nuovo_stato = dati.get('stato')
        
        offerta = Offerta.objects(id=id_offerta).first()
        if not offerta:
            return jsonify({"errore": "Offerta non trovata"}), 404
        
        annuncio = Annuncio.objects(id=offerta.annuncio_id).first()
        if str(annuncio.venditore_id) != str(user_id):
            return jsonify({"errore" : "Non sei autorizzato a gestire questa offerta."}), 403
        
        if nuovo_stato in ['ACCETTATA', 'RIFIUTATA']:
            offerta.update(set__stato_corrente = nuovo_stato)
            offerente = Utente.objects(id=offerta.acquirente_id).first()

            if offerente and offerente.email:
                invia_email_async(offerente.email, nuovo_stato)
                
            if nuovo_stato == 'ACCETTATA':
                annuncio.update(set__stato = "VENDUTO")
                
                altre_offerte = Offerta.objects(
                    annuncio_id = offerta.annuncio_id,
                    id__ne = offerta.id,
                    stato_corrente__in=["IN ATTESA", None]
                )
                altre_offerte.update(set__stato_corrente="RIFIUTATA")
                
            return jsonify({"messaggio": "Stato salvato in modo corretto"}), 200
            
        return jsonify({"errore": "stato non valido"}), 400
        
    except Exception as e:
        print(f"ERRORE CRITICO BACKEND: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"errore": f"Errore server: {str(e)}"}), 500
    