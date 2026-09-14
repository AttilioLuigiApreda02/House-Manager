from mongoengine import Document, EmbeddedDocument, StringField, FloatField, DateTimeField, EmbeddedDocumentField, ObjectIdField
import datetime


class Appuntamento(Document):
    agente_id = ObjectIdField(required=True)   
    cliente_id = ObjectIdField(required=True)  
    annuncio_id = ObjectIdField()              

    data_inizio = DateTimeField(required=True)
    data_fine = DateTimeField(null=True)

    stato = StringField(
        default="IN ATTESA",
        choices=["IN ATTESA", "CONFERMATO", "RIFIUTATO", "COMPLETATO"]
    )
    

    meta = {
            'collection': 'appuntamenti',
            'indexes': ['agente_id', 'cliente_id', 'annuncio_id', 'stato']
        }