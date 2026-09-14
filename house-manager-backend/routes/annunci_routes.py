from flask import Blueprint, request, jsonify
from flask import current_app
from models.Annuncio import Annuncio, Foto, Casa, Caratteristiche
from models.User import Utente
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
import traceback
import datetime
import os
import uuid
from mongoengine.queryset.visitor import Q


annunci_bp = Blueprint('annunci', __name__)

UPLOAD_FOLDER = 'static/uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@annunci_bp.route('/api/annunci', methods=['POST'])
@jwt_required()
def crea_annuncio():
    try:
        user_id = get_jwt_identity()

        dati = request.form

        files = request.files.getlist('foto')
        lista_foto = []

        for file in files:
            if file and file.filename:
                ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
                filename = f"{uuid.uuid4()}.{ext}"
                
                upload_dir = os.path.join(current_app.root_path, 'static', 'uploads')
                os.makedirs(upload_dir, exist_ok=True)
                
                file_path = os.path.join(upload_dir, filename)
                file.save(file_path)
                
                lista_foto.append(Foto(url=f"/static/uploads/{filename}"))

        def get_bool(key): return dati.get(key) == 'true'
        def get_int(key):
            val = dati.get(key, '')
            return int(val) if val and val.isdigit() else 0
        def get_float(key):
            try: return float(dati.get(key, '')) if dati.get(key) else 0.0
            except: return 0.0

        nuova_casa = Casa(
            indirizzo=dati.get('indirizzo', ''),
            civico=dati.get('civico', ''),
            citta=dati.get('citta', ''),
            ascensore=get_bool('ascensore'),
            tipo_immobile=dati.get('tipologia_immobile', 'Appartamento')
        )

        nuove_car = Caratteristiche(
            metri_quadri=get_int('mq'),
            numero_stanze=get_int('stanze'),
            posti_auto=get_int('posti_auto'),
            ascensore=get_bool('ascensore'),
            balcone=get_bool('balcone'),
            garage=get_bool('garage'),
            arredato=get_bool('arredato'),
            giardino = get_bool('giardino'),
            climatizzazione=get_bool('climatizzazione')
        )

        annuncio = Annuncio(
            titolo=dati.get('titolo', 'Senza Titolo'),
            descrizione=dati.get('descrizione', ''),
            prezzo_base=get_float('prezzo'),
            tipologia_acquisizione=dati.get('tipologia', 'Vendita'),
            stato="ATTIVO",
            data_pubblicazione=datetime.datetime.utcnow(),
            venditore_id=str(user_id),
            casa=nuova_casa,
            caratteristiche=nuove_car,
            foto=lista_foto
        )

        annuncio.save()
        return jsonify({"messaggio": "Ok", "id": str(annuncio.id)}), 201

    except Exception as e:
        print("❌ ERRORE CREAZIONE:", e)
        traceback.print_exc()
        return jsonify({"errore": str(e)}), 500

