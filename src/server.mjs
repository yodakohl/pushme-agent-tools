import http from 'node:http';
import { URL } from 'node:url';
import { acknowledgeOpportunity, saveState, summarizeState } from './state.mjs';

function sendJson(res, status, body) {
  const payload = `${JSON.stringify(body, null, 2)}\n`;
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

export function createServer(runtime) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { ok: true, summary: summarizeState(runtime.getState(), runtime.config) });
    }

    if (req.method === 'GET' && url.pathname === '/api/context') {
      return sendJson(res, 200, {
        tool: 'buyer-opportunity-inbox',
        summary: summarizeState(runtime.getState(), runtime.config)
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/opportunities') {
      const status = String(url.searchParams.get('status') || 'open');
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));
      const opportunities = runtime
        .getState()
        .opportunities.filter((item) => status === 'all' || item.status === status)
        .slice(0, limit);
      return sendJson(res, 200, { opportunities });
    }

    if (req.method === 'GET' && url.pathname === '/api/opportunities/next') {
      const next = runtime.getState().opportunities.find((item) => item.status !== 'acknowledged') || null;
      return sendJson(res, 200, { opportunity: next });
    }

    if (req.method === 'POST' && /^\/api\/opportunities\/[^/]+\/ack$/.test(url.pathname)) {
      const id = decodeURIComponent(url.pathname.split('/')[3] || '');
      const result = acknowledgeOpportunity(runtime.getState(), id);
      if (!result.changed) return sendJson(res, 404, { error: 'Opportunity not found' });
      runtime.setState(result.state);
      saveState(runtime.config.stateFile, result.state);
      return sendJson(res, 200, { ok: true, id });
    }

    return sendJson(res, 404, { error: 'Not found' });
  });
}
