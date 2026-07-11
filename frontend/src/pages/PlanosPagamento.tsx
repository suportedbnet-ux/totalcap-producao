import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Printer, CreditCard, Hash, Calendar, Download } from 'lucide-react';
import api from '../lib/api';
import './PlanosPagamento.css';
import logoEmpresa from '../assets/images/LogoEmpresa.png';

interface PlanoPag {
  id: number;
  codigo?: number;
  formapag: string;
  numparc: number;
  intervalo?: number;
  ativo: boolean;
  id_forma_erp?: string | number;
}

export default function PlanosPagamento() {
  const [planos, setPlanos] = useState<PlanoPag[]>([]);
  const [filteredPlanos, setFilteredPlanos] = useState<PlanoPag[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    codigo: undefined as number | undefined,
    formapag: '',
    numparc: 1,
    intervalo: 0,
    ativo: true,
    id_forma_erp: '' as string | number
  });
  
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPlanos();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPlanos(planos);
    } else {
      const lowerSearch = searchTerm.toLowerCase();
      setFilteredPlanos(planos.filter(p => 
        p.formapag.toLowerCase().includes(lowerSearch) || 
        (p.codigo && String(p.codigo).includes(lowerSearch))
      ));
    }
  }, [searchTerm, planos]);

  const fetchPlanos = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await api.get('/planos-pagamento/');
      setPlanos(response.data);
    } catch (error: any) {
      console.error("Erro ao buscar planos de pagamento:", error);
      setFetchError(error.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode: 'create' | 'edit', plano?: PlanoPag) => {
    setModalMode(mode);
    setFormError('');
    if (mode === 'edit' && plano) {
      setCurrentId(plano.id);
      setFormData({
        codigo: plano.codigo,
        formapag: plano.formapag,
        numparc: plano.numparc,
        intervalo: plano.intervalo || 0,
        ativo: plano.ativo,
        id_forma_erp: plano.id_forma_erp || ''
      });
    } else {
      setCurrentId(null);
      setFormData({
        codigo: undefined,
        formapag: '',
        numparc: 1,
        intervalo: 0,
        ativo: true,
        id_forma_erp: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.formapag.trim()) {
      setFormError('A Descrição do Plano é obrigatória.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (modalMode === 'create') {
        await api.post('/planos-pagamento/', formData);
      } else if (modalMode === 'edit' && currentId !== null) {
        await api.put(`/planos-pagamento/${currentId}`, formData);
      }
      await fetchPlanos();
      closeModal();
    } catch (err: any) {
      console.error("Erro ao salvar plano de pagamento:", err);
      const detail = err.response?.data?.detail;
      const errorMessage = typeof detail === 'string' 
        ? detail 
        : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : 'Ocorreu um erro ao salvar o plano.');
      
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleImportarERP = async () => {
    if (!formData.formapag) {
      alert("Para importar do ERP, é necessário ter a Descrição (nome) da forma de pagamento preenchida.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payloadRequest = {
        recurso: `formas_pagamentos?nome=${encodeURIComponent(formData.formapag)}`,
        method: "GET"
      };

      const response: any = await api.post('/gestaoclick/proxy', payloadRequest);
      const data = response.data;
      
      const debugData = {
        request: payloadRequest,
        status: response.status,
        response: data
      };
      await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));

      const responseData = data.response_data || data;
      let erpId = null;

      if (Array.isArray(responseData) && responseData.length > 0) {
        erpId = responseData[0].id;
      } else if (responseData && Array.isArray(responseData.data) && responseData.data.length > 0) {
        erpId = responseData.data[0].id;
      } else if (responseData && responseData.id) {
        erpId = responseData.id;
      }

      if (erpId) {
        setFormData(prev => ({ ...prev, id_forma_erp: erpId }));
        alert(`ERP Importado com sucesso. ID Vinculado: ${erpId}\n\nOs dados de requisição e resposta foram copiados para a área de transferência.`);
      } else {
        alert("Nenhuma forma de pagamento correspondente encontrada no ERP com este nome.\n\nOs dados foram copiados para a área de transferência.");
      }
    } catch (error: any) {
      console.error("Erro ao importar do ERP:", error);
      
      const debugData = {
        request: {
          recurso: `formas_pagamentos?nome=${formData.formapag}`,
          method: "GET"
        },
        status: error.response?.status || 500,
        response: error.response?.data || error.message
      };
      await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));

      alert("Erro ao consultar a API do GestãoClick.\n\nOs dados do erro foram copiados para a área de transferência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, nomePlano: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o plano "${nomePlano}"? Esta ação não pode ser desfeita.`)) {
      try {
        await api.delete(`/planos-pagamento/${id}`);
        await fetchPlanos();
      } catch (error) {
        console.error("Erro ao excluir plano:", error);
        alert('Erro ao excluir o plano. Ele pode estar sendo utilizado em algum faturamento.');
      }
    }
  };

  return (
    <div className="planos-container">
      <div className="print-header">
        <img src={logoEmpresa} alt="Logo Empresa" className="print-logo" />
        <h1 className="print-title">Relatório de Formas de Pagamento</h1>
      </div>

      <div className="page-header">
        <div className="title-group">
          <CreditCard size={28} className="title-icon" />
          <h1 className="title">Formas de Pagamento</h1>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={20} />
            Imprimir
          </button>
          <button className="btn-primary" onClick={() => openModal('create')}>
            <Plus size={20} />
            Nova Forma
          </button>
        </div>
      </div>

      <div className="glass-panel table-container">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por descrição ou código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {fetchError && (
          <div className="error-banner">
            <Search size={20} />
            <span>Erro ao carregar planos: {fetchError}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Carregando dados...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Cód.</th>
                  <th>Descrição da Forma de Pagamento</th>
                  <th style={{ textAlign: 'center' }}>Parcelas</th>
                  <th style={{ textAlign: 'center' }}>Intervalo</th>
                  <th>Status</th>
                  <th style={{ width: '120px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlanos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      {searchTerm ? "Nenhum plano encontrado." : "Nenhum plano cadastrado."}
                    </td>
                  </tr>
                ) : (
                  filteredPlanos.map((plano) => (
                    <tr key={plano.id}>
                      <td><strong>{plano.codigo || '-'}</strong></td>
                      <td>
                        <div className="plan-info">
                          <span className="plan-name">{plano.formapag}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                         <span className="parcela-badge">{plano.numparc}x</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                         <span className="intervalo-badge">{plano.intervalo || 0} dias</span>
                      </td>
                      <td>
                        <span className={`status-badge ${plano.ativo ? 'active' : 'inactive'}`}>
                          {plano.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn-icon-premium edit" 
                            onClick={() => openModal('edit', plano)}
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="btn-icon-premium delete" 
                            onClick={() => handleDelete(plano.id, plano.formapag)}
                            title="Excluir"
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
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="premium-modal-content" onClick={e => e.stopPropagation()}>
            <div className="premium-modal-header">
              <div className="modal-title-group">
                <CreditCard size={24} className="modal-title-icon" />
                <h2>{modalMode === 'create' ? 'Nova Forma de Pagamento' : 'Editar Forma de Pagamento'}</h2>
              </div>
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body custom-scrollbar" style={{ background: '#E5E5E5', padding: '1.5rem' }}>
                {formError && <div className="form-error">{formError}</div>}
                
                <div className="premium-master-panel">
                  <div className="form-grid">
                    <div className="form-group">
                      <label><Hash size={14} /> Código</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.codigo || ''}
                        onChange={(e) => setFormData({...formData, codigo: e.target.value ? parseInt(e.target.value) : undefined})}
                        placeholder="Ex: 1"
                      />
                    </div>

                    <div className="form-group col-2">
                      <label><CreditCard size={14} /> Descrição da Forma *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.formapag}
                        onChange={(e) => setFormData({...formData, formapag: e.target.value})}
                        placeholder="Ex: Cartão de Crédito 30 dias"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label><Calendar size={14} /> Nº de Parcelas</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.numparc}
                        onChange={(e) => setFormData({...formData, numparc: parseInt(e.target.value) || 1})}
                        min="1"
                        max="99"
                      />
                    </div>

                    <div className="form-group">
                      <label><Calendar size={14} /> Intervalo em Dias</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.intervalo}
                        onChange={(e) => setFormData({...formData, intervalo: parseInt(e.target.value) || 0})}
                        min="0"
                        max="365"
                        placeholder="Ex: 30"
                      />
                    </div>
                  </div>
                  
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                    />
                    <label htmlFor="ativo">Forma de pagamento ativa</label>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="id_forma_erp">ID Forma de Pagamento ERP</label>
                    <input
                      type="text"
                      id="id_forma_erp"
                      value={formData.id_forma_erp}
                      onChange={(e) => setFormData({...formData, id_forma_erp: e.target.value})}
                      placeholder="Ex: 58172930"
                    />
                  </div>
                </div>
              </div>
              
              <div className="premium-modal-footer">
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  {modalMode === 'edit' && (
                    <button type="button" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#e0e7ff', color: '#4f46e5', borderColor: '#c7d2fe' }} onClick={handleImportarERP} disabled={isSubmitting}>
                      <Download size={18} /> Importa ERP
                    </button>
                  )}
                </div>
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
