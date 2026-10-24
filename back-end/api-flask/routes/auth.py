from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash

from database import db
from models import Usuario

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/auth/login", methods=["POST"])
def login():

    # Recebe os dados enviados pelo cliente
    dados = request.get_json(silent=True)

    # Verifica se foi enviado um objeto JSON
    if not isinstance(dados, dict):
        return jsonify({"erro": "JSON inválido"}), 400

    email = dados.get("email")
    senha = dados.get("senha")

    # Verifica se o e-mail e a senha foram preenchidos
    if not isinstance(email, str) or not isinstance(senha, str):
        return jsonify({"erro": "E-mail e senha obrigatórios"}), 400

    if not email.strip() or not senha:
        return jsonify({"erro": "E-mail e senha obrigatórios"}), 400

    # Padroniza o e-mail informado
    email = email.strip().lower()

    # Busca o usuário pelo e-mail utilizando ORM
    usuario = db.session.execute(
        db.select(Usuario).filter_by(email=email)
    ).scalar_one_or_none()

    # Verifica se o usuário existe e se a senha está correta
    if not usuario or not check_password_hash(usuario.senha, senha):
        return jsonify({"erro": "E-mail ou senha incorretos"}), 401

    # Gera um token JWT identificando o usuário
    token = create_access_token(identity=str(usuario.id))

    # Retorna o token para o cliente
    return jsonify({
        "mensagem": "Login realizado com sucesso",
        "access_token": token
    }), 200

@auth_bp.route("/auth/alterar-senha", methods=["PUT"])
@jwt_required()
def alterar_senha():

    # Obtém os dados enviados pelo Postman
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "JSON inválido"}), 400

    senha_atual = dados.get("senha_atual")
    nova_senha = dados.get("nova_senha")
    confirmacao_senha = dados.get("confirmacao_senha")

    # Verifica se as senhas foram informadas
    if not isinstance(senha_atual, str) or not isinstance(nova_senha, str):
        return jsonify({"erro": "Informe a senha atual e a nova senha"}), 400

    if not senha_atual or not nova_senha:
        return jsonify({"erro": "Informe a senha atual e a nova senha"}), 400

    if nova_senha != confirmacao_senha:
        return jsonify({"erro": "A nova senha e a confirmação não coincidem"}), 400

    # Obtém o ID do usuário autenticado
    usuario_id = int(get_jwt_identity())

    # Busca o usuário utilizando ORM
    usuario = db.session.execute(
        db.select(Usuario).filter_by(id=usuario_id)
    ).scalar_one_or_none()

    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404

    # Confere a senha atual
    if not check_password_hash(usuario.senha, senha_atual):
        return jsonify({"erro": "Senha atual incorreta"}), 401

    # Valida o tamanho da nova senha
    if len(nova_senha) < 8:
        return jsonify({"erro": "A nova senha deve ter pelo menos 8 caracteres"}), 400

    # Impede reutilizar a senha atual
    if check_password_hash(usuario.senha, nova_senha):
        return jsonify({"erro": "A nova senha deve ser diferente da atual"}), 400

    # Gera o hash da nova senha
    usuario.senha = generate_password_hash(nova_senha)

    # Salva no banco
    db.session.commit()

    return jsonify({
        "mensagem": "Senha alterada com sucesso"
    }), 200

@auth_bp.route("/auth/alterar-info", methods=["PUT"])
@jwt_required()
def alterar_info():

    # Obtém o ID do usuário autenticado
    usuario_id = int(get_jwt_identity())

    # Obtém os dados enviados pelo Postman
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "JSON inválido"}), 400

    nome = dados.get("nome")
    email = dados.get("email")

    # Verifica se os dados foram informados
    if not isinstance(nome, str) or not isinstance(email, str):
        return jsonify({"erro": "Informe o nome e o email"}), 400

    if not nome or not email:
        return jsonify({"erro": "Informe o nome e o email"}), 400

    if len(nome) > 100 or len(email) > 150:
        return jsonify({"erro": "Nome ou e-mail inválido"}), 400

    if email.count("@") != 1 or "." not in email.split("@")[1]:
        return jsonify({"erro": "E-mail inválido"}), 400

    # Busca o usuário utilizando ORM
    usuario = db.session.execute(
        db.select(Usuario).filter_by(id=usuario_id)
    ).scalar_one_or_none()

    usuario.nome = nome.strip()
    usuario.email = email.strip().lower()

    # Salva no banco
    db.session.commit()

    return jsonify({
        "mensagem": "Informações atualizadas com sucesso"
    }), 200

import os
import hashlib
import hmac
import smtplib

from email.message import EmailMessage
from flask import current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature


def gerar_serializador():
    # Obtém a chave específica para recuperação de senha
    chave = os.environ["RESET_TOKEN_SECRET"]

    # Cria o objeto responsável por assinar e validar tokens
    return URLSafeTimedSerializer(chave)


def enviar_email(destinatario, token):
    mensagem = EmailMessage()

    mensagem["Subject"] = "Recuperação de senha - DespensaWeb"
    mensagem["From"] = os.environ["SMTP_EMAIL"]
    mensagem["To"] = destinatario

    mensagem.set_content(
        "Você solicitou a recuperação da sua senha.\n\n"
        "Utilize o código abaixo para definir uma nova senha:\n\n"
        f"{token}\n\n"
        "Este código é válido por 15 minutos.\n"
        "Caso não tenha solicitado, ignore este e-mail."
    )

    # Conexão segura com o servidor de e-mail
    with smtplib.SMTP_SSL(
        os.environ["SMTP_HOST"],
        int(os.environ["SMTP_PORT"]),
        timeout=15
    ) as servidor:

        servidor.login(
            os.environ["SMTP_EMAIL"],
            os.environ["SMTP_PASSWORD"]
        )

        servidor.send_message(mensagem)


@auth_bp.route("/auth/esqueci-senha", methods=["POST"])
def esqueci_senha():

    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "JSON inválido"}), 400

    email = dados.get("email")

    if not isinstance(email, str) or not email.strip():
        return jsonify({"erro": "Informe o e-mail"}), 400

    email = email.strip().lower()

    # Busca o usuário pelo e-mail utilizando ORM
    usuario = db.session.execute(
        db.select(Usuario).filter_by(email=email)
    ).scalar_one_or_none()

    # Mesma resposta para e-mails existentes e inexistentes
    resposta = {
        "mensagem": "Se o e-mail estiver cadastrado, você receberá instruções de recuperação."
    }

    if not usuario:
        return jsonify(resposta), 200

    # Identifica a versão atual da senha
    versao = hashlib.sha256(
        usuario.senha.encode("utf-8")
    ).hexdigest()

    # Gera um token assinado
    token = gerar_serializador().dumps(
        {
            "usuario_id": usuario.id,
            "versao": versao
        },
        salt="recuperacao-senha"
    )

    # Envia o token por e-mail
    try:
        enviar_email(usuario.email, token)
    except (smtplib.SMTPException, OSError, KeyError):
        current_app.logger.exception(
            "Falha ao enviar e-mail de recuperação"
        )

    return jsonify(resposta), 200

