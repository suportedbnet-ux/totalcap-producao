import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import OrdemServico from './pages/OrdemServico';
import ColetaPneus from './pages/ColetaPneus';
import ReloadPrompt from './components/ReloadPrompt';
import Areas from './pages/Areas';
import Regioes from './pages/Regioes';
import Atividades from './pages/Atividades';
import Vendedores from './pages/Vendedores';
import Transportadora from './pages/Transportadora';
import Cidades from './pages/Cidades';
import Estados from './pages/Estados';
import Medidas from './pages/Medidas';
import Desenhos from './pages/Desenhos';
import Marcas from './pages/Marcas';
import Empresas from './pages/Empresas';
import TipoRecapagem from './pages/TipoRecapagem';
import PCP from './pages/PCP';
import Servicos from './pages/Servicos';
import Produtos from './pages/Produtos';
import Setores from './pages/Setores';
import Operadores from './pages/Operadores';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import Veiculos from './pages/Veiculos';
import Faturamento from './pages/Faturamento';
import TabelaPreco from './pages/TabelaPreco';
import Contratos from './pages/Contratos';
import PlanosPagamento from './pages/PlanosPagamento';
import FaturaEntrada from './pages/FaturaEntrada';
import FaturaRetorno from './pages/FaturaRetorno';
import InformeServicos from './pages/InformeServicos';
import Orcamento from './pages/Orcamento';
import LactoDespesas from './pages/LactoDespesas';
import { AuthProvider, useAuth } from './context/AuthContext';

import { ThemeProvider } from './context/ThemeContext';
import Configuracoes from './pages/Configuracoes';
import Integracao from './pages/Integracao';
import SincronizaERP from './pages/SincronizaERP';
import Localizacao from './pages/Localizacao';
import Apontamento from './pages/Apontamento';
import RegistroFalhas from './pages/RegistroFalhas';
import Falhas from './pages/Falhas';
import ConsumoMateriaPrima from './pages/ConsumoMateriaPrima';
import GruposProduto from './pages/GruposProduto';
import Bancos from './pages/Bancos';
import TiposDocto from './pages/TiposDocto';
import RelVendasServico from './pages/Relatorios/RelVendasServico';
import RelComissoes from './pages/Relatorios/RelComissoes';
import RelProdutividade from './pages/Relatorios/RelProdutividade';
import RelFalhas from './pages/Relatorios/RelFalhas';
import RelConsumoMateria from './pages/Relatorios/RelConsumoMateria';
import RelLaudos from './pages/Relatorios/RelLaudos';
import RelOrdemServico from './pages/Relatorios/RelOrdemServico';
import RelColetaPneus from './pages/Relatorios/RelColetaPneus';
import RelMetas from './pages/Relatorios/RelMetas';
import Laudos from './pages/Laudos';
import GeradorCodigoBarra from './pages/GeradorCodigoBarra';
import FichaTecnica from './pages/FichaTecnica';
import TabOrigDef from './pages/TabOrigDef';
import TabRecusa from './pages/TabRecusa';
import Comissoes from './pages/Comissoes';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Carregando...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  useEffect(() => {
    const handleGlobalEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const tagName = target.tagName;
        
        if (tagName === 'TEXTAREA' || (target instanceof HTMLButtonElement && target.type === 'submit')) {
          return;
        }

        if (tagName === 'INPUT' || tagName === 'SELECT') {
          e.preventDefault();
          const form = target.closest('form') || document;
          const focusableElements = Array.from(form.querySelectorAll(
            'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
          )) as HTMLElement[];
          
          const index = focusableElements.indexOf(target);
          if (index > -1 && index < focusableElements.length - 1) {
            focusableElements[index + 1].focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalEnter);
    return () => window.removeEventListener('keydown', handleGlobalEnter);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>

        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ReloadPrompt />
          <Routes>
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />

            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/os" element={<OrdemServico />} />
              <Route path="/coleta" element={<ColetaPneus />} />
              <Route path="/faturamento" element={<Faturamento />} />
              <Route path="/informe-servicos" element={<InformeServicos />} />
              <Route path="/fatura-retorno" element={<FaturaRetorno />} />
              <Route path="/fatura-entrada" element={<FaturaEntrada />} />
              <Route path="/tabela-preco" element={<TabelaPreco />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/planos-pagamento" element={<PlanosPagamento />} />
              <Route path="/orcamento" element={<Orcamento />} />
              <Route path="/localizacao" element={<Localizacao />} />
              <Route path="/apontamento" element={<Apontamento />} />
              <Route path="/falhas" element={<RegistroFalhas />} />
              <Route path="/fichatecnica" element={<FichaTecnica />} />
              <Route path="/cad-falhas" element={<Falhas />} />
              <Route path="/consumo-materia" element={<ConsumoMateriaPrima />} />
              <Route path="/rel-vendas-servico" element={<RelVendasServico />} />
              <Route path="/rel-comissoes" element={<RelComissoes />} />
              <Route path="/rel-produtividade" element={<RelProdutividade />} />
              <Route path="/rel-falhas" element={<RelFalhas />} />
              <Route path="/rel-consumo-materia" element={<RelConsumoMateria />} />
              <Route path="/rel-laudos" element={<RelLaudos />} />
              <Route path="/rel-ordem-servico" element={<RelOrdemServico />} />
              <Route path="/rel-coleta-pneus" element={<RelColetaPneus />} />
              <Route path="/rel-metas" element={<RelMetas />} />
              <Route path="/rel-vendas-servico" element={<RelVendasServico />} />
              <Route path="/laudos" element={<Laudos />} />
              <Route path="/gerador-etiquetas" element={<GeradorCodigoBarra />} />
              <Route path="/lacto-despesas" element={<LactoDespesas />} />
              <Route path="/areas" element={<Areas />} />
              <Route path="regioes" element={<Regioes />} />
              <Route path="atividades" element={<Atividades />} />
              <Route path="vendedores" element={<Vendedores />} />
              <Route path="transportadoras" element={<Transportadora />} />
              <Route path="cidades" element={<Cidades />} />
              <Route path="estados" element={<Estados />} />
              <Route path="veiculos" element={<Veiculos />} />
              <Route path="medidas" element={<Medidas />} />
              <Route path="/desenhos" element={<Desenhos />} />
              <Route path="/marcas" element={<Marcas />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="tipo-recapagem" element={<TipoRecapagem />} />
              <Route path="servicos" element={<Servicos />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="setores" element={<Setores />} />
              <Route path="operadores" element={<Operadores />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="integracao" element={<Integracao />} />
              <Route path="sincroniza-erp" element={<SincronizaERP />} />
              <Route path="/grupos-produto" element={<GruposProduto />} />
              <Route path="/bancos" element={<Bancos />} />
              <Route path="/tipos-docto" element={<TiposDocto />} />
              <Route path="/pcp" element={<PCP />} />
              <Route path="/comissoes" element={<Comissoes />} />
              <Route path="/origens-defeito" element={<TabOrigDef />} />
              <Route path="/motivos-recusa" element={<TabRecusa />} />
              <Route path="/rel-vendas-servico" element={<RelVendasServico />} />
              <Route path="/rel-comissoes" element={<RelComissoes />} />
            </Route>
            <Route path="/os-public" element={<OrdemServico />} />
            <Route path="/fat-public" element={<Faturamento />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
