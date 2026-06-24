import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, ClipboardList } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';

interface Record {
  id: number;
  codigo: number;
  descricao: string;
  ativo: boolean;
}

export default function TabOrigDef() {
  const [data, setData] = useState<Record[]>([]);
  const [filteredData, setFilteredData] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    codigo: 0,
    descricao: '',
    ativo: true
  });
  
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredData(data);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      setFilteredData(data.filter(item => 
        item.descricao?.toLowerCase().includes(lowerSearch) ||
        item.codigo?.toString().includes(lowerSearch)
      ));
    }
  }, [searchTerm, data]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/taborigdef/');
      setData(response.data);
      setFilteredData(response.data);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: 'create' | 'edit', item?: Record) => {
    setModalMode(mode);
    setFormError('');
    if (mode === 'edit' && item) {
      setCurrentId(item.id);
      setFormData({
        codigo: item.codigo,
        descricao: item.descricao || '',
        ativo: item.ativo
      });
    } else {
      setCurrentId(null);
      setFormData({
        codigo: 0,
        descricao: '',
        ativo: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      if (modalMode === 'create') {
        await api.post('/taborigdef/', formData);
      } else {
        await api.put(`/taborigdef/${currentId}`, formData);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      setFormError(getErrorMessage(error, "Erro ao salvar registro"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      await api.delete(`/taborigdef/${id}`);
      fetchData();
    } catch (error: any) {
      alert(getErrorMessage(error, "Erro ao excluir registro"));
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-title-group">
          <ClipboardList className="header-icon" style={{ color: '#3b82f6' }} />
          <div>
            <h1>Tab. Origens de Defeito</h1>
            <p>Gerenciamento da tabela de origens de defeitos técnicos</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => openModal('create')} style={{ background: '#3b82f6' }}>
          <Plus size={20} /> Novo Registro
        </button>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <div className="search-bar" style={{ marginBottom: '1.5rem' }}>
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Buscar por descrição ou código..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '100px' }}>Código</th>
              <th>Descrição</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center' }}>Carregando...</td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center' }}>Nenhum registro encontrado.</td></tr>
            ) : (
              filteredData.map(item => (
                <tr key={item.id}>
                  <td>{item.codigo}</td>
                  <td style={{ fontWeight: 600 }}>{item.descricao}</td>
                  <td>
                    <span className={`status-badge ${item.ativo ? 'active' : 'inactive'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button className="btn-icon-premium edit" onClick={() => openModal('edit', item)} title="Editar" style={{ background: '#3b82f6' }}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon-premium delete" onClick={() => handleDelete(item.id)} title="Excluir" style={{ background: '#ef4444' }}>
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

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="premium-modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header">
              <h2>{modalMode === 'create' ? 'Novo Registro' : 'Editar Registro'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ background: '#E5E5E5', padding: '1.5rem' }}>
                {formError && <div className="form-error">{formError}</div>}
                
                <div className="premium-master-panel" style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px' }}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Código *</label>
                    <input 
                      type="number" 
                      className="form-input"
                      value={formData.codigo}
                      onChange={e => setFormData({...formData, codigo: parseInt(e.target.value || '0')})}
                      required
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Descrição *</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={formData.descricao}
                      onChange={e => setFormData({...formData, descricao: e.target.value})}
                      required
                      maxLength={250}
                    />
                  </div>

                  <div className="form-checkbox">
                    <input 
                      type="checkbox" 
                      id="ativo"
                      checked={formData.ativo}
                      onChange={e => setFormData({...formData, ativo: e.target.checked})}
                    />
                    <label htmlFor="ativo">Ativo</label>
                  </div>
                </div>
              </div>
              
              <div className="premium-modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ background: '#3b82f6' }}>
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
