import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Printer, Layers, Eye, Download } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import './Servicos.css';
import logoEmpresa from '../assets/images/LogoEmpresa.png';

interface Medida { id: number; descricao: string; }
interface Desenho { id: number; descricao: string; }
interface Produto { id: number; descricao: string; codprod: string; }
interface TipoRecapagem { id: number; descricao: string; codigo: string; }

interface Servico {
  id: number;
  codigo: string;
  descricao: string;
  id_medida: number | null;
  id_desenho: number | null;
  id_produto: number | null;
  id_recap: number | null;
  ativo: boolean;
  grupo: string | null;
  id_fichatecnica: number | null;
  medida?: { id: number; descricao: string };
  desenho?: { id: number; descricao: string };
  produto?: { id: number; descricao: string };
  recap?: { id: number; descricao: string };
  fichatecnica?: { id: number; descricao: string };
  valor: number;
  id_servico_erp?: string;
}

export default function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [filteredServicos, setFilteredServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Auxiliary data
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [desenhos, setDesenhos] = useState<Desenho[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tiposRecap, setTiposRecap] = useState<TipoRecapagem[]>([]);
  const [fichasTecnicas, setFichasTecnicas] = useState<any[]>([]);
  const [selectedFichaItems, setSelectedFichaItems] = useState<any[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Produto autocomplete state
  const [produtoSearchQuery, setProdutoSearchQuery] = useState('');
  const [showProdutoSuggestions, setShowProdutoSuggestions] = useState(false);
  const produtoRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    descricao: '',
    id_medida: '' as string | number,
    id_desenho: '' as string | number,
    id_produto: '' as string | number,
    id_recap: '' as string | number,
    valor: '' as string | number,
    ativo: true,
    grupo: '',
    id_fichatecnica: '' as string | number,
    id_servico_erp: ''
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    fetchAuxiliaryData();
  }, []);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (produtoRef.current && !produtoRef.current.contains(e.target as Node)) {
        setShowProdutoSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredServicos(servicos);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      setFilteredServicos(servicos.filter(s =>
        s.descricao.toLowerCase().includes(lowerSearch) ||
        s.codigo?.toLowerCase().includes(lowerSearch) ||
        s.medida?.descricao.toLowerCase().includes(lowerSearch) ||
        s.produto?.descricao.toLowerCase().includes(lowerSearch)
      ));
    }
  }, [searchTerm, servicos]);

  // Auto-generate código e descrição
  useEffect(() => {
    // Only auto-generate if we are creating or if the user changed the IDs
    // We check if the values are actually different from the current formData to avoid loops
    // and we only run if the auxiliary data is loaded.

    if (medidas.length === 0 || desenhos.length === 0 || tiposRecap.length === 0) return;

    // Rule 1: Product Priority (only if id_produto is set and > 0)
    if (formData.id_produto && Number(formData.id_produto) > 0) {
      const prod = produtos.find(p => p.id === Number(formData.id_produto));
      if (prod) {
        const novoCodigo = prod.codprod || '';
        const novaDescricao = prod.descricao || '';
        if (formData.codigo !== novoCodigo || formData.descricao !== novaDescricao) {
          setFormData(prev => ({ ...prev, codigo: novoCodigo, descricao: novaDescricao }));
        }
        return;
      }
    }

    // Rule 2: Medida + Desenho + Tipo Recapagem
    if (Number(formData.id_medida) > 0 && Number(formData.id_desenho) > 0 && Number(formData.id_recap) > 0) {
      const med = medidas.find(m => m.id === Number(formData.id_medida));
      const des = desenhos.find(d => d.id === Number(formData.id_desenho));
      const rec = tiposRecap.find(r => r.id === Number(formData.id_recap));

      if (med && des && rec) {
        const novoCodigo = `${Number(formData.id_medida)}.${Number(formData.id_desenho)}.${Number(formData.id_recap)}`;
        const novaDescricao = `${med.descricao.trim()} ${des.descricao.trim()} ${rec.codigo.trim()}`;
        if (formData.codigo !== novoCodigo || formData.descricao !== novaDescricao) {
          setFormData(prev => ({ ...prev, codigo: novoCodigo, descricao: novaDescricao }));
        }
      }
    }
  }, [formData.id_medida, formData.id_desenho, formData.id_recap, formData.id_produto, produtos, medidas, desenhos, tiposRecap]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/servicos/');
      setServicos(response.data);
    } catch (error) {
      console.error("Erro ao buscar serviços:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [mRes, dRes, maRes, rRes, fRes] = await Promise.all([
        api.get('/medidas/'),
        api.get('/desenhos/'),
        api.get('/produtos/'),
        api.get('/tipo-recapagem/'),
        api.get('/fichatecnica/')
      ]);
      setMedidas(mRes.data);
      setDesenhos(dRes.data);
      setProdutos(maRes.data);
      setTiposRecap(rRes.data);
      setFichasTecnicas(fRes.data);
    } catch (error) {
      console.error("Erro ao buscar dados auxiliares:", error);
    }
  };

  const openModal = (mode: 'create' | 'edit' | 'view', servico?: Servico) => {
    setModalMode(mode);
    setFormError('');
    if ((mode === 'edit' || mode === 'view') && servico) {
      setCurrentId(servico.id);
      setFormData({
        codigo: servico.codigo || '',
        descricao: servico.descricao || '',
        id_medida: (servico.id_medida || servico.medida?.id)?.toString() || '',
        id_desenho: (servico.id_desenho || servico.desenho?.id)?.toString() || '',
        id_produto: (servico.id_produto || servico.produto?.id)?.toString() || '',
        id_recap: (servico.id_recap || servico.recap?.id)?.toString() || '',
        valor: servico.valor || 0,
        ativo: servico.ativo,
        grupo: servico.grupo || '',
        id_fichatecnica: (servico.id_fichatecnica || servico.fichatecnica?.id)?.toString() || '',
        id_servico_erp: servico.id_servico_erp || ''
      });
      setProdutoSearchQuery(servico.produto?.descricao || '');

      const ficha = fichasTecnicas.find(f => f.id === (servico.id_fichatecnica || servico.fichatecnica?.id));
      setSelectedFichaItems(ficha?.itens || []);
    } else {
      setCurrentId(null);
      setFormData({
        codigo: '',
        descricao: '',
        id_medida: '',
        id_desenho: '',
        id_produto: '',
        id_recap: '',
        valor: 0,
        ativo: true,
        grupo: '',
        id_fichatecnica: '',
        id_servico_erp: ''
      });
      setProdutoSearchQuery('');
      setSelectedFichaItems([]);
    }
    setShowProdutoSuggestions(false);
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));

    if (id === 'id_fichatecnica') {
      const ficha = fichasTecnicas.find(f => f.id === Number(value));
      setSelectedFichaItems(ficha?.itens || []);
    }
  };

  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectProduto = (p: Produto) => {
    setFormData(prev => ({
      ...prev,
      id_produto: p.id,
      codigo: p.codprod || prev.codigo,
      descricao: p.descricao || prev.descricao
    }));
    setProdutoSearchQuery(p.descricao);
    setShowProdutoSuggestions(false);
  };

  const filteredProdutos = produtos.filter(p =>
    p.descricao.toLowerCase().includes(produtoSearchQuery.toLowerCase()) ||
    (p.codprod && p.codprod.toLowerCase().includes(produtoSearchQuery.toLowerCase()))
  );

  const handleImportarERP = async () => {
    if (!formData.codigo) {
      alert("Para importar do ERP, é necessário ter um código de serviço preenchido na tela.");
      return;
    }

    let payloadRequest: any = null;

    try {
      payloadRequest = {
        recurso: `servicos?codigo=${formData.codigo}`,
        method: "GET"
      };

      const response: any = await api.post('/gestaoclick/proxy', payloadRequest);
      const data = response.data;

      const statusCode = response.status || 200;
      let erpId = null;
      if (statusCode === 200) {
        const apiResp = data.response_data || data;
        if (Array.isArray(apiResp?.data) && apiResp.data.length > 0) {
          erpId = apiResp.data[0].id;
        } else if (apiResp?.id) {
          erpId = apiResp.id;
        } else if (Array.isArray(apiResp) && apiResp.length > 0) {
          erpId = apiResp[0].id;
        } else if (apiResp?.data?.id) {
          erpId = apiResp.data.id;
        }
      }

      if (erpId) {
        setFormData(prev => ({ ...prev, id_servico_erp: String(erpId) }));
        alert(`Serviço encontrado no ERP! ID atualizado para: ${erpId}\nClique em Salvar para gravar essa alteração no banco.`);
      } else {
        alert("Nenhum serviço correspondente encontrado no ERP com este código.");
      }

      const jsonHeaders = response.data?.request_info?.headers ? JSON.stringify(response.data.request_info.headers, null, 2) : "{}";
      const statusText = `STATUS: ${response.status || 200}\n\n=== HEADER ENVIADO ===\n${jsonHeaders}\n\n=== REQUISIÇÃO ENVIADA ===\n${JSON.stringify(payloadRequest, null, 2)}\n\n=== RETORNO ===\n${JSON.stringify(data, null, 2)}`;
      try {
        await navigator.clipboard.writeText(statusText);
      } catch (e) { }

    } catch (err: any) {
      console.error("Erro Importação ERP:", err);
      const errorResponse = err.response?.data || err.message;
      const jsonPayload = payloadRequest ? JSON.stringify(payloadRequest, null, 2) : "Requisição não montada";
      const statusCode = err.response?.status || 'Desconhecido';
      const jsonHeaders = err.response?.data?.request_info?.headers ? JSON.stringify(err.response.data.request_info.headers, null, 2) : "{}";
      const debugText = `STATUS: ${statusCode}\n\n=== HEADER ENVIADO ===\n${jsonHeaders}\n\n=== REQUISIÇÃO ENVIADA ===\n${jsonPayload}\n\n=== RETORNO ===\n${JSON.stringify(errorResponse, null, 2)}`;

      try {
        await navigator.clipboard.writeText(debugText);
        alert("Erro ao tentar buscar o serviço no ERP.\nO JSON da requisição foi copiado para a sua área de transferência para ajudar na verificação.");
      } catch (e) {
        alert("Erro ao tentar buscar o serviço no ERP. Verifique o console ou o log da requisição.");
      }
    }
  };

  const handleExportarAPI = async () => {
    if (!formData.codigo) {
      alert("Para exportar para o ERP, é necessário ter um código de serviço.");
      return;
    }
    if (!formData.descricao) {
      alert("Para exportar para o ERP, é necessário ter uma descrição (nome do serviço).");
      return;
    }

    let payloadRequest: any = null;

    try {
      const payloadParam = {
        codigo: formData.codigo,
        nome: formData.descricao,
        valor_venda: formData.valor ? Number(formData.valor) : 0,
        observacoes: "Recapagem"
      };

      payloadRequest = {
        recurso: "servicos",
        method: "POST",
        param: payloadParam
      };

      const response: any = await api.post('/gestaoclick/proxy', payloadRequest);
      const data = response.data;

      const statusCode = response.status || 200;
      let erpId = null;
      if (statusCode === 200) {
        const apiResp = data.response_data || data;
        if (Array.isArray(apiResp?.data) && apiResp.data.length > 0) {
          erpId = apiResp.data[0].id;
        } else if (apiResp?.id) {
          erpId = apiResp.id;
        } else if (Array.isArray(apiResp) && apiResp.length > 0) {
          erpId = apiResp[0].id;
        } else if (apiResp?.data?.id) {
          erpId = apiResp.data.id;
        }
      }

      if (erpId) {
        setFormData(prev => ({ ...prev, id_servico_erp: String(erpId) }));
      }

      const jsonHeaders = response.data?.request_info?.headers ? JSON.stringify(response.data.request_info.headers, null, 2) : "{}";
      const statusText = `STATUS: ${response.status || 200}\n\n=== HEADER ENVIADO ===\n${jsonHeaders}\n\n=== REQUISIÇÃO ENVIADA ===\n${JSON.stringify(payloadRequest, null, 2)}\n\n=== RETORNO ===\n${JSON.stringify(data, null, 2)}`;

      try {
        await navigator.clipboard.writeText(statusText);
        alert(`Ação concluída com sucesso no ERP!\n\n(O JSON da requisição foi copiado para a sua área de transferência).`);
      } catch (err) {
        alert("Ação concluída com sucesso no ERP!");
      }

    } catch (err: any) {
      console.error("Erro Exportação ERP:", err);
      const errorResponse = err.response?.data || err.message;
      const jsonPayload = payloadRequest ? JSON.stringify(payloadRequest, null, 2) : "Requisição não montada";
      const jsonError = JSON.stringify(errorResponse, null, 2);

      const statusCode = err.response?.status || 'Desconhecido';
      const jsonHeaders = err.response?.data?.request_info?.headers ? JSON.stringify(err.response.data.request_info.headers, null, 2) : "{}";
      const debugText = `STATUS: ${statusCode}\n\n=== HEADER ENVIADO ===\n${jsonHeaders}\n\n=== REQUISIÇÃO ENVIADA ===\n${jsonPayload}\n\n=== RETORNO DE ERRO ===\n${jsonError}`;

      try {
        await navigator.clipboard.writeText(debugText);
        alert(`Erro ao exportar serviço. O detalhe do erro foi copiado para a sua área de transferência.`);
      } catch (e) {
        alert(getErrorMessage(err, "Erro ao exportar serviço para o ERP."));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao.trim()) {
      setFormError('A descrição do serviço é obrigatória.');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    const payload = {
      ...formData,
      id_medida: formData.id_medida === '' ? null : Number(formData.id_medida),
      id_desenho: formData.id_desenho === '' ? null : Number(formData.id_desenho),
      id_produto: formData.id_produto === '' ? null : Number(formData.id_produto),
      id_recap: formData.id_recap === '' ? null : Number(formData.id_recap),
      id_fichatecnica: formData.id_fichatecnica === '' ? null : Number(formData.id_fichatecnica),
      valor: formData.valor === '' ? 0 : Number(formData.valor)
    };

    try {
      if (modalMode === 'create') {
        await api.post('/servicos/', payload);
      } else if (modalMode === 'edit' && currentId !== null) {
        await api.put(`/servicos/${currentId}`, payload);
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(getErrorMessage(err, 'Erro ao salvar serviço.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, descricao: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o serviço "${descricao}"?`)) {
      try {
        await api.delete(`/servicos/${id}`);
        await fetchData();
      } catch (error) {
        alert('Erro ao excluir o serviço.');
      }
    }
  };

  return (
    <div className="servicos-container">
      <div className="print-header">
        <img src={logoEmpresa} alt="Logo Empresa" className="print-logo" />
        <h1 className="print-title">Catálogo Técnico de Serviços</h1>
      </div>

      <div className="page-header">
        <h1 className="title">Serviços</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={20} /> Imprimir
          </button>
          <button className="btn-primary" onClick={() => openModal('create')}>
            <Plus size={20} /> Novo Serviço
          </button>
        </div>
      </div>

      <div className="glass-panel table-container">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por descrição, código, medida ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="data-table-wrapper">
          {loading ? (
            <div className="loading-state">Carregando...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th style={{ width: '100px' }}>Código</th>
                  <th>Serviço / Medida</th>
                  <th>Produto / Desenho</th>
                  <th>T. Recap</th>
                  <th style={{ width: '100px' }}>Valor</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '100px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredServicos.length === 0 ? (
                  <tr><td colSpan={8} className="empty-state">Nenhum serviço encontrado.</td></tr>
                ) : (
                  filteredServicos.map(s => (
                    <tr key={s.id}>
                      <td>#{s.id}</td>
                      <td><strong>{s.codigo || '-'}</strong></td>
                      <td>
                        <div className="servico-info">
                          <span className="servico-desc">{s.descricao}</span>
                          {s.medida && <span className="servico-sub">Medida: {s.medida.descricao}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="servico-info">
                          <span>{s.produto?.descricao || '-'}</span>
                          {s.desenho && <span className="servico-sub">{s.desenho.descricao}</span>}
                        </div>
                      </td>
                      <td>{s.recap?.descricao || '-'}</td>
                      <td><strong>R$ {(s.valor || 0).toFixed(2)}</strong></td>
                      <td>
                        <span className={`status-badge ${s.ativo ? 'active' : 'inactive'}`}>
                          {s.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className="btn-icon-premium view"
                            onClick={() => openModal('view', s)}
                            title="Visualizar"
                            style={{ background: '#10b981', color: 'white', padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="btn-icon-premium edit"
                            onClick={() => openModal('edit', s)}
                            title="Editar"
                            style={{ background: '#3b82f6', color: 'white', padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon-premium delete"
                            onClick={() => handleDelete(s.id, s.descricao)}
                            title="Excluir"
                            style={{ background: '#ef4444', color: 'white', padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
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
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="premium-modal-content large" style={{ maxWidth: '1200px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2>
                {modalMode === 'create' ? 'Novo Serviço' :
                  modalMode === 'edit' ? 'Editar Serviço' :
                    'Visualizar Serviço'}
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {(modalMode === 'edit' || modalMode === 'view') && (
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: '#10b981', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={handleExportarAPI}
                  >
                    <Layers size={18} /> Exporta ERP
                  </button>
                )}
                <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ background: '#E5E5E5', padding: '1.5rem', minHeight: '400px' }}>
                {formError && <div className="form-error full-width">{formError}</div>}

                <div className="premium-master-panel" style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div className="grid-code-desc" style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label htmlFor="codigo" style={{ fontWeight: '600', color: '#475569' }}>Código</label>
                      <input className="form-input" id="codigo" value={formData.codigo} onChange={handleChange} placeholder="---" disabled={modalMode === 'view'} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="descricao" style={{ fontWeight: '600', color: '#475569' }}>Descrição *</label>
                      <input className="form-input" id="descricao" value={formData.descricao} onChange={handleChange} placeholder="Gerada automaticamente..." required disabled={modalMode === 'view'} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>

                  <div className="form-split-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div className="left-column">
                      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                        <div className="form-group">
                          <label htmlFor="id_medida">Medida</label>
                          <select className="form-select" id="id_medida" value={formData.id_medida} onChange={handleChange} disabled={modalMode === 'view'}>
                            <option value="">Selecione a Medida</option>
                            {medidas.map(m => <option key={m.id} value={m.id.toString()}>{m.descricao}</option>)}
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="id_desenho">Desenho</label>
                          <select className="form-select" id="id_desenho" value={formData.id_desenho} onChange={handleChange} disabled={modalMode === 'view'}>
                            <option value="">Selecione o Desenho</option>
                            {desenhos.map(d => <option key={d.id} value={d.id.toString()}>{d.descricao}</option>)}
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="id_recap">Tipo de Recapagem</label>
                          <select className="form-select" id="id_recap" value={formData.id_recap} onChange={handleChange} disabled={modalMode === 'view'}>
                            <option value="">Selecione o Tipo</option>
                            {tiposRecap.map(r => <option key={r.id} value={r.id.toString()}>{r.descricao}</option>)}
                          </select>
                        </div>

                        <div className="form-group" ref={produtoRef} style={{ position: 'relative' }}>
                          <label style={{ fontWeight: '600', color: '#475569' }}>Produto</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar produto..."
                            value={produtoSearchQuery}
                            onChange={(e) => {
                              setProdutoSearchQuery(e.target.value);
                              setShowProdutoSuggestions(true);
                              if (formData.id_produto) setFormData(prev => ({ ...prev, id_produto: '' }));
                            }}
                            onFocus={() => setShowProdutoSuggestions(true)}
                            disabled={modalMode === 'view'}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          />
                          {showProdutoSuggestions && produtoSearchQuery.length > 0 && (
                            <div className="autocomplete-dropdown glass-panel" style={{ zIndex: 4000, position: 'absolute', width: '100%', backgroundColor: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                              {filteredProdutos.length === 0 ? (
                                <div className="autocomplete-item empty" style={{ padding: '0.75rem', color: '#64748b' }}>Nenhum produto encontrado</div>
                              ) : (
                                filteredProdutos.map(p => (
                                  <div key={p.id} className="autocomplete-item" onClick={() => handleSelectProduto(p)}>
                                    <span className="name">{p.descricao}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label style={{ fontWeight: '600', color: '#475569' }}>Grupo de Serviço</label>
                          <select className="form-input" id="grupo" value={formData.grupo} onChange={(e) => setFormData({ ...formData, grupo: e.target.value })} disabled={modalMode === 'view'}>
                            <option value="">Selecione um grupo...</option>
                            <option value="RECAPAGEM">RECAPAGEM</option>
                            <option value="MANCHOES">MANCHOES</option>
                            <option value="PROTETORES">PROTETORES</option>
                            <option value="LONAS">LONAS</option>
                            <option value="CONSERTO">CONSERTO</option>
                            <option value="PATIO">PATIO</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label style={{ fontWeight: '600', color: '#475569' }}>Valor (R$)</label>
                          <input type="number" step="0.01" className="form-input" id="valor" value={formData.valor} onChange={handleMasterChange} placeholder="0.00" disabled={modalMode === 'view'} />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label htmlFor="id_fichatecnica">Ficha Técnica</label>
                          <select className="form-select" id="id_fichatecnica" value={formData.id_fichatecnica} onChange={handleChange} disabled={modalMode === 'view'}>
                            <option value="">Selecione a Ficha</option>
                            {fichasTecnicas.map(f => <option key={f.id} value={f.id.toString()}>{f.descricao}</option>)}
                          </select>
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                          <div className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="checkbox" id="ativo" checked={formData.ativo} onChange={handleChange} style={{ width: '18px', height: '18px' }} disabled={modalMode === 'view'} />
                            <label htmlFor="ativo" style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Serviço ativo para novas ordens</label>
                          </div>
                        </div>

                        <div className="form-group">
                          <label htmlFor="id_servico_erp" style={{ fontWeight: '600', color: '#475569' }}>ID Integração (GestãoClick)</label>
                          <input type="text" className="form-input" id="id_servico_erp" value={formData.id_servico_erp || ''} onChange={handleChange} placeholder="Ex: 58172930" disabled={modalMode === 'view'} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                        </div>
                      </div>
                    </div>

                    <div className="right-column">
                      <div className="premium-master-panel" style={{ background: '#f8fafc', height: '100%', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', borderRadius: '12px 12px 0 0' }}>
                          <h3 style={{ fontSize: '0.9rem', margin: 0, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Layers size={18} /> Composição da Ficha Técnica
                          </h3>
                        </div>
                        <div style={{ flex: 1, padding: '0.5rem', overflowY: 'auto', maxHeight: '350px' }}>
                          <table className="dispositivos-table" style={{ fontSize: '0.8rem' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th>Produto (Matéria Prima)</th>
                                <th style={{ width: '80px', textAlign: 'right' }}>Quant.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedFichaItems.length === 0 ? (
                                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Selecione uma Ficha Técnica para ver os itens.</td></tr>
                              ) : (
                                selectedFichaItems.map((item, idx) => (
                                  <tr key={idx}>
                                    <td style={{ textAlign: 'center' }}>{item.ordem || idx + 1}</td>
                                    <td>{item.produto_descricao || `Produto #${item.id_produto}`}</td>
                                    <td style={{ textAlign: 'right' }}><strong>{item.quant}</strong></td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="premium-modal-footer">
                <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                  {(modalMode === 'edit' || modalMode === 'view') && (
                    <button type="button" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#e0e7ff', color: '#4f46e5', borderColor: '#c7d2fe' }} onClick={handleImportarERP}>
                      <Download size={18} /> Importa ERP
                    </button>
                  )}
                </div>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>Salvar</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewer modal removido, grid agora é inline */}
    </div>
  );
}
