import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ClientConfig } from './types.js';

// Default HTTP timeout in milliseconds
const DEFAULT_HTTP_TIMEOUT_MS = 30000;

export function buildOneAppServer(config: ClientConfig): McpServer {
  const timeoutMs = config.httpTimeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;

  // HTTP helper function - uses config via closure
  async function httpJson<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(path, baseUrl);

    // Set up headers with authentication and client info
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add authorization header if available
    if (config.authorization) {
      headers['Authorization'] = config.authorization;
    }

    // Add client header if available
    if (config.clientHeader) {
      headers['client'] = config.clientHeader;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Enhanced error logging for debugging
        const errorText = await response.text();
        console.error('HTTP Error Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  const server = new McpServer({ name: 'oneapp-mcp', version: '0.1.0' });

  // Core API tools
  server.tool(
    'core_list_sucursales',
    'Obtiene la lista completa de sucursales registradas para el cliente autenticado (sin parámetros adicionales).',
    async () => { 
      try {
        const data = await httpJson<any>(config.coreBaseUrl, '/core/sucursales', { method: 'GET' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        console.error('Request failed:', error);
        throw error;
      }
    }
  );

  server.tool(
    'core_list_zonas',
    'Devuelve todas las zonas asociadas al cliente; permite filtrar con el query param zone_id para recuperar una zona específica.',
    {
      zone_id: z.number().int().optional().describe('ID de la zona')
    },
    async ({ zone_id }) => {
      const qs = new URLSearchParams();
      if (typeof zone_id === 'number') qs.set('zone_id', String(zone_id));
      const path = '/core/zonas' + (qs.toString() ? `?${qs.toString()}` : '');
      const data = await httpJson<any>(config.coreBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'core_list_subgerencias',
    'Devuelve todas las subgerencias asociadas al cliente.',
    async () => {
      const data = await httpJson<any>(config.coreBaseUrl, '/core/subgerencias', { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'core_list_zonas_by_subgerencia',
    'Devuelve las zonas pertenecientes a la subgerencia indicada por el path param id.',
    {
      id: z.number().int().describe('ID de subgerencia')
    },
    async ({ id }) => {
      const data = await httpJson<any>(config.coreBaseUrl, `/core/subgerencias/${id}/zonas`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'core_list_sucursales_by_zona',
    'Muestra las sucursales asociadas a la zona identificada por el path param zone_id.',
    {
      zone_id: z.number().int().describe('ID de la zona')
    },
    async ({ zone_id }) => {
      const data = await httpJson<any>(config.coreBaseUrl, `/core/zonas/${zone_id}/sucursales`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // Checklist API tools
  server.tool(
    'checklist_list_checks',
    'Retorna todos los checklists activos del cliente con paginación (page, limit) y búsqueda por nombre (search).',
    {
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)'),
      search: z.string().optional().describe('Search term')
    },
    async ({ page, limit, search }) => {
      const qs = new URLSearchParams();
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      if (search) qs.set('search', search);
      const path = `/front/api/checklist/data/checks${qs.size ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config.clientBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_ambitos',
    'Obtiene los ámbitos de un checklist específico (check_id), con soporte de paginación opcional.',
    {
      check_id: z.number().int().describe('ID del checklist'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ check_id, page, limit }) => {
      const qs = new URLSearchParams({ check_id: String(check_id) });
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config.clientBaseUrl, `/front/api/checklist/data/ambitos?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_preguntas',
    'Devuelve todas las preguntas que componen un checklist identificado por check_id.',
    {
      check_id: z.number().int().describe('ID del checklist')
    },
    async ({ check_id }) => {
      const qs = new URLSearchParams({ check_id: String(check_id) });
      const data = await httpJson<any>(config.clientBaseUrl, `/front/api/checklist/data/preguntas?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_cuestionarios',
    'Lista los cuestionarios ejecutados de un checklist dentro de un rango de fechas (from_date → end_date), con paginación opcional. ',
    {
      check_id: z.number().int().describe('ID del checklist'),
      from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD'),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ check_id, from_date, end_date, page, limit }) => {
      const qs = new URLSearchParams({
        check_id: String(check_id),
        from_date,
        end_date
      });
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config.clientBaseUrl, `/front/api/checklist/data/cuestionarios?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_asignaciones',
    'Devuelve las asignaciones ligadas a un cuestionario (cuestionario_id), con paginación opcional.',
    {
      cuestionario_id: z.number().int().describe('ID del cuestionario'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ cuestionario_id, page, limit }) => {
      const qs = new URLSearchParams({ cuestionario_id: String(cuestionario_id) });
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config.clientBaseUrl, `/front/api/checklist/data/asignaciones?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_respuestas',
    'Entrega las respuestas registradas para un cuestionario (cuestionario_id) o para una asignación concreta (asignacion_id), permitiendo paginación.',
    {
      cuestionario_id: z.number().int().describe('ID del cuestionario'),
      asignacion_id: z.number().int().optional().describe('ID de la asignación (opcional)'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ cuestionario_id, asignacion_id, page, limit }) => {
      const qs = new URLSearchParams({ cuestionario_id: String(cuestionario_id) });
      if (typeof asignacion_id === 'number') qs.set('asignacion_id', String(asignacion_id));
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config.clientBaseUrl, `/front/api/checklist/data/respuestas?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_areas',
    'Devuelve las áreas del modulo de visapp o visuales disponibles en el cliente. Permite filtrar con el query param area_id para recuperar un area específica.',
    {
      area_id: z.number().int().optional().describe('ID del area visual (opcional)')
    },
    async ({ area_id }) => {
      const qs = new URLSearchParams();
      if (area_id) qs.set('id', String(area_id));
      const path = `/visual/area${qs.toString() ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config.coreBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_categorias',
    'Devuelve las categorías visuales disponibles en el cliente. Permite filtrar con el query param category_id para recuperar una categoría específica.',
    {
      category_id: z.number().int().optional().describe('ID de la categoría visual (opcional)')
    },
    async ({ category_id }) => {
      const qs = new URLSearchParams();
      if (category_id) qs.set('id', String(category_id));
      const path = `/visual/category${qs.toString() ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config.coreBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_area_categorias',
    'Devuelve las categorías visuales asociadas a un area disponibles en el cliente.',
    {
      areas_id: z.array(z.number().int()).describe('Listado de ids de areas de visuales')
    },
    async ({ areas_id }) => {
        const qs = new URLSearchParams();
        if (areas_id) qs.set('areas', areas_id.join(','));
        const data = await httpJson<any>(config.coreBaseUrl, `/visual/category/areas?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_razones',
    'Devuelve los criterios de evaluación de campañas visuales disponibles en el cliente. Permite filtrar con el query param reason_id para recuperar un criterio específico.',
    {
      reason_id: z.number().int().optional().describe('ID del criterio de evaluación (opcional)')
    },
    async ({ reason_id }) => {
      const qs = new URLSearchParams();
      if (reason_id) qs.set('reason_id', String(reason_id));
      const path = `/visual/reason${qs.toString() ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config.coreBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_area_categoria_razones',
    'Devuelve los criterios de evaluación de campañas visuales asociadas a un listado de areas_categorias. Es recomendable haber preguntado por categorias y areas previamente. La relacion es muchos a muchos',
    {
      categories_id: z.array(z.number().int()).describe('Listado de ids de categorias de visuales')
    },
    async ({ categories_id }) => {
        const qs = new URLSearchParams();
        if (categories_id) qs.set('categories', categories_id.join(','));
      const data = await httpJson<any>(config.coreBaseUrl, `/visual/reason/categories?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'moai_visapp_foto',
    'Permite subir una foto y sus criterios de evaluación para Visapp MoAI',
    {
      foto_url: z.string().url().describe('URL de la foto a subir'),
      criterios: z.array(z.string()).describe('Listado de criterios de evaluación')
    },
    async ({ foto_url, criterios }) => {
      const requestBody = {
        foto_url,
        criterios
      };
      const data = await httpJson<any>(config.coreBaseUrl, '/visual/moai', { 
        method: 'POST', 
        body: JSON.stringify(requestBody)
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

    server.tool(
    'moai_visapp_foto_info',
    'Obtiene la lista completa de fotos de Visapp con Moai registradas para el cliente autenticado (sin parámetros adicionales).',
    async () => { 
      try {
        const data = await httpJson<any>(config.coreBaseUrl, '/visual/moai', { method: 'GET' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        console.error('Request failed:', error);
        throw error;
      }
    }
  );

  return server;
}
