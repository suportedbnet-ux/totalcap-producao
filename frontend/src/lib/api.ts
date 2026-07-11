import axios from 'axios';

// Vite already exposes env mode.
// Use proxy (`/api` -> `http://127.0.0.1:8000`) in dev regardless of hostname/IP.
const apiDevBaseURL = '/api/v1/';
const apiProdBaseURL = 'https://totalcap-producao-production.up.railway.app/api/v1';

// Optional override for production builds (e.g. in CI):
// Define VITE_API_BASE_URL=https://host/api/v1
const apiBaseOverride = import.meta.env.VITE_API_BASE_URL as string | undefined;

const baseURL = apiBaseOverride
  ? apiBaseOverride
  : (import.meta.env.DEV ? apiDevBaseURL : apiProdBaseURL);

const api = axios.create({
  baseURL: baseURL,


  timeout: 60000,
  headers: {
    // Deixamos o Axios detectar o Content-Type automaticamente
  },

});

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('totalcap_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Debug: log da URL final solicitada
    try {
      const finalUrl = `${config.baseURL ?? ''}${config.url ?? ''}`;
      console.debug('[API] Request:', { url: finalUrl, method: config.method, authorized: !!token });
    } catch {
      // ignore logging errors
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error', error);
    return Promise.reject(error);
  }
);

// Interceptor para logar respostas/erros da API
api.interceptors.response.use(
  (response) => {
    // Opcional: logar respostas de sucesso para diagnóstico
    return response;
  },
  (error) => {
    try {
      const url = error?.response?.config?.url;
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error('[API] Response error', { url, status, data });
    } catch {}
    return Promise.reject(error);
  }
);

/**
 * Extrai uma mensagem de erro amigável de uma resposta da API (FastAPI/Pydantic)
 */
export const getErrorMessage = (error: any, defaultMessage: string = 'Erro desconhecido'): string => {
  const detail = error.response?.data?.detail;
  
  if (typeof detail === 'string') {
    return detail;
  }
  
  if (Array.isArray(detail)) {
    // Erros de validação do Pydantic chegam como uma lista de objetos {msg, loc, type}
    return detail.map(d => {
      const field = d.loc && d.loc.length > 1 ? `${d.loc[d.loc.length - 1]}: ` : '';
      return `${field}${d.msg}`;
    }).join(', ');
  }
  
  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail);
  }
  
  if (error.code === 'ECONNABORTED') {
    return 'Tempo limite esgotado. A IA demorou demais para responder ou o servidor cortou a conexão.';
  }
  
  if (error.message === 'Network Error') {
    return 'Erro de Rede. Verifique sua conexão ou se o servidor está online. (Pode ser um bloqueio de CORS ou timeout do servidor)';
  }

  return error.response?.data?.message || error.message || defaultMessage;
};

export default api;
