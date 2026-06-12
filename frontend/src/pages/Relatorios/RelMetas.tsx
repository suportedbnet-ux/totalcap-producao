import { useState, useEffect } from 'react';
import { 
  Target, 
  Search, 
  Calendar, 
  User, 
  Printer, 
  Loader2,
  DollarSign,
  Fuel
} from 'lucide-react';
import api from '../../lib/api';
import './RelMetas.css';
import LogoDbnet from '../../assets/images/LogoEmpresa.png';

interface MetaItem {
  id: number;
  id_vendedor: number;
  vendedor_nome: string;
  ano: number;
  mes: number;
  valor_meta: number;
  quantidade_meta: number;
  vfatreal: number;
  vcombreal: number;
  ativo: boolean;
}

export default function RelMetas() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'vendas' | 'combustivel'>('vendas');
  const [data, setData] = useState<MetaItem[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [vendedores, setVendedores] = useState<any[]>([]);

  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [idVendedor, setIdVendedor] = useState<string>('');

  useEffect(() => {
    fetchLookups();
  }, []);

  const fetchLookups = async () => {
    try {
      const [vRes, eRes] = await Promise.all([
        api.get('/vendedores/'),
        api.get('/empresas/')
      ]);
      setVendedores(vRes.data);
      if (eRes.data && eRes.data.length > 0) {
        setEmpresa(eRes.data[0]);
      }
    } catch (err) {
      console.error("Erro ao carregar filtros:", err);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (idVendedor) params.append('id_vendedor', idVendedor);

      const response = await api.get(`/vendedor-metas/relatorio?${params.toString()}`);
      setData(response.data);
    } catch (err) {
      console.error("Erro ao buscar relatório:", err);
      alert("Erro ao buscar dados do relatório.");
    } finally {
      setLoading(false);
    }
  };

  const totalMetaVendas = data.reduce((acc, curr) => acc + curr.valor_meta, 0);
  const totalRealVendas = data.reduce((acc, curr) => acc + (curr.vfatreal || 0), 0);
  
  const totalMetaComb = data.reduce((acc, curr) => acc + curr.quantidade_meta, 0);
  const totalRealComb = data.reduce((acc, curr) => acc + (curr.vcombreal || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relatorio-container">
      {/* Cabeçalho de Impressão */}
      <div className="report-print-header only-print">
        <div className="print-header-top">
          <div className="print-logo">
            <img src={LogoDbnet} alt="Logo" />
          </div>
          <div className="print-main-row">
            <div className="print-company-name">{empresa?.razaosocial || 'TOTALCAP'}</div>
            <div className="print-date"><strong>Data Impressão:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
        <div className="print-header-bottom">
          <div className="print-report-title">RELATÓRIO DE METAS - {activeTab === 'vendas' ? 'VENDAS' : 'COMBUSTÍVEL'}</div>
          <div className="print-meta-info">
            <span><strong>Período:</strong> {new Date(startDate).toLocaleDateString('pt-BR', {month: '2-digit', year: 'numeric'})} à {new Date(endDate).toLocaleDateString('pt-BR', {month: '2-digit', year: 'numeric'})}</span>
          </div>
        </div>
      </div>

      <div className="relatorio-header no-print">
        <div className="relatorio-title">
          <Target size={32} className="text-primary" />
          <h1>Relatório de Metas</h1>
        </div>
        <button className="btn-primary" onClick={handlePrint} style={{ background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Printer size={20} /> Imprimir Relatório
        </button>
      </div>

      <div className="relatorio-tabs no-print">
        <div 
          className={`tab-item ${activeTab === 'vendas' ? 'active' : ''}`} 
          onClick={() => setActiveTab('vendas')}
        >
          <DollarSign size={18} /> Metas de Vendas
        </div>
        <div 
          className={`tab-item ${activeTab === 'combustivel' ? 'active' : ''}`} 
          onClick={() => setActiveTab('combustivel')}
        >
          <Fuel size={18} /> Metas de Combustível
        </div>
      </div>

      <div className="filter-bar no-print">
        <div className="filter-row">
          <div className="input-group">
            <label><Calendar size={14} /> Mês/Ano Início</label>
            <input type="month" value={startDate.substring(0, 7)} onChange={e => setStartDate(`${e.target.value}-01`)} />
          </div>
          <div className="input-group">
            <label><Calendar size={14} /> Mês/Ano Fim</label>
            <input type="month" value={endDate.substring(0, 7)} onChange={e => setEndDate(`${e.target.value}-01`)} />
          </div>
          <div className="input-group">
            <label><User size={14} /> Vendedor</label>
            <select value={idVendedor} onChange={e => setIdVendedor(e.target.value)}>
              <option value="">Todos os Vendedores</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={handleSearch} disabled={loading} style={{ height: '45px', marginTop: 'auto' }}>
            {loading ? <Loader2 className="spinning" /> : <Search size={20} />} Gerar Relatório
          </button>
        </div>
      </div>

      <div className="results-section">
        <div style={{ overflowX: 'auto' }}>
          <table className="relatorio-table">
            <thead>
              {activeTab === 'vendas' ? (
                <tr>
                  <th>Vendedor</th>
                  <th>Ano/Mês</th>
                  <th style={{ textAlign: 'right' }}>Meta Faturamento</th>
                  <th style={{ textAlign: 'right' }}>Realizado</th>
                  <th style={{ textAlign: 'right' }}>% Atingido</th>
                </tr>
              ) : (
                <tr>
                  <th>Vendedor</th>
                  <th>Ano/Mês</th>
                  <th style={{ textAlign: 'right' }}>Meta Combustível</th>
                  <th style={{ textAlign: 'right' }}>Realizado</th>
                  <th style={{ textAlign: 'right' }}>% Atingido</th>
                </tr>
              )}
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Nenhum dado encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                data.map((item) => {
                  const meta = activeTab === 'vendas' ? item.valor_meta : item.quantidade_meta;
                  const real = activeTab === 'vendas' ? (item.vfatreal || 0) : (item.vcombreal || 0);
                  const atingido = meta > 0 ? (real / meta) * 100 : 0;

                  return (
                    <tr key={item.id}>
                      <td>{item.vendedor_nome}</td>
                      <td>{item.ano} / {item.mes.toString().padStart(2, '0')}</td>
                      <td style={{ textAlign: 'right' }}>
                        {activeTab === 'vendas' 
                          ? `R$ ${meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : meta.toLocaleString('pt-BR')
                        }
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {activeTab === 'vendas' 
                          ? `R$ ${real.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : real.toLocaleString('pt-BR')
                        }
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: atingido >= 100 ? '#10b981' : atingido >= 80 ? '#f59e0b' : '#ef4444' }}>
                        {atingido.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {data.length > 0 && (
          <div className="relatorio-footer">
            <div className="total-card">
              <span className="total-label">Total Meta {activeTab === 'vendas' ? 'Vendas' : 'Comb.'}</span>
              <span className="total-value">
                {activeTab === 'vendas' 
                  ? `R$ ${totalMetaVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : totalMetaComb.toLocaleString('pt-BR')
                }
              </span>
            </div>
            <div className="total-card">
              <span className="total-label">Total Realizado</span>
              <span className="total-value">
                {activeTab === 'vendas' 
                  ? `R$ ${totalRealVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : totalRealComb.toLocaleString('pt-BR')
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
