from mongoengine import Document, StringField, FloatField, BooleanField, EmbeddedDocument, EmbeddedDocumentField, ListField, IntField, DateTimeField
import datetime

class Foto(EmbeddedDocument):
    url = StringField(required=True)
    alt_altezza = IntField()
    alt_larghezza = IntField()
    formato = StringField()
    dimensione = FloatField()
    meta = {'strict': False}

class Casa(EmbeddedDocument):
    indirizzo = StringField()
    civico = StringField()
    citta = StringField()
    ascensore = BooleanField(default=False)
    tipo_immobile = StringField(default="Appartamento")
    piano = StringField()
    meta = {'strict': False}

class Caratteristiche(EmbeddedDocument):
    metri_quadri = IntField()
    numero_stanze = IntField()
    ascensore = BooleanField(default=False)
    balcone = BooleanField(default=False)
    garage = BooleanField(default=False)
    arredato = BooleanField(default=False)
    climatizzazione = BooleanField(default=False)
    giardino = BooleanField(default=False)
    posti_auto = IntField(default=0)
    meta = {'strict': False}

class Annuncio(Document):
    titolo = StringField(required=True)
    descrizione = StringField()

    prezzo_base = FloatField(required=True)
    tipologia_acquisizione = StringField(default="Vendita")

    stato = StringField(default="ATTIVO")
    data_pubblicazione = DateTimeField(default=datetime.datetime.utcnow)
    venditore_id = StringField()

    casa = EmbeddedDocumentField(Casa)
    caratteristiche = EmbeddedDocumentField(Caratteristiche)
    foto = ListField(EmbeddedDocumentField(Foto))

    meta = {'strict': False}