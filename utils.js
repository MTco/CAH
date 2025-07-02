export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

export function safeGetElement(id) { return document.getElementById(id); }
export function safeSetTextContent(id, text) { const el = safeGetElement(id); if (el) el.textContent = text; }
export function safeSetInnerHTML(id, html) { const el = safeGetElement(id); if (el) el.innerHTML = html; }
export function safeLocalStorageGet(key, def = null) { try { const item = localStorage.getItem(key); return item === null ? def : item; } catch { return def; } }
export function safeLocalStorageSet(key, val) { try { localStorage.setItem(key, val); } catch (e) { console.error(e); } }
export function safeJsonParse(str, def = null) { try { if (typeof str === 'string' && str.length > 0) return JSON.parse(str); } catch (e) { console.error("JSON parse error:", e); } return def; }
export function safeLocalStorageGetJSON(key, def = {}) { const item = safeLocalStorageGet(key); return safeJsonParse(item, def) ?? def; }
export function safeLocalStorageSetJSON(key, val) { safeLocalStorageSet(key, JSON.stringify(val)); }

export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
