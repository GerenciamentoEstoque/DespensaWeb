
import os
from datetime import timedelta

from flask import Flask, jsonify
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager

from database import db
from routes.auth import auth_bp
from routes.usuarios import usuarios_bp
from routes.produtos import produtos_bp
from routes.categorias import categoria_bp
from routes.movivmentacoes import movimentacao_bp


# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

# Inicializa a aplicação Flask
app = Flask(__name__)

# CONFIGURAÇÃO DO BANCO DE DADOS
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///despensaWeb.db"

# Inicializa o SQLAlchemy
db.init_app(app)

# CONFIGURAÇÃO DO JWT
# Obtém a chave secreta do arquivo .env
app.config["JWT_SECRET_KEY"] = os.environ["JWT_SECRET_KEY"]

# Define a validade do token em 30 minutos
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=30)

# Define que o token será recebido pelo cabeçalho HTTP
app.config["JWT_TOKEN_LOCATION"] = ["headers"]

# Inicializa o JWT na aplicação
jwt = JWTManager(app)

# REGISTRO DAS ROTAS
app.register_blueprint(auth_bp)
app.register_blueprint(usuarios_bp)
app.register_blueprint(produtos_bp)
app.register_blueprint(categoria_bp)
app.register_blueprint(movimentacao_bp)

# ROTA PRINCIPAL
@app.route("/")
def home():
    return jsonify({"mensagem": "API funcionando!"})


# CRIAÇÃO DAS TABELAS
with app.app_context():
    print("Banco de dados:", db.engine.url.database)
    db.create_all()

# EXECUÇÃO DA API
if __name__ == "__main__":
    app.run(debug=True)
