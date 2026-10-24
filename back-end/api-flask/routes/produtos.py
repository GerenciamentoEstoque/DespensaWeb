from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from database import db
from models import Produto, Categoria, Movimentacao, UNIDADES_MEDIDAS

produtos_bp = Blueprint("produtos", __name__)
# region Produtos

#LISTAR PRODUTOS
@produtos_bp.route("/produtos/listar", methods=["GET"])
@jwt_required()
def listar_produtos():
    produtos = db.session.execute(
        db.select(Produto)
    ).scalars().all()

    resultado = []

    for produto in produtos:
        resultado.append({
            "id": produto.id,
            "nome": produto.nome,
            "quantidade": produto.quantidade,
            "quantidade_minima": produto.quantidade_minima,
            "unidade_medida": produto.unidade_medida,
            "categoria_id": produto.categoria_id
        })

    return jsonify(resultado), 200

#BUSCA DE PRODUTO POR ID
@produtos_bp.route("/produtos/buscar/<int:id>", methods=["GET"])
@jwt_required()
def buscar_produto(id):
    produto = db.session.get(Produto, id)

    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404

    return jsonify({
        "id": produto.id,
        "nome": produto.nome,
        "quantidade": produto.quantidade,
        "quantidade_minima": produto.quantidade_minima,
        "unidade_medida": produto.unidade_medida,
        "categoria_id": produto.categoria_id
    }), 200

#BUSCA DE PRODUTO POR CATEGORIA
@produtos_bp.route("/produtos/buscar/categoria/<int:categoria_id>", methods=["GET"])
@jwt_required()
def buscar_produtos_por_categoria(categoria_id):
    produtos = db.session.execute(
        db.select(Produto).where(Produto.categoria_id == categoria_id)
    ).scalars().all()

    if not produtos:
        return jsonify({"erro": "Nenhum produto encontrado para a categoria especificada"}), 404

    resultado = []
    for produto in produtos:
        resultado.append({
            "id": produto.id,
            "nome": produto.nome,
            "quantidade": produto.quantidade,
            "quantidade_minima": produto.quantidade_minima,
            "unidade_medida": produto.unidade_medida,
            "categoria_id": produto.categoria_id
        })
    return jsonify(resultado), 200

#BUSCA DE PRODUTO POR NOME
@produtos_bp.route("/produtos/buscar/nome/<string:nome>", methods=["GET"])
@jwt_required()
def buscar_produtos_por_nome(nome):
    produtos = db.session.execute(
        db.select(Produto).where(Produto.nome.contains(nome))
    ).scalars().all()

    if not produtos:
        return jsonify({"erro": "Nenhum produto encontrado para o nome especificado"}), 404

    resultado = []
    for produto in produtos:
        resultado.append({
            "id": produto.id,
            "nome": produto.nome,
            "quantidade": produto.quantidade,
            "quantidade_minima": produto.quantidade_minima,
            "unidade_medida": produto.unidade_medida,
            "categoria_id": produto.categoria_id
        })
    return jsonify(resultado), 200

