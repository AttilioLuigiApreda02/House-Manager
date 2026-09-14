from mongoengine import Document, StringField, DateTimeField, ObjectIdField, EmbeddedDocumentField
import datetime

class Consulenza(Document):
    professionista_id = ObjectIdField(required=True)
    cliente_id = ObjectIdField(required=True)
    
    data_richiesta = DateTimeField(default=datetime.datetime.utcnow)
    
    data_inizio = DateTimeField(required=True) 

    casa = EmbeddedDocumentField('Casa', required=True)
    caratteristiche = EmbeddedDocumentField('Caratteristiche', required=True)

    stato = StringField(default="IN ATTESA") 
    rendiconto_id = ObjectIdField(default=None)

    meta = {
        'collection': 'consulenze'
    }