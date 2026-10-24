from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import db
from models import Categoria, Produto
categoria_bp = Blueprint("categorias", __name__)
# region Categorias

#LISTAR CATEGORIAS
@categoria_bp.route("/categorias/listar", methods=["GET"])
@jwt_required()
def listar_categorias():
    categorias = db.session.execute(
        db.select(Categoria)
    ).scalars().all()

    resultado = []

    for categoria in categorias:
        resultado.append({
            "id": categoria.id,
            "nome": categoria.nome
        })

    return jsonify(resultado), 200

#BUSCA DE CATEGORIA POR ID
@categoria_bp.route("/categorias/buscar/<int:id>", methods=["GET"])
@jwt_required()
def buscar_categoria(id):
    categoria = db.session.get(Categoria, id)

    if not categoria:
        return jsonify({"erro": "Categoria não encontrada"}), 404

    return jsonify({
        "id": categoria.id,
        "nome": categoria.nome
    }), 200

#CADASTRAR CATEGORIA
@categoria_bp.route("/categorias/cadastrar", methods=["POST"])
@jwt_required()
def cadastrar_categoria():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Dados inválidos"}), 400

    # Exige texto preenchido e respeita o tamanho da coluna.
    if not isinstance(dados.get("nome"), str) or not dados["nome"].strip():
        return jsonify({"erro": "Nome inválido"}), 400
    nome = dados["nome"].strip()
    if len(nome) > 100:
        return jsonify({"erro": "Nome muito longo"}), 400

    nova_categoria = Categoria(
        nome=nome
    )

    db.session.add(nova_categoria)
    db.session.commit()

    return jsonify({
        "mensagem": "Categoria cadastrada com sucesso",
        "id": nova_categoria.id
    }), 201

#ATUALIZAR CATEGORIA
@categoria_bp.route("/categorias/atualizar/<int:id>", methods=["PUT"])
@jwt_required()
def atualizar_categoria(id):
    categoria = db.session.get(Categoria, id)

    if not categoria:
        return jsonify({"erro": "Categoria não encontrada"}), 404

    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie um JSON válido"}), 400

    # Verifica texto, espaços e tamanho antes de atualizar.
    if not isinstance(dados.get("nome"), str) or not dados["nome"].strip():
        return jsonify({"erro": "Nome inválido"}), 400
    if len(dados["nome"].strip()) > 100:
        return jsonify({"erro": "Nome muito longo"}), 400

    categoria.nome = dados["nome"].strip()
    db.session.commit()

    return jsonify({"mensagem": "Categoria atualizada com sucesso"}), 200

#EXCLUIR CATEGORIA
@categoria_bp.route("/categorias/excluir/<int:id>", methods=["DELETE"])
@jwt_required()
def excluir_categoria(id):
    categoria = db.session.get(Categoria, id)

    if not categoria:
        return jsonify({"erro": "Categoria não encontrada"}), 404

    # Não permite excluir uma categoria utilizada por produtos.
    if db.session.execute(db.select(Produto.id).where(
        Produto.categoria_id == id
    )).first():
        return jsonify({"erro": "Categoria possui produtos"}), 409

    db.session.delete(categoria)
    db.session.commit()

    return jsonify({"mensagem": "Categoria excluída com sucesso"}), 200
# endregion