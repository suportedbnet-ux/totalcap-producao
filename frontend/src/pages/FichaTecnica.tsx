import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, ClipboardList, Package, Layers, Eye } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import './Configuracoes.css'; 

interface FichaTecnicaItem {
  id?: number;
  id_fichapronto?: number;
  id_produto?: number;
  quant?: number;
  ordem?: number;
  produto_descricao?: string;
}

interface FichaTecnica {
  id: number;
  descricao: string;
  itens: FichaTecnicaItem[];
}

export default function FichaTecnica() {
  const [fichas, setFichas] = useState<FichaTecnica[]>([]);
  const [filteredFichas, setFilteredFichas] = useState<FichaTecnica[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    descricao: '',
    itens: [] as FichaTecnicaItem[]
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredFichas(fichas);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredFichas(fichas.filter(f => 
        f.descricao?.toLowerCase().includes(lower)
      ));
    }
  }, [searchTerm, fichas]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fichasRes, prodRes] = await Promise.all([
        api.get('/fichatecnica/'),
        api.get('/produtos/')
      ]);
      setFichas(fichasRes.data);
      setProdutos(prodRes.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: 'create' | 'edit' | 'view', ficha?: FichaTecnica) => {
    setModalMode(mode);
    setFormError('');
    if ((mode === 'edit' || mode === 'view') && ficha) {
      setCurrentId(ficha.id);
      setFormData({
        descricao: ficha.descricao || '',
        itens: ficha.itens || []
      });
    } else {
      setCurrentId(null);
      setFormData({ descricao: '', itens: [] });
    }
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, { id_produto: 0, quant: 0, ordem: prev.itens.length + 1 }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: keyof FichaTecnicaItem, value: any) => {
    setFormData(prev => {
      const newItens = [...prev.itens];
      newItens[index] = { ...newItens[index], [field]: value };
      return { ...prev, itens: newItens };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descricao.trim()) {
      setFormError('A descrição da ficha é obrigatória.');
      return;
    }
    
    // Validar itens
    const itensValidos = formData.itens.filter(item => item.id_produto && item.id_produto > 0);
    if (itensValidos.length === 0) {
      setFormError('Adicione pelo menos uma matéria-prima válida.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    
    const payload = {
      descricao: formData.descricao,
      itens: itensValidos.map(item => ({
        id_produto: Number(item.id_produto),
        quant: Number(item.quant) || 0,
        ordem: Number(item.ordem) || 0,
        id_fichapronto: item.id_fichapronto || null
      }))
    };

    try {
      if (modalMode === 'create') {
        await api.post('/fichatecnica/', payload);
      } else if (modalMode === 'edit' && currentId !== null) {
        await api.put(`/fichatecnica/${currentId}`, payload);
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(getErrorMessage(err, 'Erro ao salvar ficha técnica.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, descricao: string) => {
    if (window.confirm(`Excluir a Ficha Técnica "${descricao}"?`)) {
      try {
        await api.delete(`/fichatecnica/${id}`);
        await fetchData();
      } catch {
        alert('Erro ao excluir a ficha técnica.');
      }
    }
  };

  return (
    <div className="config-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
            <ClipboardList size={28} color="var(--primary)" />
            Ficha Técnica
          </h1>
          <p className="text-muted">Gerenciamento de composições e matérias-primas</p>
        </div>
        <button className="btn-primary" onClick={() => openModal('create')}>
          <Plus size={20} /> Nova Ficha
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div className="table-toolbar" style={{ marginBottom: '1.5rem' }}>
          <div className="input-with-icon" style={{ maxWidth: '400px' }}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.8rem' }}
            />
          </div>
        </div>

        <div className="dispositivos-table-container">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>
          ) : (
            <table className="dispositivos-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Descrição</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Itens</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredFichas.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma ficha técnica encontrada.</td></tr>
                ) : (
                  filteredFichas.map(f => (
                    <tr key={f.id}>
                      <td>#{f.id}</td>
                      <td><strong>{f.descricao}</strong></td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="status-badge active" style={{ fontSize: '0.8rem' }}>
                          {f.itens?.length || 0} Matérias
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-table" 
                            onClick={() => openModal('view', f)} 
                            title="Visualizar"
                            style={{ background: '#10b981', color: 'white' }}
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="btn-table authorize" 
                            onClick={() => openModal('edit', f)} 
                            title="Editar"
                            style={{ background: '#3b82f6', color: 'white' }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="btn-table deauthorize" 
                            onClick={() => handleDelete(f.id, f.descricao)} 
                            title="Excluir"
                            style={{ background: '#ef4444', color: 'white' }}
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
          <div className="premium-modal-content" style={{ maxWidth: '900px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Layers size={22} />
                {modalMode === 'create' ? 'Nova Ficha Técnica' : 
                 modalMode === 'edit' ? 'Editar Ficha Técnica' : 
                 'Visualizar Ficha Técnica'}
              </h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ background: '#f1f5f9', padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {formError && (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fecaca', fontSize: '0.9rem' }}>
                    {formError}
                  </div>
                )}
                
                <div className="premium-master-panel" style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#1e293b' }}>Dados do Cabeçalho (Mestre)</h3>
                  <div className="form-group">
                    <label htmlFor="descricao" style={{ fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.5rem' }}>Descrição da Ficha *</label>
                    <input 
                      className="form-input" 
                      id="descricao" 
                      value={formData.descricao} 
                      onChange={handleChange} 
                      placeholder="Ex: Ficha Técnica Pneu 275/80 R22.5" 
                      required 
                      disabled={modalMode === 'view'}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                    />
                  </div>
                </div>

                <div className="premium-master-panel" style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem', margin: 0, color: '#1e293b' }}>Composição (Detalhe)</h3>
                    {modalMode !== 'view' && (
                      <button type="button" className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleAddItem}>
                        <Plus size={16} /> Adicionar Item
                      </button>
                    )}
                  </div>

                  <div className="dispositivos-table-container" style={{ maxHeight: '300px' }}>
                    <table className="dispositivos-table" style={{ fontSize: '0.85rem' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          <th style={{ width: '60px' }}>Ordem</th>
                          <th>Matéria Prima *</th>
                          <th style={{ width: '120px' }}>Quantidade</th>
                          {modalMode !== 'view' && <th style={{ width: '60px', textAlign: 'center' }}>Ação</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {formData.itens.length === 0 ? (
                          <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum item adicionado. Clique em "Adicionar Item".</td></tr>
                        ) : (
                          formData.itens.map((item, index) => (
                            <tr key={index}>
                              <td>
                                <input 
                                  type="number" 
                                  value={item.ordem || ''} 
                                  onChange={(e) => handleItemChange(index, 'ordem', e.target.value)}
                                  disabled={modalMode === 'view'}
                                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                />
                              </td>
                              <td>
                                <select
                                  value={item.id_produto || ''}
                                  onChange={(e) => handleItemChange(index, 'id_produto', e.target.value)}
                                  disabled={modalMode === 'view'}
                                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: modalMode === 'view' ? '#f8fafc' : 'white' }}
                                  required
                                >
                                  <option value="">Selecione um produto...</option>
                                  {produtos.map(p => (
                                    <option key={p.id} value={p.id}>{p.descricao} ({p.codprod})</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.quant || ''} 
                                  onChange={(e) => handleItemChange(index, 'quant', e.target.value)}
                                  disabled={modalMode === 'view'}
                                  placeholder="0.00"
                                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                  required
                                />
                              </td>
                              {modalMode !== 'view' && (
                                <td style={{ textAlign: 'center' }}>
                                  <button type="button" onClick={() => handleRemoveItem(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="premium-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Salvar Ficha Técnica'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
