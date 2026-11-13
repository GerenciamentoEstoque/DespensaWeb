
from database import db
from datetime import date

TIPO_MOVIMENTACAO = ('entrada', 'saida')
UNIDADES_MEDIDAS = ('unidade', 'kg', 'g', 'l', 'ml')

def dia_atual():
    """Retorna data atual em formato UTC sem fuso para persistência."""
    return date.today()


class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    senha = db.Column(db.String(255), nullable=False)


class Categoria(db.Model):
    __tablename__ = 'categorias'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome = db.Column(db.String(100), nullable=False)

    produtos = db.relationship(
        "Produto",
        back_populates="categoria",
        cascade="all, delete-orphan"
    )


class Produto(db.Model):
    __tablename__ = 'produtos'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome = db.Column(db.String(100), nullable=False)
    quantidade = db.Column(db.Numeric, default=0)
    quantidade_minima = db.Column(db.Integer, nullable=False, default=0)
    unidade_medida = db.Column(db.String(50), nullable=False, default='unidade')

    categoria_id = db.Column(
        db.Integer,
        db.ForeignKey('categorias.id'),
        nullable=False
    )

    categoria = db.relationship(
        "Categoria",
        back_populates="produtos"
    )

    movimentacoes = db.relationship(
        "Movimentacao",
        back_populates="produto",
        cascade="all, delete-orphan"
    )


class Movimentacao(db.Model):
    __tablename__ = 'movimentacoes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tipo = db.Column(db.String(10), nullable=False, default='entrada')
    observacao = db.Column(db.String(255))
    quantidade = db.Column(db.Integer, nullable=False)
    data = db.Column(db.Date, nullable=False, default=dia_atual)

    produto_id = db.Column(
        db.Integer,
        db.ForeignKey('produtos.id'),
        nullable=False
    )

    usuario_id = db.Column(
        db.Integer,
        db.ForeignKey('usuarios.id'),
        nullable=False
    )

    usuario = db.relationship("Usuario", backref="movimentacoes")

    produto = db.relationship(
        "Produto",
        back_populates="movimentacoes"
    )
