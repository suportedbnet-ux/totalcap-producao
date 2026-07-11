import React, { useState } from 'react';
import { RefreshCcw, Database, Receipt, Server } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import './Integracao.css'; // reaproveitar o css de integração

export default function SincronizaERP() {
  const [activeTab, setActiveTab] = useState<'cadastros' | 'notaFiscal'>('cadastros');
  const [tabelaCadastro, setTabelaCadastro] = useState('clientes');
  const [recurso, setRecurso] = useState('clientes');
  const [method, setMethod] = useState('GET');
  const [parametro, setParametro] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [requestPayload, setRequestPayload] = useState<string | null>(null);
  const [apiError, setApiError] = useState(false);

  const handleTabelaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTabelaCadastro(value);
    setRecurso(value);
    setParametro('');
  };

  const handleSincronizarCadastros = async () => {
    if (!recurso) {
      setApiResult('Erro: O campo Recurso é obrigatório.');
      return;
    }

    setLoading(true);
    setApiResult(null);
    setRequestPayload(null);
    setApiError(false);

    try {
      let parsedParam: any = method === 'GET' ? { pagina: 1 } : undefined;

      if (parametro.trim()) {
        try {
          parsedParam = JSON.parse(parametro);
        } catch (e: any) {
          throw new Error('Formato do Parâmetro inválido. Deve ser um JSON válido.');
        }
      }

      const payload = {
        recurso: recurso,
        param: parsedParam,
        method: method
      };

      const debugInfo = `Backend Proxy: /gestaoclick/proxy\n\nPayload Enviado:\n${JSON.stringify(payload, null, 2)}`;
      setRequestPayload(debugInfo);

      const response = await api.post('/gestaoclick/proxy', payload);

      const data = response.data;
      setApiResult(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setApiError(true);
      const errorMessage = getErrorMessage(error, error.message);
      setApiResult(`Erro na requisição: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ background: '#E5E5E5', minHeight: '100vh' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="header-title-group">
          <RefreshCcw size={32} className="header-icon" style={{ color: '#3b82f6' }} />
          <div>
            <h1>Sincroniza ERP (GestãoClick)</h1>
            <p>Sincronize os dados entre a aplicação e o ERP GestãoClick</p>
          </div>
        </div>
      </header>

      <div className="premium-master-panel" style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        {/* Abas */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2e8f0', marginBottom: '2rem' }}>
          <button
            onClick={() => setActiveTab('cadastros')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'cadastros' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'cadastros' ? '#3b82f6' : '#64748b',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Database size={18} />
            Cadastros
          </button>
          <button
            onClick={() => setActiveTab('notaFiscal')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'notaFiscal' ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === 'notaFiscal' ? '#3b82f6' : '#64748b',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Receipt size={18} />
            Nota Fiscal
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="tab-content" style={{ padding: '1rem 0' }}>
          {activeTab === 'cadastros' && (
            <div>
              <h3 style={{ color: '#475569', marginBottom: '1rem' }}>Sincronização de Cadastros (GestãoClick)</h3>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                Utilize esta aba para importar/exportar os dados básicos a partir do ERP GestãoClick.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '100%' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
                  {/* Esquerda: Tabela, Recurso */}
                  <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="form-group" style={{ flex: '0 0 200px' }}>
                        <label style={{ fontWeight: '600', color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Tabela a Sincronizar</label>
                        <select
                          className="form-input"
                          value={tabelaCadastro}
                          onChange={handleTabelaChange}
                          style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: '0.5rem' }}
                        >
                          <option value="clientes">Clientes</option>
                          <option value="produtos">Produtos</option>
                          <option value="servicos">Serviços</option>
                          <option value="estados">Estados</option>
                          <option value="cidades">Cidades</option>
                          <option value="funcionarios">Funcionários</option>
                          <option value="formas_pagamentos">Formas de Pagamento</option>
                          <option value="ordens_servicos">Ordens de Serviço</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-start' }}>
                      <div className="form-group" style={{ flex: '0 0 150px' }}>
                        <label style={{ fontWeight: '600', color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Método</label>
                        <select
                          className="form-input"
                          value={method}
                          onChange={(e) => setMethod(e.target.value)}
                          style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: '0.5rem' }}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: '0 0 250px' }}>
                        <label style={{ fontWeight: '600', color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Recurso</label>
                        <input
                          type="text"
                          className="form-input"
                          value={recurso}
                          onChange={(e) => setRecurso(e.target.value)}
                          placeholder="Ex: clientes"
                          style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: '0.5rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Direita: Parâmetro */}
                  <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontWeight: '600', color: '#475569', marginBottom: '0.5rem', display: 'block' }}>Parâmetro (GET query params ou POST body)</label>
                    <textarea
                      className="form-input"
                      value={parametro}
                      onChange={(e) => setParametro(e.target.value)}
                      placeholder="Informe o Parâmetro em JSON (opcional)"
                      style={{ flex: 1, width: '100%', padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', marginBottom: '0.5rem', resize: 'vertical' }}
                    />
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={handleSincronizarCadastros}
                  disabled={loading}
                  style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', borderRadius: '8px', opacity: loading ? 0.7 : 1 }}
                >
                  <Server size={20} />
                  {loading ? 'Sincronizando...' : 'Sincronizar Cadastros'}
                </button>

                {apiError && requestPayload && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', overflowX: 'auto', maxHeight: '200px', overflowY: 'auto' }}>
                    <h4 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>Detalhes do Erro (Payload):</h4>
                    <pre style={{ fontSize: '0.875rem', color: '#7f1d1d', whiteSpace: 'pre-wrap' }}>
                      {requestPayload}
                    </pre>
                  </div>
                )}

                {apiResult && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: apiError ? '#fef2f2' : '#f8fafc', border: `1px solid ${apiError ? '#fca5a5' : '#cbd5e1'}`, borderRadius: '8px', overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                    <h4 style={{ color: apiError ? '#991b1b' : '#475569', marginBottom: '0.5rem' }}>Retorno da API:</h4>
                    <pre style={{ fontSize: '0.875rem', color: apiError ? '#7f1d1d' : '#334155', whiteSpace: 'pre-wrap' }}>
                      {apiResult}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notaFiscal' && (
            <div>
              <h3 style={{ color: '#475569', marginBottom: '1rem' }}>Sincronização de Notas Fiscais</h3>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                Utilize esta aba para enviar as Notas Fiscais e faturamentos para o ERP ou receber atualizações de status.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                <button className="btn-primary" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', borderRadius: '8px', background: '#10b981', border: 'none' }}>
                  <Server size={20} />
                  Sincronizar Notas Fiscais
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
