import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, Calendar, User, Factory, Loader2, Save, Package, X, AlertCircle, Edit2, Trash2, Eye } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';

interface ConsumoItem {
  id: number;
  data: string;
  id_produto?: number;
  produto_nome: string;
  quant: number;
  unidade: string;
}

export default function ConsumoMateriaPrima() {
  const [loading, setLoading] = useState(false);
  const [registros, setRegistros] = useState<ConsumoItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'por_os'>('individual');
  const [searchTermPneus, setSearchTermPneus] = useState('');
  const [pneusList, setPneusList] = useState<any[]>([]);
  const [filteredPneus, setFilteredPneus] = useState<any[]>([]);
  
  console.log("Current Active Tab:", activeTab);
  
  // Form state
  const [datamov, setDatamov] = useState('');
  const [idProduto, setIdProduto] = useState('');
  const [quant, setQuant] = useState('');
  const [obs, setObs] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Sub-modal state for Tire Materials
  const [showPneuModal, setShowPneuModal] = useState(false);
  const [selectedPneu, setSelectedPneu] = useState<any>(null);
  const [materiaisPneu, setMateriaisPneu] = useState<any[]>([]);
  const [idPneuProd, setIdPneuProd] = useState('');
  const [quantPneuProd, setQuantPneuProd] = useState('');
  const [activePneuId, setActivePneuId] = useState<number | null>(null);
  
  // Lookups
  const [produtos, setProdutos] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);

  useEffect(() => {
    fetchLookups();
    fetchRegistros();
  }, []);

  useEffect(() => {
    if (searchTermPneus.trim() === '') {
      setFilteredPneus(pneusList);
    } else {
      const lower = searchTermPneus.toLowerCase();
      setFilteredPneus(pneusList.filter(p => 
        p.medida_desc?.toLowerCase().includes(lower) || 
        p.desenho_desc?.toLowerCase().includes(lower) ||
        p.numserie?.toLowerCase().includes(lower) ||
        p.numfogo?.toLowerCase().includes(lower) ||
        p.codbarra?.toLowerCase().includes(lower)
      ));
    }
  }, [searchTermPneus, pneusList]);

  const fetchLookups = async () => {
    // Busca Produtos
    try {
      const res = await api.get('/produtos/');
      setProdutos(res.data);
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    }

    // Busca Grupos
    try {
      const res = await api.get('/grupos-produto/');
      setGrupos(res.data);
    } catch (err) {
      console.error("Erro ao carregar grupos:", err);
    }

    // Busca Pneus Individualizados
    try {
      const res = await api.get('/pneus/');
      setPneusList(res.data);
    } catch (err) {
      console.error("Erro ao carregar lista de pneus:", err);
    }
  };

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const response = await api.get('/consumo-mprima/relatorio?solo=true');
      setRegistros(response.data);
    } catch (err) {
      console.error("Erro ao buscar registros:", err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: 'create' | 'edit' | 'view', registro?: ConsumoItem) => {
    setModalMode(mode);
    setFormError('');
    if ((mode === 'edit' || mode === 'view') && registro) {
      setCurrentId(registro.id);
      setDatamov(registro.data ? registro.data.split('T')[0] : '');
      setIdProduto(registro.id_produto?.toString() || '');
      setQuant(registro.quant?.toString() || '');
      setObs(registro.obs || '');
    } else {
      setCurrentId(null);
      setDatamov(new Date().toISOString().split('T')[0]);
      setIdProduto('');
      setQuant('');
      setObs('');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idProduto || !quant) {
      alert("Por favor, preencha os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const payload: any = {
        id_produto: parseInt(idProduto),
        quant: parseFloat(quant),
        id_pneu: activePneuId
      };
      
      if (obs) payload.obs = obs;
      if (datamov) payload.datamov = datamov;

      if (modalMode === 'create') {
        await api.post('/consumo-mprima/', payload);
      } else {
        await api.put(`/consumo-mprima/${currentId}/`, payload);
      }
      
      setShowModal(false);
      resetForm();
      fetchRegistros();
      if (activePneuId) {
        fetchMateriaisPneu(activePneuId);
      }
    } catch (err: any) {
      setFormError(getErrorMessage(err, "Erro ao salvar lançamento de consumo."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este lançamento?")) return;
    try {
      await api.delete(`/consumo-mprima/${id}`);
      fetchRegistros();
      if (showPneuModal && activePneuId) {
        fetchMateriaisPneu(activePneuId);
      }
    } catch (err) {
      alert("Erro ao excluir registro.");
    }
  };

  const openPneuMaterialModal = async (pneu: any) => {
    setSelectedPneu(pneu);
    setActivePneuId(pneu.id);
    setShowPneuModal(true);
    fetchMateriaisPneu(pneu.id);
  };

  const closePneuMaterialModal = () => {
    setShowPneuModal(false);
    setSelectedPneu(null);
    setActivePneuId(null);
  };

  const fetchMateriaisPneu = async (idPneu: number) => {
    try {
      const res = await api.get(`/consumo-mprima/?id_pneu=${idPneu}`);
      setMateriaisPneu(res.data);
    } catch (err) {
      console.error("Erro ao buscar materiais do pneu:", err);
    }
  };

  const resetForm = () => {
    setDatamov('');
    setIdProduto('');
    setQuant('');
    setObs('');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-title-group">
          <Layers className="header-icon" style={{ color: '#f59e0b' }} />
          <div>
            <h1>Consumo de Mat.Prima</h1>
            <p>Lançamento de utilização de insumos e matérias-primas</p>
          </div>
        </div>
      </div>

      <div className="tabs-container" style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button 
          className={`tab-item ${activeTab === 'individual' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('individual');
            setActivePneuId(null);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'individual' ? '3px solid #f59e0b' : '3px solid transparent',
            color: activeTab === 'individual' ? '#f59e0b' : '#64748b',
            fontWeight: activeTab === 'individual' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Consumo Aleatorio
        </button>
        <button 
          className={`tab-item ${activeTab === 'por_os' ? 'active' : ''}`}
          onClick={() => setActiveTab('por_os')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'por_os' ? '3px solid #f59e0b' : '3px solid transparent',
            color: activeTab === 'por_os' ? '#f59e0b' : '#64748b',
            fontWeight: activeTab === 'por_os' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Consumo Padrao Por Pneu
        </button>
      </div>

      {activeTab === 'individual' && (
        <div className="tab-content">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button 
              className="btn-primary" 
              onClick={() => {
                setActivePneuId(null);
                openModal('create');
              }} 
              style={{ background: '#f59e0b' }}
            >
              <Plus size={20} /> Novo Lançamento
            </button>
          </div>
          <div className="glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Produto/Insumo</th>
              <th style={{ textAlign: 'right' }}>Quantidade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center' }}><Loader2 className="spinning" /> Carregando...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center' }}>Nenhum lançamento encontrado.</td></tr>
            ) : (
              registros.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.data).toLocaleString('pt-BR')}</td>
                  <td style={{ fontWeight: 600 }}>{r.produto_nome}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.quant.toFixed(3)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn-icon-premium" 
                        onClick={() => openModal('view', r)}
                        title="Visualizar"
                        style={{ background: '#10b981', color: 'white', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        className="btn-icon-premium" 
                        onClick={() => openModal('edit', r)}
                        title="Editar"
                        style={{ background: '#3b82f6', color: 'white', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn-icon-premium" 
                        onClick={() => handleDelete(r.id)}
                        style={{ background: '#ef4444', color: 'white', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
      )}

      {activeTab === 'por_os' && (
        <div className="tab-content">
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div className="table-toolbar" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="input-with-icon" style={{ maxWidth: '400px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar Pneu por descrição ou código..."
                  value={searchTermPneus}
                  onChange={(e) => setSearchTermPneus(e.target.value)}
                  style={{ padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }}
                />
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Medida</th>
                  <th>Desenho</th>
                  <th>Tipo Recapagem</th>
                  <th>DOT</th>
                  <th>Num. Série</th>
                  <th>Num. Fogo</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPneus.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum pneu encontrado.</td></tr>
                ) : (
                  filteredPneus.map(p => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td><strong>{p.medida_desc}</strong></td>
                      <td>{p.desenho_desc}</td>
                      <td>{p.recap_desc}</td>
                      <td>{p.dot}</td>
                      <td>{p.numserie}</td>
                      <td>{p.numfogo}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}
                          onClick={() => openPneuMaterialModal(p)}
                        >
                          <Package size={14} /> M.Prima
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="premium-modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2>
                {modalMode === 'create' ? 'Novo Lançamento de Consumo' : 
                 modalMode === 'edit' ? 'Editar Lançamento' : 
                 'Visualizar Lançamento'}
              </h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ background: '#E5E5E5', padding: '1.5rem' }}>
                {formError && <div className="form-error"><AlertCircle size={16} /> {formError}</div>}
                
                <div className="premium-master-panel" style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                    <label style={{ fontWeight: '600', color: '#475569' }}>Data do Movimento</label>
                    <input 
                      type="date" 
                      className="form-input"
                      value={datamov} 
                      onChange={e => setDatamov(e.target.value)} 
                      disabled={modalMode === 'view'}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                    <label style={{ fontWeight: '600', color: '#475569' }}>Produto/Insumo *</label>
                    <select className="form-select" value={idProduto} onChange={e => setIdProduto(e.target.value)} required disabled={modalMode === 'view'} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <option value="">Selecione o Insumo</option>
                      {produtos.map(p => <option key={p.id} value={p.id}>{p.descricao} ({p.unidade})</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                    <label style={{ fontWeight: '600', color: '#475569' }}>Quantidade *</label>
                    <input 
                      type="number" 
                      step="0.001" 
                      className="form-input"
                      value={quant} 
                      onChange={e => setQuant(e.target.value)} 
                      placeholder="0.000"
                      required 
                      disabled={modalMode === 'view'}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  
                  
                  
                  <div className="form-group">
                    <label style={{ fontWeight: '600', color: '#475569' }}>Observação</label>
                    <textarea 
                      className="form-input"
                      value={obs} 
                      onChange={e => setObs(e.target.value)}
                      placeholder="Notas sobre o consumo..."
                      rows={2}
                      disabled={modalMode === 'view'}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="premium-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ background: '#f59e0b' }}>
                    {isSubmitting ? <Loader2 className="spinning" size={20} /> : <Save size={20} />}
                    Salvar Consumo
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {showPneuModal && selectedPneu && (
        <div className="modal-overlay" onClick={() => setShowPneuModal(false)}>
          <div className="premium-modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header" style={{ background: '#3b82f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Package size={24} />
                <div>
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Matéria-Prima do Pneu</h2>
                  <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>OS: {selectedPneu.numos} — Medida: {selectedPneu.medida_desc}</p>
                </div>
              </div>
              <button className="close-btn" onClick={closePneuMaterialModal}><X size={20} /></button>
            </div>

            <div className="modal-body" style={{ background: '#f8fafc', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button 
                  className="btn-primary" 
                  onClick={() => openModal('create')} 
                  style={{ background: '#3b82f6', fontSize: '0.9rem', padding: '0.6rem 1rem' }}
                >
                  <Plus size={18} /> Novo Material
                </button>
              </div>

              {/* Grid de Materiais do Pneu */}
              <div className="glass-panel" style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <table className="data-table" style={{ margin: 0 }}>
                  <thead style={{ background: '#f1f5f9' }}>
                    <tr>
                      <th>Material</th>
                      <th style={{ textAlign: 'right' }}>Quant.</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiaisPneu.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>Nenhum material associado.</td></tr>
                    ) : (
                      materiaisPneu.map(m => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 500 }}>{m.produto_nome}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{m.quant} {m.unidade}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button 
                                className="btn-icon-premium" 
                                onClick={() => openModal('view', m)}
                                title="Visualizar"
                                style={{ background: '#10b981', color: 'white', padding: '0.35rem' }}
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                className="btn-icon-premium" 
                                onClick={() => openModal('edit', m)}
                                title="Alterar"
                                style={{ background: '#3b82f6', color: 'white', padding: '0.35rem' }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                className="btn-icon-premium" 
                                onClick={() => handleDelete(m.id)}
                                title="Excluir"
                                style={{ background: '#ef4444', color: 'white', padding: '0.35rem' }}
                              >
                                <Trash2 size={14} />
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

            <div className="premium-modal-footer">
              <button className="btn-secondary" onClick={closePneuMaterialModal}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
