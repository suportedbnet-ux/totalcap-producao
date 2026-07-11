import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Save, Eye, FileText, Calendar, DollarSign, User, Printer } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import './Coletas.css';

export default function Contratos() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [medidas, setMedidas] = useState<any[]>([]);
  const [desenhos, setDesenhos] = useState<any[]>([]);
  const [tiporecaps, setTiporecaps] = useState<any[]>([]);
  const [planosPagamento, setPlanosPagamento] = useState<any[]>([]);
  const [tiposDocto, setTiposDocto] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [searchFilteredClientes, setSearchFilteredClientes] = useState<any[]>([]);
  const [searchShowSuggestions, setSearchShowSuggestions] = useState(false);

  const handleSearchClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchCliente(value);
    if (value.length >= 3) {
      const filtered = clientes.filter(c => (c.nome || '').toLowerCase().includes(value.toLowerCase())).slice(0, 10);
      setSearchFilteredClientes(filtered);
      setSearchShowSuggestions(true);
    } else {
      setSearchShowSuggestions(false);
    }
  };

  const selectSearchCliente = (c: any) => {
    setSearchCliente(c.nome);
    setSearchShowSuggestions(false);
  };

  // Seleção de Contrato na Grid
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);

  // Modal principal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Form Mestre
  const [formData, setFormData] = useState({
    id_empresa: 1,
    id_contato: '' as string | number,
    id_planopag: '' as string | number,
    id_tipodocto: '' as string | number,
    datacon: '',
    qttotal: 0,
    vrtotal: 0,
    qtfat: 0,
    vrfat: 0,
    obs: '',
    status: 'A',
    userlan: 'admin'
  });

  // Detalhe Combinações
  const [servicoItems, setServicoItems] = useState<any[]>([]);
  const [showServicoSelector, setShowServicoSelector] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Detalhe Parcelas
  const [parcelaItems, setParcelaItems] = useState<any[]>([]);

  // Form Item Detalhe
  const [newItemMedida, setNewItemMedida] = useState<string | number>('');
  const [newItemDesenho, setNewItemDesenho] = useState<string | number>('');
  const [newItemRecap, setNewItemRecap] = useState<string | number>('');
  const [newItemQuant, setNewItemQuant] = useState<string | number>('1');
  const [newItemValor, setNewItemValor] = useState<string | number>('0.00');

  useEffect(() => {
    fetchContratos();
    fetchLookups();
  }, []);

  // Atualiza totais automaticamente quando os itens mudam
  useEffect(() => {
    if (modalMode !== 'view') {
      const qti = servicoItems.reduce((sum, item) => sum + (parseInt(item.quant) || 0), 0);
      const vri = servicoItems.reduce((sum, item) => sum + ((parseInt(item.quant) || 0) * (parseFloat(item.valor) || 0)), 0);
      setFormData(prev => ({
        ...prev,
        qttotal: qti,
        vrtotal: parseFloat(vri.toFixed(2))
      }));
    }
  }, [servicoItems, modalMode]);

  const fetchContratos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/contratos/');
      const data = res.data || [];
      setContratos(data);
      // Seleciona automaticamente o primeiro se houver e nenhum selecionado
      if (data.length > 0 && !selectedContratoId) {
        setSelectedContratoId(data[0].id);
      }
    } catch {
      console.error('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [cliRes, medRes, desRes, recRes, ppRes, tdRes] = await Promise.all([
        api.get('/clientes/'),
        api.get('/medidas/'),
        api.get('/desenhos/'),
        api.get('/tipo-recapagem/'),
        api.get('/planos-pagamento/'),
        api.get('/tipos-docto/')
      ]);
      setClientes(cliRes.data || []);
      setMedidas(medRes.data || []);
      setDesenhos(desRes.data || []);
      setTiporecaps(recRes.data || []);
      setPlanosPagamento(ppRes.data || []);
      setTiposDocto(tdRes.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados auxiliares:', err);
    }
  };

  const filteredContratos = contratos.filter(c => {
    const idMatch = !searchId || String(c.id).includes(searchId);
    const cliMatch = !searchCliente || c.contato_nome?.toLowerCase().includes(searchCliente.toLowerCase());

    const contractDate = c.datacon ? (typeof c.datacon === 'string' ? c.datacon.split('T')[0] : c.datacon) : '';
    const dateMatch = (!searchStartDate || contractDate >= searchStartDate) &&
                      (!searchEndDate || contractDate <= searchEndDate);

    return idMatch && cliMatch && dateMatch;
  });

  const openModal = (mode: 'create' | 'edit' | 'view', contrato?: any) => {
    setModalMode(mode);
    if (contrato) {
      setCurrentId(contrato.id);
      setFormData({
        id_empresa: contrato.id_empresa || 1,
        id_contato: contrato.id_contato || '',
        id_planopag: contrato.id_planopag || '',
        id_tipodocto: contrato.id_tipodocto || '',
        datacon: contrato.datacon ? contrato.datacon.split('T')[0] : '',
        qttotal: contrato.qttotal || 0,
        vrtotal: parseFloat(contrato.vrtotal || 0),
        qtfat: contrato.qtfat || 0,
        vrfat: parseFloat(contrato.vrfat || 0),
        obs: contrato.obs || '',
        status: contrato.status || 'A',
        userlan: contrato.userlan || 'admin'
      });
      setServicoItems((contrato.servicos || []).map((s: any) => ({
        id: s.id,
        id_medida: s.id_medida || '',
        id_desenho: s.id_desenho || '',
        id_recap: s.id_recap || '',
        quant: s.quant || 0,
        valor: parseFloat(s.valor || 0),
        medida_descricao: s.medida_descricao || '',
        desenho_descricao: s.desenho_descricao || '',
        recap_descricao: s.recap_descricao || ''
      })));
      setParcelaItems((contrato.parcelas || []).map((p: any) => ({
        id: p.id,
        id_contato: p.id_contato,
        id_tipodocto: p.id_tipodocto || '',
        datacon: p.datacon ? p.datacon.split('T')[0] : '',
        vencto: p.vencto ? p.vencto.split('T')[0] : '',
        valor: parseFloat(p.valor || 0),
        tipodocto_descricao: p.tipodocto_descricao || ''
      })));
    } else {
      setCurrentId(null);
      setFormData({
        id_empresa: 1,
        id_contato: '',
        id_planopag: '',
        id_tipodocto: '',
        datacon: new Date().toISOString().split('T')[0],
        qttotal: 0,
        vrtotal: 0,
        qtfat: 0,
        vrfat: 0,
        obs: '',
        status: 'A',
        userlan: 'admin'
      });
      setServicoItems([]);
      setParcelaItems([]);
    }
    setModalOpen(true);
  };

  const handleMestreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleStatusCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, status: e.target.checked ? 'A' : 'I' }));
  };

  const openDetailSelector = (index: number | null) => {
    setEditingItemIndex(index);
    if (index !== null) {
      const item = servicoItems[index];
      setNewItemMedida(item.id_medida);
      setNewItemDesenho(item.id_desenho);
      setNewItemRecap(item.id_recap);
      setNewItemQuant(item.quant);
      setNewItemValor(item.valor);
    } else {
      setNewItemMedida('');
      setNewItemDesenho('');
      setNewItemRecap('');
      setNewItemQuant('1');
      setNewItemValor('0.00');
    }
    setShowServicoSelector(true);
  };

  const handleSaveDetailItem = () => {
    const medObj = medidas.find(m => m.id === Number(newItemMedida));
    const desObj = desenhos.find(d => d.id === Number(newItemDesenho));
    const recObj = tiporecaps.find(r => r.id === Number(newItemRecap));

    const item = {
      id_medida: newItemMedida === '' ? null : Number(newItemMedida),
      id_desenho: newItemDesenho === '' ? null : Number(newItemDesenho),
      id_recap: newItemRecap === '' ? null : Number(newItemRecap),
      quant: parseInt(String(newItemQuant)) || 0,
      valor: parseFloat(String(newItemValor)) || 0,
      medida_descricao: medObj ? medObj.descricao : '-',
      desenho_descricao: desObj ? desObj.descricao : '-',
      recap_descricao: recObj ? recObj.descricao : '-'
    };

    if (editingItemIndex !== null) {
      setServicoItems(prev => prev.map((s, i) => i === editingItemIndex ? item : s));
    } else {
      setServicoItems(prev => [...prev, item]);
    }

    setShowServicoSelector(false);
  };

  const removeDetailItem = (index: number) => {
    setServicoItems(prev => prev.filter((_, i) => i !== index));
  };

  // Lógica para Gerar Parcelas Dinamicamente
  const handleGerarParcelas = () => {
    if (!formData.id_contato) {
      alert('Selecione um cliente para gerar as parcelas.');
      return;
    }
    if (!formData.id_planopag) {
      alert('Selecione um Plano de Pagamento.');
      return;
    }
    if (formData.vrtotal <= 0) {
      alert('O valor total do contrato deve ser maior que zero.');
      return;
    }

    const plano = planosPagamento.find(pp => pp.id === Number(formData.id_planopag));
    if (!plano) {
      alert('Plano de Pagamento inválido.');
      return;
    }

    const numparc = plano.numparc || 1;
    const intervalo = plano.intervalo || 0;
    const baseDate = formData.datacon ? new Date(formData.datacon + 'T12:00:00') : new Date();

    const parcelasGeradas = [];
    const valorParcelaBase = parseFloat((formData.vrtotal / numparc).toFixed(2));
    let valorAcumulado = 0;

    for (let i = 0; i < numparc; i++) {
      const dueDate = new Date(baseDate);
      const daysToAdd = i * (intervalo || 30);
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      let valorParcela = valorParcelaBase;
      if (i === numparc - 1) {
        valorParcela = parseFloat((formData.vrtotal - valorAcumulado).toFixed(2));
      } else {
        valorAcumulado += valorParcela;
      }

      parcelasGeradas.push({
        id_contato: Number(formData.id_contato),
        id_tipodocto: formData.id_tipodocto === '' ? null : Number(formData.id_tipodocto),
        datacon: formData.datacon || new Date().toISOString().split('T')[0],
        vencto: dueDate.toISOString().split('T')[0],
        valor: valorParcela,
        tipodocto_descricao: tiposDocto.find(td => td.id === Number(formData.id_tipodocto))?.descricao || ''
      });
    }

    setParcelaItems(parcelasGeradas);
  };

  const handleParcelaDateChange = (index: number, val: string) => {
    setParcelaItems(prev => prev.map((p, i) => i === index ? { ...p, vencto: val } : p));
  };

  const handleParcelaValorChange = (index: number, val: string) => {
    setParcelaItems(prev => prev.map((p, i) => i === index ? { ...p, valor: val } : p));
  };

  const handleSubmit = async () => {
    if (!formData.id_contato) {
      alert('Selecione um cliente.');
      return;
    }
    if (servicoItems.length === 0) {
      alert('Adicione ao menos um item de detalhe ao contrato.');
      return;
    }

    const payload = {
      ...formData,
      id_contato: Number(formData.id_contato),
      id_planopag: formData.id_planopag === '' ? null : Number(formData.id_planopag),
      id_tipodocto: formData.id_tipodocto === '' ? null : Number(formData.id_tipodocto),
      datacon: formData.datacon ? `${formData.datacon}T12:00:00` : null,
      servicos: servicoItems.map(s => ({
        id_medida: s.id_medida === '' ? null : s.id_medida,
        id_desenho: s.id_desenho === '' ? null : s.id_desenho,
        id_recap: s.id_recap === '' ? null : s.id_recap,
        quant: s.quant,
        valor: s.valor,
        userlan: formData.userlan
      })),
      parcelas: parcelaItems.map(p => ({
        id_contato: Number(formData.id_contato),
        id_tipodocto: p.id_tipodocto === '' ? null : Number(p.id_tipodocto),
        datacon: p.datacon ? `${p.datacon}T12:00:00` : null,
        vencto: p.vencto ? `${p.vencto}T12:00:00` : null,
        valor: Number(p.valor),
        userlan: formData.userlan
      }))
    };

    try {
      if (modalMode === 'create') {
        await api.post('/contratos/', payload);
      } else if (modalMode === 'edit' && currentId !== null) {
        await api.put(`/contratos/${currentId}`, payload);
      }
      await fetchContratos();
      setModalOpen(false);
    } catch (err) {
      alert(getErrorMessage(err, 'Erro ao salvar contrato'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Excluir contrato número "${id}"?`)) return;
    try {
      await api.delete(`/contratos/${id}`);
      if (selectedContratoId === id) {
        setSelectedContratoId(null);
      }
      await fetchContratos();
    } catch {
      alert('Erro ao excluir contrato');
    }
  };

  const handlePrintContrato = () => {
    if (!selectedContratoId) {
      alert('Selecione um contrato na grid para imprimir.');
      return;
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const formatarDataBr = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
      }
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  // Encontra o contrato selecionado para a área de impressão
  const contratoParaImprimir = contratos.find(c => c.id === selectedContratoId);

  return (
    <>
      <div className="coleta-container">
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .contrato-print-area, .contrato-print-area * {
              visibility: visible !important;
            }
            .contrato-print-area {
              visibility: visible !important;
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              color: #000000 !important;
              padding: 20px !important;
              font-family: 'Inter', Arial, sans-serif !important;
            }
          }
          .contrato-print-area {
            display: none;
          }
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .print-header h2 {
          margin: 0 0 5px 0;
          font-size: 1.4rem;
          color: #1e3a8a;
          font-weight: 800;
        }
        .print-header p {
          margin: 2px 0;
          font-size: 0.85rem;
          color: #4b5563;
        }
        .contract-badge {
          text-align: right;
          border: 2px solid #1e3a8a;
          padding: 8px 16px;
          border-radius: 8px;
          background-color: #f0f4f8;
        }
        .badge-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #1e3a8a;
          letter-spacing: 1px;
        }
        .badge-number {
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f172a;
          margin: 4px 0;
        }
        .badge-date {
          font-size: 0.8rem;
          color: #4b5563;
        }
        .print-divider {
          border: 0;
          border-top: 2px solid #e5e7eb;
          margin: 20px 0;
        }
        .print-section {
          margin-bottom: 25px;
        }
        .print-section h3 {
          font-size: 0.95rem;
          color: #1e3a8a;
          border-bottom: 1.5px solid #1e3a8a;
          padding-bottom: 4px;
          margin: 0 0 10px 0;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .print-info-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .print-info-table td {
          padding: 6px 0;
        }
        .print-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          margin-top: 10px;
        }
        .print-data-table th {
          background-color: #f3f4f6;
          color: #374151;
          font-weight: 700;
          padding: 8px;
          border: 1px solid #e5e7eb;
        }
        .print-data-table td {
          padding: 8px;
          border: 1px solid #e5e7eb;
        }
        .totals-row td {
          background-color: #f9fafb;
          border-top: 2px solid #374151;
        }
        .print-obs-box {
          border: 1px solid #e5e7eb;
          background-color: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          color: #374151;
          min-height: 50px;
        }
        .print-signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 60px;
          page-break-inside: avoid;
        }
        .sig-line {
          width: 45%;
          text-align: center;
        }
        .sig-line .line {
          border-top: 1.5px solid #4b5563;
          margin-bottom: 8px;
        }
        .sig-line p {
          margin: 2px 0;
          font-size: 0.85rem;
          color: #374151;
        }
      `}</style>

      <div className="page-header">
        <div className="header-title-container">
          <div className="header-title">
            <FileText size={28} style={{ color: 'var(--primary)' }} />
            <h1>Contratos</h1>
          </div>
          <p className="page-subtitle">Gerencie contratos comerciais de preços de serviços especiais</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn-secondary" 
            onClick={handlePrintContrato} 
            disabled={!selectedContratoId}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              opacity: selectedContratoId ? 1 : 0.5,
              cursor: selectedContratoId ? 'pointer' : 'not-allowed',
              background: '#ffffff',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              fontWeight: '600',
              height: '42px',
              margin: 0
            }}
          >
            <Printer size={18} /> Imprimir Contrato
          </button>
          <button className="btn-primary-coleta" onClick={() => openModal('create')} style={{ height: '42px', margin: 0 }}>
            <Plus size={20} /> Novo Contrato
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '0.6rem 0.75rem', marginBottom: '1.25rem' }}>
        <div className="search-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.6rem', flexWrap: 'nowrap', width: '100%', boxSizing: 'border-box', minHeight: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 36, width: 32, flexShrink: 0 }}>
            <Search size={16} style={{ color: '#64748b' }} />
          </div>
          <input
            type="text"
            placeholder="Buscar por ID"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            style={{ width: 120, height: 36, boxSizing: 'border-box', flexShrink: 1, border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.85rem', padding: '0 0.5rem', background: '#fff', borderRadius: 6 }}
          />
          <div style={{ position: 'relative', flex: 4, minWidth: 450 }}>
            <input
              type="text"
              placeholder="Cliente"
              value={searchCliente}
              onChange={handleSearchClienteChange}
              style={{ width: '100%', height: 36, boxSizing: 'border-box', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.85rem', padding: '0 0.5rem', background: '#fff', borderRadius: 6 }}
            />
            {searchShowSuggestions && searchFilteredClientes.length > 0 && (
              <div className="autocomplete-dropdown glass-panel" style={{ position: 'absolute', width: '100%', zIndex: 100, top: '100%', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                {searchFilteredClientes.map(c => (
                  <div key={c.id} className="autocomplete-item" onClick={() => selectSearchCliente(c)} style={{ padding: '0.8rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontWeight: 500, color: '#334155' }}>
                    {c.nome}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            type="date"
            className="form-input"
            value={searchStartDate}
            onChange={e => setSearchStartDate(e.target.value)}
            title="Data Inicial"
            style={{ width: 180, minWidth: 180, maxWidth: 180, height: 36, boxSizing: 'border-box', flexShrink: 1, padding: '0 0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fff' }}
          />
          <input
            type="date"
            className="form-input"
            value={searchEndDate}
            onChange={e => setSearchEndDate(e.target.value)}
            title="Data Final"
            style={{ width: 180, minWidth: 180, maxWidth: 180, height: 36, boxSizing: 'border-box', flexShrink: 1, padding: '0 0.5rem', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.85rem', background: '#fff' }}
          />
          <button
            className="btn-search-producao"
            style={{ height: 36, minHeight: 36, padding: '0 1.3rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'var(--primary-gradient, linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%))', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s' }}
          >
            <Search size={15} /> Filtrar
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 60, textAlign: 'center' }}>Sel.</th>
              <th style={{ textAlign: 'left', width: 80 }}>ID</th>
              <th style={{ textAlign: 'left' }}>Cliente</th>
              <th style={{ textAlign: 'left' }}>Forma Pagamento</th>
              <th style={{ textAlign: 'center', width: 120 }}>Data</th>
              <th style={{ textAlign: 'right', width: 100 }}>Qtd Itens</th>
              <th style={{ textAlign: 'right', width: 140 }}>Valor Total</th>
              <th style={{ textAlign: 'center', width: 100 }}>Status</th>
              <th style={{ textAlign: 'center', width: 140 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
            ) : filteredContratos.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum contrato encontrado</td></tr>
            ) : filteredContratos.map(c => (
              <tr 
                key={c.id} 
                onClick={() => setSelectedContratoId(c.id)}
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedContratoId === c.id ? '#eff6ff' : 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <input 
                    type="radio" 
                    name="selectedContrato" 
                    checked={selectedContratoId === c.id} 
                    onChange={() => setSelectedContratoId(c.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </td>
                <td style={{ fontWeight: 600 }}>#{c.id}</td>
                <td style={{ fontWeight: 500 }}>{c.contato_nome || `Cliente #${c.id_contato}`}</td>
                <td style={{ fontWeight: 500 }}>{c.planopag_descricao || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  {formatarDataBr(c.datacon)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.qttotal}</td>
                <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 700 }}>
                  R$ {parseFloat(c.vrtotal).toFixed(2)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {c.status === 'A'
                    ? <span className="status-badge-item status-pronto" style={{ fontSize: '0.7rem', padding: '3px 10px' }}>Ativo</span>
                    : <span className="status-badge-item status-aguardando" style={{ fontSize: '0.7rem', padding: '3px 10px' }}>Inativo</span>
                  }
                </td>
                <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                    <button className="icon-btn edit" onClick={() => openModal('view', c)} title="Visualizar"><Eye size={16} /></button>
                    <button className="icon-btn edit" onClick={() => openModal('edit', c)} title="Editar"><Edit2 size={16} /></button>
                    <button className="icon-btn delete" onClick={() => handleDelete(c.id)} title="Excluir"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="coleta-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="coleta-modal-content" style={{ maxWidth: 1100, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="coleta-modal-header">
              <h2>{modalMode === 'create' ? 'Novo' : modalMode === 'edit' ? 'Editar' : 'Visualizar'} Contrato</h2>
              <button className="close-btn" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>

            <div className="coleta-modal-body scrollable">
              <div className="coleta-master-section">
                <div className="section-divider">
                  <span className="divider-label"><FileText size={14} /> Cabeçalho do Contrato</span>
                </div>
                <div className="form-grid-coleta">
                  <div className="form-group">
                    <label>Código Contrato</label>
                    <input type="text" className="form-input" value={currentId ? `#${currentId}` : 'Automático'} disabled style={{ background: '#f1f5f9', fontWeight: 'bold' }} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Cliente *</label>
                    <select className="form-select" id="id_contato" value={formData.id_contato} onChange={handleMestreChange} disabled={modalMode === 'view'}>
                      <option value="">Selecione o Cliente...</option>
                      {clientes.map(cli => (
                        <option key={cli.id} value={cli.id}>{cli.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Data de Cadastro</label>
                    <input type="date" className="form-input" id="datacon" value={formData.datacon} onChange={handleMestreChange} disabled={modalMode === 'view'} />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label>Observações</label>
                    <input type="text" className="form-input" id="obs" value={formData.obs} onChange={handleMestreChange} disabled={modalMode === 'view'} placeholder="Notas ou observações adicionais..." />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '1.8rem' }}>
                    <div className="checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="checkbox" id="status" checked={formData.status === 'A'} onChange={handleStatusCheckboxChange} disabled={modalMode === 'view'} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      <label htmlFor="status" style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer' }}>Contrato Ativo</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="coleta-master-section">
                <div className="section-divider" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="divider-label"><DollarSign size={14} /> Itens / Preços por Combinação de Pneu</span>
                  {modalMode !== 'view' && (
                    <button className="btn-primary-coleta" onClick={() => openDetailSelector(null)} style={{ padding: '0.4rem 1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Plus size={16} /> Adicionar Preço Especial
                    </button>
                  )}
                </div>

                <div className="table-responsive">
                  <table className="data-table" style={{ width: '100%', marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Medida</th>
                        <th style={{ textAlign: 'left' }}>Desenho</th>
                        <th style={{ textAlign: 'left' }}>Recapagem</th>
                        <th style={{ textAlign: 'right', width: 100 }}>Quantidade</th>
                        <th style={{ textAlign: 'right', width: 140 }}>Valor (R$)</th>
                        <th style={{ textAlign: 'right', width: 140 }}>Subtotal (R$)</th>
                        {modalMode !== 'view' && <th style={{ width: 100, textAlign: 'center' }}>Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {servicoItems.length === 0 ? (
                        <tr><td colSpan={modalMode !== 'view' ? 7 : 6} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>Nenhuma combinação especial cadastrada.</td></tr>
                      ) : (
                        servicoItems.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{item.medida_descricao || '-'}</td>
                            <td>{item.desenho_descricao || '-'}</td>
                            <td>{item.recap_descricao || '-'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quant}</td>
                            <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>R$ {parseFloat(item.valor).toFixed(2)}</td>
                            <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>R$ {(item.quant * item.valor).toFixed(2)}</td>
                            {modalMode !== 'view' && (
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                                  <button className="icon-btn edit" onClick={() => openDetailSelector(idx)} title="Editar"><Edit2 size={14} /></button>
                                  <button className="icon-btn delete" onClick={() => removeDetailItem(idx)} title="Remover"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', marginTop: '1rem', padding: '0.75rem 1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Quantidade Total:</span>
                    <span style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '700' }}>{formData.qttotal}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Valor Total:</span>
                    <span style={{ fontSize: '1.2rem', color: '#059669', fontWeight: '800' }}>R$ {formData.vrtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Seção de Parcelas - Condições de Pagamento */}
              <div className="coleta-master-section" style={{ marginTop: '1.5rem' }}>
                <div className="section-divider">
                  <span className="divider-label"><Calendar size={14} /> Condições de Pagamento & Parcelas</span>
                </div>
                
                <div className="form-grid-coleta" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Plano de Pagamento</label>
                    <select className="form-select" id="id_planopag" value={formData.id_planopag} onChange={handleMestreChange} disabled={modalMode === 'view'}>
                      <option value="">Selecione o Plano...</option>
                      {planosPagamento.map(pp => (
                        <option key={pp.id} value={pp.id}>{pp.formapag}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Tipo de Documento</label>
                    <select className="form-select" id="id_tipodocto" value={formData.id_tipodocto} onChange={handleMestreChange} disabled={modalMode === 'view'}>
                      <option value="">Selecione o Tipo...</option>
                      {tiposDocto.map(td => (
                        <option key={td.id} value={td.id}>{td.descricao}</option>
                      ))}
                    </select>
                  </div>

                  {modalMode !== 'view' && (
                    <div className="form-group" style={{ width: '220px' }}>
                      <button 
                        type="button"
                        className="btn-primary-coleta" 
                        onClick={handleGerarParcelas}
                        style={{ 
                          width: '100%', 
                          height: '42px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '0.5rem',
                          margin: 0
                        }}
                      >
                        <Calendar size={18} /> Gerar Parcelas
                      </button>
                    </div>
                  )}
                </div>

                <div className="table-responsive">
                  <table className="data-table" style={{ width: '100%', marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', width: 120 }}>Nº Parcela</th>
                        <th style={{ textAlign: 'left' }}>Vencimento</th>
                        <th style={{ textAlign: 'right', width: 200 }}>Valor (R$)</th>
                        <th style={{ textAlign: 'left', width: 220 }}>Tipo Docto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parcelaItems.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>Nenhuma parcela gerada para este contrato.</td></tr>
                      ) : (
                        parcelaItems.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{idx + 1}ª Parcela</td>
                            <td>
                              {modalMode === 'view' ? (
                                <span>{item.vencto ? new Date(item.vencto + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                              ) : (
                                <input 
                                  type="date" 
                                  className="form-input" 
                                  value={item.vencto} 
                                  onChange={e => handleParcelaDateChange(idx, e.target.value)} 
                                  style={{ padding: '0.3rem 0.6rem', width: '100%', maxWidth: '200px' }}
                                />
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {modalMode === 'view' ? (
                                <span style={{ color: '#059669', fontWeight: 600 }}>R$ {parseFloat(item.valor).toFixed(2)}</span>
                              ) : (
                                <input 
                                  type="number" 
                                  step="0.01"
                                  className="form-input" 
                                  value={item.valor} 
                                  onChange={e => handleParcelaValorChange(idx, e.target.value)} 
                                  style={{ padding: '0.3rem 0.6rem', textAlign: 'right', width: '100%', maxWidth: '160px', color: '#059669', fontWeight: 'bold' }}
                                />
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                {item.tipodocto_descricao || tiposDocto.find(td => td.id === Number(item.id_tipodocto))?.descricao || '-'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {modalMode !== 'view' && (
              <div className="modal-footer-coleta">
                <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn-primary-coleta" onClick={handleSubmit}>
                  <Save size={20} /> {modalMode === 'create' ? 'Salvar Contrato' : 'Salvar Alterações'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showServicoSelector && (
        <div className="coleta-modal-overlay" style={{ zIndex: 2000 }} onClick={() => setShowServicoSelector(false)}>
          <div className="coleta-modal-content" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
            <div className="coleta-modal-header">
              <h2>{editingItemIndex !== null ? 'Editar Preço Especial' : 'Adicionar Preço Especial'}</h2>
              <button className="close-btn" onClick={() => setShowServicoSelector(false)}><X size={20} /></button>
            </div>
            <div className="coleta-modal-body">
              <div className="form-grid-coleta">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Medida do Pneu</label>
                  <select className="form-select" value={newItemMedida} onChange={e => setNewItemMedida(e.target.value)}>
                    <option value="">Qualquer Medida / Ignorar</option>
                    {medidas.map(med => (
                      <option key={med.id} value={med.id}>{med.descricao}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Desenho da Banda</label>
                  <select className="form-select" value={newItemDesenho} onChange={e => setNewItemDesenho(e.target.value)}>
                    <option value="">Qualquer Desenho / Ignorar</option>
                    {desenhos.map(des => (
                      <option key={des.id} value={des.id}>{des.descricao}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Tipo Recapagem</label>
                  <select className="form-select" value={newItemRecap} onChange={e => setNewItemRecap(e.target.value)}>
                    <option value="">Qualquer Recapagem / Ignorar</option>
                    {tiporecaps.map(rec => (
                      <option key={rec.id} value={rec.id}>{rec.descricao}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantidade</label>
                  <input type="number" className="form-input" value={newItemQuant} onChange={e => setNewItemQuant(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Preço Unitário (R$)</label>
                  <input type="number" step="0.01" className="form-input" value={newItemValor} onChange={e => setNewItemValor(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer-coleta">
              <button className="btn-secondary" onClick={() => setShowServicoSelector(false)}>Cancelar</button>
              <button className="btn-primary-coleta" onClick={handleSaveDetailItem}>
                <Save size={20} /> {editingItemIndex !== null ? 'Salvar Item' : 'Confirmar Item'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Área oculta para impressão estruturada do Contrato */}
      {contratoParaImprimir && (
        <div className="contrato-print-area">
          <div className="print-header">
            <div className="company-info">
              <h2>TOTALCAP RECAPAGEM DE PNEUS</h2>
              <p>Av. das Indústrias, 1500 - Distrito Industrial</p>
              <p>CNPJ: 12.345.678/0001-90 | Tel: (11) 4522-3000</p>
            </div>
            <div className="contract-badge">
              <div className="badge-title">CONTRATO COMERCIAL</div>
              <div className="badge-number">Nº {contratoParaImprimir.id}</div>
              <div className="badge-date">Data: {formatarDataBr(contratoParaImprimir.datacon)}</div>
            </div>
          </div>

          <hr className="print-divider" />

          <div className="print-section">
            <h3>1. IDENTIFICAÇÃO E SALDOS DO CONTRATO</h3>
            <table className="print-info-table">
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '150px' }}>Cliente:</td>
                  <td>{contratoParaImprimir.contato_nome || `Cliente #${contratoParaImprimir.id_contato}`}</td>
                  <td style={{ fontWeight: 'bold', width: '150px' }}>Qtd. Contratada:</td>
                  <td>{contratoParaImprimir.qttotal || 0}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Data Contrato:</td>
                  <td>{formatarDataBr(contratoParaImprimir.datacon)}</td>
                  <td style={{ fontWeight: 'bold' }}>Qtd. Faturada:</td>
                  <td>{contratoParaImprimir.qtfat || 0}</td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td style={{ fontWeight: 'bold', color: '#1e3a8a' }}>Saldo Restante:</td>
                  <td style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{(contratoParaImprimir.qttotal || 0) - (contratoParaImprimir.qtfat || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="print-section">
            <h3>2. ITENS E COMBINAÇÕES CONTRATADAS</h3>
            <table className="print-data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Medida</th>
                  <th style={{ textAlign: 'left' }}>Desenho</th>
                  <th style={{ textAlign: 'left' }}>Recapagem</th>
                  <th style={{ textAlign: 'right', width: '100px' }}>Qtd</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Preço Unitário</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(contratoParaImprimir.servicos || []).map((s: any, idx: number) => (
                  <tr key={idx}>
                    <td>{s.medida_descricao || '-'}</td>
                    <td>{s.desenho_descricao || '-'}</td>
                    <td>{s.recap_descricao || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{s.quant}</td>
                    <td style={{ textAlign: 'right' }}>R$ {parseFloat(s.valor || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>R$ {(s.quant * (s.valor || 0)).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="totals-row">
                  <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'right' }}>Totais:</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{contratoParaImprimir.qttotal}</td>
                  <td></td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                    R$ {parseFloat(contratoParaImprimir.vrtotal || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {contratoParaImprimir.planopag_descricao && (
            <div className="print-section">
              <h3>3. CONDIÇÕES DE PAGAMENTO</h3>
              <table className="print-info-table">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', width: '160px' }}>Plano de Pagamento:</td>
                    <td>{contratoParaImprimir.planopag_descricao}</td>
                  </tr>
                  {contratoParaImprimir.tipodocto_descricao && (
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>Tipo de Documento:</td>
                      <td>{contratoParaImprimir.tipodocto_descricao}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {(contratoParaImprimir.parcelas || []).length > 0 && (
            <div className="print-section">
              <h3>4. CRONOGRAMA DE PARCELAS</h3>
              <table className="print-data-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', width: '120px' }}>Parcela</th>
                    <th style={{ textAlign: 'left' }}>Data Vencimento</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'left', width: '220px' }}>Tipo Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {(contratoParaImprimir.parcelas || []).map((p: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 'bold' }}>{idx + 1}ª Parcela</td>
                      <td>{formatarDataBr(p.vencto)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>R$ {parseFloat(p.valor || 0).toFixed(2)}</td>
                      <td>{p.tipodocto_descricao || contratoParaImprimir.tipodocto_descricao || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {contratoParaImprimir.obs && (
            <div className="print-section">
              <h3>5. OBSERVAÇÕES ADICIONAIS</h3>
              <div className="print-obs-box">
                {contratoParaImprimir.obs}
              </div>
            </div>
          )}

          <div className="print-signatures">
            <div className="sig-line">
              <div className="line"></div>
              <p>TOTALCAP RECAPAGEM DE PNEUS</p>
              <p>Representante Comercial</p>
            </div>
            <div className="sig-line">
              <div className="line"></div>
              <p>{contratoParaImprimir.contato_nome || 'CONTRATANTE'}</p>
              <p>Assinatura do Cliente</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
