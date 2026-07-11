import { useState, useEffect } from 'react';
import {
  DollarSign, Search, Plus, Edit, Eye, Trash2, X, Save, Printer, Package
} from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import './Faturamento.css';
import './TabelaPreco.css';
import logoEmpresa from '../assets/images/LogoEmpresa.png';

export default function TabelaPreco() {
  const [precos, setPrecos] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingPreco, setEditingPreco] = useState<any | null>(null);
  const [servicoItems, setServicoItems] = useState<any[]>([]);
  const [servicoSearch, setServicoSearch] = useState('');
  const [showServicoSelector, setShowServicoSelector] = useState(false);
  const [showServicoDropdown, setShowServicoDropdown] = useState(false);
  const [newItemServico, setNewItemServico] = useState<any>(null);
  const [newItemValor, setNewItemValor] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [recapFilter, setRecapFilter] = useState('');

  const [precoForm, setPrecoForm] = useState({
    descricao: '',
    ativo: true
  });

  useEffect(() => {
    fetchPrecos();
    fetchServicos();
  }, []);

  const fetchPrecos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/precos/');
      const data = res.data || [];
      setPrecos(data);
      setSelectedIds(prev => prev.filter(id => data.some((p: any) => p.id === id)));
    } catch {
      console.error('Erro ao carregar tabelas de preço');
    } finally {
      setLoading(false);
    }
  };

  const fetchServicos = async () => {
    try {
      const res = await api.get('/servicos/', { params: { limit: 1000 } });
      setServicos(res.data.items || []);
    } catch {
      console.error('Erro ao carregar serviços');
    }
  };

  const filteredPrecos = precos.filter(p =>
    !searchQuery || p.descricao?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openModal = (preco?: any, mode: 'create' | 'edit' | 'view' = 'create') => {
    setModalMode(mode);
    if (preco) {
      setEditingPreco(preco);
      setPrecoForm({ descricao: preco.descricao || '', ativo: preco.ativo !== false });
      setServicoItems((preco.servicos || []).map((s: any) => {
        const serv = servicos.find(sv => sv.id === s.id_servico);
        return {
          id: s.id,
          id_servico: s.id_servico,
          descricao: s.servico_descricao || '',
          codigo: s.servico_codigo || '',
          valor: parseFloat(s.valor || 0),
          recap_nome: serv?.recap?.descricao || s.servico_recap_nome || ''
        };
      }));
    } else {
      setEditingPreco(null);
      setPrecoForm({ descricao: '', ativo: true });
      setServicoItems([]);
    }
    setNewItemServico(null);
    setNewItemValor('');
    setServicoSearch('');
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setPrecoForm(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
  };

  const addServicoItem = (servico: any) => {
    if (servicoItems.some(s => s.id_servico === servico.id)) return;
    setServicoItems(prev => [...prev, {
      id_servico: servico.id,
      descricao: servico.descricao,
      codigo: servico.codigo || '',
      valor: parseFloat(servico.valor || 0)
    }]);
    setServicoSearch('');
    setShowServicoSelector(false);
  };

  const removeServicoItem = (index: number) => {
    setServicoItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateServicoValor = (index: number, valor: string) => {
    setServicoItems(prev => prev.map((s, i) => i === index ? { ...s, valor: parseFloat(valor) || 0 } : s));
  };

  const handleServicoSearch = (value: string) => {
    setServicoSearch(value);
    setShowServicoDropdown(value.length >= 2);
    if (!value || value.length < 2) {
      setNewItemServico(null);
    }
  };

  const handleEditItem = (index: number) => {
    const item = servicoItems[index];
    const servico = servicos.find(s => s.id === item.id_servico);
    if (servico) {
      setNewItemServico(servico);
      setServicoSearch(servico.descricao);
    } else {
      setNewItemServico({ id: item.id_servico, descricao: item.descricao, codigo: item.codigo });
      setServicoSearch(item.descricao);
    }
    setNewItemValor(String(item.valor));
    setEditingItemIndex(index);
    setShowServicoDropdown(false);
    setShowServicoSelector(true);
  };

  const handleAddNewItem = () => {
    if (!newItemServico) return;
    const item = {
      id_servico: newItemServico.id,
      descricao: newItemServico.descricao,
      codigo: newItemServico.codigo || '',
      valor: parseFloat(newItemValor) || 0,
      recap_nome: newItemServico.recap?.descricao || ''
    };
    if (editingItemIndex !== null) {
      setServicoItems(prev => prev.map((s, i) => i === editingItemIndex ? item : s));
    } else {
      setServicoItems(prev => [...prev, item]);
    }
    setShowServicoSelector(false);
    setShowServicoDropdown(false);
    setNewItemServico(null);
    setNewItemValor('');
    setServicoSearch('');
    setEditingItemIndex(null);
  };

  const handleSubmit = async () => {
    if (!precoForm.descricao.trim()) {
      alert('Informe a descrição da tabela de preço.');
      return;
    }
    if (servicoItems.length === 0) {
      alert('Adicione ao menos um serviço com preço.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        ...precoForm,
        servicos: servicoItems.map(s => ({ id_servico: s.id_servico, valor: s.valor }))
      };
      if (editingPreco) {
        await api.put(`/precos/${editingPreco.id}`, payload);
      } else {
        await api.post('/precos/', payload);
      }
      await fetchPrecos();
      setIsModalOpen(false);
    } catch (err) {
      alert(getErrorMessage(err, 'Erro ao salvar tabela de preço'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, descricao: string) => {
    if (!window.confirm(`Excluir tabela "${descricao}"?`)) return;
    try {
      await api.delete(`/precos/${id}`);
      await fetchPrecos();
    } catch {
      alert('Erro ao excluir tabela de preço');
    }
  };

  return (
    <div className="faturamento-container">
      <style>{`
        @media screen {
          .print-only { display: none !important; }
        }
        @media print {
          @page { size: portrait; margin: 10mm; }
          body, html { background: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; position: static !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; }
          .print-only, .print-only * { visibility: visible !important; }
          .print-header { display: flex !important; align-items: center !important; justify-content: space-between !important; border-bottom: 2px solid #334155 !important; padding-bottom: 8px !important; margin-bottom: 15px !important; }
          .print-logo { height: 50px !important; width: auto !important; object-fit: contain !important; }
          .print-title { font-size: 1.6rem !important; font-weight: 700 !important; color: #1e293b !important; margin: 0 !important; flex: 1 !important; text-align: center !important; }
          .print-table-section { margin-top: 0 !important; margin-bottom: 2rem !important; page-break-inside: auto !important; }
          tr { page-break-inside: avoid !important; }
        }
      `}</style>

      {/* PAGE HEADER */}
      <div className="page-header no-print">
        <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <DollarSign size={32} color="var(--primary-color)" />
          Tabela de Preço
        </h1>
        <div className="header-actions" style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn-primary" onClick={() => openModal(undefined, 'create')}>
            <Plus size={20} /> Nova Tabela
          </button>
        </div>
      </div>

      {/* SEARCH SECTION */}
      <div className="search-section glass-panel no-print" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div className="search-grid" style={{ gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label><Search size={14} /> Buscar por descrição</label>
            <input
              type="text"
              className="form-input"
              placeholder="Digite para buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label style={{ visibility: 'hidden' }}>&nbsp;</label>
            <button className="btn-primary" onClick={fetchPrecos} style={{ height: '42px', width: '100%' }}>
              <Search size={18} /> Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="glass-panel no-print" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(filteredPrecos.map(p => p.id));
                      else setSelectedIds([]);
                    }}
                    checked={selectedIds.length === filteredPrecos.length && filteredPrecos.length > 0}
                  />
                </th>
                <th style={{ textAlign: 'left' }}>Descrição</th>
                <th style={{ textAlign: 'center' }}>Serviços</th>
                <th style={{ textAlign: 'center' }}>Ativo</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Carregando...</td></tr>
              ) : filteredPrecos.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Nenhuma tabela de preço encontrada.</td></tr>
              ) : filteredPrecos.map(p => (
                <tr key={p.id} className={selectedIds.includes(p.id) ? 'selected-row' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, p.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== p.id));
                      }}
                    />
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.descricao}</td>
                  <td style={{ textAlign: 'center' }}>{p.servicos?.length || 0}</td>
                  <td style={{ textAlign: 'center' }}>
                    {p.ativo
                      ? <span className="status-badge-item status-pronto" style={{ fontSize: '0.7rem', padding: '3px 10px' }}>Sim</span>
                      : <span className="status-badge-item status-aguardando" style={{ fontSize: '0.7rem', padding: '3px 10px' }}>Não</span>
                    }
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon-premium success" onClick={() => openModal(p, 'view')}><Eye size={18} /></button>
                      <button className="btn-icon-premium edit" onClick={() => openModal(p, 'edit')}><Edit size={18} /></button>
                      <button className="btn-icon-premium delete" onClick={() => handleDelete(p.id, p.descricao)}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MAIN MODAL */}
      {isModalOpen && (
        <div className="os-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="premium-modal-content full-screen" onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2>{modalMode === 'view' ? 'Visualizar' : editingPreco ? 'Editar' : 'Nova'} Tabela de Preço</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {modalMode !== 'create' && (
                  <button className="btn-print" onClick={() => window.print()} title="Imprimir Tabela" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', margin: 0 }}>
                    <Printer size={16} /> Imprimir Tabela
                  </button>
                )}
                <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
              </div>
            </div>

            <div className="modal-body scrollable" style={{ background: '#f1f5f9', padding: '1.5rem' }}>
              {/* DADOS DA TABELA */}
              <div className="premium-master-panel" style={{ marginBottom: '1.5rem' }}>
                <div className="premium-section-title"><Package size={18} /> Dados da Tabela</div>
                <div className="search-grid" style={{ gridTemplateColumns: '1fr auto auto' }}>
                  <div className="form-group span-2">
                    <label>Descrição *</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        id="descricao"
                        value={precoForm.descricao}
                        onChange={handleChange}
                        disabled={modalMode === 'view'}
                        placeholder="Ex: Tabela de Preço 2026"
                        style={{ flex: 1 }}
                      />
                      {modalMode !== 'view' && (
                        <button className="btn-primary" onClick={() => {
                          const importados = servicos
                            .filter(s => !servicoItems.some(item => item.id_servico === s.id))
                            .map(s => ({
                              id_servico: s.id,
                              descricao: s.descricao,
                              codigo: s.codigo || '',
                              valor: parseFloat(s.valor || 0),
                              recap_nome: s.recap?.descricao || ''
                            }));
                          if (importados.length === 0) {
                            alert('Todos os serviços já foram importados.');
                            return;
                          }
                          setServicoItems(prev => [...prev, ...importados]);
                        }}
                          style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          <Plus size={16} /> Importar Serviços
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        id="ativo"
                        checked={precoForm.ativo}
                        onChange={handleChange}
                        disabled={modalMode === 'view'}
                        style={{ width: 18, height: 18 }}
                      />
                      Ativo
                    </label>
                  </div>
                </div>
              </div>

              {/* PREÇO DOS SERVIÇOS */}
              <div className="premium-master-panel" style={{ marginBottom: '1.5rem' }}>
                <div className="premium-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <DollarSign size={18} /> Preço dos Serviços
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {(() => {
                      const uniqueRecaps = [...new Set(servicoItems.map(s => s.recap_nome).filter(Boolean))];
                      return uniqueRecaps.length > 0 && (
                        <select className="form-input" value={recapFilter} onChange={e => setRecapFilter(e.target.value)}
                          style={{ width: 180, height: '38px', fontSize: '0.85rem', padding: '0 0.75rem' }}>
                          <option value="">Todos os Tipos Recap</option>
                          {uniqueRecaps.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      );
                    })()}
                    {modalMode !== 'view' && (
                      <button className="btn-primary" onClick={() => {
                        setEditingItemIndex(null);
                        setNewItemServico(null);
                        setNewItemValor('');
                        setServicoSearch('');
                        setShowServicoDropdown(false);
                        setShowServicoSelector(true);
                      }} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                        <Plus size={16} /> Novo Item
                      </button>
                    )}
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="data-table small">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Código</th>
                        <th style={{ textAlign: 'left' }}>Serviço</th>
                        <th style={{ textAlign: 'right', width: 150 }}>Preço (R$)</th>
                        {modalMode !== 'view' && <th style={{ width: 50, textAlign: 'center' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = recapFilter ? servicoItems.filter(s => s.recap_nome === recapFilter) : servicoItems;
                        return filtered.length === 0 ? (
                          <tr><td colSpan={modalMode !== 'view' ? 4 : 3} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum serviço encontrado.</td></tr>
                        ) : filtered.map((item, idx) => {
                          const origIdx = servicoItems.indexOf(item);
                          return (
                            <tr key={idx}>
                              <td style={{ fontFamily: 'Courier New, monospace', fontWeight: 600 }}>{item.codigo || '-'}</td>
                              <td style={{ color: '#0f172a' }}>{item.descricao}</td>
                              <td style={{ textAlign: 'right' }}>
                                {modalMode !== 'view' ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.valor}
                                    onChange={e => updateServicoValor(origIdx, e.target.value)}
                                    className="form-input"
                                    style={{ width: 120, textAlign: 'right', height: '38px', fontSize: '0.85rem' }}
                                  />
                                ) : (
                                  <strong style={{ color: '#059669' }}>R$ {item.valor.toFixed(2)}</strong>
                                )}
                              </td>
                              {modalMode !== 'view' && (
                                <td style={{ textAlign: 'center' }}>
                                  <div className="action-buttons" style={{ justifyContent: 'center' }}>
                                    <button className="btn-icon-premium edit" onClick={() => handleEditItem(origIdx)} title="Editar" style={{ width: 32, height: 32 }}><Edit size={14} /></button>
                                    <button className="btn-icon-premium delete" onClick={() => removeServicoItem(origIdx)} title="Remover" style={{ width: 32, height: 32 }}><Trash2 size={14} /></button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="premium-modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Fechar</button>
              {modalMode !== 'view' && (
                <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                  <Save size={20} /> {loading ? 'Salvando...' : editingPreco ? 'Salvar Alterações' : 'Criar Tabela'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SERVIÇO SELECTOR MODAL */}
      {showServicoSelector && (
        <div className="os-modal-overlay" style={{ zIndex: 2100 }} onClick={() => setShowServicoSelector(false)}>
          <div className="premium-modal-content medium" onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2>{editingItemIndex !== null ? 'Editar Item de Serviço' : 'Novo Item de Preço'}</h2>
              <button className="close-btn" onClick={() => setShowServicoSelector(false)}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', background: '#f1f5f9' }}>
              <div className="premium-master-panel" style={{ marginBottom: 0 }}>
                <div className="search-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Serviço</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Buscar serviço..."
                      value={servicoSearch}
                      onChange={e => handleServicoSearch(e.target.value)}
                    />
                    {showServicoDropdown && (
                      <div className="autocomplete-dropdown glass-panel" style={{ position: 'absolute', width: '100%', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                        {servicos.filter(s => s.descricao.toLowerCase().includes(servicoSearch.toLowerCase())).map(s => (
                          <div
                            key={s.id}
                            className="autocomplete-item"
                            onClick={() => { setNewItemServico(s); setServicoSearch(s.descricao); setShowServicoDropdown(false); }}
                          >
                            <span className="name">{s.descricao}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" className="form-input" value={newItemValor} onChange={e => setNewItemValor(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="premium-modal-footer">
              <button className="btn-secondary" onClick={() => setShowServicoSelector(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddNewItem}>
                <Save size={20} /> {editingItemIndex !== null ? 'Salvar Item' : 'Adicionar Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT ELEMENT */}
      <div className="print-only" style={{ color: '#000', background: '#fff', width: '100%' }}>
        <div className="print-header" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '2px solid #334155', paddingBottom: '12px', marginBottom: '20px' }}>
          <img src={logoEmpresa} alt="Logo Empresa" className="print-logo" style={{ height: '60px' }} />
          <h1 className="print-title" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Relatório de Tabelas de Preço</h1>
        </div>

        {(() => {
          if (isModalOpen) {
            return (
              <div className="print-table-section" style={{ marginBottom: '3rem', pageBreakInside: 'auto' }}>
                <div style={{ background: '#f1f5f9', padding: '10px 15px', borderLeft: '5px solid #3b82f6', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: 'bold' }}>{precoForm.descricao || 'Tabela de Preço'}</h3>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: precoForm.ativo ? '#10b981' : '#ef4444' }}>
                    {precoForm.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #475569' }}>
                      <th style={{ textAlign: 'left', padding: '8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Código</th>
                      <th style={{ textAlign: 'left', padding: '8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Serviço</th>
                      <th style={{ textAlign: 'right', padding: '8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '150px' }}>Preço (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredItems = recapFilter
                        ? servicoItems.filter(item => item.recap_nome === recapFilter)
                        : servicoItems;
                      if (filteredItems.length === 0) {
                        return (
                          <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '15px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum serviço correspondente ao filtro.</td>
                          </tr>
                        );
                      }
                      return filteredItems.map((item: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', fontFamily: 'Courier New, monospace', fontWeight: 600 }}>{item.codigo || '-'}</td>
                          <td style={{ padding: '8px', color: '#334155' }}>{item.descricao}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>R$ {parseFloat(item.valor || 0).toFixed(2)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            );
          }

          const itemsToPrint = selectedIds.length > 0
            ? precos.filter(p => selectedIds.includes(p.id))
            : filteredPrecos;

          if (itemsToPrint.length === 0) {
            return <p style={{ textAlign: 'center', fontStyle: 'italic', padding: '2rem' }}>Nenhuma tabela de preço selecionada ou encontrada.</p>;
          }

          return itemsToPrint.map(p => (
            <div key={p.id} className="print-table-section" style={{ marginBottom: '3rem', pageBreakInside: 'auto' }}>
              <div style={{ background: '#f1f5f9', padding: '10px 15px', borderLeft: '5px solid #3b82f6', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: 'bold' }}>{p.descricao}</h3>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: p.ativo ? '#10b981' : '#ef4444' }}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #475569' }}>
                    <th style={{ textAlign: 'left', padding: '8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Código</th>
                    <th style={{ textAlign: 'left', padding: '8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Serviço</th>
                    <th style={{ textAlign: 'right', padding: '8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '150px' }}>Preço (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {!p.servicos || p.servicos.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum serviço cadastrado nesta tabela.</td>
                    </tr>
                  ) : p.servicos.map((s: any, idx: number) => {
                    const serv = servicos.find(sv => sv.id === s.id_servico);
                    const desc = s.servico_descricao || serv?.descricao || 'Serviço não identificado';
                    const cod = s.servico_codigo || serv?.codigo || '-';
                    const val = parseFloat(s.valor || 0);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', fontFamily: 'Courier New, monospace', fontWeight: 600 }}>{cod}</td>
                        <td style={{ padding: '8px', color: '#334155' }}>{desc}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>R$ {val.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
