from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from database import db
from models import Movimentacao, Produto, Usuario, TIPO_MOVIMENTACAO

movimentacao_bp = Blueprint("movimentacoes", __name__)

# region Movimentacoes

#LISTAR MOVIMENTACOES
@movimentacao_bp.route("/movimentacoes/listar", methods=["GET"])
@jwt_required()
def listar_movimentacoes():
    movimentacoes = db.session.execute(
        db.select(Movimentacao)
    ).scalars().all()

    resultado = []

    for movimentacao in movimentacoes:
        resultado.append({
            "id": movimentacao.id,
            "tipo": movimentacao.tipo,
            "observacao": movimentacao.observacao,
            "quantidade": movimentacao.quantidade,
            "data": movimentacao.data.isoformat(),
            "produto_id": movimentacao.produto_id,
            "usuario_id": movimentacao.usuario_id
        })

    return jsonify(resultado), 200

#BUSCA DE MOVIMENTACAO POR ID
@movimentacao_bp.route("/movimentacoes/buscar/<int:id>", methods=["GET"])
@jwt_required()
def buscar_movimentacao(id):
    movimentacao = db.session.get(Movimentacao, id)

    if not movimentacao:
        return jsonify({"erro": "Movimentação não encontrada"}), 404

    return jsonify({
        "id": movimentacao.id,
        "tipo": movimentacao.tipo,
        "observacao": movimentacao.observacao,
        "quantidade": movimentacao.quantidade,
        "data": movimentacao.data.isoformat(),
        "produto_id": movimentacao.produto_id,
        "usuario_id": movimentacao.usuario_id
    }), 200

#BUSCA DE MOVIMENTACAO POR PRODUTO
@movimentacao_bp.route("/movimentacoes/buscar/produto/<int:produto_id>", methods=["GET"])
@jwt_required()
def buscar_movimentacoes_por_produto(produto_id):
    movimentacoes = db.session.execute(
        db.select(Movimentacao).where(Movimentacao.produto_id == produto_id)
    ).scalars().all()

    if not movimentacoes:
        return jsonify({"erro": "Nenhuma movimentação encontrada para o produto especificado"}), 404

    resultado = []
    for movimentacao in movimentacoes:
        resultado.append({
            "id": movimentacao.id,
            "tipo": movimentacao.tipo,
            "observacao": movimentacao.observacao,
            "quantidade": movimentacao.quantidade,
            "data": movimentacao.data.isoformat(),
            "produto_id": movimentacao.produto_id,
            "usuario_id": movimentacao.usuario_id
        })
    return jsonify(resultado), 200

