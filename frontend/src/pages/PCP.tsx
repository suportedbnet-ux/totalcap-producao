import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Save, Eye, Calendar, User, FileText, ClipboardList, Printer } from 'lucide-react';
import api, { getErrorMessage } from '../lib/api';
import './Coletas.css'; // Reutiliza os estilos premium dos modais e tabelas glassmorphism

export default function PCP() {
  const [pcpList, setPcpList] = useState<any[]>([]);
  const [pneusDisponiveis, setPneusDisponiveis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPneus, setLoadingPneus] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Seleção de PCP na Grid para visualização rápida no painel inferior
  const [selectedPcpId, setSelectedPcpId] = useState<number | null>(null);

  // Modal principal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Form Mestre
  const [formData, setFormData] = useState({
    datapcp: '',
    obs: '',
    userlan: 'admin'
  });

  // Detalhe Pneus Agendados no Form/Modal
  const [scheduledPneus, setScheduledPneus] = useState<any[]>([]);

  // Seleção de novos pneus
  const [searchPneuQuery, setSearchPneuQuery] = useState('');

  useEffect(() => {
    fetchPCPs();
    fetchPneusDisponiveis();
  }, []);

  const fetchPCPs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pcp/');
      const data = res.data || [];
      setPcpList(data);
      if (data.length > 0 && !selectedPcpId) {
        setSelectedPcpId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar programações PCP:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPneusDisponiveis = async () => {
    setLoadingPneus(true);
    try {
      const res = await api.get('/pneus/');
      const data = res.data || [];
      // Filtra pneus que não estão faturados
      const filtered = data.filter((p: any) => !p.statusfat);
      setPneusDisponiveis(filtered);
    } catch (err) {
      console.error('Erro ao carregar pneus ativos:', err);
    } finally {
      setLoadingPneus(false);
    }
  };

  const filteredPCPList = pcpList.filter(p => {
    const term = search.toLowerCase();
    const idMatch = String(p.id).includes(term);
    const obsMatch = p.obs?.toLowerCase().includes(term);
    const userMatch = p.userlan?.toLowerCase().includes(term);
    const textMatch = !search || idMatch || obsMatch || userMatch;

    let dateMatch = true;
    if (startDate) {
      dateMatch = dateMatch && p.datapcp && p.datapcp >= startDate;
    }
    if (endDate) {
      dateMatch = dateMatch && p.datapcp && p.datapcp <= endDate + 'T23:59:59';
    }

    return textMatch && dateMatch;
  });

  // Filtra os pneus disponíveis para exibir no select do modal
  // Remove pneus que já foram agendados no modal atual
  const availablePneusToSelect = pneusDisponiveis.filter(p => {
    const isAlreadyScheduled = scheduledPneus.some(sp => sp.id_pneu === p.id);
    if (isAlreadyScheduled) return false;

    if (!searchPneuQuery) return true;
    const query = searchPneuQuery.toLowerCase().trim();
    const idMatch = String(p.id) === query;
    const barcodeMatch = p.codbarra?.toLowerCase().includes(query);

    return idMatch || barcodeMatch;
  });

  const openModal = (mode: 'create' | 'edit' | 'view', pcp?: any) => {
    setModalMode(mode);
    setSearchPneuQuery('');

    if (pcp) {
      setCurrentId(pcp.id);
      setFormData({
        datapcp: pcp.datapcp ? pcp.datapcp.split('T')[0] : '',
        obs: pcp.obs || '',
        userlan: pcp.userlan?.trim() || 'admin'
      });
      // Mapeia pneus agendados
      setScheduledPneus((pcp.pneus || []).map((p: any) => ({
        id: p.id,
        id_pneu: p.id_pneu,
        datapcp: p.datapcp,
        userlan: p.userlan,
        pneu: p.pneu || {}
      })));
    } else {
      setCurrentId(null);
      setFormData({
        datapcp: new Date().toISOString().split('T')[0],
        obs: '',
        userlan: 'admin'
      });
      setScheduledPneus([]);
    }
    setModalOpen(true);
  };

  const handleMestreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleAddPneuToSchedule = () => {
    if (!searchPneuQuery) return;

    const query = searchPneuQuery.toLowerCase().trim();
    // 1. Tenta encontrar correspondência exata por ID ou Código de Barras
    let matched = pneusDisponiveis.find(p => {
      const isAlreadyScheduled = scheduledPneus.some(sp => sp.id_pneu === p.id);
      if (isAlreadyScheduled) return false;
      return String(p.id) === query || p.codbarra?.toLowerCase() === query;
    });

    // 2. Se não houver correspondência exata mas a lista filtrada tiver exatamente 1 item, usa ele
    if (!matched && availablePneusToSelect.length === 1) {
      matched = availablePneusToSelect[0];
    }

    if (matched) {
      const newItem = {
        id_pneu: matched.id,
        datapcp: formData.datapcp ? `${formData.datapcp}T12:00:00` : null,
        userlan: formData.userlan,
        pneu: matched
      };

      setScheduledPneus(prev => [...prev, newItem]);
      setSearchPneuQuery('');
    } else {
      alert('Nenhum pneu disponível correspondente ao ID ou Código de Barras digitado.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPneuToSchedule();
    }
  };

  const handleRemovePneuFromSchedule = (index: number) => {
    setScheduledPneus(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (scheduledPneus.length === 0) {
      alert('Selecione pelo menos 1 pneu para criar a programação.');
      return;
    }

    const payload = {
      datapcp: formData.datapcp ? `${formData.datapcp}T12:00:00` : null,
      obs: formData.obs,
      userlan: formData.userlan,
      pneus: scheduledPneus.map(sp => ({
        id_pneu: sp.id_pneu,
        datapcp: sp.datapcp ? sp.datapcp : (formData.datapcp ? `${formData.datapcp}T12:00:00` : null),
        userlan: sp.userlan || formData.userlan
      }))
    };

    try {
      if (modalMode === 'create') {
        await api.post('/pcp/', payload);
      } else if (modalMode === 'edit' && currentId !== null) {
        await api.put(`/pcp/${currentId}`, payload);
      }
      await fetchPCPs();
      await fetchPneusDisponiveis();
      setModalOpen(false);
    } catch (err) {
      alert(getErrorMessage(err, 'Erro ao salvar programação PCP'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Excluir programação PCP número "${id}"?`)) return;
    try {
      await api.delete(`/pcp/${id}`);
      if (selectedPcpId === id) {
        setSelectedPcpId(null);
      }
      await fetchPCPs();
      await fetchPneusDisponiveis();
    } catch (err) {
      alert('Erro ao excluir programação PCP');
    }
  };

  const handlePrintPCP = (id?: number) => {
    const printId = id ?? selectedPcpId;
    if (!printId) return;
    const pcp = pcpList.find(p => p.id === printId);
    if (!pcp) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir.');
      return;
    }

    const formatarData = (dateStr: string) => {
      if (!dateStr) return '-';
      try {
        const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = cleanStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch {
        return dateStr;
      }
    };

    const pneusHtml = (pcp.pneus || []).map((sp: any, idx: number) => `
      <tr>
        <td style="text-align: center; font-weight: bold; border: 1px solid #000; padding: 6px;">${idx + 1}º</td>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${sp.pneu?.numserie || sp.pneu?.numfogo || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${sp.pneu?.codbarra || '-'}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">OS #${sp.pneu?.numos || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${sp.pneu?.nome_cliente || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${sp.pneu?.produto_desc || 'Sem Descrição'}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">
          ${sp.pneu?.statusfat ? 'Faturado' : 'Em Produção'}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>PCP Programacao #${pcp.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #000;
              margin: 20px;
              padding: 0;
            }
            .header {
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              text-transform: uppercase;
            }
            .header .meta {
              text-align: right;
              font-size: 14px;
            }
            .details {
              margin-bottom: 20px;
              font-size: 14px;
            }
            .details table {
              width: 100%;
              border-collapse: collapse;
            }
            .details td {
              padding: 5px;
              vertical-align: top;
            }
            .pneus-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              font-size: 12px;
            }
            .pneus-table th {
              background-color: #f2f2f2;
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 14px;
            }
            .signature {
              width: 250px;
              border-top: 1px solid #000;
              text-align: center;
              padding-top: 5px;
            }
            @media print {
              body { margin: 10px; }
              @page { size: portrait; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Ficha de Programação de Produção - PCP</h1>
              <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 16px;">Número do PCP: #${pcp.id}</p>
            </div>
            <div class="meta">
              <p style="margin: 0;">Data de Programação: <strong>${formatarData(pcp.datapcp)}</strong></p>
              <p style="margin: 5px 0 0 0;">Responsável: <strong>${pcp.userlan?.trim() || 'admin'}</strong></p>
            </div>
          </div>

          <div class="details">
            <table>
              <tr>
                <td style="width: 15%; font-weight: bold;">Observações:</td>
                <td>${pcp.obs || 'Nenhuma observação informada.'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Qtd. Total:</td>
                <td style="font-weight: bold; font-size: 15px;">${pcp.quant} pneus</td>
              </tr>
            </table>
          </div>

          <h2 style="font-size: 14px; margin-bottom: 5px; text-transform: uppercase;">Lista de Pneus Agendados</h2>
          <table class="pneus-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center; border: 1px solid #000;">Seq.</th>
                <th style="width: 120px; border: 1px solid #000;">Nº Série</th>
                <th style="width: 120px; border: 1px solid #000;">Cód. Barras</th>
                <th style="width: 80px; text-align: center; border: 1px solid #000;">OS</th>
                <th style="border: 1px solid #000;">Cliente</th>
                <th style="border: 1px solid #000;">Descrição Pneu</th>
                <th style="width: 100px; text-align: center; border: 1px solid #000;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${pneusHtml}
            </tbody>
          </table>

          <div class="footer">
            <div>
              <p>Data de Produção: ____/____/_______</p>
            </div>
            <div class="signature">
              Assinatura do Operador / PCP
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintFilteredPneus = () => {
    if (allFilteredPneus.length === 0) {
      alert('Nenhum pneu para imprimir. Aplique um filtro para selecionar as programações.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir.');
      return;
    }

    const formatarData = (dateStr: string) => {
      if (!dateStr) return '-';
      try {
        const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = cleanStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch {
        return dateStr;
      }
    };

    const pneusHtml = allFilteredPneus.map((sp: any, idx: number) => `
      <tr>
        <td style="text-align: center; font-weight: bold; border: 1px solid #000; padding: 6px;">${idx + 1}º</td>
        <td style="text-align: center; font-weight: bold; border: 1px solid #000; padding: 6px;">#${sp.pcp_id}</td>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${sp.pneu?.numserie || sp.pneu?.numfogo || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${sp.pneu?.codbarra || '-'}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">OS #${sp.pneu?.numos || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${sp.pneu?.nome_cliente || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${sp.pneu?.produto_desc || 'Sem Descrição'}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">
          ${sp.pneu?.statusfat ? 'Faturado' : 'Em Produção'}
        </td>
      </tr>
    `).join('');

    const filtroResumo = [];
    if (startDate) filtroResumo.push(`Data inicial: ${formatarData(startDate)}`);
    if (endDate) filtroResumo.push(`Data final: ${formatarData(endDate)}`);
    const filtroTexto = filtroResumo.length > 0 ? `Filtro: ${filtroResumo.join(' | ')}` : 'Sem filtro de data';

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatorio Programacoes PCP</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #000;
              margin: 20px;
              padding: 0;
            }
            .header {
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              text-transform: uppercase;
            }
            .header .meta {
              text-align: right;
              font-size: 14px;
            }
            .pneus-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              font-size: 12px;
            }
            .pneus-table th {
              background-color: #f2f2f2;
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 14px;
            }
            .signature {
              width: 250px;
              border-top: 1px solid #000;
              text-align: center;
              padding-top: 5px;
            }
            @media print {
              body { margin: 10px; }
              @page { size: landscape; margin: 0.8cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Relatório de Programações PCP</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">${filtroTexto}</p>
            </div>
            <div class="meta">
              <p style="margin: 0;">Total: <strong>${allFilteredPneus.length} pneus</strong></p>
              <p style="margin: 5px 0 0 0;">Emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <h2 style="font-size: 14px; margin-bottom: 5px; text-transform: uppercase;">Lista de Pneus</h2>
          <table class="pneus-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center; border: 1px solid #000;">Seq.</th>
                <th style="width: 60px; text-align: center; border: 1px solid #000;">PCP</th>
                <th style="width: 120px; border: 1px solid #000;">Nº Série</th>
                <th style="width: 120px; border: 1px solid #000;">Cód. Barras</th>
                <th style="width: 70px; text-align: center; border: 1px solid #000;">OS</th>
                <th style="border: 1px solid #000;">Cliente</th>
                <th style="border: 1px solid #000;">Descrição Pneu</th>
                <th style="width: 90px; text-align: center; border: 1px solid #000;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${pneusHtml}
            </tbody>
          </table>

          <div class="footer">
            <div>
              <p>Data de Produção: ____/____/_______</p>
            </div>
            <div class="signature">
              Assinatura do Operador / PCP
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintModalPneus = () => {
    if (scheduledPneus.length === 0) {
      alert('Nenhum pneu no lote atual para imprimir.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir.');
      return;
    }

    const formatarData = (dateStr: string) => {
      if (!dateStr) return '-';
      try {
        const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = cleanStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch {
        return dateStr;
      }
    };

    const pneusHtml = scheduledPneus.map((sp: any, idx: number) => `
      <tr>
        <td style="text-align: center; font-weight: bold; border: 1px solid #000; padding: 6px;">${idx + 1}º</td>
        <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${sp.pneu?.numserie || sp.pneu?.numfogo || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${sp.pneu?.codbarra || '-'}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">OS #${sp.pneu?.numos || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${sp.pneu?.nome_cliente || '-'}</td>
        <td style="border: 1px solid #000; padding: 6px;">${sp.pneu?.produto_desc || 'Sem Descrição'}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 6px;">
          ${sp.pneu?.statusfat ? 'Faturado' : 'Em Produção'}
        </td>
      </tr>
    `).join('');

    const titulo = currentId ? `PCP #${currentId}` : 'Nova Programação';

    printWindow.document.write(`
      <html>
        <head>
          <title>PCP ${titulo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #000;
              margin: 20px;
              padding: 0;
            }
            .header {
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              text-transform: uppercase;
            }
            .header .meta {
              text-align: right;
              font-size: 14px;
            }
            .details {
              margin-bottom: 20px;
              font-size: 14px;
            }
            .details table {
              width: 100%;
              border-collapse: collapse;
            }
            .details td {
              padding: 5px;
              vertical-align: top;
            }
            .pneus-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              font-size: 12px;
            }
            .pneus-table th {
              background-color: #f2f2f2;
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            .footer {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 14px;
            }
            .signature {
              width: 250px;
              border-top: 1px solid #000;
              text-align: center;
              padding-top: 5px;
            }
            @media print {
              body { margin: 10px; }
              @page { size: portrait; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Ficha de Programação de Produção - PCP</h1>
              <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 16px;">${titulo}</p>
            </div>
            <div class="meta">
              <p style="margin: 0;">Data de Programação: <strong>${formatarData(formData.datapcp)}</strong></p>
              <p style="margin: 5px 0 0 0;">Responsável: <strong>${formData.userlan || 'admin'}</strong></p>
            </div>
          </div>

          <div class="details">
            <table>
              <tr>
                <td style="width: 15%; font-weight: bold;">Observações:</td>
                <td>${formData.obs || 'Nenhuma observação informada.'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Qtd. Total:</td>
                <td style="font-weight: bold; font-size: 15px;">${scheduledPneus.length} pneus</td>
              </tr>
            </table>
          </div>

          <h2 style="font-size: 14px; margin-bottom: 5px; text-transform: uppercase;">Lista de Pneus Agendados</h2>
          <table class="pneus-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center; border: 1px solid #000;">Seq.</th>
                <th style="width: 120px; border: 1px solid #000;">Nº Série</th>
                <th style="width: 120px; border: 1px solid #000;">Cód. Barras</th>
                <th style="width: 80px; text-align: center; border: 1px solid #000;">OS</th>
                <th style="border: 1px solid #000;">Cliente</th>
                <th style="border: 1px solid #000;">Descrição Pneu</th>
                <th style="width: 100px; text-align: center; border: 1px solid #000;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${pneusHtml}
            </tbody>
          </table>

          <div class="footer">
            <div>
              <p>Data de Produção: ____/____/_______</p>
            </div>
            <div class="signature">
              Assinatura do Operador / PCP
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  // Encontra o PCP selecionado na Grid para o Painel Inferior
  const selectedPcp = pcpList.find(p => p.id === selectedPcpId);

  // Achata todos os pneus das programações filtradas para exibição no painel inferior
  const allFilteredPneus = filteredPCPList.flatMap(pcp =>
    (pcp.pneus || []).map((p: any) => ({
      ...p,
      pcp_id: pcp.id,
      pcp_datapcp: pcp.datapcp
    }))
  );

  return (
    <div className="coleta-container">
      {/* Cabeçalho */}
      <div className="page-header">
        <div className="header-title-container">
          <div className="header-title">
            <ClipboardList size={28} style={{ color: 'var(--primary)' }} />
            <h1>PCP - Programação de Produção</h1>
          </div>
          <p className="page-subtitle">Agende e organize a ordem de serviço dos pneus no chão de fábrica</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handlePrintFilteredPneus}
            disabled={allFilteredPneus.length === 0}
            style={{
              height: '42px',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: allFilteredPneus.length > 0 ? 1 : 0.6,
              cursor: allFilteredPneus.length > 0 ? 'pointer' : 'not-allowed',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
            title="Imprimir todos os pneus das programações filtradas"
          >
            <Printer size={20} /> Imprimir PCP
          </button>
          <button className="btn-primary-coleta" onClick={() => openModal('create')} style={{ height: '42px', margin: 0 }}>
            <Plus size={20} /> Nova Programação
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div className="search-box" style={{ maxWidth: 400, flex: 1 }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por ID, observação ou operador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="date-filters">
            <div className="date-input-group">
              <Calendar size={16} className="date-icon" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                title="Data inicial"
              />
            </div>
            <span className="date-separator">até</span>
            <div className="date-input-group">
              <Calendar size={16} className="date-icon" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                title="Data final"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Master / Tabela de Programações */}
      <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 60, textAlign: 'center' }}>Sel.</th>
              <th style={{ textAlign: 'left', width: 80 }}>ID</th>
              <th style={{ textAlign: 'center', width: 140 }}>Data Prog.</th>
              <th style={{ textAlign: 'center', width: 120 }}>Qtd Pneus</th>
              <th style={{ textAlign: 'left' }}>Observação</th>
              <th style={{ textAlign: 'left', width: 120 }}>Operador</th>
              <th style={{ textAlign: 'center', width: 120 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Carregando...</td></tr>
            ) : filteredPCPList.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma programação cadastrada.</td></tr>
            ) : filteredPCPList.map(pcp => (
              <tr
                key={pcp.id}
                onClick={() => setSelectedPcpId(pcp.id)}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedPcpId === pcp.id ? '#eff6ff' : 'transparent',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <input
                    type="radio"
                    name="selectedPcp"
                    checked={selectedPcpId === pcp.id}
                    onChange={() => setSelectedPcpId(pcp.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </td>
                <td style={{ fontWeight: 700 }}>#{pcp.id}</td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{formatarDataBr(pcp.datapcp)}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{pcp.quant} pneus</td>
                <td style={{ fontWeight: 500 }} className="text-truncate">{pcp.obs || '-'}</td>
                <td style={{ fontWeight: 500 }}>{pcp.userlan || 'admin'}</td>
                <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                    <button className="icon-btn edit" onClick={() => openModal('view', pcp)} title="Visualizar"><Eye size={16} /></button>
                    <button className="icon-btn edit" onClick={() => openModal('edit', pcp)} title="Editar"><Edit2 size={16} /></button>
                    <button className="icon-btn delete" onClick={() => handleDelete(pcp.id)} title="Excluir"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Painel Inferior de Detalhes - Pneus das Programações Filtradas */}
      {allFilteredPneus.length > 0 && (
        <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
          <div className="section-divider" style={{ margin: '0 0 1rem 0' }}>
            <span className="divider-label" style={{ fontSize: '1rem', color: 'var(--primary)' }}>
              <ClipboardList size={18} /> Pneus nas Programações Filtradas ({allFilteredPneus.length} pneus)
            </span>
          </div>

          <div className="table-responsive" style={{ maxHeight: '250px' }}>
            <table className="data-table" style={{ width: '100%', marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 60, textAlign: 'center' }}>Seq.</th>
                  <th style={{ width: 80, textAlign: 'center' }}>PCP</th>
                  <th style={{ width: 100, textAlign: 'center' }}>OS</th>
                  <th style={{ textAlign: 'left' }}>Cliente</th>
                  <th style={{ width: 130, textAlign: 'left' }}>Cód. Barras</th>
                  <th style={{ width: 130, textAlign: 'left' }}>Série / Fogo</th>
                  <th style={{ textAlign: 'left' }}>Descrição Pneu</th>
                  <th style={{ width: 130, textAlign: 'center' }}>Status OS</th>
                </tr>
              </thead>
              <tbody>
                {allFilteredPneus.map((sp: any, idx: number) => (
                  <tr key={`${sp.pcp_id}-${sp.id_pneu}-${idx}`}>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{idx + 1}º</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>#{sp.pcp_id}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{sp.pneu?.numos ? `#${sp.pneu.numos}` : '-'}</td>
                    <td style={{ fontWeight: 500 }}>{sp.pneu?.nome_cliente || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{sp.pneu?.codbarra || '-'}</td>
                    <td style={{ fontWeight: 500 }}>{sp.pneu?.numserie || sp.pneu?.numfogo || '-'}</td>
                    <td style={{ fontWeight: 500 }}>{sp.pneu?.produto_desc || 'Sem Descrição'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {sp.pneu?.statusfat ? (
                        <span className="status-badge-item status-pronto" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Faturado</span>
                      ) : (
                        <span className="status-badge-item status-aguardando" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Em Produção</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Mestre-Detalhe (Create/Edit/View) */}
      {modalOpen && (
        <div className="coleta-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="coleta-modal-content" style={{ maxWidth: 1000, maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="coleta-modal-header">
              <h2>{modalMode === 'create' ? 'Nova' : modalMode === 'edit' ? 'Editar' : 'Visualizar'} Programação PCP</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {scheduledPneus.length > 0 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handlePrintModalPneus}
                    style={{
                      height: '36px',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '0.85rem',
                      padding: '0 0.75rem'
                    }}
                    title="Imprimir lote atual"
                  >
                    <Printer size={16} /> Imprime PCP
                  </button>
                )}
                <button className="close-btn" onClick={() => setModalOpen(false)}><X size={20} /></button>
              </div>
            </div>

            <div className="coleta-modal-body scrollable">
              {/* Seção Mestre */}
              <div className="coleta-master-section">
                <div className="section-divider">
                  <span className="divider-label"><FileText size={14} /> Dados Gerais da Programação</span>
                </div>
                <div className="form-grid-coleta">
                  <div className="form-group">
                    <label>Código Programação</label>
                    <input
                      type="text"
                      className="form-input"
                      value={currentId ? `#${currentId}` : 'Novo (Automático)'}
                      disabled
                      style={{ background: '#f1f5f9', fontWeight: 'bold' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Data da Programação *</label>
                    <input
                      type="date"
                      className="form-input"
                      id="datapcp"
                      value={formData.datapcp}
                      onChange={handleMestreChange}
                      disabled={modalMode === 'view'}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label>Observações</label>
                    <input
                      type="text"
                      className="form-input"
                      id="obs"
                      value={formData.obs}
                      onChange={handleMestreChange}
                      disabled={modalMode === 'view'}
                      placeholder="Observações de fabricação para esta programação..."
                    />
                  </div>
                </div>
              </div>

              {/* Seção Detalhe (Pneus na Programação) */}
              <div className="coleta-master-section" style={{ marginTop: '1.5rem' }}>
                <div className="section-divider">
                  <span className="divider-label"><ClipboardList size={14} /> Seleção e Lista de Pneus Programados</span>
                </div>

                {/* Seletor Dinâmico de Pneus (Apenas Create/Edit) */}
                {modalMode !== 'view' && (
                  <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <label style={{ marginBottom: '4px', fontWeight: 600 }}>Filtro rápido por ID do Pneu ou Código de Barra</label>
                        <div className="search-box" style={{ maxWidth: '100%', height: '38px', background: '#ffffff', border: '1px solid #cbd5e1' }}>
                          <Search size={16} className="search-icon" />
                          <input 
                            type="text" 
                            placeholder="Digite o ID, bipe o Código de Barras e aperte Enter..." 
                            value={searchPneuQuery} 
                            onChange={e => setSearchPneuQuery(e.target.value)} 
                            onKeyDown={handleKeyDown}
                          />
                        </div>
                      </div>

                      <button 
                        type="button" 
                        className="btn-primary-coleta" 
                        onClick={handleAddPneuToSchedule}
                        disabled={!searchPneuQuery.trim()}
                        style={{ height: '38px', padding: '0 2rem', margin: 0, opacity: searchPneuQuery.trim() ? 1 : 0.6 }}
                      >
                        Agendar Pneu
                      </button>
                    </div>
                  </div>
                )}

                {/* Tabela de Itens Agendados */}
                <div className="table-responsive">
                  <table className="data-table" style={{ width: '100%', marginBottom: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 80, textAlign: 'center' }}>Seq.</th>
                        <th style={{ width: 100, textAlign: 'center' }}>OS</th>
                        <th style={{ textAlign: 'left' }}>Cliente</th>
                        <th style={{ width: 130, textAlign: 'left' }}>Cód. Barras</th>
                        <th style={{ width: 140, textAlign: 'left' }}>Série / Fogo</th>
                        <th style={{ textAlign: 'left' }}>Descrição Pneu</th>
                        {modalMode !== 'view' && <th style={{ width: 80, textAlign: 'center' }}>Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledPneus.length === 0 ? (
                        <tr><td colSpan={modalMode !== 'view' ? 7 : 6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum pneu adicionado a esta programação ainda.</td></tr>
                      ) : (
                        scheduledPneus.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{idx + 1}º</td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.pneu?.numos ? `#${item.pneu.numos}` : '-'}</td>
                            <td style={{ fontWeight: 500 }} className="text-truncate">{item.pneu?.nome_cliente || '-'}</td>
                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.pneu?.codbarra || '-'}</td>
                            <td style={{ fontWeight: 500 }}>{item.pneu?.numserie || item.pneu?.numfogo || '-'}</td>
                            <td style={{ fontWeight: 500 }}>{item.pneu?.produto_desc || 'Sem Descrição'}</td>
                            {modalMode !== 'view' && (
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  className="icon-btn delete"
                                  onClick={() => handleRemovePneuFromSchedule(idx)}
                                  title="Remover da Programação"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Rodapé informativo de quantidades */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', marginTop: '1rem', padding: '0.75rem 1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Total de Pneus na Programação:</span>
                    <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: '800' }}>{scheduledPneus.length} pneus</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="coleta-modal-footer">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>
                {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
              </button>
              {modalMode !== 'view' && (
                <button className="btn-primary-coleta" onClick={handleSubmit} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Save size={18} /> Salvar Programação
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
