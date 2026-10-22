from flask import Flask, jsonify
from database import db
from routes.usuarios import usuarios_bp
from routes.produtos import produtos_bp
from routes.categorias import categoria_bp  
from routes.movivmentacoes import movimentacao_bp

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///despensaWeb.db"

db.init_app(app)
    
app.register_blueprint(usuarios_bp)
app.register_blueprint(produtos_bp)
app.register_blueprint(categoria_bp)
app.register_blueprint(movimentacao_bp)

@app.route("/")
def home():
    return jsonify({"mensagem": "API funcionando!"})

with app.app_context():
    print("Banco de dados:", db.engine.url.database)
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True)