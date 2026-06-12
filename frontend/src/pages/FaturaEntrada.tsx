import { useState, useEffect } from 'react';
import { 
  CreditCard, Search, DollarSign, Plus, Trash2, X, User, Package, Calendar, Edit, Eye, Save,
  Printer, ExternalLink
} from 'lucide-react';
import api from '../lib/api';
import './Faturamento.css';

export default function FaturaEntrada() {
  const [faturas, setFaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [faturaLoading, setFaturaLoading] = useState(false);
  const [faturaSearchQuery, setFaturaSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFaturas, setSelectedFaturas] = useState<number[]>([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingFatura, setEditingFatura] = useState<any | null>(null);
  const [isImportOSModalOpen, setIsImportOSModalOpen] = useState(false);
  const [osImportSearch, setOsImportSearch] = useState('');
  const [osImportResults, setOsImportResults] = useState<any[]>([]);
  const [isOsLoading, setIsOsLoading] = useState(false);
  const [showOsSuggestions, setShowOsSuggestions] = useState(false);
  
  // Form states
  const [faturaForm, setFaturaForm] = useState<any>({
    id_contato: null,
    cliente_nome: '',
    id_planopag: 0,
    id_vendedor: null,
    id_banco: null,
    id_tipodocto: 0,
    obs: '',
    datafat: new Date().toISOString().split('T')[0],
    vrservico: 0,
    vrproduto: 0,
    vrcarcaca: 0,
    vrmontagem: 0,
    vrbonus: 0,
    vrtotal: 0,
    tipofat: 'E' // Entrada
  });
  
  const [produtosItems, setProdutosItems] = useState<any[]>([]);
  
  // Aux data
  const [clientes, setClientes] = useState<any[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [bancos, setBancos] = useState<any[]>([]);
  const [tiposDocto, setTiposDocto] = useState<any[]>([]);
  const [allPlanosPag, setAllPlanosPag] = useState<any[]>([]);
  const [allProdutos, setAllProdutos] = useState<any[]>([]);

  useEffect(() => {
    fetchFaturas();
    fetchAuxData();
  }, []);

  useEffect(() => {
    if (isImportOSModalOpen) {
      const timer = setTimeout(() => {
        handleSearchOS();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isImportOSModalOpen, osImportSearch]);

  const handleSearchOS = async () => {
    try {
      setIsOsLoading(true);
      const params: any = { limit: 50, statusfat: false }; // Apenas as não faturadas ou todas? 
      if (osImportSearch) params.q = osImportSearch;
      const response = await api.get('/ordens-servico/', { params });
      setOsImportResults(response.data);
    } catch (err) {
      console.error("Erro ao buscar OS para importação", err);
    } finally {
      setIsOsLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [resCli, resVen, resBan, resTip, resPla, resPro] = await Promise.all([
        api.get('/clientes/'),
        api.get('/vendedores/'),
        api.get('/bancos/'),
        api.get('/tipos-docto/'),
        api.get('/planos-pagamento/'),
        api.get('/produtos/', { params: { limit: 1000 } })
      ]);
      setClientes(resCli.data);
      setVendedores(resVen.data);
      setBancos(resBan.data);
      setTiposDocto(resTip.data);
      setAllPlanosPag(resPla.data);
      setAllProdutos(resPro.data.items || []);
    } catch (err) {
      console.error("Erro ao buscar dados auxiliares", err);
    }
  };

  const fetchFaturas = async () => {
    try {
      setFaturaLoading(true);
      const params: any = { limit: 500, tipofat: 'E' };
      if (faturaSearchQuery) params.q = faturaSearchQuery;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await api.get('/faturas/', { params });
      setFaturas(response.data);
    } catch (err) {
      console.error("Erro ao buscar faturas", err);
    } finally {
      setFaturaLoading(false);
    }
  };

  const handleOpenModal = (fatura?: any, mode: 'create' | 'edit' | 'view' = 'create') => {
    setModalMode(mode);
    if (fatura) {
      setEditingFatura(fatura);
      setFaturaForm({
        ...fatura,
        datafat: (fatura.datafat || new Date().toISOString()).split('T')[0]
      });
      setProdutosItems(fatura.produtos || []);
    } else {
      setEditingFatura(null);
      setFaturaForm({
        id_contato: null,
        cliente_nome: '',
        id_planopag: 0,
        id_vendedor: null,
        id_banco: null,
        id_tipodocto: 0,
        obs: '',
        datafat: new Date().toISOString().split('T')[0],
        vrservico: 0,
        vrproduto: 0,
        vrcarcaca: 0,
        vrmontagem: 0,
        vrbonus: 0,
        vrtotal: 0,
        tipofat: 'E'
      });
      setProdutosItems([]);
    }
    setIsModalOpen(true);
  };

  const handleImportOSData = async (sourceOS: any) => {
    if (!window.confirm(`Deseja importar os dados da OS #${sourceOS.numos}? Isso substituirá os itens atuais.`)) return;

    try {
      // Buscar detalhes da OS para pegar os pneus
      const res = await api.get(`/ordens-servico/${sourceOS.id}`);
      const fullOS = res.data;

      // Mapear pneus para produtos de entrada
      const entryProducts = (fullOS.pneus || []).map((p: any) => ({
        codproduto: 'PNEU',
        descricao: `${(p.medida_nome || '').trim()} Dot:${(p.dot || '').trim()} Serie:${(p.numserie || '').trim()} n.fogo:${(p.numfogo || '').trim()}`,
        valor: parseFloat(p.valornfe || 0),
        quant: 1,
        vrtotal: parseFloat(p.valornfe || 0)
      }));

      setFaturaForm({
        ...faturaForm,
        id_contato: fullOS.id_contato,
        cliente_nome: fullOS.contato_nome || '',
        id_vendedor: fullOS.id_vendedor,
        obs: `Importado da OS #${fullOS.numos}`
      });

      setProdutosItems(entryProducts);
      updateTotals(entryProducts);
      setIsImportOSModalOpen(false);
      alert("Dados da OS importados com sucesso!");
    } catch (err) {
      console.error("Erro ao importar dados da OS", err);
      alert("Erro ao buscar detalhes da OS.");
    }
  };

  const handleAddProdutoRow = () => {
    setProdutosItems([...produtosItems, { id_produto: null, descricao: '', quant: 1, valor: 0, vrtotal: 0 }]);
  };

  const handleRemoveProdutoRow = (index: number) => {
    const newItems = [...produtosItems];
    newItems.splice(index, 1);
    setProdutosItems(newItems);
    updateTotals(newItems);
  };

  const handleUpdateProdutoRow = (index: number, field: string, value: any) => {
    const newItems = [...produtosItems];
    const item = { ...newItems[index] };
    
    if (field === 'codproduto') {
      item.codproduto = value;
      const prod = allProdutos.find(p => (p.codatual === value || p.id === parseInt(value)));
      if (prod) {
        item.descricao = prod.descricao;
        item.valor = prod.valor;
      }
    } else {
      item[field] = value;
    }
    
    item.vrtotal = (parseFloat(item.quant) || 0) * (parseFloat(item.valor) || 0);
    newItems[index] = item;
    setProdutosItems(newItems);
    updateTotals(newItems);
  };

  const updateTotals = (items: any[]) => {
    const totalProd = items.reduce((acc, curr) => acc + (parseFloat(curr.vrtotal) || 0), 0);
    setFaturaForm(prev => ({
      ...prev,
      vrproduto: totalProd,
      vrtotal: totalProd + (parseFloat(prev.vrservico) || 0) + (parseFloat(prev.vrcarcaca) || 0) + (parseFloat(prev.vrmontagem) || 0) - (parseFloat(prev.vrbonus) || 0)
    }));
  };

  const handleSave = async () => {
    if (!faturaForm.id_contato) return alert("Selecione um cliente.");
    
    try {
      setLoading(true);
      const payload = {
        ...faturaForm,
        produtos: produtosItems
      };
      
      if (editingFatura) {
        await api.put(`/faturas/${editingFatura.id}`, payload);
      } else {
        await api.post('/faturas/', payload);
      }
      
      alert("Fatura de Entrada salva com sucesso!");
      setIsModalOpen(false);
      fetchFaturas();
    } catch (err: any) {
      alert("Erro ao salvar: " + (err.response?.data?.detail || "Erro no servidor"));
    } finally {
      setLoading(false);
    }
  };

  const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFaturaForm({ ...faturaForm, cliente_nome: value });
    if (value.length >= 2) {
      const filtered = clientes.filter(c => c.nome.toLowerCase().includes(value.toLowerCase())).slice(0, 10);
      setFilteredClientes(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectCliente = (c: any) => {
    setFaturaForm({ ...faturaForm, id_contato: c.id, cliente_nome: c.nome, id_vendedor: c.id_vendedor });
    setShowSuggestions(false);
  };

  return (
    <div className="faturamento-container">
      <div className="page-header">
        <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <CreditCard size={32} color="var(--primary-color)" />
          Fatura NF Entrada
        </h1>
        <div className="header-actions" style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn-primary" style={{ background: '#6366f1', borderColor: '#6366f1' }} onClick={() => alert("Exportando para API...")} disabled={selectedFaturas.length === 0}>
            <ExternalLink size={20} /> Exporta API
          </button>
          <button className="btn-secondary" onClick={() => alert("Imprimindo faturas selecionadas...")} disabled={selectedFaturas.length === 0}>
            <Printer size={20} /> Imprime
          </button>
           <button className="btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} /> Nova Fatura Entrada
          </button>
        </div>
      </div>

      <div className="search-section glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div className="search-grid" style={{ gridTemplateColumns: '1.2fr auto auto auto auto', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label><Search size={14} /> Buscar (ID ou Cliente)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Digite para buscar..." 
              value={faturaSearchQuery}
              onChange={e => setFaturaSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label><Calendar size={14} /> Início</label>
            <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label><Calendar size={14} /> Fim</label>
            <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label style={{ visibility: 'hidden' }}>&nbsp;</label>
            <button className="btn-primary" onClick={fetchFaturas} style={{ height: '42px', width: '100%' }}>
              <Search size={18} /> Filtrar
            </button>
          </div>
          {selectedFaturas.length > 0 && (
            <div className="form-group">
              <label style={{ visibility: 'hidden' }}>&nbsp;</label>
              <button 
                className="btn-primary" 
                onClick={() => alert(`Gerando NF para ${selectedFaturas.length} faturas...`)}
                style={{ height: '42px', width: '100%', background: '#10b981', borderColor: '#10b981' }}
              >
                <FileText size={18} /> Gerar NF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) setSelectedFaturas(faturas.map(f => f.id));
                      else setSelectedFaturas([]);
                    }}
                    checked={selectedFaturas.length === faturas.length && faturas.length > 0}
                  />
                </th>
                <th style={{ width: '80px' }}>ID</th>
                <th>Data</th>
                <th>Cliente / Fornecedor</th>
                <th>Vendedor</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {faturas.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Nenhuma fatura encontrada.</td></tr>
              ) : (
                faturas.map(f => (
                  <tr key={f.id} className={selectedFaturas.includes(f.id) ? 'selected-row' : ''}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedFaturas.includes(f.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedFaturas([...selectedFaturas, f.id]);
                          else setSelectedFaturas(selectedFaturas.filter(id => id !== f.id));
                        }}
                      />
                    </td>
                    <td><span className="os-number">#{f.id}</span></td>
                    <td>{new Date(f.datafat).toLocaleDateString()}</td>
                    <td style={{ fontWeight: '600' }}>{f.contato_nome}</td>
                    <td>{f.vendedor_nome || '---'}</td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: '#10b981' }}>R$ {parseFloat(f.vrtotal).toFixed(2)}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon-premium success" onClick={() => handleOpenModal(f, 'view')}><Eye size={18} /></button>
                        <button className="btn-icon-premium edit" onClick={() => handleOpenModal(f, 'edit')}><Edit size={18} /></button>
                        <button className="btn-icon-premium delete" onClick={async () => {
                          if (confirm("Excluir fatura?")) {
                            await api.delete(`/faturas/${f.id}`);
                            fetchFaturas();
                          }
                        }}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="os-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="premium-modal-content full-screen" onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2>{modalMode === 'view' ? 'Visualizar' : editingFatura ? 'Editar' : 'Nova'} Fatura Entrada</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <div className="modal-body scrollable" style={{ background: '#f1f5f9', padding: '1.5rem' }}>
              <div className="premium-master-panel" style={{ marginBottom: '1.5rem' }}>
                <div className="premium-section-title"><User size={18} /> Dados do Fornecedor / Cliente</div>
                <div className="search-grid">
                  <div className="form-group span-2" style={{ position: 'relative' }}>
                    <label>Cliente / Fornecedor *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={faturaForm.cliente_nome} 
                      onChange={handleClienteChange}
                      disabled={modalMode === 'view'}
                      placeholder="Busque o contato..."
                    />
                    {showSuggestions && (
                      <div className="autocomplete-dropdown glass-panel" style={{ position: 'absolute', width: '100%', zIndex: 100 }}>
                        {filteredClientes.map(c => (
                          <div key={c.id} className="autocomplete-item" onClick={() => selectCliente(c)} style={{ padding: '0.8rem', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                            {c.nome}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Data</label>
                    <input type="date" className="form-input" value={faturaForm.datafat} onChange={e => setFaturaForm({...faturaForm, datafat: e.target.value})} disabled={modalMode === 'view'} />
                  </div>
                  <div className="form-group">
                    <label>Vendedor / Comprador</label>
                    <select className="form-input" value={faturaForm.id_vendedor || ''} onChange={e => setFaturaForm({...faturaForm, id_vendedor: parseInt(e.target.value)})} disabled={modalMode === 'view'}>
                      <option value="">Selecione...</option>
                      {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="premium-master-panel" style={{ marginBottom: '1.5rem' }}>
                <div className="premium-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={18} /> Itens da Fatura (Produtos)
                  </div>
                  {modalMode !== 'view' && (
                    <button className="btn-primary" onClick={handleAddProdutoRow} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                      <Plus size={16} /> Adicionar Item
                    </button>
                  )}
                </div>
                <div className="table-responsive">
                  <table className="data-table small">
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Produto</th>
                        <th>Descrição</th>
                        <th style={{ width: '100px' }}>Qte</th>
                        <th style={{ width: '150px' }}>V. Unit</th>
                        <th style={{ width: '150px', textAlign: 'right' }}>Total</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtosItems.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum item adicionado.</td></tr>
                      ) : (
                        produtosItems.map((item, idx) => (
                          <tr key={idx}>
                          <td style={{ display: 'flex', gap: '0.5rem', border: 'none' }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              list="produtos-list"
                              value={item.codproduto || ''} 
                              onChange={e => handleUpdateProdutoRow(idx, 'codproduto', e.target.value)}
                              disabled={modalMode === 'view'}
                              style={{ height: '38px', fontSize: '0.85rem' }}
                              placeholder="Cód..."
                            />
                            <datalist id="produtos-list">
                              <option value="PNEU">PNEU</option>
                              {allProdutos.map(p => (
                                <option key={p.id} value={p.codatual || p.id}>
                                  {p.descricao}
                                </option>
                              ))}
                            </datalist>
                          </td>
                            <td>
                              <input 
                                type="text" 
                                className="form-input" 
                                value={item.descricao} 
                                onChange={e => handleUpdateProdutoRow(idx, 'descricao', e.target.value)}
                                disabled={modalMode === 'view'}
                                style={{ height: '38px', fontSize: '0.85rem' }}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="form-input" 
                                value={item.quant} 
                                onChange={e => handleUpdateProdutoRow(idx, 'quant', e.target.value)}
                                disabled={modalMode === 'view'}
                                style={{ height: '38px', fontSize: '0.85rem' }}
                              />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                className="form-input" 
                                value={item.valor} 
                                onChange={e => handleUpdateProdutoRow(idx, 'valor', e.target.value)}
                                disabled={modalMode === 'view'}
                                style={{ height: '38px', fontSize: '0.85rem' }}
                              />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '700' }}>
                              R$ {(parseFloat(item.vrtotal) || 0).toFixed(2)}
                            </td>
                            <td>
                              {modalMode !== 'view' && (
                                <button className="icon-btn delete" onClick={() => handleRemoveProdutoRow(idx)}><Trash2 size={16} /></button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="premium-master-panel" style={{ background: '#f8fafc' }}>
                <div className="premium-section-title"><DollarSign size={18} /> Totais e Pagamento</div>
                <div className="search-grid">
                  <div className="form-group">
                    <label>Plano de Pagamento</label>
                    <select 
                      className="form-input" 
                      value={faturaForm.id_planopag !== null && faturaForm.id_planopag !== undefined ? faturaForm.id_planopag : ''} 
                      onChange={e => setFaturaForm({...faturaForm, id_planopag: e.target.value === '' ? null : parseInt(e.target.value)})} 
                      disabled={modalMode === 'view'}
                    >
                      <option value="">Selecione...</option>
                      {allPlanosPag.map(p => <option key={p.id} value={p.id}>{p.formapag}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Observações</label>
                    <textarea className="form-input" value={faturaForm.obs} onChange={e => setFaturaForm({...faturaForm, obs: e.target.value})} disabled={modalMode === 'view'} rows={1} />
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', color: '#64748b' }}>Valor Total da Nota</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>R$ {parseFloat(faturaForm.vrtotal || 0).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="premium-modal-footer" style={{ display: 'flex', gap: '1rem' }}>
              {modalMode === 'create' && (
                <button 
                  className="btn-primary" 
                  style={{ background: '#f59e0b', color: 'white', marginRight: 'auto', border: 'none' }} 
                  onClick={() => setIsImportOSModalOpen(true)}
                >
                  <Search size={18} /> Seleciona Ordem de Servico
                </button>
              )}
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Fechar</button>
              {modalMode !== 'view' && (
                <button className="btn-primary" onClick={handleSave} disabled={loading}>
                  <Save size={20} /> {loading ? 'Salvando...' : 'Gravar Fatura'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação de OS */}
      {isImportOSModalOpen && (
        <div className="os-modal-overlay" onClick={() => setIsImportOSModalOpen(false)}>
          <div className="premium-modal-content medium" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="premium-modal-header">
              <h2><Search size={24} /> Selecionar Ordem de Serviço para Importação</h2>
              <button className="close-btn" onClick={() => setIsImportOSModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <label>Pesquisar OS (Número ou Nome do Cliente)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Digite o número ou nome para buscar..."
                    value={osImportSearch}
                    onChange={(e) => {
                      setOsImportSearch(e.target.value);
                      setShowOsSuggestions(true);
                    }}
                    onFocus={() => setShowOsSuggestions(true)}
                  />
                  {isOsLoading && <div style={{ alignSelf: 'center' }}>...</div>}
                </div>

                {showOsSuggestions && osImportResults.length > 0 && (
                  <div className="autocomplete-dropdown glass-panel" style={{ 
                    position: 'absolute', 
                    width: '100%', 
                    zIndex: 100, 
                    maxHeight: '300px', 
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginTop: '5px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}>
                    {osImportResults.map(os => (
                      <div 
                        key={os.id} 
                        className="autocomplete-item" 
                        onClick={() => {
                          handleImportOSData(os);
                          setShowOsSuggestions(false);
                        }} 
                        style={{ 
                          padding: '1rem', 
                          cursor: 'pointer', 
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--primary-color)' }}>OS #{os.numos}</div>
                          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{os.contato_nome}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(os.dataentrada).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', opacity: showOsSuggestions ? 0.3 : 1 }}>
                <table className="data-table small">
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                    <tr>
                      <th>OS</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th style={{ textAlign: 'center' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isOsLoading ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Buscando ordens de serviço...</td></tr>
                    ) : osImportResults.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma OS encontrada.</td></tr>
                    ) : (
                      osImportResults.map(os => (
                        <tr key={os.id}>
                          <td style={{ fontWeight: '700' }}>#{os.numos}</td>
                          <td>{new Date(os.dataentrada).toLocaleDateString()}</td>
                          <td>{os.contato_nome}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn-primary" 
                              style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: '#f59e0b', border: 'none' }}
                              onClick={() => handleImportOSData(os)}
                            >
                              Importar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="premium-modal-footer">
              <button className="btn-secondary" onClick={() => setIsImportOSModalOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