#CADASTRAR PRODUTO
@produtos_bp.route("/produtos/cadastrar", methods=["POST"])
@jwt_required()
def cadastrar_produto():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Dados inválidos"}), 400

    if not all(campo in dados for campo in
                ["nome", "quantidade", "quantidade_minima", "unidade_medida", "categoria_id"]):
        return jsonify({"erro": "Campos obrigatórios ausentes"}), 400

    # Valida nome e limite definido no modelo.
    if not isinstance(dados.get("nome"), str) or not dados["nome"].strip() or len(dados["nome"].strip()) > 100:
        return jsonify({"erro": "Nome inválido"}), 400

    # Colunas Integer aceitam somente inteiros positivos ou zero (não booleanos).
    for campo in ("quantidade", "quantidade_minima"):
        if type(dados.get(campo)) is not int or dados[campo] < 0:
            return jsonify({"erro": f"{campo} deve ser inteiro não negativo"}), 400

    # Aceita apenas as unidades previstas no sistema.
    if dados.get("unidade_medida") not in UNIDADES_MEDIDAS:
        return jsonify({"erro": "Unidade de medida inválida"}), 400

    # Exige uma categoria existente para manter a chave estrangeira válida.
    if type(dados.get("categoria_id")) is not int or dados["categoria_id"] <= 0:
        return jsonify({"erro": "ID da categoria inválido"}), 400
    if not db.session.get(Categoria, dados["categoria_id"]):
        return jsonify({"erro": "Categoria não encontrada"}), 404

    nome = dados.get("nome")
    quantidade = dados.get("quantidade", 0)
    quantidade_minima = dados.get("quantidade_minima", 0)
    unidade_medida = dados.get("unidade_medida", "unidade")
    categoria_id = dados.get("categoria_id")

    novo_produto = Produto(
        nome=nome,
        quantidade=quantidade,
        quantidade_minima=quantidade_minima,
        unidade_medida=unidade_medida,
        categoria_id=categoria_id
    )

    db.session.add(novo_produto)
    db.session.commit()

    return jsonify({
        "mensagem": "Produto cadastrado com sucesso",
        "id": novo_produto.id
    }), 201

#ATUALIZAR PRODUTO
@produtos_bp.route("/produtos/atualizar/<int:id>", methods=["PUT"])
@jwt_required()
def atualizar_produto(id):
    produto = db.session.get(Produto, id)

    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404

    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie um JSON válido"}), 400

    # Exige todos os campos antes de validá-los individualmente.
    if not all(campo in dados for campo in
               ["nome", "quantidade", "quantidade_minima", "unidade_medida", "categoria_id"]):
        return jsonify({"erro": "Campos obrigatórios ausentes"}), 400

    # Valida nome e limite definido no modelo.
    if not isinstance(dados.get("nome"), str) or not dados["nome"].strip() or len(dados["nome"].strip()) > 100:
        return jsonify({"erro": "Nome inválido"}), 400

    # Colunas Integer aceitam somente inteiros positivos ou zero (não booleanos).
    for campo in ("quantidade", "quantidade_minima"):
        if type(dados.get(campo)) is not int or dados[campo] < 0:
            return jsonify({"erro": f"{campo} deve ser inteiro não negativo"}), 400

    # Aceita apenas as unidades previstas no sistema.
    if dados.get("unidade_medida") not in UNIDADES_MEDIDAS:
        return jsonify({"erro": "Unidade de medida inválida"}), 400

    # Exige uma categoria existente para manter a chave estrangeira válida.
    if type(dados.get("categoria_id")) is not int or dados["categoria_id"] <= 0:
        return jsonify({"erro": "ID da categoria inválido"}), 400
    
    if not db.session.get(Categoria, dados["categoria_id"]):
        return jsonify({"erro": "Categoria não encontrada"}), 404

    produto.nome = dados["nome"]
    produto.quantidade = dados["quantidade"]
    produto.quantidade_minima = dados["quantidade_minima"]
    produto.unidade_medida = dados["unidade_medida"]
    produto.categoria_id = dados["categoria_id"]

    db.session.commit()

    return jsonify({"mensagem": "Produto atualizado com sucesso"}), 200

#EXCLUIR PRODUTO
@produtos_bp.route("/produtos/excluir/<int:id>", methods=["DELETE"])
@jwt_required()
def excluir_produto(id):
    produto = db.session.get(Produto, id)

    if not produto:
        return jsonify({"erro": "Produto não encontrado"}), 404

    # Protege o histórico: um produto movimentado não pode ser excluído.
    if db.session.execute(db.select(Movimentacao.id).where(
        Movimentacao.produto_id == id
    )).first():
        return jsonify({"erro": "Produto possui movimentações"}), 409

    db.session.delete(produto)
    db.session.commit()

    return jsonify({"mensagem": "Produto excluído com sucesso"}), 200
# endregion