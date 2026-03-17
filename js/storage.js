/**
 * ==============================================================================
 * js/storage.js — Data Extraction & Restoration Layer
 * SK Agro Chemicals Invoice System
 * 
 * Handles mapping the UI state to a robust JSON object and vice versa.
 * This ensures no data loss when saving/loading to Google Sheets.
 * ==============================================================================
 */

'use strict';

/**
 * Extracts all invoice data from the current UI state into a structured JSON string.
 * This JSON is what gets saved to Google Sheets.
 * @param {string} uniqueId (Optional) Pass uniqueId if updating an existing invoice.
 * @returns {object} Highly structured invoice payload.
 */
function extractInvoiceJSON(existingUniqueId = null) {
    // Basic settings
    const gstRate = parseFloat(document.getElementById('gst-rate').value) || 0;
    const showQR = document.getElementById('qr-toggle').checked;

    // Collect product rows from global `rows` array (defined in script.js)
    // We deep copy to avoid mutating the live UI state
    const productRows = window.rows.map(r => ({
        id: r.id,
        brand: r.brand || '',
        name: r.name || '',
        desc: r.desc || '',
        qty: parseFloat(r.qty) || 0,
        price: parseFloat(r.price) || 0,
        total: parseFloat(r.total) || 0
    }));

    // Calculate totals carefully to match UI
    const subtotal = productRows.reduce((sum, r) => sum + r.total, 0);
    const gstAmount = gstRate > 0 ? Math.round(subtotal * (gstRate / 100) * 100) / 100 : 0;
    const grandTotal = subtotal + gstAmount;

    // Build the full structure
    const payload = {
        meta: {
            uniqueId: existingUniqueId || generateUniqueId(),
            invoiceNumber: document.getElementById('s-inv-num').value || '',
            date: document.getElementById('s-inv-date').value || '',
            dueDate: document.getElementById('s-due-date').value || '',
            createdTimestamp: new Date().toISOString(),
            // status removed
            version: '1.0'
        },
        business: {
            company: document.getElementById('s-company').value || '',
            address: document.getElementById('s-address').value || '',
            phone: document.getElementById('s-phone').value || '',
            email: document.getElementById('s-email').value || '',
            gstin: document.getElementById('s-gstin').value || '',
            signatory: document.getElementById('s-signatory').value || ''
        },
        bank: {
            name: document.getElementById('s-bank-name').value || '',
            account: document.getElementById('s-bank-acc').value || '',
            ifsc: document.getElementById('s-bank-ifsc').value || '',
            upi: document.getElementById('s-upi').value || ''
        },
        customer: {
            name: document.getElementById('s-client-name').value || '',
            address: document.getElementById('s-client-addr').value || '',
            phone: document.getElementById('s-client-phone').value || '',
            gstin: document.getElementById('s-client-gstin').value || ''
        },
        settings: {
            intro: document.getElementById('s-intro').value || '',
            terms: document.getElementById('s-terms').value || '',
            gstRate: gstRate,
            showQR: showQR
        },
        rows: productRows,
        calculations: {
            subtotal: subtotal,
            gstAmount: gstAmount,
            grandTotal: grandTotal
        }
    };

    return payload;
}


/**
 * Completely restores the UI state from a saved JSON invoice object.
 * Acts as if the user just manually typed all this data in.
 * @param {object} data The parsed JSON object retrieved from Sheets.
 */
function restoreInvoiceUI(data) {
    if (!data) return;

    // --- 🔹 BACKWARD COMPATIBILITY FOR OLD INVOICES ---
    // If the data is in the old format { fields: {...}, rows: [...] }
    if (data.fields) {
        // Set basic fields dynamically from the old flattened map
        Object.entries(data.fields).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        });
        
        // Settings/Flags from old format
        if (data.gstRate !== undefined) setVal('gst-rate', data.gstRate);
        else if (data.gst) setVal('gst-rate', '18'); 
        
        const qrToggle = document.getElementById('qr-toggle');
        if (qrToggle) qrToggle.checked = !!data.qr;
        
        // Set the ID so we update the same row instead of creating a duplicate
        window.currentInvoiceId = data._legacyUniqueId || data.fields['uniqueId'] || null;

    } 
    // --- 🔹 MODERN SECURE FORMAT ---
    else if (data.meta) {
        // 1. Restore Meta Fields
        setVal('s-inv-num', data.meta.invoiceNumber);
        setVal('s-inv-date', data.meta.date);
        setVal('s-due-date', data.meta.dueDate);

        // Store the uniqueId in a hidden field or global so updateInvoice() knows which one to overwrite
        window.currentInvoiceId = data.meta.uniqueId;

        // 2. Restore Business Fields
        if (data.business) {
            setVal('s-company', data.business.company);
            setVal('s-address', data.business.address);
            setVal('s-phone', data.business.phone);
            setVal('s-email', data.business.email);
            setVal('s-gstin', data.business.gstin);
            setVal('s-signatory', data.business.signatory);
        }

        // 3. Restore Bank Fields
        if (data.bank) {
            setVal('s-bank-name', data.bank.name);
            setVal('s-bank-acc', data.bank.account);
            setVal('s-bank-ifsc', data.bank.ifsc);
            setVal('s-upi', data.bank.upi);
        }

        // 4. Restore Customer Fields
        if (data.customer) {
            setVal('s-client-name', data.customer.name);
            setVal('s-client-addr', data.customer.address);
            setVal('s-client-phone', data.customer.phone);
            setVal('s-client-gstin', data.customer.gstin);
        }

        // 5. Restore Settings
        if (data.settings) {
            setVal('s-intro', data.settings.intro);
            setVal('s-terms', data.settings.terms);
            setVal('gst-rate', data.settings.gstRate);
            const qrToggle = document.getElementById('qr-toggle');
            if (qrToggle) qrToggle.checked = !!data.settings.showQR;
        }
    } else {
        // If it's completely empty or invalid JSON, fail gracefully
        return;
    }

    // 6. Restore Product Rows
    // window.rows comes from window scope. Clear it and rebuild.
    window.rows = [];
    window.rowCounter = 0; // reset local row ID counter
    
    if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
        data.rows.forEach(r => {
            // Re-use addRow from script.js but pre-populate the data
            // script.js addRow() takes a data object
            if (typeof window.addRow === 'function') {
                window.addRow({
                    brand: r.brand,
                    name: r.name,
                    desc: r.desc,
                    qty: r.qty,
                    price: r.price,
                    total: r.total
                });
            }
        });
    } else {
        // Fallback if empty
        if (typeof window.addRow === 'function') window.addRow();
    }

    // 7. Force all UI recalculations and rendering
    if (typeof window.refreshPaper === 'function') window.refreshPaper();
    if (typeof window.recalcAll === 'function') window.recalcAll();
    if (typeof window.updateIntro === 'function') window.updateIntro();
    if (typeof window.updateTerms === 'function') window.updateTerms();
    if (typeof window.updateQR === 'function') window.updateQR();
}


// ─── UTILITIES ────────────────────────────────────────────────────────────────

// Helper to safely set value of DOM input by ID
function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

// Generate a unique ID for the invoice (fallback if not using DB auto-increment)
function generateUniqueId() {
    const ts = new Date().getTime().toString(36);
    const rand = Math.random().toString(36).substring(2, 6);
    return `INV-${ts}-${rand}`.toUpperCase();
}