@annunci_bp.route('/api/annunci', methods=['GET'])
def get_annunci():
    try:
        search_text = request.args.get('q', '').strip()
        query = Q()

        filtro_venditore = request.args.get('venditore_id')

        if filtro_venditore == 'me':
            try:
                verify_jwt_in_request()
                user_id = get_jwt_identity()
                query = query & Q(venditore_id = str(user_id))
            except:
                return jsonify({"errore": "Devi essere loggato per vedere i tuoi annunci"}), 401
        elif filtro_venditore:
            query = query & Q(venditore_id = filtro_venditore)

        if search_text:
            query = query & (Q(titolo__icontains=search_text) | Q(casa__citta__icontains=search_text))

        prezzo_max = request.args.get('prezzo_max')
        if prezzo_max and int(prezzo_max) > 0:
            query = query & Q(prezzo_base__lte=float(prezzo_max))

        mq_min = request.args.get('mq')
        if mq_min and int(mq_min) > 0:
            query = query & Q(caratteristiche__metri_quadri__gte=int(mq_min))

        stanze_min = request.args.get('stanze')
        if stanze_min and int(stanze_min) > 0:
            query = query & Q(caratteristiche__numero_stanze__gte=int(stanze_min))

        tipo_immobile = request.args.get('tipo')
        if tipo_immobile and tipo_immobile != "Tutti":
            query = query & Q(casa__tipo_immobile=tipo_immobile)

        if request.args.get('garage') == 'true':
            query = query & Q(caratteristiche__garage=True)

        if request.args.get('balcone') == 'true':
            query = query & Q(caratteristiche__balcone=True)

        if request.args.get('ascensore') == 'true':
            query = query & (Q(casa__ascensore=True) | Q(caratteristiche__ascensore=True))

        if request.args.get('giardino') == 'true':
            query = query & Q(caratteristiche__giardino=True)

        raw_annunci = Annuncio.objects(query).order_by('-data_pubblicazione')
        lista = []

        for ann in raw_annunci:
            try:
                c = ann.casa
                k = ann.caratteristiche
                has_giardino = getattr(k, 'giardino', False)
                has_garage = getattr(k, 'garage', False)
                has_balcone = getattr(k, 'balcone', False)
                lista.append({
                    "id": str(ann.id),
                    "titolo": ann.titolo,
                    "prezzo_base": ann.prezzo_base,
                    "tipologia": getattr(ann, 'tipologia_acquisizione', 'Vendita'),
                    "stato": getattr(ann, 'stato', 'ATTIVO'),
                    "foto": [{"url": f.url} for f in ann.foto] if ann.foto else [],
                    "casa": {
                        "citta": c.citta if c else "",
                        "indirizzo": c.indirizzo if c else "",
                        "civico": getattr(c, 'civico', ""),
                        "tipo_immobile": getattr(c, 'tipo_immobile', "Appartamento")
                    },
                    "caratteristiche": {
                        "mq": k.metri_quadri if k else 0,
                        "stanze": k.numero_stanze if k else 0,
                        "posti": getattr(k, 'posti_auto', 0) if k else 0,
                        "giardino" : has_giardino,
                        "garage" : has_garage,
                        "balcone" : has_balcone
                    },
                    "venditore_id": ann.venditore_id
                })
            except: continue
        return jsonify(lista), 200
    except Exception as e:
        return jsonify({"errore": str(e)}), 500

@annunci_bp.route('/api/annunci/<id>', methods=['GET'])
def get_singolo_annuncio(id):
    try:
        ann = Annuncio.objects.get(id=id)
        c = ann.casa
        k = ann.caratteristiche
        nome_venditore = "utente privato"
        try:
            if ann.venditore_id:
                utente = Utente.objects.get(id=ann.venditore_id)
                nome_venditore = f"{utente.nome}{utente.cognome}"
        except:
            nome_venditore ="Utente non disponibile"
        return jsonify({
            "id": str(ann.id),
            "titolo": ann.titolo,
            "prezzo_base": ann.prezzo_base,
            "descrizione": getattr(ann, 'descrizione', ''),
            "stato": getattr(ann, 'stato', 'ATTIVO'),
            "venditore_nome": nome_venditore,
            "data_pubblicazione": ann.data_pubblicazione.isoformat() if hasattr(ann, 'data_pubblicazione') else None,
            "foto": [{"url": f.url} for f in ann.foto] if ann.foto else [],
            "casa": {
                "indirizzo": c.indirizzo if c else "",
                "civico": getattr(c, 'civico', ""),
                "citta": c.citta if c else "",
                "tipo_immobile": getattr(c, 'tipo_immobile', "Appartamento"),
                "piano": getattr(c, 'piano', ""),
                "ascensore": c.ascensore if c else False
            },
            "caratteristiche": {
                "metri_quadri": k.metri_quadri if k else 0,
                "numero_stanze": k.numero_stanze if k else 0,
                "garage": k.garage if k else False,
                "balcone": k.balcone if k else False,
                "arredato": getattr(k, 'arredato', False),
                "climatizzazione": getattr(k, 'climatizzazione', False),
                "posti_auto": getattr(k, 'posti_auto', 0),
                "giardino": getattr(k, 'giardino', False)
            }
        }), 200
    except Exception as e:
        return jsonify({"errore": "Annuncio non trovato"}), 404