#BUSCA DATA INICIAL
@movimentacao_bp.route("/movimentacoes/buscar/data-inicial/<string:data_inicial>", methods=["GET"])
@jwt_required()
def buscar_movimentacoes_data_inicial(data_inicial):
    # A data já veio pela URL; valida seu formato.
    try:
        data_inicial = datetime.strptime(data_inicial, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return jsonify({"erro": "Datas inválidas. Utilize o formato AAAA-MM-DD"}), 400

    movimentacoes = db.session.execute(
        db.select(Movimentacao).where(Movimentacao.data >= data_inicial)
    ).scalars().all()

    if not movimentacoes:
        return jsonify({"erro": "Nenhuma movimentação encontrada para o período especificado"}), 404

    resultado = []
    for movimentacao in movimentacoes:
        resultado.append({
            "id": movimentacao.id,
            "tipo": movimentacao.tipo,
            "observacao": movimentacao.observacao,
            "quantidade": movimentacao.quantidade,
            "data": movimentacao.data.isoformat(),
            "produto_id": movimentacao.produto_id,
            "usuario_id": movimentacao.usuario_id
        })
    return jsonify(resultado), 200

#BUSCA DATA FINAL
@movimentacao_bp.route("/movimentacoes/buscar/data-final/<string:data_final>", methods=["GET"])
@jwt_required()
def buscar_movimentacoes_data_final(data_final):
    # A data já veio pela URL; valida seu formato.
    try:
        data_final = datetime.strptime(data_final, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return jsonify({"erro": "Datas inválidas. Utilize o formato AAAA-MM-DD"}), 400

    movimentacoes = db.session.execute(
        db.select(Movimentacao).where(Movimentacao.data <= data_final)
    ).scalars().all()

    if not movimentacoes:
        return jsonify({"erro": "Nenhuma movimentação encontrada para o período especificado"}), 404

    resultado = []
    for movimentacao in movimentacoes:
        resultado.append({
            "id": movimentacao.id,
            "tipo": movimentacao.tipo,
            "observacao": movimentacao.observacao,
            "quantidade": movimentacao.quantidade,
            "data": movimentacao.data.isoformat(),
            "produto_id": movimentacao.produto_id,
            "usuario_id": movimentacao.usuario_id
        })
    return jsonify(resultado), 200

#CADASTRAR MOVIMENTACAO
@movimentacao_bp.route("/movimentacoes/cadastrar", methods=["POST"])
@jwt_required()
def cadastrar_movimentacao():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Dados inválidos"}), 400

    # Exige os campos usados pela rota (a observação pode ser omitida).
    if not all(campo in dados for campo in ("tipo", "quantidade", "produto_id")):
        return jsonify({"erro": "Campos obrigatórios ausentes"}), 400

    # Impede tipos desconhecidos (que seriam tratados indevidamente como saída).
    if dados.get("tipo") not in TIPO_MOVIMENTACAO:
        return jsonify({"erro": "Tipo de movimentação inválido"}), 400

    # Movimentações precisam ter quantidade inteira e maior que zero.
    if type(dados.get("quantidade")) is not int or dados["quantidade"] <= 0:
        return jsonify({"erro": "Quantidade inválida"}), 400

    # Observação opcional, mas deve respeitar o tamanho da coluna.
    if dados.get("observacao") is not None and (
        not isinstance(dados["observacao"], str) or len(dados["observacao"]) > 255
    ):
        return jsonify({"erro": "Observação inválida"}), 400

    # Evita IDs inexistentes e entradas booleanas.
    
    if type(dados.get("produto_id")) is not int or dados["produto_id"] <= 0:
        return jsonify({"erro": f"{dados['produto_id']} inválido"}), 400
    
    if not db.session.get(Produto, dados["produto_id"]):
        return jsonify({"erro": "Produto não encontrado"}), 404

    quantidade_produto = db.session.execute(
        db.select(Produto.quantidade).where(Produto.id == dados["produto_id"])
    ).scalars().first()

    # Estoque insuficiente só se aplica às SAÍDAS, não às ENTRADAS.
    if dados["tipo"] == "saida" and quantidade_produto - dados["quantidade"] < 0:
        return jsonify({"erro": "Quantidade insuficiente para a movimentação"}), 400
    else:
        if dados["tipo"] == "entrada":
            db.session.execute(
                db.update(Produto).where(Produto.id == dados["produto_id"]).values(quantidade=Produto.quantidade + dados["quantidade"])
            )
        else:
            db.session.execute(
                db.update(Produto).where(Produto.id == dados["produto_id"]).values(quantidade=Produto.quantidade - dados["quantidade"])
            )

    # Obtém o ID do usuário autenticado
    usuario_id = int(get_jwt_identity())

    tipo = dados.get("tipo")
    observacao = dados.get("observacao")
    quantidade = dados.get("quantidade", 0)
    produto_id = dados.get("produto_id")

    nova_movimentacao = Movimentacao(
        tipo=tipo,
        observacao=observacao,
        quantidade=quantidade,
        produto_id=produto_id,
        usuario_id=usuario_id
    )

    db.session.add(nova_movimentacao)
    db.session.commit()

    return jsonify({
        "mensagem": "Movimentação cadastrada com sucesso",
        "id": nova_movimentacao.id
    }), 201

# endregion 