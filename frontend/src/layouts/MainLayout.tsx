import { useState, useEffect } from 'react';
import { useLocation, Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  BarChart2,
  LogOut,
  MapPin,
  Monitor,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Plug2,
  CreditCard,
  Factory,
  Clock,
  AlertTriangle,
  Layers,
  Calculator,
  DollarSign,
  Receipt,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AIChat from '../components/AIAgent/AIChat';
import './MainLayout.css';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ClipboardList, label: 'Coleta de Pneus', path: '/coleta' },
  { icon: FileText, label: 'Ordem de Serviço', path: '/os' },
  {
    icon: CreditCard,
    label: 'Faturamento',
    path: '#',
    subItems: [
      { label: 'Informe de Serviços', path: '/informe-servicos' },
      { label: 'Fatura de Serviço', path: '/faturamento' },
      { label: 'Fatura NF Retorno', path: '/fatura-retorno' },
      { label: 'Fatura NF Entrada', path: '/fatura-entrada' },
      { label: 'Orçamento', path: '/orcamento' },
      { label: 'Tabela de Preço', path: '/tabela-preco' },
      { label: 'Contratos', path: '/contratos' },
    ]
  },
  {
    icon: Factory,
    label: 'Chão de Fábrica',
    path: '#',
    subItems: [
      { label: 'Localização', path: '/localizacao' },
      { label: 'Apontamento', path: '/apontamento' },
      { label: 'Registro de Falhas', path: '/falhas' },
      { label: 'Consumo de Mat.Prima', path: '/consumo-materia' },
      { label: 'Laudos', path: '/laudos' },
      { label: 'Gerador Código de Barra', path: '/gerador-etiquetas' },
      { label: 'PCP - Programação', path: '/pcp' },
    ]
  },
  { icon: Receipt, label: 'Despesas C/ Vendas', path: '/lacto-despesas' },
  {
    icon: BarChart2,
    label: 'Relatórios',
    path: '#',
    subItems: [
      {
        label: 'Faturamento',
        path: '#',
        isGroup: true,
        subItems: [
          { label: 'Rel. Vendas', path: '/rel-vendas-servico' },
          { label: 'Rel. Comissões', path: '/rel-comissoes' },
          { label: 'Rel. Metas', path: '/rel-metas' },
        ]
      },
      {
        label: 'Produção',
        path: '#',
        isGroup: true,
        subItems: [
          { label: 'Rel. Produtividade', path: '/rel-produtividade' },
          { label: 'Rel. Falhas', path: '/rel-falhas' },
          { label: 'Rel. Consumo Mat.Prima', path: '/rel-consumo-materia' },
          { label: 'Rel. Laudos', path: '/rel-laudos' },
          { label: 'Rel. Ordens de Serviço', path: '/rel-ordem-servico' },
        ]
      }
    ]
  },
  {
    icon: Users,
    label: 'Cadastros',
    path: '#',
    subItems: [
      { label: 'Clientes', path: '/clientes' },
      {
        label: 'Auxiliares',
        path: '#',
        isGroup: true,
        subItems: [
          { label: 'Áreas', path: '/areas' },
          { label: 'Regiões', path: '/regioes' },
          { label: 'Atividades', path: '/atividades' },
          { label: 'Vendedores', path: '/vendedores' },
          { label: 'Transportadoras', path: '/transportadoras' },
          { label: 'Cidades', path: '/cidades' },
          { label: 'Estados', path: '/estados' },
          { label: 'Veículos', path: '/veiculos' },
          { label: 'Bancos', path: '/bancos' },
          { label: 'Formas de Pagamento', path: '/planos-pagamento' },
          { label: 'Tipo de Docto', path: '/tipos-docto' },
          { label: 'Tipos de Falha', path: '/cad-falhas' },
          { label: 'Regras Comissão', path: '/comissoes' },
          { label: 'Origens Defeito', path: '/origens-defeito' },
          { label: 'Motivos Recusa', path: '/motivos-recusa' },

        ]
      },
      {
        label: 'Produção',
        path: '#',
        isGroup: true,
        subItems: [
          { label: 'Medidas', path: '/medidas' },
          { label: 'Desenhos', path: '/desenhos' },
          { label: 'Marcas', path: '/marcas' },
          { label: 'Tipo Recapagem', path: '/tipo-recapagem' },
          { label: 'Produto', path: '/produtos' },
          { label: 'Grupos Produto', path: '/grupos-produto' },
          { label: 'Pisos', path: '/pisos' },
          { label: 'Serviços', path: '/servicos' },
          { label: 'Receita Padrão', path: '/receita-padrao' },
          { label: 'Ficha Técnica', path: '/fichatecnica' },
          { label: 'Setores', path: '/setores' },
          { label: 'Operadores', path: '/operadores' },
          { label: 'Falhas', path: '/cad-falhas' },
        ]
      },
      {
        label: 'Sistema',
        path: '#',
        isGroup: true,
        subItems: [
          { label: 'Empresa', path: '/empresas' },
          { label: 'Usuarios ERP', path: '/usuarios' },
          { label: 'Usuarios IA', path: '/usuarios-ia' },
        ]
      },
    ]
  },
  { icon: Plug2, label: 'Integração', path: '/integracao' },
  { icon: Settings, label: 'Configuração', path: '/configuracoes' },
];

