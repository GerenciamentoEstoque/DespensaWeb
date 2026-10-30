
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from database import db
from models import Produto


dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():

    # Busca todos os produtos cadastrados
    produtos = db.session.execute(
        db.select(Produto).order_by(Produto.nome)
    ).scalars().all()

    total = len(produtos)
    estoque_ok = 0
    acabando = 0
    em_falta = 0

    produtos_baixos = []
    dados_grafico = []

    for produto in produtos:

        # Determina o status do produto
        if produto.quantidade == 0:
            status = "em_falta"
            em_falta += 1

        elif produto.quantidade <= produto.quantidade_minima:
            status = "acabando"
            acabando += 1

        else:
            status = "ok"
            estoque_ok += 1

        # Dados utilizados pelo gráfico
        dados_grafico.append({
            "nome": produto.nome,
            "quantidade": produto.quantidade,
            "quantidade_minima": produto.quantidade_minima,
            "unidade_medida": produto.unidade_medida,
            "status": status
        })

        # Produtos que precisam de reposição
        if status != "ok":
            produtos_baixos.append({
                "id": produto.id,
                "nome": produto.nome,
                "quantidade": produto.quantidade,
                "quantidade_minima": produto.quantidade_minima,
                "unidade_medida": produto.unidade_medida,
                "status": status
            })

    # Mostra primeiro os produtos em falta
    produtos_baixos.sort(
        key=lambda p: (
            p["quantidade"] != 0,
            p["quantidade"] / p["quantidade_minima"]
            if p["quantidade_minima"] > 0 else 1
        )
    )

    return jsonify({
        "indicadores": {
            "total_produtos": total,
            "estoque_ok": estoque_ok,
            "acabando": acabando,
            "em_falta": em_falta
        },
        "produtos_baixos": produtos_baixos,
        "grafico": dados_grafico
    }), 200
