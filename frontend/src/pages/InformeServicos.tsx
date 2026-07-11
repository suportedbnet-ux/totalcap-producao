import { useState, useEffect } from 'react';
import { 
  Search, FileText, Hash, User, Package, ChevronRight,
  TrendingUp, CheckCircle, Clock, Plus, Trash2, X, Settings, Activity, DollarSign, CreditCard, Eye, Edit, Save, Printer
} from 'lucide-react';
import api from '../lib/api';
import logoEmpresa from '../assets/images/LogoEmpresa.png';
import './Faturamento.css';

interface PneuSearchResult {
  pneu_id: number;
  numserie: string;
  numfogo: string;
  dot: string;
  statuspro: boolean;
  statusfat: boolean;
  statuspro_label: string;
  medida_nome: string;
  produto_nome: string;
  desenho_nome: string;
  servico_nome: string;
  os_id: number;
  numos: number;
  contato_nome: string;
  dataentrada: string;
  id_servico_base: number;
  valor_pneu: number;
  vrtabela?: number;
  tiporecap_nome: string;
  qservico: number;
  vrservico: number;
  id_vendedor?: number;
  id_contato?: number;
  id_recusa?: number;
  id_preco?: number;
  examinador?: string;
  obs?: string;
}

export default function InformeServicos() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Busca por Pneu
  const [pneuSearchQuery, setPneuSearchQuery] = useState('');
  const [pneuResults, setPneuResults] = useState<PneuSearchResult[]>([]);
  const isFaturado = pneuResults.length > 0 && pneuResults[0].statusfat;
  
  // Estado para Serviços Adicionais (CRUD)
  const [pneuServicos, setPneuServicos] = useState<any[]>([]);
  const [isServicoModalOpen, setIsServicoModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<any | null>(null);
  const [allServicos, setAllServicos] = useState<any[]>([]);
  const [newServico, setNewServico] = useState({ id_servico: 0, quant: 1, valor: 0 });
  const [servicoSearchQuery, setServicoSearchQuery] = useState('');
  const [showServicoSuggestions, setShowServicoSuggestions] = useState(false);

  // Lookups para edição
  const [medidas, setMedidas] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [desenhos, setDesenhos] = useState<any[]>([]);
  const [tiporecaps, setTiporecaps] = useState<any[]>([]);
  const [motivosRecusa, setMotivosRecusa] = useState<any[]>([]);
  const [precos, setPrecos] = useState<any[]>([]);
  
  // Estado de Edição do Pneu
  const [pneuEditData, setPneuEditData] = useState<any>(null);
  const [isUpdatingPneu, setIsUpdatingPneu] = useState(false);

  useEffect(() => {
    fetchMasterServicos();
    fetchLookups();
  }, []);

  const fetchLookups = async () => {
    try {
      const [resMed, resMar, resDes, resRec, resPrecos] = await Promise.all([
        api.get('/medidas/?limit=5000'),
        api.get('/marcas/?limit=5000'),
        api.get('/desenhos/?limit=5000'),
        api.get('/tipo-recapagem/?limit=5000'),
        api.get('/precos/')
      ]);
      setMedidas(Array.isArray(resMed.data) ? resMed.data : (resMed.data?.items || []));
      setMarcas(Array.isArray(resMar.data) ? resMar.data : (resMar.data?.items || []));
      setDesenhos(Array.isArray(resDes.data) ? resDes.data : (resDes.data?.items || []));
      setTiporecaps(Array.isArray(resRec.data) ? resRec.data : (resRec.data?.items || []));
      setPrecos(Array.isArray(resPrecos.data) ? resPrecos.data : (resPrecos.data?.items || []));
    } catch (err) {
      console.error("Erro ao buscar lookups", err);
    }
    try {
      const resMot = await api.get('/tabrecusa/?limit=5000');
      const data = Array.isArray(resMot.data) ? resMot.data : (resMot.data?.items || []);
      setMotivosRecusa(data);
    } catch (err) {
      console.error("Erro ao buscar motivos de recusa", err);
    }
  };

  const fetchMasterServicos = async () => {
    try {
      const response = await api.get('/servicos/?limit=1000');
      if (Array.isArray(response.data)) {
        setAllServicos(response.data);
      } else if (response.data && response.data.items) {
        setAllServicos(response.data.items);
      }
    } catch (err) {
      console.error("Erro ao buscar mestre de serviços", err);
    }
  };

  const handlePneuSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pneuSearchQuery.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/ordens-servico/pneu-search/?q=${encodeURIComponent(pneuSearchQuery)}`);
      setPneuResults(response.data);
      if (response.data.length === 0) {
        setError('Nenhum pneu encontrado com este número de série ou fogo.');
        setPneuEditData(null);
      } else {
        const p = response.data[0];
        // Inicializa dados de edição
        setPneuEditData({
          id_medida: p.id_medida,
          id_marca: p.id_marca,
          id_desenho: p.id_desenho,
          id_recap: p.id_recap,
          id_recusa: p.id_recusa || 0,
          id_preco: p.id_preco || 0,
          examinador: p.examinador || '',
          obs: p.obs || '',
          valor: p.valor_pneu,
          vrtabela: p.vrtabela || 0
        });
        // Busca serviços atuais do pneu identificado
        fetchPneuServicos(p.pneu_id);
      }
    } catch (err: any) {
      setError('Erro ao buscar pneu. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPneuServicos = async (pneuId: number) => {
    try {
      const response = await api.get(`/pneu-servicos/pneu/${pneuId}`);
      setPneuServicos(response.data);
    } catch (err) {
      console.error("Erro ao buscar serviços do pneu", err);
    }
  };
  const handlePrintCartaAvaliacao = async () => {
    const p = pneuResults[0];
    if (!p || !p.pneu_id) return;

    try {
      const res = await api.get(`/pneus/${p.pneu_id}/carta-avaliacao`);
      const data = res.data;

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) return;

      const e = data.empresa || {};
      const c = data.cliente || {};
      const os = data.os || {};

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Carta de Avaliação de Carcaça - ${os.numos || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #000; }
            .title-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
            .title-area h1 { font-size: 16px; font-weight: bold; text-decoration: underline; text-align: center; flex: 1; margin: 0; }
            .pneu-id { font-size: 14px; font-weight: bold; border: 1px solid #000; padding: 3px 8px; }
            .box { border: 1px solid #000; border-radius: 4px; padding: 8px; margin-bottom: 10px; }
            .box-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; text-decoration: underline; }
            .row { display: flex; margin-bottom: 4px; }
            .col { flex: 1; display: flex; }
            .label { font-weight: bold; margin-right: 4px; }
            .value { flex: 1; border-bottom: 1px dotted #ccc; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 5px; }
            .grid-header { font-weight: bold; text-align: left; border-bottom: 1px solid #000; padding-bottom: 2px; }
            .grid-val { padding-top: 2px; font-family: 'Courier New', Courier, monospace; }
            .result-box { text-align: center; border: 2px solid #000; font-size: 16px; font-weight: bold; padding: 8px; margin: 15px 0; }
            @media print { body { padding: 0; } @page { margin: 15mm; } }
          </style>
        </head>
        <body>
          <div class="title-area">
            <div style="width: 100px;">
              <img src="${window.location.origin}${logoEmpresa}" alt="Logo" style="max-width: 100px; max-height: 50px; object-fit: contain;" />
            </div>
            <h1>CARTA DE AVALIAÇÃO DE CARCAÇA</h1>
            <div class="pneu-id">Pneu: ${p.pneu_id}</div>
          </div>

          <div class="box">
            <div class="row">
              <div class="col" style="flex: 2.5"><span class="label">Razão Social:</span><span class="value">${e.razaosocial || e.nome || ''}</span></div>
            </div>
            <div class="row">
              <div class="col"><span class="label">CNPJ:</span><span class="value">${e.cnpj || ''}</span></div>
              <div class="col"><span class="label">Inscrição Municipal:</span><span class="value">${e.inscmunicipio || ''}</span></div>
              <div class="col"><span class="label">Inscrição Estadual:</span><span class="value">${e.inscestadual || ''}</span></div>
              <div class="col"><span class="label">Telefone:</span><span class="value">${e.telefone || ''}</span></div>
            </div>
            <div class="row">
              <div class="col" style="flex: 2"><span class="label">Endereço:</span><span class="value">${e.endereco || ''}</span></div>
              <div class="col"><span class="label">Email:</span><span class="value">${e.email || ''}</span></div>
            </div>
            <div class="row">
              <div class="col"><span class="label">CEP:</span><span class="value">${e.cep || ''}</span></div>
              <div class="col" style="flex: 1.5"><span class="label">Municipio:</span><span class="value">${e.cidade || ''}</span></div>
              <div class="col" style="flex: 0.5"><span class="label">UF:</span><span class="value">${e.uf || ''}</span></div>
            </div>
          </div>

          <div class="box-title">Cliente</div>
          <div class="box">
            <div class="row">
              <div class="col" style="flex: 2.5"><span class="label">Razão Social:</span><span class="value">${c.razaosocial || c.nome || ''}</span></div>
            </div>
            <div class="row">
              <div class="col"><span class="label">CNPJ:</span><span class="value">${c.cnpj || c.cpfcnpj || ''}</span></div>
              <div class="col"><span class="label">Telefone:</span><span class="value">${c.telefone || c.foneprincipal || ''}</span></div>
            </div>
            <div class="row">
              <div class="col" style="flex: 2"><span class="label">Endereço:</span><span class="value">${c.endereco || ''}</span></div>
              <div class="col"><span class="label">Email:</span><span class="value">${c.email || ''}</span></div>
            </div>
            <div class="row">
              <div class="col"><span class="label">CEP:</span><span class="value">${c.cep || ''}</span></div>
              <div class="col" style="flex: 1.5"><span class="label">Municipio:</span><span class="value">${c.cidade || ''}</span></div>
              <div class="col" style="flex: 0.5"><span class="label">UF:</span><span class="value">${c.uf || ''}</span></div>
            </div>
          </div>

          <div class="row" style="margin-top: 10px;">
            <div class="col"><span class="label">Vendedor:</span><span class="value">${data.vendedor ? data.vendedor.codigo + ' - ' + data.vendedor.nome : ''}</span></div>
          </div>
          
          <div class="row" style="margin-top: 15px;">
            <div class="col"><span class="label">Numero da OS:</span><span class="value">${os.numos || ''}</span></div>
            <div class="col"><span class="label">Data NF:</span><span class="value">${data.datafat ? new Date(data.datafat).toLocaleDateString('pt-BR') : ''}</span></div>
            <div class="col"><span class="label">Numero da NF:</span><span class="value">${data.numnota || ''}</span></div>
          </div>

          <div class="box" style="margin-top: 15px; padding-top: 15px;">
            <div class="grid">
              <div class="grid-header">Marca</div><div class="grid-header">Num.Serie</div><div class="grid-header">Medida</div><div class="grid-header">Num.Fogo</div>
              <div class="grid-val">${data.marca || p.marca_nome || ''}</div><div class="grid-val">${p.numserie || ''}</div><div class="grid-val">${data.medida || p.medida_nome || ''}</div><div class="grid-val">${p.numfogo || ''}</div>
            </div>
            <div class="grid" style="margin-top: 10px;">
              <div class="grid-header">DOT</div><div class="grid-header">Servico</div><div class="grid-header">Desenho Original</div><div class="grid-header">Desenho Executado</div>
              <div class="grid-val">${p.dot || ''}</div><div class="grid-val">${data.servico || p.servico_nome || ''}</div><div class="grid-val">${data.desenho || p.desenho_nome || ''}</div><div class="grid-val">${p.desenhoriginal || data.pneu?.desenhoriginal || ''}</div>
            </div>
            <div class="grid" style="margin-top: 10px;">
              <div class="grid-header">Data Producao</div><div class="grid-header">Supervisor</div><div class="grid-header">Data Exame</div><div class="grid-header">Num.Reforma</div>
              <div class="grid-val">${data.data_producao ? new Date(data.data_producao).toLocaleDateString('pt-BR') : ''}</div><div class="grid-val"></div><div class="grid-val">${data.data_exame ? new Date(data.data_exame).toLocaleDateString('pt-BR') : ''}</div><div class="grid-val">${p.qreforma || 0}</div>
            </div>
          </div>

          <div class="result-box">
            Resultado da Avaliação: <span style="color: ${p.id_recusa ? '#b91c1c' : '#059669'};">${p.id_recusa ? 'RECUSADO' : 'APROVADO'}</span>
          </div>

          <div class="row">
            <div class="col"><span class="label">Motivo:</span><span class="value">${motivosRecusa.find(m => m.id === p.id_recusa)?.descricao || data.resultadolaudo || ''}</span></div>
          </div>
          <div class="row" style="margin-top: 10px;">
            <div class="col"><span class="label">Observação:</span><span class="value">${data.obsfabrica || ''} ${data.obsempresa || ''}</span></div>
          </div>

          <div class="row" style="margin-top: 30px;">
            <div class="col"><span class="label">Examinador:</span><span class="value">${data.userlan || ''}</span></div>
          </div>

          <script>
            setTimeout(function() { window.print(); }, 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("Erro ao imprimir carta de avaliação", err);
      alert("Erro ao gerar carta de avaliação.");
    }
  };

  const handleUpdatePneu = async () => {
    if (!pneuResults[0] || !pneuEditData) return;
    
    const p = pneuResults[0];
    const onlyChanges: any = {};
    const recusaChanged = pneuEditData.id_recusa !== (p.id_recusa || 0);
    const precoChanged = pneuEditData.id_preco !== (p.id_preco || 0);
    
    if (pneuEditData.id_medida !== p.id_medida) onlyChanges.id_medida = pneuEditData.id_medida;
    if (pneuEditData.id_marca !== p.id_marca) onlyChanges.id_marca = pneuEditData.id_marca;
    if (pneuEditData.id_desenho !== p.id_desenho) onlyChanges.id_desenho = pneuEditData.id_desenho;
    if (!recusaChanged && pneuEditData.id_recap !== p.id_recap) onlyChanges.id_recap = pneuEditData.id_recap;
    if (recusaChanged) onlyChanges.id_recusa = pneuEditData.id_recusa;
    if (precoChanged) onlyChanges.id_preco = pneuEditData.id_preco;
    if (pneuEditData.valor !== p.valor_pneu) onlyChanges.valor = pneuEditData.valor;
    if (pneuEditData.examinador !== (p.examinador || '')) onlyChanges.examinador = pneuEditData.examinador;
    if (pneuEditData.obs !== (p.obs || '')) onlyChanges.obs = pneuEditData.obs;

    if (Object.keys(onlyChanges).length === 0) return;

    setIsUpdatingPneu(true);
    try {
      // Lógica de recusa
      if (recusaChanged) {
        if (pneuEditData.id_recusa > 0) {
          const currentRecap = pneuEditData.id_recap ?? p.id_recap;
          if (currentRecap !== 1) {
            onlyChanges.id_recap = 1;
            // Deleta serviços existentes
            const servRes = await api.get(`/pneu-servicos/pneu/${p.pneu_id}`);
            for (const s of (servRes.data || [])) {
              await api.delete(`/pneu-servicos/${s.id}`);
            }
            // Cria novo serviço id_servico=1
            await api.post('/pneu-servicos/', {
              id_pneu: p.pneu_id,
              id_servico: 1,
              id_ordem: p.os_id,
              quant: 1,
              valor: p.valor_pneu
            });
          }
        } else {
          onlyChanges.id_recap = 0;
          // Deleta serviços existentes
          const servRes = await api.get(`/pneu-servicos/pneu/${p.pneu_id}`);
          for (const s of (servRes.data || [])) {
            await api.delete(`/pneu-servicos/${s.id}`);
          }
        }
      }

      await api.put(`/pneus/${p.pneu_id}`, onlyChanges);
      
      // Recarrega dados do pneu
      const response = await api.get(`/ordens-servico/pneu-search/?q=${encodeURIComponent(pneuSearchQuery)}`);
      setPneuResults(response.data);
      await fetchPneuServicos(p.pneu_id);
      
      alert("✅ Dados do pneu atualizados com sucesso!");
    } catch (err: any) {
      console.error("Erro ao atualizar pneu", err);
      const msg = err.response?.data?.detail || "Erro ao atualizar dados do pneu.";
      alert(`❌ ${msg}`);
    } finally {
      setIsUpdatingPneu(false);
    }
  };


  const handleOpenAddServicoModal = async () => {
    const p = pneuResults[0];
    if (!p) return;

    // Se não existe nenhum serviço lançado, cria o primeiro automaticamente
    if ((p.qservico || 0) === 0) {
      setLoading(true);
      try {
        await api.post('/pneu-servicos/', {
          id_pneu: p.pneu_id,
          id_servico: p.id_servico_base,
          id_ordem: p.os_id,
          quant: 1,
          valor: p.valor_pneu
        });
        
        // Recarrega os serviços e o status do pneu
        await fetchPneuServicos(p.pneu_id);
        const response = await api.get(`/ordens-servico/pneu-search?q=${encodeURIComponent(pneuSearchQuery)}`);
        setPneuResults(response.data);
        
        alert("✅ Serviço base lançado automaticamente com sucesso!");
      } catch (err: any) {
        console.error("Erro ao lançar serviço automático", err);
        const msg = err.response?.data?.detail || "Erro ao lançar serviço automático.";
        alert(`❌ ${msg}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Se já existem serviços, abre o modal normal para adicionar extras
      setEditingServico(null);
      setNewServico({ id_servico: 0, quant: 1, valor: 0 });
      setServicoSearchQuery('');
      setIsServicoModalOpen(true);
    }
  };

  const handleSelectServicoSuggestion = (s: any) => {
    setNewServico({
      ...newServico,
      id_servico: s.id,
      valor: parseFloat(s.valor || 0)
    });
    setServicoSearchQuery(s.descricao);
    setShowServicoSuggestions(false);
  };

  const handleAddServico = async () => {
    if (!pneuResults[0]) return;
    if (isFaturado) {
      alert("Não é possível alterar serviços de um pneu já faturado.");
      return;
    }
    try {
      const payload = {
        id_pneu: pneuResults[0].pneu_id,
        id_servico: newServico.id_servico,
        id_ordem: pneuResults[0].os_id,
        quant: newServico.quant,
        valor: newServico.valor,
        vrtotal: newServico.quant * newServico.valor,
        vrtabela: newServico.valor,
        pdescto: 0,
        vrdescto: 0,
        pcomissao: 0
      };

      if (editingServico) {
        await api.put(`/pneu-servicos/${editingServico.id}`, payload);
      } else {
        await api.post('/pneu-servicos/', payload);
      }
      
      setIsServicoModalOpen(false);
      fetchPneuServicos(pneuResults[0].pneu_id);
      
      // Atualiza o valor total no mestre (opcional, pois o front recarrega do pneuResults se necessário)
      // Mas aqui o ideal é atualizar a lista de resultados também se afetar vrservico
      const updatedPneuRes = await api.get(`/ordens-servico/pneu-search/?q=${encodeURIComponent(pneuSearchQuery)}`);
      setPneuResults(updatedPneuRes.data);

    } catch (err) {
      console.error("Erro ao salvar serviço", err);
      alert("Erro ao salvar serviço.");
    }
  };

  const handleDeleteServico = async (id: number) => {
    if (isFaturado) {
      alert("Não é possível excluir serviços de um pneu já faturado.");
      return;
    }
    if (!window.confirm("Deseja excluir este serviço adicional?")) return;
    try {
      await api.delete(`/pneu-servicos/${id}`);
      fetchPneuServicos(pneuResults[0].pneu_id);
      
      const updatedPneuRes = await api.get(`/ordens-servico/pneu-search/?q=${encodeURIComponent(pneuSearchQuery)}`);
      setPneuResults(updatedPneuRes.data);
    } catch (err) {
      console.error("Erro ao deletar serviço", err);
      alert("Erro ao excluir serviço.");
    }
  };

  const filteredServicos = allServicos.filter(s => 
    s.descricao.toLowerCase().includes(servicoSearchQuery.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="faturamento-container">
      <div className="faturamento-header glass-panel animate-fade-in">
        <div className="header-content">
          <div className="title-section">
            <div className="icon-box">
              <Settings size={28} color="white" />
            </div>
            <div>
              <h1>Informe de Serviços</h1>
              <p>Gerencie serviços adicionais e correções nos pneus antes do faturamento</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message animate-shake">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <div className="tab-content animate-fade-in">
        {/* Busca por Pneu */}
        <div className="search-section glass-panel" style={{ marginBottom: '2rem' }}>
          <form onSubmit={handlePneuSearch} className="search-form-producao">
            <div className="search-grid" style={{ gridTemplateColumns: '0.5fr auto', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginLeft: '1.5rem' }}>
                <label><Hash size={14} /> ID do Pneu ou Cód. Barras</label>
                <div className="input-with-button">
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Escaneie o código de barras ou digite o ID do pneu..." 
                    value={pneuSearchQuery}
                    onChange={(e) => setPneuSearchQuery(e.target.value)}
                    style={{ fontSize: '1.2rem', padding: '0.8rem 1.2rem', fontWeight: 'bold' }}
                    autoFocus
                  />
                  <button type="submit" className="btn-search-producao" disabled={loading} style={{ height: '52px' }}>
                    {loading ? 'Identificando...' : <><Search size={22} /> Identificar Pneu</>}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Resultado Único da Busca por Pneu */}
        {pneuResults.length > 0 && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.8rem', paddingLeft: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}></div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pneu Identificado com Sucesso
              </h3>
            </div>
            {pneuResults.map(p => {
              const hasChanges = pneuEditData && (
                pneuEditData.id_medida !== p.id_medida ||
                pneuEditData.id_marca !== p.id_marca ||
                pneuEditData.id_desenho !== p.id_desenho ||
                pneuEditData.id_recap !== p.id_recap ||
                pneuEditData.id_recusa !== (p.id_recusa || 0) ||
                pneuEditData.id_preco !== (p.id_preco || 0) ||
                pneuEditData.valor !== p.valor_pneu
              );
              const hasRecusaChange = pneuEditData && pneuEditData.id_recusa !== (p.id_recusa || 0);
              const hasPrecoChange = pneuEditData && pneuEditData.id_preco !== (p.id_preco || 0);
              const hasExaminadorChange = pneuEditData && pneuEditData.examinador !== (p.examinador || '');
              const hasObsChange = pneuEditData && pneuEditData.obs !== (p.obs || '');
              const isProduced = !!p.statuspro;
              const hasServices = (p.qservico || 0) > 0;
              const canEditFields = !isProduced && !hasServices;
              const canSavePneu = (canEditFields && hasChanges) || hasRecusaChange || hasPrecoChange || hasExaminadorChange || hasObsChange;
              
              return (
              <div key={p.pneu_id} className="glass-panel" style={{ padding: '2rem' }}>
                <div className="search-grid" style={{ marginBottom: '2rem' }}>
                  
                  <div className="form-group">
                    <label><Hash size={14} /> ID Interno (Pneu)</label>
                    <input type="text" className="form-input" value={p.pneu_id} readOnly style={{ fontWeight: '800', background: 'rgba(37, 99, 235, 0.05)', color: '#1d4ed8' }} />
                  </div>

                  <div className="form-group span-3">
                    <label><User size={14} /> Nome do Cliente</label>
                    <input type="text" className="form-input" value={p.contato_nome} readOnly style={{ fontWeight: '600' }} />
                  </div>

                  <div className="form-group">
                    <label><FileText size={14} /> Nº Ordem de Serviço</label>
                    <input type="text" className="form-input" value={p.numos > 0 ? p.numos : 'NÃO VINCULADA'} readOnly style={{ fontWeight: 'bold', color: p.numos > 0 ? 'var(--primary-color)' : '#94a3b8' }} />
                  </div>

                  <div className="form-group">
                    <label><Settings size={14} /> Tipo Recapagem {pneuEditData?.id_recap ? `(${pneuEditData.id_recap})` : ''}</label>
                    {canEditFields ? (
                      <select 
                        className="form-input" 
                        style={{ backgroundColor: '#fff7ed', border: '1px solid #fbbf24', color: '#059669', fontWeight: '600' }}
                        value={pneuEditData?.id_recap}
                        onChange={(e) => setPneuEditData({ ...pneuEditData, id_recap: parseInt(e.target.value) })}
                      >
                        <option value={0}>Selecione...</option>
                        {tiporecaps.map(tr => <option key={tr.id} value={tr.id}>{tr.descricao}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="form-input" 
                        value={p.tiporecap_nome} 
                        readOnly 
                        style={{ color: '#059669', fontWeight: '600' }} 
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label><Package size={14} /> Medida {pneuEditData?.id_medida ? `(${pneuEditData.id_medida})` : ''}</label>
                    {canEditFields ? (
                      <select 
                        className="form-input" 
                        style={{ backgroundColor: '#fff7ed', border: '1px solid #fbbf24' }}
                        value={pneuEditData?.id_medida}
                        onChange={(e) => setPneuEditData({ ...pneuEditData, id_medida: parseInt(e.target.value) })}
                      >
                        <option value={0}>Selecione...</option>
                        {medidas.map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
                      </select>
                    ) : (
                      <input type="text" className="form-input" value={p.medida_nome} readOnly />
                    )}
                  </div>

                  <div className="form-group">
                    <label><CheckCircle size={14} /> Desenho {pneuEditData?.id_desenho ? `(${pneuEditData.id_desenho})` : ''}</label>
                    {canEditFields ? (
                      <select 
                        className="form-input" 
                        style={{ backgroundColor: '#fff7ed', border: '1px solid #fbbf24' }}
                        value={pneuEditData?.id_desenho}
                        onChange={(e) => setPneuEditData({ ...pneuEditData, id_desenho: parseInt(e.target.value) })}
                      >
                        <option value={0}>Selecione...</option>
                        {desenhos.map(d => <option key={d.id} value={d.id}>{d.descricao}</option>)}
                      </select>
                    ) : (
                      <input type="text" className="form-input" value={p.desenho_nome} readOnly />
                    )}
                  </div>

                  <div className="form-group">
                    <label><TrendingUp size={14} /> Marca / Produto {pneuEditData?.id_marca ? `(${pneuEditData.id_marca})` : ''}</label>
                    {canEditFields ? (
                      <select 
                        className="form-input" 
                        style={{ backgroundColor: '#fff7ed', border: '1px solid #fbbf24' }}
                        value={pneuEditData?.id_marca}
                        onChange={(e) => setPneuEditData({ ...pneuEditData, id_marca: parseInt(e.target.value) })}
                      >
                        <option value={0}>Selecione...</option>
                        {marcas.map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
                      </select>
                    ) : (
                      <input type="text" className="form-input" value={p.marca_nome} readOnly />
                    )}
                  </div>

                  <div className="form-group">
                    <label><Clock size={14} /> DOT</label>
                    <input type="text" className="form-input" value={p.dot || '---'} readOnly />
                  </div>

                  <div className="form-group">
                    <label><Hash size={14} /> Num. Série</label>
                    <input type="text" className="form-input" value={p.numserie || '---'} readOnly />
                  </div>

                  <div className="form-group">
                    <label><Hash size={14} /> Num. Fogo</label>
                    <input type="text" className="form-input" value={p.numfogo || '---'} readOnly />
                  </div>

                  <div className="form-group">
                    <label><Activity size={14} /> Qte. Serviço</label>
                    <input type="text" className="form-input" value={p.qservico || 0} readOnly style={{ color: '#6366f1', fontWeight: '600' }} />
                  </div>

                  <div className="form-group">
                    <label><DollarSign size={14} /> Vr. Reforma</label>
                    {canEditFields ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'stretch', 
                        borderRadius: '8px', 
                        overflow: 'hidden', 
                        border: '1px solid #fbbf24',
                        backgroundColor: '#fff7ed',
                        height: '42px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '0 12px', 
                          background: '#fef3c7', 
                          borderRight: '1px solid #fbbf24',
                          color: '#b45309', 
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}>
                          R$
                        </div>
                        <input 
                          type="number" 
                          step="0.01"
                          className="form-input" 
                          style={{ 
                            border: 'none', 
                            background: 'transparent', 
                            padding: '0 12px', 
                            color: '#10b981', 
                            fontWeight: '700',
                            fontSize: '1.1rem',
                            width: '100%',
                            outline: 'none'
                          }}
                          value={pneuEditData?.valor}
                          onChange={(e) => setPneuEditData({ ...pneuEditData, valor: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '0.6rem 1rem', 
                        background: 'rgba(16, 185, 129, 0.05)', 
                        borderRadius: '8px',
                        color: '#059669',
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        border: '1px solid rgba(16, 185, 129, 0.1)'
                      }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '4px' }}>R$</span>
                        {parseFloat(p.valor_pneu as any || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label><DollarSign size={14} /> Vr. Tabela</label>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '0.6rem 1rem', 
                        background: 'rgba(59, 130, 246, 0.05)', 
                        borderRadius: '8px',
                        color: '#2563eb',
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        <span style={{ fontSize: '0.8rem', opacity: 0.7, marginRight: '4px' }}>R$</span>
                        {parseFloat(p.vrtabela as any || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label><DollarSign size={14} /> Tabela de Preço {pneuEditData?.id_preco ? `(${pneuEditData.id_preco})` : ''}</label>
                    {!p.statusfat ? (
                      <select 
                        className="form-input" 
                        style={{ backgroundColor: '#fff7ed', border: '1px solid #fbbf24', color: '#059669', fontWeight: '600' }}
                        value={pneuEditData?.id_preco || 0}
                        onChange={(e) => setPneuEditData({ ...pneuEditData, id_preco: parseInt(e.target.value) })}
                      >
                        <option value={0}>Padrão (Empresa)</option>
                        {precos.map(pr => <option key={pr.id} value={pr.id}>{pr.descricao}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="form-input" 
                        value={precos.find(pr => pr.id === p.id_preco)?.descricao || 'Padrão (Empresa)'} 
                        readOnly 
                        style={{ color: '#059669', fontWeight: '600' }} 
                      />
                    )}
                  </div>

                  <div className="form-group">
                    <label><TrendingUp size={14} /> Status Produção</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={p.statuspro ? 'Sim' : 'Não'} 
                      readOnly 
                      style={{ background: p.statuspro ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: p.statuspro ? '#059669' : '#b91c1c', fontWeight: '700' }} 
                    />
                  </div>

                  <div className="form-group">
                    <label><CreditCard size={14} /> Status Faturamento</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={p.statusfat ? 'Sim' : 'Não'} 
                      readOnly 
                      style={{ background: p.statusfat ? 'rgba(37, 99, 235, 0.1)' : 'transparent', color: p.statusfat ? '#1d4ed8' : '#b91c1c', fontWeight: '700' }} 
                    />
                  </div>

                  <div className="form-group span-2">
                    <label><FileText size={14} /> Observação</label>
                    <textarea
                      className="form-input"
                      style={{ backgroundColor: '#fff7ed', border: '1px solid #fbbf24', resize: 'vertical', minHeight: '60px' }}
                      value={pneuEditData?.obs || ''}
                      onChange={(e) => setPneuEditData({ ...pneuEditData, obs: e.target.value })}
                    />
                  </div>

                  <div className="form-group span-2">
                    <label><AlertTriangle size={14} /> Motivo Recusa</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                      <select 
                        className="form-input" 
                        style={{ backgroundColor: '#fff7ed', border: '1px solid #fbbf24', color: '#b91c1c', fontWeight: '600', flex: 1 }}
                        value={pneuEditData?.id_recusa || 0}
                        onChange={(e) => setPneuEditData({ ...pneuEditData, id_recusa: parseInt(e.target.value) })}
                      >
                        <option value={0}>Nenhum</option>
                        {motivosRecusa.map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group span-2">
                    <label><User size={14} /> Examinador</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                      <input 
                        type="text" 
                        className="form-input"
                        style={{ backgroundColor: '#fff7ed', border: '1px solid #fbbf24', flex: 1 }}
                        value={pneuEditData?.examinador || ''}
                        onChange={(e) => setPneuEditData({ ...pneuEditData, examinador: e.target.value })}
                      />
                      <button 
                        className="btn-primary"
                        disabled={!pneuEditData?.id_recusa}
                        style={{ whiteSpace: 'nowrap', background: !pneuEditData?.id_recusa ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 1rem', borderRadius: '8px', cursor: !pneuEditData?.id_recusa ? 'not-allowed' : 'pointer', color: '#fff', fontWeight: '600', fontSize: '0.85rem', opacity: !pneuEditData?.id_recusa ? 0.7 : 1 }}
                        onClick={handlePrintCartaAvaliacao}
                      >
                        <Printer size={16} /> Imprime Carta Avaliação
                      </button>
                    </div>
                  </div>

                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                   {(!isProduced || hasRecusaChange || hasExaminadorChange || hasObsChange) && (
                     <button 
                       className="btn-primary" 
                       onClick={handleUpdatePneu} 
                       disabled={isUpdatingPneu || !canSavePneu}
                       style={{ 
                         background: !canSavePneu ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                         border: 'none',
                         marginRight: 'auto',
                         cursor: !canSavePneu ? 'not-allowed' : 'pointer',
                         opacity: !canSavePneu ? 0.7 : 1
                       }}
                     >
                       {isUpdatingPneu ? 'Salvando...' : <><Save size={18} /> Salvar Alterações do Pneu</>}
                     </button>
                   )}
                   <button className="btn-secondary" onClick={() => { setPneuResults([]); setPneuSearchQuery(''); setPneuServicos([]); setPneuEditData(null); }}>Nova Pesquisa</button>
                </div>
              </div>
            )})}

            {/* Alerta de Pneu Faturado */}
            {isFaturado && (
              <div className="error-message" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#1d4ed8', border: '1px solid rgba(37, 99, 235, 0.2)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', borderRadius: '12px' }}>
                <CreditCard size={20} />
                <div style={{ fontWeight: '600' }}>Este pneu já foi faturado. A edição de serviços adicionais está bloqueada.</div>
              </div>
            )}

            {/* Seção de Serviços Adicionais */}
            <div className="glass-panel animate-fade-in" style={{ marginTop: '2rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#1e293b' }}>
                  <Settings size={20} color="var(--primary-color)" />
                  Serviços Adicionais do Pneu
                </h3>
                <button 
                  className="btn-primary" 
                  onClick={handleOpenAddServicoModal} 
                  style={{ 
                    padding: '0.6rem 1rem', 
                    fontSize: '0.9rem',
                    opacity: isFaturado ? 0.6 : 1,
                    cursor: isFaturado ? 'not-allowed' : 'pointer'
                  }} 
                  disabled={isFaturado}
                >
                  <Plus size={16} /> Adicionar Serviço
                </button>
              </div>

              <div className="premium-table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th style={{ width: '450px' }}>Descrição</th>
                      <th style={{ textAlign: 'center', width: '80px' }}>Qte</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>Unitário</th>
                      <th style={{ textAlign: 'right', width: '120px' }}>Total</th>
                      <th style={{ textAlign: 'center', width: '100px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pneuServicos.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum serviço adicional lançado</td>
                      </tr>
                    ) : (
                      pneuServicos.map(ps => (
                        <tr key={ps.id}>
                          <td style={{ fontWeight: '500' }}>{ps.servico_descricao || ps.descricao || 'Serviço'}</td>
                          <td style={{ textAlign: 'center' }}>{ps.quant}</td>
                          <td style={{ textAlign: 'right' }}>R$ {parseFloat(ps.valor || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}>R$ {parseFloat(ps.vrtotal || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                              <button 
                                className="btn-icon-premium success" 
                                title="Visualizar" 
                                onClick={() => {
                                  setEditingServico(ps);
                                  setNewServico({ id_servico: ps.id_servico, quant: ps.quant, valor: ps.valor });
                                  setServicoSearchQuery(ps.servico_descricao || ps.descricao || '');
                                  setShowServicoSuggestions(false);
                                  setIsServicoModalOpen(true);
                                }}
                                style={{ background: '#10b981', color: 'white', padding: '0.4rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                className="btn-icon-premium edit" 
                                title="Editar" 
                                onClick={() => {
                                  setEditingServico(ps);
                                  setNewServico({ id_servico: ps.id_servico, quant: ps.quant, valor: ps.valor });
                                  setServicoSearchQuery(ps.servico_descricao || ps.descricao || '');
                                  setShowServicoSuggestions(false);
                                  setIsServicoModalOpen(true);
                                }}
                                style={{ 
                                  background: '#3b82f6', 
                                  color: 'white', 
                                  padding: '0.4rem', 
                                  borderRadius: '8px', 
                                  border: 'none', 
                                  cursor: isFaturado ? 'not-allowed' : 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  opacity: isFaturado ? 0.5 : 1
                                }}
                                disabled={isFaturado}
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                className="btn-icon-premium delete" 
                                title="Excluir" 
                                onClick={() => handleDeleteServico(ps.id)}
                                style={{ 
                                  background: '#ef4444', 
                                  color: 'white', 
                                  padding: '0.4rem', 
                                  borderRadius: '8px', 
                                  border: 'none', 
                                  cursor: isFaturado ? 'not-allowed' : 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  opacity: isFaturado ? 0.5 : 1
                                }}
                                disabled={isFaturado}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Serviço */}
      {isServicoModalOpen && (
        <div className="premium-modal-overlay animate-fade-in">
          <div className="premium-modal glass-panel animate-scale-in" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="premium-modal-header">
              <h2>{editingServico ? 'Alterar Serviço' : 'Lançar Novo Serviço'}</h2>
              <button className="close-btn" onClick={() => setIsServicoModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ padding: '2rem', background: '#f8fafc' }}>
              <div className="premium-master-panel" style={{ padding: '1.5rem', marginBottom: 0 }}>
              <div className="form-group" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <label>Descrição do Serviço</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Comece a digitar para buscar..." 
                    value={servicoSearchQuery}
                    onChange={(e) => {
                      setServicoSearchQuery(e.target.value);
                      setShowServicoSuggestions(true);
                      if (newServico.id_servico !== 0) {
                        setNewServico({ ...newServico, id_servico: 0 });
                      }
                    }}
                    onFocus={() => {
                      if (servicoSearchQuery.length === 0) setShowServicoSuggestions(true);
                    }}
                  />
                  {showServicoSuggestions && servicoSearchQuery.length > 0 && (
                    <div className="autocomplete-dropdown glass-panel">
                      {filteredServicos.length === 0 ? (
                        <div className="autocomplete-item empty">Nenhum serviço encontrado</div>
                      ) : (
                        filteredServicos.map(s => (
                          <div 
                            key={s.id} 
                            className="autocomplete-item"
                            onClick={() => handleSelectServicoSuggestion(s)}
                            style={{ cursor: 'pointer', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between' }}
                          >
                            <span style={{ fontWeight: '500', color: '#1e293b' }}>{s.descricao}</span>
                            <span style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: '600' }}>R$ {parseFloat(s.valor).toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Quantidade</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newServico.quant} 
                    onChange={(e) => setNewServico({ ...newServico, quant: parseInt(e.target.value) || 1 })} 
                  />
                </div>
                <div className="form-group">
                  <label>Valor Unitário (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    value={newServico.valor} 
                    onChange={(e) => setNewServico({ ...newServico, valor: parseFloat(e.target.value) || 0 })} 
                  />
                </div>
              </div>
            </div>
            </div>
            <div className="premium-modal-footer">
              <button className="btn-secondary" onClick={() => setIsServicoModalOpen(false)}>Cancelar</button>
              <button 
                className="btn-primary" 
                onClick={handleAddServico} 
                disabled={!newServico.id_servico || isFaturado}
                style={{
                  opacity: (!newServico.id_servico || isFaturado) ? 0.6 : 1,
                  cursor: (!newServico.id_servico || isFaturado) ? 'not-allowed' : 'pointer'
                }}
              >
                Gravar Serviço
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertTriangle({ size }: { size: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
    </svg>
  );
}
