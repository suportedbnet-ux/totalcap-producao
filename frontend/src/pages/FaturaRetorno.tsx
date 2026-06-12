import { useState, useEffect } from 'react';
import { 
  CreditCard, Search, Printer, DollarSign, FileText, 
  Plus, Trash2, X, User, Package, Calendar, Hash, Edit, Eye, Save, ChevronRight, ExternalLink
} from 'lucide-react';
import api from '../lib/api';
import './Faturamento.css'; // Reutilizando os estilos de faturamento

export default function FaturaRetorno() {
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
  const [isImportFaturaModalOpen, setIsImportFaturaModalOpen] = useState(false);
  const [faturaImportSearch, setFaturaImportSearch] = useState('');
  const [importFaturaResults, setImportFaturaResults] = useState<any[]>([]);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [showImportSuggestions, setShowImportSuggestions] = useState(false);
  
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
    tipofat: 'R', // Retorno
    dataent: '',
    notaent: null,
    chavent: ''
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
    if (isImportFaturaModalOpen) {
      const timer = setTimeout(() => {
        handleSearchImport();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isImportFaturaModalOpen, faturaImportSearch]);

  const handleSearchImport = async () => {
    try {
      setIsImportLoading(true);
      const params: any = { limit: 50, tipofat: 'S' };
      if (faturaImportSearch) params.q = faturaImportSearch;
      const response = await api.get('/faturas/', { params });
      setImportFaturaResults(response.data);
    } catch (err) {
      console.error("Erro ao buscar faturas para importação", err);
    } finally {
      setIsImportLoading(false);
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
      const params: any = { limit: 500, tipofat: 'R' };
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
        datafat: (fatura.datafat || new Date().toISOString()).split('T')[0],
        dataent: fatura.dataent ? fatura.dataent.split('T')[0] : '',
        notaent: fatura.notaent,
        chavent: fatura.chavent || ''
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
        tipofat: 'R',
        dataent: '',
        notaent: null,
        chavent: ''
      });
      setProdutosItems([]);
    }
    setIsModalOpen(true);
  };

  const handleImportFaturaData = async (sourceFatura: any) => {
    if (!window.confirm(`Deseja importar os dados da fatura #${sourceFatura.id}? Isso substituirá os itens atuais.`)) return;

    // Buscar detalhes da fatura para pegar os pneus
    try {
      const res = await api.get(`/faturas/${sourceFatura.id}`);
      const fullFatura = res.data;

      // Mapear pneus para produtos de retorno
      const returnProducts = (fullFatura.pneus || []).map((p: any) => ({
        codproduto: 'PNEU',
        descricao: `${(p.medida_nome || '').trim()} Dot:${p.dot || ''} Serie:${p.numserie || ''} n.fogo:${p.numfogo || ''}`,
        valor: parseFloat(p.valornfe || 0),
        quant: 1,
        vrtotal: parseFloat(p.valornfe || 0)
      }));

      setFaturaForm({
        ...faturaForm,
        id_contato: fullFatura.id_contato,
        cliente_nome: fullFatura.contato_nome || '',
        id_vendedor: fullFatura.id_vendedor,
        notaent: fullFatura.pneus?.[0]?.numnota || null,
        dataent: fullFatura.pneus?.[0]?.datalan ? fullFatura.pneus[0].datalan.split('T')[0] : '',
        obs: `Importado da fatura #${fullFatura.id}`
      });

      setProdutosItems(returnProducts);
      updateTotals(returnProducts);
      setIsImportFaturaModalOpen(false);
      alert("Dados importados com sucesso!");
    } catch (err) {
      console.error("Erro ao importar dados", err);
      alert("Erro ao buscar detalhes da fatura.");
    }
  };

  const handleAddProdutoRow = () => {
    setProdutosItems([...produtosItems, { codproduto: '', descricao: '', quant: 1, valor: 0, vrtotal: 0 }]);
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
      const prod = allProdutos.find(p => p.codigo === value || p.codatual === value || p.descricao === value);
      item.codproduto = value;
      if (prod) {
        item.descricao = prod.descricao || '';
        item.valor = prod.valor || 0;
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
      
      alert("Fatura de Retorno salva com sucesso!");
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
          Fatura NF Retorno
        </h1>
        <div className="header-actions" style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn-primary" style={{ background: '#6366f1', borderColor: '#6366f1' }} onClick={() => alert("Exportando retorno para API...")} disabled={selectedFaturas.length === 0}>
            <ExternalLink size={20} /> Exporta API
          </button>
          <button className="btn-secondary" onClick={() => alert("Imprimindo faturas de retorno...")} disabled={selectedFaturas.length === 0}>
            <Printer size={20} /> Imprime
          </button>
           <button className="btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={20} /> Nova Fatura Retorno
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
                <th>Cliente</th>
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
              <h2>{modalMode === 'view' ? 'Visualizar' : editingFatura ? 'Editar' : 'Nova'} Fatura Retorno</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <div className="modal-body scrollable" style={{ background: '#f1f5f9', padding: '1.5rem' }}>
              <div className="premium-master-panel" style={{ marginBottom: '1.5rem' }}>
                <div className="premium-section-title"><User size={18} /> Dados do Cliente</div>
                <div className="search-grid">
                  <div className="form-group span-2" style={{ position: 'relative' }}>
                    <label>Cliente *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={faturaForm.cliente_nome} 
                      onChange={handleClienteChange}
                      disabled={modalMode === 'view'}
                      placeholder="Busque o cliente..."
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
                    <label>Vendedor</label>
                    <select className="form-input" value={faturaForm.id_vendedor || ''} onChange={e => setFaturaForm({...faturaForm, id_vendedor: parseInt(e.target.value)})} disabled={modalMode === 'view'}>
                      <option value="">Selecione...</option>
                      {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Data Entrada</label>
                    <input type="date" className="form-input" value={faturaForm.dataent} onChange={e => setFaturaForm({...faturaForm, dataent: e.target.value})} disabled={modalMode === 'view'} />
                  </div>
                  <div className="form-group">
                    <label>Num. NF Entrada</label>
                    <input type="number" className="form-input" value={faturaForm.notaent} onChange={e => setFaturaForm({...faturaForm, notaent: parseInt(e.target.value)})} disabled={modalMode === 'view'} />
                  </div>
                  <div className="form-group span-2">
                    <label>Chave XML Entrada</label>
                    <input type="text" className="form-input" value={faturaForm.chavent} onChange={e => setFaturaForm({...faturaForm, chavent: e.target.value})} disabled={modalMode === 'view'} />
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
                        <th style={{ width: '100px' }}>Produto</th>
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
                            <td>
                              <input 
                                type="text" 
                                className="form-input" 
                                value={item.codproduto || ''} 
                                onChange={e => handleUpdateProdutoRow(idx, 'codproduto', e.target.value)}
                                disabled={modalMode === 'view'}
                                style={{ height: '38px', fontSize: '0.85rem' }}
                                list="all-produtos-list"
                              />
                              <datalist id="all-produtos-list">
                                {allProdutos.map(p => (
                                  <option key={p.id} value={p.codigo || p.codatual}>{p.descricao}</option>
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
                  onClick={() => setIsImportFaturaModalOpen(true)}
                >
                  <Search size={18} /> Seleciona Fatura Servico
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

      {/* Modal de Importação de Fatura */}
      {isImportFaturaModalOpen && (
        <div className="os-modal-overlay" onClick={() => setIsImportFaturaModalOpen(false)}>
          <div className="premium-modal-content medium" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="premium-modal-header">
              <h2><Search size={24} /> Selecionar Fatura de Serviço para Importação</h2>
              <button className="close-btn" onClick={() => setIsImportFaturaModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <label>Pesquisar Fatura (ID ou Nome do Cliente)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Digite ID ou nome para buscar faturas..."
                    value={faturaImportSearch}
                    onChange={(e) => {
                      setFaturaImportSearch(e.target.value);
                      setShowImportSuggestions(true);
                    }}
                    onFocus={() => setShowImportSuggestions(true)}
                  />
                  {isImportLoading && <div style={{ alignSelf: 'center' }}>...</div>}
                </div>

                {showImportSuggestions && importFaturaResults.length > 0 && (
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
                    {importFaturaResults.map(f => (
                      <div 
                        key={f.id} 
                        className="autocomplete-item" 
                        onClick={() => {
                          handleImportFaturaData(f);
                          setShowImportSuggestions(false);
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
                          <div style={{ fontWeight: '700', color: 'var(--primary-color)' }}>Fatura #{f.id}</div>
                          <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{f.contato_nome}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(f.datafat).toLocaleDateString()}</div>
                          <div style={{ fontWeight: '600' }}>R$ {parseFloat(f.vrtotal || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', opacity: showImportSuggestions ? 0.3 : 1 }}>
                <table className="data-table small">
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                    <tr>
                      <th>ID</th>
                      <th>Data</th>
                      <th>Cliente</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isImportLoading ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Buscando faturas...</td></tr>
                    ) : importFaturaResults.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma fatura de serviço encontrada.</td></tr>
                    ) : (
                      importFaturaResults.map(f => (
                        <tr key={f.id}>
                          <td>#{f.id}</td>
                          <td>{new Date(f.datafat).toLocaleDateString()}</td>
                          <td style={{ fontWeight: '600' }}>{f.contato_nome}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700' }}>R$ {parseFloat(f.vrtotal || 0).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              className="btn-primary" 
                              style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', background: '#f59e0b', border: 'none' }}
                              onClick={() => handleImportFaturaData(f)}
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
              <button className="btn-secondary" onClick={() => setIsImportFaturaModalOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
