import os
import json
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from openai import OpenAI
from backend.app.models.ordem_servico import OSPneu, OrdemServico
from backend.app.models.apontamento import Apontamento
from backend.app.models.setor import Setor
from backend.app.models.contato import Contato
from backend.config import settings

class TotalcapAgent:
    def __init__(self, db: Session, user_type: str = "interno", id_contato: Optional[int] = None, platform: str = "web"):
        self.db = db
        self.user_type = user_type
        self.id_contato = id_contato
        self.platform = platform
        self.api_key = settings.OPENAI_API_KEY
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None
        self.model = "gpt-4o-mini"

    def get_contact_by_phone(self, phone: str):
        """
        Busca um contato pelo número de telefone (limpando formatação).
        """
        # Remove 55, + e caracteres não numéricos
        clean_phone = "".join(filter(str.isdigit, phone))
        if clean_phone.startswith("55"):
            clean_phone = clean_phone[2:]
        
        # Tenta buscar por foneprincipal ou celulares
        contato = self.db.query(Contato).filter(
            or_(
                Contato.foneprincipal.contains(clean_phone),
                Contato.celular_comercial.contains(clean_phone),
                Contato.celular_financeiro.contains(clean_phone)
            )
        ).first()
        
        return contato

    def get_tire_status_tool(self, identifier: str):
        """
        Busca informações detalhadas sobre um pneu específico.
        Identificador pode ser o ID (numérico), numserie, numfogo ou codbarra.
        """
        # Limpa o identificador removendo o caractere '#' se presente
        clean_id = identifier.replace("#", "").strip()
        
        # Se for numérico, tenta buscar por ID primeiro
        if clean_id.isdigit():
            pneu = self.db.query(OSPneu).filter(or_(OSPneu.id == int(clean_id), OSPneu.numserie == clean_id, OSPneu.numfogo == clean_id, OSPneu.codbarra == clean_id)).first()
        else:
            pneu = self.db.query(OSPneu).filter(or_(OSPneu.numserie == clean_id, OSPneu.numfogo == clean_id, OSPneu.codbarra == clean_id)).first()

        if not pneu:
            return f"Não encontrei nenhum pneu com o identificador '{identifier}'."

        # Informações básicas do pneu (sempre disponíveis)
        try:
            os_num = pneu.os.numos if pneu.os else "Sem OS"
            cliente = pneu.os.contato.nome if pneu.os and pneu.os.contato else "Desconhecido"
            medida = pneu.medida.descricao if pneu.medida else "N/A"
            marca = pneu.marca.descricao if pneu.marca else "N/A"
            
            # FILTRO DE SEGURANÇA: Se for externo, só pode ver se o id_contato bater
            if self.user_type == "externo" and self.id_contato:
                if pneu.os and pneu.os.id_contato != self.id_contato:
                    return f"Você não tem permissão para visualizar informações deste pneu."
                elif not pneu.os:
                    return f"Pneu sem Ordem de Serviço vinculada. Não foi possível validar a permissão."
        except Exception as rel_error:
            os_num = "Erro ao carregar relacionamentos"
            cliente = "Indisponível"
            medida = "N/A"
            marca = "N/A"

        # Status do pneu
        status_msg = "Em Produção" if getattr(pneu, 'statuspro', False) else "Aguardando Início"
        if getattr(pneu, 'statusfat', False):
            status_msg = "Finalizado / Pronto para Entrega"

        # Histórico de apontamentos (pode falhar por schema不一致)
        historico = []
        setor_atual = "Não iniciado"
        try:
            apontamentos = self.db.query(Apontamento).join(Setor).filter(
                Apontamento.id_pneu == pneu.id
            ).order_by(Setor.sequencia.asc(), Apontamento.datalan.asc()).all()

            for ap in apontamentos:
                setor_nome = ap.setor.descricao if ap.setor else "N/A"
                data = ap.datalan.strftime("%d/%m/%Y %H:%M") if ap.datalan else "N/A"
                historico.append(f"{data}: {setor_nome}")

            if historico:
                setor_atual = historico[-1].split(": ")[1]
        except Exception as hist_error:
            historico = []
            # Rollback para limpar a transação abortada
            try:
                self.db.rollback()
            except Exception:
                pass

        info = {
            "id": pneu.id,
            "os": os_num,
            "cliente": cliente,
            "medida": medida,
            "marca": marca,
            "status": status_msg,
            "setor_atual": setor_atual,
            "historico_setores": historico,
            "num_serie": getattr(pneu, 'numserie', 'N/A'),
            "num_fogo": getattr(pneu, 'numfogo', 'N/A')
        }

        return json.dumps(info, ensure_ascii=False)

    # Dicionário completo de documentação com URLs
    DOC_MENU = {
        "1": {
            "titulo": "Coleta / OS",
            "url": "https://suportedbnet-ux.github.io/totalcap-docs",
            "subitens": {
                "1.1": {"titulo": "Coleta de Pneus",     "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_coleta_pneus"},
                "1.2": {"titulo": "Ordem de Serviço",    "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_ordem_servico"},
            }
        },
        "2": {
            "titulo": "Faturamento",
            "url": "https://suportedbnet-ux.github.io/totalcap-docs",
            "subitens": {
                "2.1": {"titulo": "Informe de Serviços",    "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_informe_servico"},
                "2.2": {"titulo": "Fatura de Serviço",      "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_fatura_servicos"},
                "2.3": {"titulo": "Fatura NF Retorno",      "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_fatura_retorno"},
                "2.4": {"titulo": "Fatura NF Entrada",      "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_fatura_entrada"},
                "2.5": {"titulo": "Orçamento",              "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_orcamento"},
                "2.6": {"titulo": "Tabela de Preço",        "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_tabela_preco"},
                "2.7": {"titulo": "Contratos",              "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_contratos"},
            }
        },
        "3": {
            "titulo": "Fábrica",
            "url": "https://suportedbnet-ux.github.io/totalcap-docs",
            "subitens": {
                "3.1": {"titulo": "Localização",            "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_localizacao"},
                "3.2": {"titulo": "Apontamento",            "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_apontamento"},
                "3.3": {"titulo": "Registro de Falhas",     "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_registro_falha"},
                "3.4": {"titulo": "Consumo de Mat.Prima",   "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_consumo_mprima"},
                "3.5": {"titulo": "Laudos",                 "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_laudos"},
                "3.6": {"titulo": "Gerador Código de Barra","url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_codigo_barra"},
                "3.7": {"titulo": "PCP - Programação",      "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_pcp"},
            }
        },
        "4": {
            "titulo": "Despesas",
            "url": "https://suportedbnet-ux.github.io/totalcap-docs",
            "subitens": {
                "4.1": {"titulo": "Despesas C/ Vendas",     "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_despesas_venda"},
            }
        },
        "5": {
            "titulo": "Relatórios",
            "url": "https://suportedbnet-ux.github.io/totalcap-docs",
            "subitens": {
                "5.1": {"titulo": "Faturamento", "url": "#", "is_group": True, "subgrupo": {
                    "5.1.1": {"titulo": "Rel. Vendas",          "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_rel_vendas"},
                    "5.1.2": {"titulo": "Rel. Comissões",       "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_rel_comissoes"},
                    "5.1.3": {"titulo": "Rel. Metas",           "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_rel_metas"},
                }},
                "5.2": {"titulo": "Produção", "url": "#", "is_group": True, "subgrupo": {
                    "5.2.1": {"titulo": "Rel. Produtividade",   "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_rel_produtividade"},
                    "5.2.2": {"titulo": "Rel. Falhas",          "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_rel_falhas"},
                    "5.2.3": {"titulo": "Rel. Consumo Mat.Prima","url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_rel_mprima"},
                    "5.2.4": {"titulo": "Rel. Laudos",          "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_rel_laudos"},
                    "5.2.5": {"titulo": "Rel. Ordens de Serviço","url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_rel_ordens"},
                }},
            }
        },
        "6": {
            "titulo": "Cadastros",
            "url": "https://suportedbnet-ux.github.io/totalcap-docs",
            "subitens": {
                "6.1": {"titulo": "Clientes", "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_cliente"},
                "6.2": {"titulo": "Auxiliares", "url": "#", "is_group": True, "subgrupo": {
                    "6.2.1":  {"titulo": "Áreas",              "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_area"},
                    "6.2.2":  {"titulo": "Regiões",            "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_regiao"},
                    "6.2.3":  {"titulo": "Atividades",         "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_atividade"},
                    "6.2.4":  {"titulo": "Vendedores",         "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_vendedor"},
                    "6.2.5":  {"titulo": "Transportadoras",    "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_transportadora"},
                    "6.2.6":  {"titulo": "Cidades",            "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_cidade"},
                    "6.2.7":  {"titulo": "Estados",            "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_estado"},
                    "6.2.8":  {"titulo": "Veículos",           "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_veiculo"},
                    "6.2.9":  {"titulo": "Bancos",             "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_banco"},
                    "6.2.10": {"titulo": "Formas de Pagamento","url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_plano_pagto"},
                    "6.2.11": {"titulo": "Tipo de Docto",      "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_tipo_docto"},
                    "6.2.12": {"titulo": "Tipos de Falha",     "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_falha"},
                    "6.2.13": {"titulo": "Regras Comissão",    "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_comissao"},
                    "6.2.14": {"titulo": "Origens Defeito",    "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_origens_defeito"},
                    "6.2.15": {"titulo": "Motivos Recusa",     "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_motivos_recusa"},
                }},
                "6.3": {"titulo": "Produção", "url": "#", "is_group": True, "subgrupo": {
                    "6.3.1":  {"titulo": "Medidas",            "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_medida"},
                    "6.3.2":  {"titulo": "Desenhos",           "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_desenho"},
                    "6.3.3":  {"titulo": "Marcas",             "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_marca"},
                    "6.3.4":  {"titulo": "Tipo Recapagem",     "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_tipo_recapagem"},
                    "6.3.5":  {"titulo": "Produto",            "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_produto"},
                    "6.3.6":  {"titulo": "Grupos Produto",     "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_grupos_produto"},
                    "6.3.7":  {"titulo": "Pisos",              "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_piso"},
                    "6.3.8":  {"titulo": "Serviços",           "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_servico"},
                    "6.3.9":  {"titulo": "Receita Padrão",     "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_receita_padrao"},
                    "6.3.10": {"titulo": "Ficha Técnica",      "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_ficha_tecnica"},
                    "6.3.11": {"titulo": "Setores",            "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_setore"},
                    "6.3.12": {"titulo": "Operadores",         "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_operadore"},
                    "6.3.13": {"titulo": "Falhas",             "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_falha"},
                }},
            }
        },
        "7": {
            "titulo": "Integração",
            "url": "https://suportedbnet-ux.github.io/totalcap-docs",
            "subitens": {
                "7.1": {"titulo": "Exportação", "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_exportacao"},
                "7.2": {"titulo": "Importação", "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_importacao"},
            }
        },
        "8": {
            "titulo": "Sistema",
            "url": "https://suportedbnet-ux.github.io/totalcap-docs",
            "subitens": {
                "8.1": {"titulo": "Empresa",    "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_empresa"},
                "8.2": {"titulo": "Usuários",   "url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_usuario"},
                "8.3": {"titulo": "Usuários IA","url": "https://suportedbnet-ux.github.io/totalcap-docs/documentacao_usuario_ia"},
            }
        },
    }

    def _render_menu_nivel1(self) -> str:
        """Renderiza o menu principal com 8 módulos."""
        linhas = ["📚 **Manual do Sistema Totalcap**\n", "Selecione um módulo digitando o número ou nome:\n"]
        for chave, modulo in self.DOC_MENU.items():
            linhas.append(f"**{chave}.** {modulo['titulo']}")
        return "\n".join(linhas)

    def _render_subitens(self, modulo: dict) -> str:
        """Renderiza os subitens de um módulo com links clicáveis."""
        linhas = []
        linhas.append(f"📖 **{modulo['titulo']}**\n")
        for chave, item in modulo["subitens"].items():
            if item.get("is_group"):
                linhas.append(f"\n**{chave}. {item['titulo']}**")
                for sub_chave, sub_item in item["subgrupo"].items():
                    linhas.append(f"   {sub_chave}. [{sub_item['titulo']}]({sub_item['url']})")
            else:
                linhas.append(f"{chave}. [{item['titulo']}]({item['url']})")
        linhas.append(f"\n---\nselecione a opção desejada.")
        return "\n".join(linhas)

    def get_system_help_tool(self, topic: str, user_type: str = "interno"):
        """
        Retorna a documentação oficial do sistema em formato de menu navegável.
        Para usuário interno, mostra a estrutura completa de 8 módulos com links.
        Para externo, mostra um subconjunto.
        """
        if user_type != "interno":
            return "A documentação completa está disponível para usuários internos. Consulte seu supervisor para mais informações."

        topic_lower = topic.strip().lower()

        # Se pediu o menu principal, retorna os 8 módulos
        if topic_lower in ["manual", "documentação", "documentacao", "menu", "ajuda", "sistema", "", "totalcap"]:
            return self._render_menu_nivel1()

        # Tenta匹配 pelo número (ex: "1", "2", etc.)
        for chave, modulo in self.DOC_MENU.items():
            # Match pelo número do módulo
            if topic_lower == chave or topic_lower.startswith(f"{chave}."):
                return self._render_subitens(modulo)

            # Match pelo nome do módulo
            if topic_lower == modulo["titulo"].lower():
                return self._render_subitens(modulo)

            # Match por subitem (ex: "1.1", "2.3", etc.)
            if "subitens" in modulo:
                for sub_chave, sub_item in modulo["subitens"].items():
                    if topic_lower == sub_chave:
                        # Se for grupo, mostra subgrupo
                        if sub_item.get("is_group"):
                            linhas = [f"📖 **{modulo['titulo']} › {sub_item['titulo']}**\n"]
                            for s_sub_chave, s_sub_item in sub_item["subgrupo"].items():
                                linhas.append(f"{s_sub_chave}. [{s_sub_item['titulo']}]({s_sub_item['url']})")
                            linhas.append(f"\n---\nselecione a opção desejada.")
                            return "\n".join(linhas)
                        return f"[{sub_item['titulo']}]({sub_item['url']})"
                    # Match por subgrupo
                    if sub_item.get("is_group"):
                        for s_sub_chave, s_sub_item in sub_item["subgrupo"].items():
                            if topic_lower == s_sub_chave:
                                return f"[{s_sub_item['titulo']}]({s_sub_item['url']})"

        # Fallback: tenta busca textual nos títulos
        for chave, modulo in self.DOC_MENU.items():
            if topic_lower in modulo["titulo"].lower():
                return self._render_subitens(modulo)
            if "subitens" in modulo:
                for sub_chave, sub_item in modulo["subitens"].items():
                    if topic_lower in sub_item["titulo"].lower():
                        if sub_item.get("is_group"):
                            linhas = [f"📖 **{modulo['titulo']} › {sub_item['titulo']}**\n"]
                            for s_sub_chave, s_sub_item in sub_item["subgrupo"].items():
                                linhas.append(f"{s_sub_chave}. [{s_sub_item['titulo']}]({s_sub_item['url']})")
                            linhas.append(f"\n---\nselecione a opção desejada.")
                            return "\n".join(linhas)
                        return f"[{sub_item['titulo']}]({sub_item['url']})"
                    if sub_item.get("is_group"):
                        for s_sub_chave, s_sub_item in sub_item["subgrupo"].items():
                            if topic_lower in s_sub_item["titulo"].lower():
                                return f"[{s_sub_item['titulo']}]({s_sub_item['url']})"

        return self._render_menu_nivel1()

    def get_client_production_summary_tool(self, client_name: str):
        """
        Busca um resumo de todos os pneus em produção ou finalizados de um cliente específico.
        Se o usuário for externo, ele busca OBRIGATORIAMENTE os dados do seu próprio id_contato.
        """
        if self.user_type == "externo" and self.id_contato:
            contato = self.db.query(Contato).filter(Contato.id == self.id_contato).first()
        else:
            contato = self.db.query(Contato).filter(Contato.nome.ilike(f"%{client_name}%")).first()
            
        if not contato:
            return f"Não foi possível localizar os dados para este cliente."

        pneus = self.db.query(OSPneu).join(OrdemServico).filter(
            OrdemServico.id_contato == contato.id,
            OrdemServico.status != 'C' # Não canceladas
        ).all()

        total = len(pneus)
        em_producao = len([p for p in pneus if p.statuspro and not p.statusfat])
        finalizados = len([p for p in pneus if p.statusfat])
        aguardando = total - em_producao - finalizados

        summary = {
            "cliente": contato.nome,
            "total_pneus": total,
            "em_producao": em_producao,
            "finalizados": finalizados,
            "aguardando_inicio": aguardando
        }

        return json.dumps(summary, ensure_ascii=False)
    
    def get_os_status_tool(self, num_os: str):
        """
        Busca todos os pneus e seus status vinculados a uma Ordem de Serviço específica.
        """
        # Limpa o número da OS
        clean_os = num_os.replace("#", "").strip()
        
        # Busca a OS e valida id_contato
        query = self.db.query(OSPneu).join(OrdemServico)
        
        # Filtro de OS e ordenação por ID do Pneu
        query = query.filter(OrdemServico.numos == clean_os).order_by(OSPneu.id.asc())
        
        # FILTRO DE SEGURANÇA: Se for externo, só pode ver se o id_contato bater
        if self.user_type == "externo" and self.id_contato:
            query = query.filter(OrdemServico.id_contato == self.id_contato)
            
        pneus = query.all()
        
        if not pneus:
            return f"Não encontrei nenhuma Ordem de Serviço com o número '{num_os}' ou você não tem permissão para acessá-la."
            
        lista_pneus = []
        for p in pneus:
            status_msg = "Em Produção" if p.statuspro else "Aguardando Início"
            if p.statusfat:
                status_msg = "Finalizado / Pronto para Entrega"
                
            lista_pneus.append({
                "id_pneu": p.id,
                "medida": p.medida.descricao if p.medida else "N/A",
                "tipo_recap": p.tipo_recapagem.descricao if hasattr(p, 'tipo_recapagem') and p.tipo_recapagem else "N/A",
                "status": status_msg
            })
            
        return json.dumps(lista_pneus, ensure_ascii=False)
    
    def get_tire_services_tool(self, id_pneu: int):
        """
        Lista todos os serviços contratados para um pneu específico.
        """
        from app.models.pneu_servico import PneuServico
        from app.models.servico import Servico
        
        # Busca os serviços, faz join com pneu para validar id_contato e servico para pegar descricao e id_recap
        query = self.db.query(
            PneuServico,
            Servico.descricao.label("servico_nome")
        ).join(Servico, PneuServico.id_servico == Servico.id)\
         .join(OSPneu, PneuServico.id_pneu == OSPneu.id)
        
        # Filtro de Pneu
        query = query.filter(PneuServico.id_pneu == id_pneu)
        
        # FILTRO DE SEGURANÇA: Se for externo, só pode ver se o id_contato bater
        if self.user_type == "externo" and self.id_contato:
            query = query.filter(OSPneu.id_contato == self.id_contato)
            
        # Ordenação por id_recap
        results = query.order_by(Servico.id_recap.asc()).all()
        
        if not results:
            return f"Não encontrei serviços para o pneu #{id_pneu} ou você não tem permissão para acessá-los."
            
        lista_servicos = []
        for ps, nome in results:
            lista_servicos.append({
                "servico": nome,
                "quantidade": ps.quant,
                "valor_unitario": float(ps.valor) if ps.valor else 0,
                "valor_total": float(ps.vrtotal) if ps.vrtotal else 0
            })
            
        return json.dumps(lista_servicos, ensure_ascii=False)

    def ask(self, question: str, context: Optional[str] = None):
        print(f"DEBUG AGENT: Iniciando pergunta ({self.user_type}). API Key presente: {bool(self.api_key)}")
        if not self.client:
            print("ERROR AGENT: Cliente OpenAI não inicializado (Falta API Key).")
            return "Erro: Chave da API OpenAI não configurada no servidor."

        persona = "Assistente Inteligente Interno" if self.user_type == "interno" else "Assistente de Atendimento ao Cliente"
        
        
        system_prompt = (
            f"Você está atendendo um usuário do tipo: {self.user_type.upper()} via plataforma {self.platform.upper()}. "
            "REGRA DE PARÂMETROS: O sistema utiliza o caractere '#' como prefixo para identificadores (Ex: #10, #2). "
            "REGRA DE DOCUMENTAÇÃO (INTERNO): Se o usuário interno solicitar 'manual', 'manual do sistema', 'documentação', 'ajuda' ou 'menu', você DEVE usar a ferramenta 'get_system_help_tool' com topic='manual' para obter o MENU completo de 8 módulos. "
            "APÓS mostrar o menu com os 8 módulos, você DEVE SEMPRE acrescentar a mensagem: \"Por favor, escolha um módulo numericamente ou mencionando o nome, para que eu possa fornecer informações detalhadas.\" "
            "REGRA DE SELEÇÃO NUMÉRICA: Se o usuário enviar um número (ex: '2'), um número com ponto (ex: '2.') ou o nome de um módulo (ex: 'Faturamento'), você DEVE chamar 'get_system_help_tool' passando esse número ou nome como 'topic'. "
            "REGRA DE SUBITEM: Se o usuário digitar um subitem (ex: '2.1', '6.2'), chame 'get_system_help_tool' com esse valor para obter o link direto da documentação. "
            "REGRA DE LINKS (IMPORTANTE): "
            " - Se plataforma for 'WEB', use Markdown para links: [Texto do Link](URL). "
            " - Se plataforma for 'WHATSAPP', NÃO use Markdown para links. Envie a URL pura para que seja clicável. "
            "Sua principal fonte de verdade para procedimentos e informações é a DOCUMENTAÇÃO que você deve consultar usando 'get_system_help_tool'. "
            "REGRA CRÍTICA: Para perguntas sobre procedimentos ou uso do sistema, use 'get_system_help_tool'. "
            "Para buscas de pneus ou status de produção, use 'get_tire_status_tool', 'get_os_status_tool', 'get_tire_services_tool' ou 'get_client_production_summary_tool'. "
            "- Se o usuário pedir para 'localizar', 'buscar' ou 'mostrar' um pneu ou parâmetro identificado por #, use a ferramenta de status IMEDIATAMENTE. "
            "- Se o usuário mencionar 'OS', 'Ordem de Serviço' ou similar com um número #, use 'get_os_status_tool'. "
            "- Se o usuário pedir para 'mostrar serviço' ou 'quais serviços' de um pneu #, use 'get_tire_services_tool'. "
            "- Somente se a mensagem for APENAS uma saudação genérica (como 'Olá', 'Bom dia') sem nenhuma pergunta ou comando, responda OBRIGATORIAMENTE: \"Olá, em que posso ajudar?\" "
            "- Sempre seja educado e profissional. "
            f"\nContexto adicional: {context if context else 'Nenhum'}"
        )

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_tire_status_tool",
                    "description": "Busca o status, localização e histórico de um pneu pelo número de série, fogo ou código de barras.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "identifier": {"type": "string", "description": "ID (com ou sem #), número de série, fogo ou código de barras do pneu."}
                        },
                        "required": ["identifier"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_system_help_tool",
                    "description": "Consulta o manual e documentação do sistema para tirar dúvidas sobre funcionalidades.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "topic": {"type": "string", "description": "O assunto ou funcionalidade sobre a qual o usuário tem dúvida."}
                        },
                        "required": ["topic"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_client_production_summary_tool",
                    "description": "Busca o resumo de produção de um cliente (pneus totais, em produção, prontos).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "client_name": {"type": "string", "description": "Nome do cliente."}
                        },
                        "required": ["client_name"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_os_status_tool",
                    "description": "Busca todos os pneus e status de uma Ordem de Serviço (OS) específica pelo número.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "num_os": {"type": "string", "description": "O número da Ordem de Serviço (com ou sem #)."}
                        },
                        "required": ["num_os"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_tire_services_tool",
                    "description": "Lista os serviços (recapagem, consertos) contratados para um pneu específico pelo ID.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "id_pneu": {"type": "integer", "description": "O ID numérico do pneu (o que vem após o #)."}
                        },
                        "required": ["id_pneu"]
                    }
                }
            }
        ]

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]

        print("DEBUG AGENT: Enviando para OpenAI...")
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            timeout=120  # 2 minutos para permitir processamentos mais longos com tool calls
        )

        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        if tool_calls:
            print(f"DEBUG AGENT: IA chamou {len(tool_calls)} ferramentas.")
            messages.append(response_message)
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                print(f"DEBUG AGENT: Chamando ferramenta {function_name} com args {function_args}")
                
                if function_name == "get_tire_status_tool":
                    function_response = self.get_tire_status_tool(identifier=function_args.get("identifier"))
                elif function_name == "get_system_help_tool":
                    function_response = self.get_system_help_tool(topic=function_args.get("topic"), user_type=self.user_type)
                elif function_name == "get_client_production_summary_tool":
                    function_response = self.get_client_production_summary_tool(client_name=function_args.get("client_name"))
                elif function_name == "get_os_status_tool":
                    function_response = self.get_os_status_tool(num_os=function_args.get("num_os"))
                elif function_name == "get_tire_services_tool":
                    function_response = self.get_tire_services_tool(id_pneu=function_args.get("id_pneu"))
                else:
                    function_response = "Função não encontrada."

                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": function_response,
                })

            second_response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                timeout=120  # 2 minutos para permitir processamentos mais longos
            )
            print("DEBUG AGENT: Resposta final gerada.")
            return second_response.choices[0].message.content

        return response_message.content
