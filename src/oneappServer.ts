import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { validateClientId, createClientIdErrorResult } from './validation.js';
import { httpJson } from './httpClient.js';
import { getClientIds, clientsConfig } from './config.js';

export function buildOneAppServer(): McpServer {
  const server = new McpServer({ name: 'oneapp-mcp', version: '0.1.0' });

  // Core API tools
  server.tool(
    'core_list_sucursales',
    'Obtiene la lista completa de sucursales registradas para el cliente especificado.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")')
    },
    async ({ clientId }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      try {
        const data = await httpJson<any>(config, config.coreBaseUrl, '/core/sucursales', { method: 'GET' });
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
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      zone_id: z.number().int().optional().describe('ID de la zona')
    },
    async ({ clientId, zone_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams();
      if (typeof zone_id === 'number') qs.set('zone_id', String(zone_id));
      const path = '/core/zonas' + (qs.toString() ? `?${qs.toString()}` : '');
      const data = await httpJson<any>(config, config.coreBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'core_list_subgerencias',
    'Devuelve todas las subgerencias asociadas al cliente.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")')
    },
    async ({ clientId }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.coreBaseUrl, '/core/subgerencias', { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'core_list_zonas_by_subgerencia',
    'Devuelve las zonas pertenecientes a la subgerencia indicada por el path param id.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      id: z.number().int().describe('ID de subgerencia')
    },
    async ({ clientId, id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.coreBaseUrl, `/core/subgerencias/${id}/zonas`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'core_list_sucursales_by_zona',
    'Muestra las sucursales asociadas a la zona identificada por el path param zone_id.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      zone_id: z.number().int().describe('ID de la zona')
    },
    async ({ clientId, zone_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.coreBaseUrl, `/core/zonas/${zone_id}/sucursales`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // Checklist API tools
  server.tool(
    'checklist_list_checks',
    'Retorna todos los checklists activos del cliente con paginación (page, limit) y búsqueda por nombre (search).',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)'),
      search: z.string().optional().describe('Search term')
    },
    async ({ clientId, page, limit, search }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams();
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      if (search) qs.set('search', search);
      const path = `/front/api/checklist/data/checks${qs.size ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config, config.clientBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_ambitos',
    'Obtiene los ámbitos de un checklist específico (check_id), con soporte de paginación opcional.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      check_id: z.number().int().describe('ID del checklist'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ clientId, check_id, page, limit }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams({ check_id: String(check_id) });
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/checklist/data/ambitos?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_preguntas',
    'Devuelve todas las preguntas que componen un checklist identificado por check_id.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      check_id: z.number().int().describe('ID del checklist')
    },
    async ({ clientId, check_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams({ check_id: String(check_id) });
      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/checklist/data/preguntas?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_cuestionarios',
    'Lista los cuestionarios ejecutados de un checklist dentro de un rango de fechas (from_date → end_date), con paginación opcional. ',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      check_id: z.number().int().describe('ID del checklist'),
      from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD'),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('YYYY-MM-DD'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ clientId, check_id, from_date, end_date, page, limit }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams({
        check_id: String(check_id),
        from_date,
        end_date
      });
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/checklist/data/cuestionarios?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_asignaciones',
    'Devuelve las asignaciones ligadas a un cuestionario (cuestionario_id), con paginación opcional.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      cuestionario_id: z.number().int().describe('ID del cuestionario'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ clientId, cuestionario_id, page, limit }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams({ cuestionario_id: String(cuestionario_id) });
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/checklist/data/asignaciones?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checklist_list_respuestas',
    'Entrega las respuestas registradas para un cuestionario (cuestionario_id) o para una asignación concreta (asignacion_id), permitiendo paginación.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      cuestionario_id: z.number().int().describe('ID del cuestionario'),
      asignacion_id: z.number().int().optional().describe('ID de la asignación (opcional)'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ clientId, cuestionario_id, asignacion_id, page, limit }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams({ cuestionario_id: String(cuestionario_id) });
      if (typeof asignacion_id === 'number') qs.set('asignacion_id', String(asignacion_id));
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/checklist/data/respuestas?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_areas',
    'Devuelve las áreas del modulo de visapp o visuales disponibles en el cliente. Permite filtrar con el query param area_id para recuperar un area específica.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      area_id: z.number().int().optional().describe('ID del area visual (opcional)')
    },
    async ({ clientId, area_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams();
      if (area_id) qs.set('id', String(area_id));
      const path = `/visual/area${qs.toString() ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config, config.coreBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_categorias',
    'Devuelve las categorías visuales disponibles en el cliente. Permite filtrar con el query param category_id para recuperar una categoría específica.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      category_id: z.number().int().optional().describe('ID de la categoría visual (opcional)')
    },
    async ({ clientId, category_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams();
      if (category_id) qs.set('id', String(category_id));
      const path = `/visual/category${qs.toString() ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config, config.coreBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_area_categorias',
    'Devuelve las categorías visuales asociadas a un area disponibles en el cliente.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      areas_id: z.array(z.number().int()).describe('Listado de ids de areas de visuales')
    },
    async ({ clientId, areas_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams();
      if (areas_id) qs.set('areas', areas_id.join(','));
      const data = await httpJson<any>(config, config.coreBaseUrl, `/visual/category/areas?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_razones',
    'Devuelve los criterios de evaluación de campañas visuales disponibles en el cliente. Permite filtrar con el query param reason_id para recuperar un criterio específico.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      reason_id: z.number().int().optional().describe('ID del criterio de evaluación (opcional)')
    },
    async ({ clientId, reason_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams();
      if (reason_id) qs.set('reason_id', String(reason_id));
      const path = `/visual/reason${qs.toString() ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config, config.coreBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'visual_area_categoria_razones',
    'Devuelve los criterios de evaluación de campañas visuales asociadas a un listado de areas_categorias. Es recomendable haber preguntado por categorias y areas previamente. La relacion es muchos a muchos',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      categories_id: z.array(z.number().int()).describe('Listado de ids de categorias de visuales')
    },
    async ({ clientId, categories_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams();
      if (categories_id) qs.set('categories', categories_id.join(','));
      const data = await httpJson<any>(config, config.coreBaseUrl, `/visual/reason/categories?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'moai_visapp_foto',
    'Permite subir una foto y sus criterios de evaluación para Visapp MoAI',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      foto_url: z.string().url().describe('URL de la foto a subir'),
      criterios: z.array(z.string()).describe('Listado de criterios de evaluación')
    },
    async ({ clientId, foto_url, criterios }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const requestBody = {
        foto_url,
        criterios
      };
      const data = await httpJson<any>(config, config.coreBaseUrl, '/visual/moai', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'moai_visapp_foto_info',
    'Obtiene la lista completa de fotos de Visapp con Moai registradas para el cliente especificado.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")')
    },
    async ({ clientId }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      try {
        const data = await httpJson<any>(config, config.coreBaseUrl, '/visual/moai', { method: 'GET' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        console.error('Request failed:', error);
        throw error;
      }
    }
  );

  // Checkstore API tools
  server.tool(
    'checkstore_cobertura_usuarios',
    'Devuelve la cobertura de visitas por usuario dentro de un rango de fechas, mostrando cuántas visitas realizó cada usuario.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha inicio YYYY-MM-DD'),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha fin YYYY-MM-DD')
    },
    async ({ clientId, desde, hasta }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/visitas/cobertura_usuarios', {
        method: 'POST',
        body: JSON.stringify({ desde, hasta })
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checkstore_sucursales_reportadas',
    'Lista las sucursales que fueron reportadas o visitadas dentro de un rango de fechas determinado.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha inicio YYYY-MM-DD'),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha fin YYYY-MM-DD')
    },
    async ({ clientId, desde, hasta }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/visitas/sucursales_reportadas', {
        method: 'POST',
        body: JSON.stringify({ desde, hasta })
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checkstore_visita_sucursales',
    'Obtiene el detalle de las visitas realizadas a sucursales dentro de un rango de fechas.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha inicio YYYY-MM-DD'),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha fin YYYY-MM-DD')
    },
    async ({ clientId, desde, hasta }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/visitas/visita_sucursales', {
        method: 'POST',
        body: JSON.stringify({ desde, hasta })
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'checkstore_reporte_visitas',
    'Genera un reporte consolidado de visitas realizadas, permitiendo filtrar por rango de fechas.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha inicio YYYY-MM-DD'),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha fin YYYY-MM-DD')
    },
    async ({ clientId, desde, hasta }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/visitas/reporte_visitas', {
        method: 'POST',
        body: JSON.stringify({ desde, hasta })
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // TaskManager API tools
  server.tool(
    'taskmanager_list_tareas',
    'Retorna las tareas configuradas en el módulo de TaskManager del cliente, con paginación y búsqueda opcional.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      tarea_id: z.number().int().optional().describe('ID de la tarea (opcional, para filtrar una tarea específica)'),
      search: z.string().optional().describe('Término de búsqueda por nombre de tarea'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ clientId, tarea_id, search, page, limit }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams();
      if (typeof tarea_id === 'number') qs.set('tarea_id', String(tarea_id));
      if (search) qs.set('search', search);
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const path = `/front/api/taskmanager/data/tareas${qs.size ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config, config.clientBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'taskmanager_list_asignaciones',
    'Devuelve las asignaciones de tareas del TaskManager para un usuario específico, con filtros opcionales por estado y rango de fechas.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      usuario_id: z.number().int().describe('ID del usuario (obligatorio)'),
      estado: z.string().optional().describe('Filtrar por estado de la asignación (opcional)'),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Fecha inicio YYYY-MM-DD (opcional)'),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Fecha fin YYYY-MM-DD (opcional)'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ clientId, usuario_id, estado, desde, hasta, page, limit }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams({ usuario_id: String(usuario_id) });
      if (estado) qs.set('estado', estado);
      if (desde) qs.set('desde', desde);
      if (hasta) qs.set('hasta', hasta);
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/taskmanager/data/asignaciones?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'taskmanager_detalle_asignacion',
    'Obtiene el detalle completo de una asignación específica del TaskManager, identificada por su ID.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      asignacion_id: z.number().int().describe('ID de la asignación')
    },
    async ({ clientId, asignacion_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/taskmanager/data/asignacion/${asignacion_id}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'taskmanager_list_preguntas',
    'Devuelve todas las preguntas que componen una tarea del TaskManager identificada por tarea_id.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      tarea_id: z.number().int().describe('ID de la tarea (obligatorio)')
    },
    async ({ clientId, tarea_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams({ tarea_id: String(tarea_id) });
      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/taskmanager/data/preguntas?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'taskmanager_list_respuestas',
    'Entrega las respuestas registradas para una tarea del TaskManager, con filtro opcional por asignación y paginación.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      tarea_id: z.number().int().describe('ID de la tarea (obligatorio)'),
      asignacion_id: z.number().int().optional().describe('ID de la asignación para filtrar resultados (opcional)'),
      page: z.number().int().min(1).optional().describe('Page number (starts at 1)'),
      limit: z.number().int().min(1).max(100).optional().describe('Number of items per page (max 100)')
    },
    async ({ clientId, tarea_id, asignacion_id, page, limit }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams({ tarea_id: String(tarea_id) });
      if (typeof asignacion_id === 'number') qs.set('asignacion_id', String(asignacion_id));
      if (page) qs.set('page', String(page));
      if (limit) qs.set('limit', String(limit));
      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/taskmanager/data/respuestas?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'taskmanager_list_reportes',
    'Genera reportes del módulo TaskManager desde una fecha obligatoria, con filtros opcionales por fecha fin, tarea, tipo de tarea y estado.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha inicio YYYY-MM-DD (obligatorio)'),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Fecha fin YYYY-MM-DD (opcional)'),
      tarea_id: z.number().int().optional().describe('ID de tarea para filtrar (opcional)'),
      tipo_tarea: z.string().optional().describe('Tipo de tarea para filtrar, ej: "Simple" (opcional)'),
      estado: z.string().optional().describe('Estado para filtrar: Pendiente, En proceso, Caducado, Finalizada (opcional)')
    },
    async ({ clientId, desde, hasta, tarea_id, tipo_tarea, estado }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams({ desde });
      if (hasta) qs.set('hasta', hasta);
      if (typeof tarea_id === 'number') qs.set('tarea_id', String(tarea_id));
      if (tipo_tarea) qs.set('tipo_tarea', tipo_tarea);
      if (estado) qs.set('estado', estado);
      const data = await httpJson<any>(config, config.clientBaseUrl, `/front/api/taskmanager/data/reportes?${qs.toString()}`, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'taskmanager_list_estados',
    'Devuelve los estados disponibles para las tareas del módulo TaskManager (ej: Pendiente, En proceso, Caducado, Finalizada).',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")')
    },
    async ({ clientId }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/taskmanager/data/estados', { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'taskmanager_list_tipos_tareas',
    'Lista los tipos de tareas disponibles en el módulo de TaskManager del cliente.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")')
    },
    async ({ clientId }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/taskmanager/data/tipos-tareas', { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // Comunicados API tools
  server.tool(
    'comunicados_estadisticas',
    'Obtiene estadísticas de lectura y comprensión de comunicados, agrupadas por país, zona o sucursal según la jerarquía del usuario. Permite controlar la profundidad con el parámetro nivel.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      nivel: z.enum(['bot', 'top', 'dual']).optional().describe('Profundidad: top (solo resumen), bot (solo detalle), dual (ambos, por defecto)'),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Fecha inicio YYYY-MM-DD (opcional)'),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Fecha fin YYYY-MM-DD (opcional)'),
      zona_id: z.number().int().optional().describe('ID de la zona para filtrar (opcional)')
    },
    async ({ clientId, nivel, desde, hasta, zona_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const qs = new URLSearchParams();
      if (nivel) qs.set('nivel', nivel);
      if (desde) qs.set('desde', desde);
      if (hasta) qs.set('hasta', hasta);
      if (typeof zona_id === 'number') qs.set('zona_id', String(zona_id));
      const path = `/front/api/comunicados/estadisticas${qs.size ? `?${qs.toString()}` : ''}`;
      const data = await httpJson<any>(config, config.clientBaseUrl, path, { method: 'GET' });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'comunicados_listar',
    'Retorna la lista de todos los comunicados existentes en la plataforma para el cliente.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")')
    },
    async ({ clientId }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/comunicados/listar', {
        method: 'POST',
        body: JSON.stringify({})
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'comunicados_comunicados',
    'Retorna los comunicados activos del usuario autenticado con estado de lectura, comprensión y estadísticas semanales/mensuales. Permite filtrar por tipo y rango de fechas.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      tipo_id: z.number().int().optional().describe('ID del tipo de comunicado para filtrar (opcional)'),
      fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Fecha inicio YYYY-MM-DD (opcional)'),
      fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Fecha fin YYYY-MM-DD (opcional)')
    },
    async ({ clientId, tipo_id, fecha_inicio, fecha_fin }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const body: Record<string, any> = {};
      if (typeof tipo_id === 'number') body.tipo_id = tipo_id;
      if (fecha_inicio) body.fecha_inicio = fecha_inicio;
      if (fecha_fin) body.fecha_fin = fecha_fin;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/comunicados/comunicados', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'comunicados_comunicado',
    'Retorna el detalle completo de un comunicado específico: contenido HTML, archivos, imágenes (galería), cuestionario con alternativas, respuestas del usuario y detalle del equipo de la sucursal.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      comunicado_id: z.number().int().describe('ID del comunicado (obligatorio)')
    },
    async ({ clientId, comunicado_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/comunicados/comunicado', {
        method: 'POST',
        body: JSON.stringify({ comunicado_id })
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'comunicados_detalle_sucursal',
    'Devuelve la lista de usuarios de una sucursal con sus estadísticas de evaluación para los comunicados activos en el período indicado.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      sucursal_id: z.number().int().describe('ID de la sucursal (obligatorio)'),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha inicio YYYY-MM-DD'),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha fin YYYY-MM-DD')
    },
    async ({ clientId, sucursal_id, desde, hasta }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/comunicados/detallesucursal', {
        method: 'POST',
        body: JSON.stringify({ sucursal_id, desde, hasta })
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'comunicados_detalle_usuario',
    'Devuelve la lista de comunicados evaluados por un usuario específico con estado de lectura, comprensión y puntaje.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      usuario_id: z.number().int().describe('ID del usuario (obligatorio)'),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha inicio YYYY-MM-DD'),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha fin YYYY-MM-DD')
    },
    async ({ clientId, usuario_id, desde, hasta }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/comunicados/detalleusuario', {
        method: 'POST',
        body: JSON.stringify({ usuario_id, desde, hasta })
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'comunicados_dashboard',
    'Retorna resumen de comunicados por tipo para el dashboard: total asignados, sin leer y hasta 2 comunicados sin leer más recientes por tipo.',
    {
      clientId: z.string().describe('Client identifier (e.g., "sechpos", "acme")'),
      tipo_id: z.number().int().describe('ID del tipo de comunicado (obligatorio)')
    },
    async ({ clientId, tipo_id }) => {
      const validation = validateClientId(clientId);
      if (!validation.success) {
        return createClientIdErrorResult(validation.error);
      }
      const { config } = validation;

      const data = await httpJson<any>(config, config.clientBaseUrl, '/front/api/comunicados/dashboard', {
        method: 'POST',
        body: JSON.stringify({ tipo_id })
      });
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // Discovery tool - list available clients
  server.tool(
    'list_clients',
    'Returns all available client IDs that can be used with other tools. Use this to discover which clients are configured before making API calls.',
    async () => {
      const clientIds = getClientIds();

      const clients = clientIds.map(id => {
        const config = clientsConfig[id];
        return {
          id,
          name: config.name || null,
          description: config.description || null,
        };
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ clients }, null, 2)
        }]
      };
    }
  );

  return server;
}
