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


import os
import hashlib
import hmac
import smtplib

from pathlib import Path
from email.message import EmailMessage
from flask import current_app, request, jsonify
from itsdangerous import URLSafeTimedSerializer, BadSignature
from dotenv import load_dotenv


def gerar_serializador():
    # Obtém a chave específica para recuperação de senha
    chave = os.environ["RESET_TOKEN_SECRET"]

    # Cria o objeto responsável por assinar e validar tokens
    return URLSafeTimedSerializer(chave)


# Caminho da pasta onde está o app.py
BASE_DIR = Path(__file__).resolve().parent.parent

# Carrega o .env da pasta api-flask
load_dotenv(BASE_DIR / ".env")


def enviar_email(destinatario, token):

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")

    print("SMTP_HOST:", smtp_host)
    print("SMTP_PORT:", smtp_port)
    print("SMTP_EMAIL configurado:", str(smtp_email))
    print("SMTP_PASSWORD configurada:", str(smtp_password))

    # Verifica se todas as configurações existem
    if not all([smtp_host, smtp_email, smtp_password]):
        raise ValueError("Configurações SMTP incompletas")

    # Monta a mensagem
    mensagem = EmailMessage()

    mensagem["Subject"] = "Recuperação de senha - DespensaWeb"
    mensagem["From"] = smtp_email
    mensagem["To"] = destinatario

    mensagem.set_content(
        "Você solicitou a recuperação de senha.\n\n"
        "Utilize o código abaixo para redefinir sua senha:\n\n"
        f"{token}\n\n"
        "Este código expira em 15 minutos.\n\n"
        "Caso não tenha solicitado, ignore este e-mail."
    )

    # Conecta ao servidor SMTP
    with smtplib.SMTP_SSL(
        smtp_host,
        smtp_port,
        timeout=15
    ) as servidor:

        servidor.login(smtp_email, smtp_password)
        servidor.send_message(mensagem)

    current_app.logger.info("Mensagem aceita pelo servidor SMTP")

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

    try:
        enviar_email(usuario.email, token)

    except (smtplib.SMTPException, OSError, ValueError):
        current_app.logger.exception("Falha no envio do e-mail")
        return jsonify({
        "erro": "Não foi possível enviar o e-mail"
    }), 503

    return jsonify(resposta), 200


from werkzeug.security import check_password_hash, generate_password_hash

from database import db
from models import Usuario


@auth_bp.route("/auth/redefinir-senha", methods=["POST"])
def redefinir_senha():

    # Recebe o token e a nova senha
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return jsonify({"erro": "JSON inválido"}), 400

    token = dados.get("token")
    nova_senha = dados.get("nova_senha")

    # Valida os campos obrigatórios
    if not isinstance(token, str) or not token.strip():
        return jsonify({"erro": "Token obrigatório"}), 400

    if not isinstance(nova_senha, str) or len(nova_senha) < 8:
        return jsonify({
            "erro": "A senha deve ter pelo menos 8 caracteres"
        }), 400

    # Verifica o token recebido por e-mail
    try:
        informacoes = gerar_serializador().loads(
            token,
            salt="recuperacao-senha",
            max_age=900
        )

    except BadSignature:
        return jsonify({
            "erro": "Token inválido ou expirado"
        }), 400

    # Verifica os dados do token
    if not isinstance(informacoes, dict):
        return jsonify({"erro": "Token inválido"}), 400

    usuario_id = informacoes.get("usuario_id")
    versao_token = informacoes.get("versao")

    if type(usuario_id) is not int or not isinstance(versao_token, str):
        return jsonify({"erro": "Token inválido"}), 400

    # Busca o usuário pelo ID usando ORM
    usuario = db.session.execute(
        db.select(Usuario).filter_by(id=usuario_id)
    ).scalar_one_or_none()

    if not usuario:
        return jsonify({"erro": "Token inválido"}), 400

    # Verifica se a senha foi alterada depois da emissão
    versao_atual = hashlib.sha256(
        usuario.senha.encode("utf-8")
    ).hexdigest()

    if not hmac.compare_digest(versao_token, versao_atual):
        return jsonify({
            "erro": "Token já utilizado ou inválido"
        }), 400

    # Impede reutilizar a senha atual
    if check_password_hash(usuario.senha, nova_senha):
        return jsonify({
            "erro": "A nova senha deve ser diferente da atual"
        }), 400

    # Gera o hash da nova senha
    usuario.senha = generate_password_hash(nova_senha)

    # Salva a alteração no banco de dados
    db.session.commit()

    return jsonify({
        "mensagem": "Senha redefinida com sucesso"
    }), 200
