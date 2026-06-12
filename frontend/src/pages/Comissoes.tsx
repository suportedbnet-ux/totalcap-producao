import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Printer, ChevronDown } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import logoEmpresa from '../assets/images/LogoEmpresa.png';

interface Comissao {
  id: number;
  descricao: string;
  id_vendedor: number | null;
  id_regiao: number | null;
  id_contato: number | null;
  id_recap: number | null;
  id_servico: number | null;
  aliquota: number;
  ativo: boolean;
  vendedor_nome?: string;
  regiao_nome?: string;
  contato_nome?: string;
  recap_nome?: string;
  servico_nome?: string;
}

export default function Comissoes() {
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [filteredComissoes, setFilteredComissoes] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lookups
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [regioes, setRegioes] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [recaps, setRecaps] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);

  // Searchable Dropdown state
  const [contatoSearch, setContatoSearch] = useState('');
  const [showContatos, setShowContatos] = useState(false);
  const [servicoSearch, setServicoSearch] = useState('');
  const [showServicos, setShowServicos] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    descricao: '',
    id_vendedor: '',
    id_regiao: '',
    id_contato: '',
    id_recap: '',
    id_servico: '',
    aliquota: 0,
    ativo: true
  });
  
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    fetchLookups();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredComissoes(comissoes);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      setFilteredComissoes(comissoes.filter(c => 
        c.descricao?.toLowerCase().includes(lowerSearch) ||
        c.vendedor_nome?.toLowerCase().includes(lowerSearch) ||
        c.contato_nome?.toLowerCase().includes(lowerSearch) ||
        c.servico_nome?.toLowerCase().includes(lowerSearch)
      ));
    }
  }, [searchTerm, comissoes]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/comissoes/');
      setComissoes(response.data);
    } catch (error) {
      console.error("Erro ao buscar regras:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [vRes, rRes, cRes, reRes, sRes] = await Promise.all([
        api.get('/vendedores/', { params: { limit: 1000 } }),
        api.get('/regioes/', { params: { limit: 1000 } }),
        api.get('/clientes/', { params: { limit: 1000 } }),
        api.get('/tipo-recapagem/', { params: { limit: 1000 } }),
        api.get('/servicos/', { params: { limit: 1000 } })
      ]);
      setVendedores(vRes.data.items || vRes.data);
      setRegioes(rRes.data.items || rRes.data);
      setContatos(cRes.data.items || cRes.data);
      setRecaps(reRes.data.items || reRes.data);
      setServicos(sRes.data.items || sRes.data);
    } catch (error) {
      console.error("Erro ao buscar lookups:", error);
    }
  };

  const openModal = (mode: 'create' | 'edit', comissao?: Comissao) => {
    setModalMode(mode);
    setFormError('');
    if (mode === 'edit' && comissao) {
      setCurrentId(comissao.id);
      setFormData({
        descricao: comissao.descricao || '',
        id_vendedor: comissao.id_vendedor?.toString() || '',
        id_regiao: comissao.id_regiao?.toString() || '',
        id_contato: comissao.id_contato?.toString() || '',
        id_recap: comissao.id_recap?.toString() || '',
        id_servico: comissao.id_servico?.toString() || '',
        aliquota: comissao.aliquota,
        ativo: comissao.ativo
      });
      setContatoSearch(comissao.contato_nome || '');
      setServicoSearch(comissao.servico_nome || '');
    } else {
      setCurrentId(null);
      setFormData({
        descricao: '',
        id_vendedor: '',
        id_regiao: '',
        id_contato: '',
        id_recap: '',
        id_servico: '',
        aliquota: 0,
        ativo: true
      });
      setContatoSearch('');
      setServicoSearch('');
    }
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const selectContato = (c: any) => {
    setFormData(prev => ({ ...prev, id_contato: c ? c.id.toString() : '' }));
    setContatoSearch(c ? c.nome : '');
    setShowContatos(false);
  };

  const selectServico = (s: any) => {
    setFormData(prev => ({ ...prev, id_servico: s ? s.id.toString() : '' }));
    setServicoSearch(s ? s.descricao : '');
    setShowServicos(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    const payload = {
      ...formData,
      id_vendedor: formData.id_vendedor ? Number(formData.id_vendedor) : null,
      id_regiao: formData.id_regiao ? Number(formData.id_regiao) : null,
      id_contato: formData.id_contato ? Number(formData.id_contato) : null,
      id_recap: formData.id_recap ? Number(formData.id_recap) : null,
      id_servico: formData.id_servico ? Number(formData.id_servico) : null,
      aliquota: Number(formData.aliquota)
    };

    try {
      if (modalMode === 'create') {
        await api.post('/comissoes/', payload);
      } else if (modalMode === 'edit' && currentId !== null) {
        await api.put(`/comissoes/${currentId}`, payload);
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(getErrorMessage(err, 'Erro ao salvar regra.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, descricao: string) => {
    if (window.confirm(`Deseja excluir a regra de comissão "${descricao || 'ID #' + id}"?`)) {
      try {
        await api.delete(`/comissoes/${id}`);
        await fetchData();
      } catch (error) {
        alert('Erro ao excluir a regra.');
      }
    }
  };

  // Filter lists for dropdowns
  const filteredContatosLookup = contatos.filter(c => 
    c.nome.toLowerCase().includes(contatoSearch.toLowerCase())
  );

  const filteredServicosLookup = servicos.filter(s => 
    s.descricao.toLowerCase().includes(servicoSearch.toLowerCase()) ||
    (s.codigo && s.codigo.toLowerCase().includes(servicoSearch.toLowerCase()))
  );

  return (
    <div className="medidas-container">
      <div className="print-header">
        <img src={logoEmpresa} alt="Logo Empresa" className="print-logo" />
        <h1 className="print-title">Regras de Comissão</h1>
      </div>

      <div className="page-header">
        <h1 className="title">Regras de Comissão</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={20} /> Imprimir
          </button>
          <button className="btn-primary" onClick={() => openModal('create')}>
            <Plus size={20} /> Nova Regra
          </button>
        </div>
      </div>

      <div className="glass-panel table-container">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar regras..." 
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
                  <th>ID</th>
                  <th>Vendedor</th>
                  <th>Região</th>
                  <th>Cliente</th>
                  <th>Tipo Recap</th>
                  <th>Serviço</th>
                  <th>Alíquota</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredComissoes.length === 0 ? (
                  <tr><td colSpan={9} className="empty-state">Nenhuma regra encontrada.</td></tr>
                ) : (
                  filteredComissoes.map(c => (
                    <tr key={c.id}>
                      <td>#{c.id}</td>
                      <td>{c.vendedor_nome || 'Todos'}</td>
                      <td>{c.regiao_nome || 'Todas'}</td>
                      <td>{c.contato_nome || 'Todos'}</td>
                      <td>{c.recap_nome || 'Todos'}</td>
                      <td>{c.servico_nome || 'Todos'}</td>
                      <td><strong style={{ color: 'var(--primary)' }}>{c.aliquota}%</strong></td>
                      <td>
                        <span className={`status-badge ${c.ativo ? 'active' : 'inactive'}`}>
                          {c.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button className="btn-icon-premium edit" onClick={() => openModal('edit', c)} title="Editar" style={{ background: '#3b82f6', color: 'white', padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                          <button className="btn-icon-premium delete" onClick={() => handleDelete(c.id, c.descricao)} title="Excluir" style={{ background: '#ef4444', color: 'white', padding: '0.4rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
          <div className="premium-modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2>{modalMode === 'create' ? 'Nova Regra' : 'Editar Regra'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ background: '#E5E5E5', padding: '1.5rem' }}>
                {formError && <div className="form-error">{formError}</div>}
                
                <div className="premium-master-panel" style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: '600', color: '#475569' }}>Vendedor</label>
                      <select className="form-input" id="id_vendedor" value={formData.id_vendedor} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <option value="">-- Todos os Vendedores --</option>
                        {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: '600', color: '#475569' }}>Região</label>
                      <select className="form-input" id="id_regiao" value={formData.id_regiao} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <option value="">-- Todas as Regiões --</option>
                        {regioes.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Searchable Contato */}
                  <div className="form-group" style={{ marginBottom: '1.2rem', position: 'relative' }}>
                    <label style={{ fontWeight: '600', color: '#475569' }}>Cliente / Contato</label>
                    <div className="search-input-wrapper" style={{ position: 'relative' }}>
                      <input 
                        className="form-input" 
                        value={contatoSearch} 
                        onChange={(e) => {
                          setContatoSearch(e.target.value);
                          if (e.target.value.length >= 3) setShowContatos(true);
                          else if (e.target.value.length === 0) selectContato(null);
                        }}
                        onFocus={() => contatoSearch.length >= 3 && setShowContatos(true)}
                        placeholder="Digite 3 letras para buscar..." 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                      <ChevronDown size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }} />
                    </div>
                    {showContatos && (
                      <div className="dropdown-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontWeight: '600', color: 'var(--primary)' }} onClick={() => selectContato(null)}>-- Todos os Clientes --</div>
                        {filteredContatosLookup.map(c => (
                          <div key={c.id} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} className="dropdown-item" onClick={() => selectContato(c)}>
                            {c.nome}
                          </div>
                        ))}
                        {filteredContatosLookup.length === 0 && <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>Nenhum cliente encontrado.</div>}
                      </div>
                    )}
                  </div>

                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: '600', color: '#475569' }}>Tipo de Recapagem</label>
                      <select className="form-input" id="id_recap" value={formData.id_recap} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <option value="">-- Todos os Tipos --</option>
                        {recaps.map(r => <option key={r.id} value={r.id}>{r.descricao}</option>)}
                      </select>
                    </div>

                    {/* Searchable Servico */}
                    <div className="form-group" style={{ position: 'relative' }}>
                      <label style={{ fontWeight: '600', color: '#475569' }}>Serviço</label>
                      <div className="search-input-wrapper" style={{ position: 'relative' }}>
                        <input 
                          className="form-input" 
                          value={servicoSearch} 
                          onChange={(e) => {
                            setServicoSearch(e.target.value);
                            if (e.target.value.length >= 3) setShowServicos(true);
                            else if (e.target.value.length === 0) selectServico(null);
                          }}
                          onFocus={() => servicoSearch.length >= 3 && setShowServicos(true)}
                          placeholder="Digite 3 letras para buscar..." 
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                        <ChevronDown size={18} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }} />
                      </div>
                      {showServicos && (
                        <div className="dropdown-results" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontWeight: '600', color: 'var(--primary)' }} onClick={() => selectServico(null)}>-- Todos os Serviços --</div>
                          {filteredServicosLookup.map(s => (
                            <div key={s.id} style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} className="dropdown-item" onClick={() => selectServico(s)}>
                              <strong>{s.codigo}</strong> - {s.descricao}
                            </div>
                          ))}
                          {filteredServicosLookup.length === 0 && <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>Nenhum serviço encontrado.</div>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: '600', color: '#475569' }}>Alíquota (%) *</label>
                      <input type="number" step="0.01" className="form-input" id="aliquota" value={formData.aliquota} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                      <div className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="checkbox" id="ativo" checked={formData.ativo} onChange={handleChange} />
                        <label htmlFor="ativo" style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Regra ativa</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="premium-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
