'use strict';

const https = require('https');
const http = require('http');

/**
 * Minimal HTTP client using Node built-ins.
 * Handles JSON, binary (Buffer), redirect-following, and error responses.
 */
function httpRequest(urlStr, { method = 'GET', headers = {}, body = null, maxRedirects = 5 } = {}) {
  return new Promise((resolve, reject) => {
    function doRequest(url, redirectsLeft) {
      let parsed;
      try { parsed = new URL(url); } catch (e) { return reject(e); }

      const lib = parsed.protocol === 'https:' ? https : http;

      let bodyBuf = null;
      if (body !== null) {
        if (Buffer.isBuffer(body)) {
          bodyBuf = body;
        } else if (typeof body === 'string') {
          bodyBuf = Buffer.from(body);
        } else {
          bodyBuf = Buffer.from(JSON.stringify(body));
          if (!headers['Content-Type'] && !headers['content-type']) {
            headers = { ...headers, 'Content-Type': 'application/json' };
          }
        }
        headers = { ...headers, 'Content-Length': String(bodyBuf.length) };
      }

      const opts = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method,
        headers,
        timeout: 30000,
      };

      const req = lib.request(opts, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          res.resume(); // drain to free socket
          const next = new URL(res.headers.location, url).toString();
          doRequest(next, redirectsLeft - 1);
          return;
        }

        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const ct = res.headers['content-type'] || '';
          let data;
          if (ct.includes('application/json')) {
            try { data = JSON.parse(buf.toString()); } catch { data = buf.toString(); }
          } else {
            // Return Buffer for binary, string for text
            data = ct.includes('text/') ? buf.toString() : buf;
          }

          if (res.statusCode >= 400) {
            const err = new Error(`HTTP ${res.statusCode} ${method} ${url}`);
            err.statusCode = res.statusCode;
            err.response = { status: res.statusCode, data, headers: res.headers };
            return reject(err);
          }
          resolve({ status: res.statusCode, data, headers: res.headers });
        });
        res.on('error', reject);
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(new Error(`Request timeout: ${url}`)); });
      if (bodyBuf) req.write(bodyBuf);
      req.end();
    }

    doRequest(urlStr, maxRedirects);
  });
}

module.exports = { httpRequest };
