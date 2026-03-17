/* ==========================================================================
   api.js  —  Google Apps Script backend communication layer
   SK Agro Chemicals Invoice System
   All API calls go through this single file.
   To change backend: only update APPS_SCRIPT_URL below.
   ========================================================================== */

'use strict';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// Replace with your deployed Google Apps Script Web App URL after setup.
// Deploy → New Deployment → Web App → Execute as: Me → Anyone: anyone (no auth)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzpPFZIbFppuozsxWpD2NbAE0Sl2yR4hw8upx-y93EQhd_ryoYwBmIWHYAEOiHOcdkyUA/exec';
const API_SECRET = 'sk_agro_secure_key_2026'; // Added Security Token

// Request timeout in milliseconds
const API_TIMEOUT_MS = 15000;

// ─── CORE FETCH WRAPPER ───────────────────────────────────────────────────────
/**
 * Internal helper: fetch with timeout + JSON parse + error normalization.
 * GET requests: pass params as URLSearchParams.
 * POST requests: pass body as plain JS object (will be JSON-stringified).
 */
async function _apiFetch(params = {}, body = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const url = new URL(APPS_SCRIPT_URL);
    // Attach the security token to every request alongside other params
    url.searchParams.set('token', API_SECRET);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const options = { signal: controller.signal };

    if (body !== null) {
      // POST — Apps Script doesn't support real PUT/DELETE easily,
      // so we tunnel the HTTP method via ?action param.
      options.method = 'POST';
      // To bypass CORS preflight OPTIONS, we use text/plain
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      options.body = JSON.stringify(body);
    } else {
      options.method = 'GET';
    }

    const res = await fetch(url.toString(), options);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json = await res.json();

    if (json.error) throw new Error(json.error);
    return json;

  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Check your internet connection.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}


// ─── PUBLIC API FUNCTIONS ─────────────────────────────────────────────────────

/**
 * GET /invoices — Load invoice list (summary only, no full JSON for performance).
 * @param {object} filters  Optional: { customer, dateFrom, dateTo, status, limit }
 * @returns {Promise<Array>} Array of invoice summary objects.
 */
async function apiGetInvoices(filters = {}) {
  const params = { action: 'getInvoices', ...filters };
  const result = await _apiFetch(params);
  return result.data || [];
}


/**
 * GET /invoice?id=xxx — Load a single invoice with full JSON.
 * @param {string} uniqueId  The invoice's uniqueId (e.g. "INV-20250317-A3F2")
 * @returns {Promise<object>} Full invoice JSON object.
 */
async function apiGetInvoice(uniqueId) {
  if (!uniqueId) throw new Error('Invoice ID is required.');
  const result = await _apiFetch({ action: 'getInvoice', id: uniqueId });
  return result.data;
}


/**
 * POST /invoice — Save a new invoice.
 * @param {object} invoiceData  Full invoice JSON (see storage.js → buildInvoiceJSON).
 * @returns {Promise<object>} { success, uniqueId, invoiceNumber, row }
 */
async function apiSaveInvoice(invoiceData) {
  _validateInvoicePayload(invoiceData);
  const result = await _apiFetch({ action: 'saveInvoice' }, invoiceData);
  return result;
}


/**
 * POST /invoice (update) — Update an existing invoice.
 * @param {object} invoiceData  Full invoice JSON including meta.uniqueId.
 * @returns {Promise<object>} { success, uniqueId }
 */
async function apiUpdateInvoice(invoiceData) {
  _validateInvoicePayload(invoiceData);
  if (!invoiceData || !invoiceData.meta.uniqueId) {
    throw new Error('Invalid payload: uniqueId missing.');
  }
  const result = await _apiFetch({ action: 'updateInvoice' }, invoiceData);
  return result.data;
}


/**
 * POST /invoice?action=deleteInvoice — Delete an invoice.
 * @param {string} uniqueId The ID to delete.
 */
async function apiDeleteInvoice(uniqueId) {
  if (!uniqueId) throw new Error('Invoice ID is required for deletion.');
  const result = await _apiFetch({ action: 'deleteInvoice' }, { uniqueId: uniqueId });
  return result.data;
}


/**
 * GET /nextInvoiceNumber — Fetch the next auto-incremented invoice number from sheet.
 * @returns {Promise<string>}  e.g. "INV-042"
 */
async function apiGetNextInvoiceNumber() {
  const result = await _apiFetch({ action: 'getNextInvoiceNumber' });
  return result.data;
}


// ─── PRIVATE VALIDATION ───────────────────────────────────────────────────────
function _validateInvoicePayload(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid invoice payload.');
  if (!data.meta) throw new Error('Invoice is missing meta block.');
  if (!data.customer) throw new Error('Invoice is missing customer block.');
  if (!Array.isArray(data.rows) || data.rows.length === 0) throw new Error('Invoice must have at least one product row.');
}
