from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from database import db
from models import  Usuario, Movimentacao
from sqlalchemy.exc import IntegrityError

usuarios_bp = Blueprint("usuarios", __name__)

# region Usuarios

#LISTAR USUARIOS
@usuarios_bp.route("/usuarios/listar", methods=["GET"])
def listar_usuarios():
    usuarios = db.session.execute(
        db.select(Usuario)
    ).scalars().all()

    resultado = []

    for usuario in usuarios:
        resultado.append({
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email
        })

    return jsonify(resultado), 200

#BUSCA DE USUARIO POR ID
@usuarios_bp.route("/usuarios/buscar/<int:id>", methods=["GET"])
def buscar_usuario(id):
    usuario = db.session.get(Usuario, id)

    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    return jsonify({
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "senha": usuario.senha
    }), 200

#CADASTRAR USUARIO
@usuarios_bp.route("/usuarios/cadastrar", methods=["POST"])
def cadastrar_usuario():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Dados inválidos"}), 400

    if not all(campo in dados for campo in
                ["nome", "email", "senha"]):
        return jsonify({"erro": "Campos obrigatórios ausentes"}), 400

    if (not isinstance(dados["nome"], str)
            or not dados["nome"].strip()
            or not isinstance(dados["email"], str)
            or not dados["email"].strip()
            or not isinstance(dados["senha"], str)
            or not dados["senha"].strip()):
        return jsonify({"erro": "Dados inválidos"}), 400

    # Normaliza os dados para evitar espaços extras e e-mails duplicados com maiúsculas.
    nome = dados["nome"].strip()
    email = dados["email"].strip().lower()
    senha = dados["senha"]

    # Respeita o tamanho das colunas e exige uma senha mínima.
    if len(nome) > 100 or len(email) > 150 or not 8 <= len(senha) <= 128:
        return jsonify({"erro": "Nome, e-mail ou tamanho da senha inválido"}), 400

    # Verifica o formato básico do e-mail.
    if email.count("@") != 1 or "." not in email.split("@")[1]:
        return jsonify({"erro": "E-mail inválido"}), 400

    usuario_existente = db.session.execute(
        db.select(Usuario).filter_by(email=email)
    ).scalar_one_or_none()

    if usuario_existente:
        return jsonify({"erro": "E-mail já cadastrado"}), 409

    novo_usuario = Usuario(
        nome=nome,
        email=email,
        senha= generate_password_hash(senha)
    )   

    db.session.add(novo_usuario)
    # Protege contra cadastros simultâneos com o mesmo e-mail.
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"erro": "E-mail já cadastrado"}), 409

    return jsonify({
        "mensagem": "Usuário cadastrado com sucesso",
        "id": novo_usuario.id
    }), 201

#ATUALIZAR USUARIO
@usuarios_bp.route("/usuarios/atualizar/<int:id>", methods=["PUT"])
def atualizar_usuario(id):
    usuario = db.session.get(Usuario, id)

    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie um JSON válido"}), 400

    # Confere os tipos antes de usar .strip(), evitando erros 500.
    if not all(isinstance(dados.get(c), str) and dados[c].strip()
               for c in ("nome", "email", "senha")):
        return jsonify({"erro": "Campos obrigatórios inválidos"}), 400

    # Confere tamanhos e formato dos dados a atualizar.
    nome = dados["nome"].strip()
    email = dados["email"].strip().lower()
    senha = dados["senha"]
    if len(nome) > 100 or len(email) > 150 or not 8 <= len(senha) <= 128:
        return jsonify({"erro": "Nome, e-mail ou tamanho da senha inválido"}), 400
    if email.count("@") != 1 or "." not in email.split("@")[1]:
        return jsonify({"erro": "E-mail inválido"}), 400

    # Impede que o e-mail de outro usuário seja reutilizado.
    existente = db.session.execute(db.select(Usuario).where(
        Usuario.email == email, Usuario.id != id
    )).scalar_one_or_none()
    if existente:
        return jsonify({"erro": "E-mail já cadastrado"}), 409

    usuario.nome = nome
    usuario.email = email
    usuario.senha = generate_password_hash(senha)

    # Evita erro não tratado se outra requisição registrar esse e-mail simultaneamente.
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"erro": "E-mail já cadastrado"}), 409

    return jsonify({"mensagem": "Usuário atualizado com sucesso"}), 200

#EXCLUIR USUARIO
@usuarios_bp.route("/usuarios/excluir/<int:id>", methods=["DELETE"])
def excluir_usuario(id):
    usuario = db.session.get(Usuario, id)

    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    # Evita excluir usuários que possuem histórico de movimentações.
    if db.session.execute(db.select(Movimentacao.id).where(
        Movimentacao.usuario_id == id
    )).first():
        return jsonify({"erro": "Usuário possui movimentações"}), 409

    db.session.delete(usuario)
    db.session.commit()

    return jsonify({"mensagem": "Usuário excluído com sucesso"}), 200
# endregion