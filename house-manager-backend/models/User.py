from mongoengine import Document, StringField, IntField, ListField, EmbeddedDocument, EmbeddedDocumentField
from werkzeug.security import generate_password_hash, check_password_hash

class DatiProfessionali(EmbeddedDocument):
    p_iva = StringField()
    tipo = StringField()
    citta_operativa = StringField(required=True)

class Utente(Document):
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    nome = StringField(required=True)
    cognome = StringField(required=True)
    data_di_nascita = StringField()
    codice_fiscale = StringField()
    numero_di_telefono = StringField()
    via=StringField()
    civico=StringField()
    citta = StringField(required=True)
    ruolo=StringField(default="Acquirente")
    dati_professionali = EmbeddedDocumentField(DatiProfessionali, null=True)

    notifiche = ListField(StringField(), default=list)

    meta = {
        'collection': 'users'
    }

    def hash_password(self):
        self.password = generate_password_hash(self.password).decode('utf8')

    def check_password(self, password_inserita):
        return check_password_hash(self.password, password_inserita)