export default function MainLayout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [openSubMenus, setOpenSubMenus] = useState<string[]>(['Cadastros']);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Fecha o menu mobile quando muda de rota
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const toggleSubMenu = (label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isCollapsed) setIsCollapsed(false);
    setOpenSubMenus(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  return (
    <div className={`layout-container ${isCollapsed ? 'is-collapsed' : ''}`}>
      {isMobileOpen && <div className="mobile-overlay" onClick={() => setIsMobileOpen(false)}></div>}

      <aside className={`sidebar glass-panel ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="logo-icon"></div>
          {!isCollapsed && <h2>Total<span className="brand-highlight">CAP</span></h2>}
          {isMobileOpen && (
            <button className="icon-btn" onClick={() => setIsMobileOpen(false)} style={{ marginLeft: 'auto' }}>
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isOpen = openSubMenus.includes(item.label);

            if (hasSubItems) {
              return (
                <div key={item.label} className="menu-group">
                  <div
                    className={`nav-item ${isOpen ? 'group-open' : ''}`}
                    onClick={() => toggleSubMenu(item.label)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                    <div className="chevron-toggle">
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="sub-menu">
                      {item.subItems?.map((sub) => {
                        if (sub.isGroup) {
                          const isGroupOpen = openSubMenus.includes(sub.label);
                          return (
                            <div key={sub.label} className="menu-group nested">
                              <div
                                className={`sub-nav-item group-header ${isGroupOpen ? 'open' : ''}`}
                                onClick={(e) => toggleSubMenu(sub.label, e)}
                              >
                                <span>{sub.label}</span>
                                <div className="chevron-toggle">
                                  {isGroupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                              </div>
                              {isGroupOpen && (
                                <div className="nested-sub-menu">
                                  {sub.subItems?.map((deepSub: any) => {
                                    if (deepSub.label === 'Usuarios ERP' && user?.email !== 'admin@totalcap.com') {
                                      return null;
                                    }
                                    return (
                                      <NavLink
                                        key={deepSub.path}
                                        to={deepSub.path}
                                        className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                                      >
                                        <span>{deepSub.label}</span>
                                      </NavLink>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }
                        if (sub.label === 'Usuários' && user?.email !== 'admin@totalcap.com') {
                          return null;
                        }
                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                          >
                            <span>{sub.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar glass-panel">
          <div className="topbar-left">
            {/* Desktop Toggle */}
            <button className="icon-btn collapse-toggle hide-mobile" onClick={() => setIsCollapsed(!isCollapsed)}>
              <Menu size={20} />
            </button>
            {/* Mobile Toggle (Hamburger) */}
            <button className="icon-btn show-mobile" onClick={() => setIsMobileOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="topbar-search">
              {/* Espaço para busca ou breadcrumbs */}
            </div>
          </div>
          <div className="topbar-actions">
            <button 
              className="help-btn-highlight" 
              title="Central de Ajuda" 
              onClick={() => window.open('https://suportedbnet-ux.github.io/totalcap-docs', '_blank')}
            >
              <HelpCircle size={18} />
              <span>Ajuda</span>
            </button>
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span>Admin</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
      <AIChat />
    </div>
  );
}
