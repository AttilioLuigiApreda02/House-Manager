from mongoengine import Document, FloatField, DateTimeField, StringField, ListField
import datetime

class Offerta(Document):
    importo = FloatField(required=True)
    messaggio = StringField()
    data = DateTimeField(default=datetime.datetime.utcnow)

    stato_corrente = StringField(default="IN ATTESA")

    acquirente_id = StringField(required=True)
    venditore_id = StringField(required=True)
    annuncio_id = StringField(required=True)

    osservatori = ListField(StringField())

    meta = {
        'collection': 'offerta',
        'strict': False
    }