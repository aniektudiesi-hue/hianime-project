const http = require('http');
const https = require('https');
const url = require('url');
const zlib = require('zlib');
const fs = require('fs');
const pathModule = require('path');

const PORT = 3000;
const API_BASE = 'https://hianime.to';

const makeRequest = (targetUrl, options = {}) => {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(targetUrl);
        const requestOptions = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                ...options.headers,
            },
        };

        const req = https.request(requestOptions, (res) => {
            let chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                let buffer = Buffer.concat(chunks);
                const encoding = res.headers['content-encoding'];
                try {
                    let decoded;
                    if (encoding === 'gzip') decoded = zlib.gunzipSync(buffer);
                    else if (encoding === 'deflate') decoded = zlib.inflateSync(buffer);
                    else decoded = buffer;
                    resolve({ status: res.statusCode, headers: res.headers, body: decoded.toString('utf-8') });
                } catch (err) { reject(err); }
            });
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
};

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    try {
        if (path === '/api/anime/search' || path === '/api/anime/latest') {
            const query = parsedUrl.query.keyword || '';
            const page = parsedUrl.query.page || '1';
            const targetUrl = query 
                ? `${API_BASE}/search?keyword=${encodeURIComponent(query)}&page=${page}`
                : `${API_BASE}/recently-updated?page=${page}`;
            const result = await makeRequest(targetUrl);
            res.writeHead(result.status, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(result.body);
        } 
        else if (path === '/api/anime/trending') {
            const result = await makeRequest(`${API_BASE}/home`);
            res.writeHead(result.status, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(result.body);
        }
        else if (path === '/api/anime/episodes') {
            const animeId = parsedUrl.query.animeId;
            const result = await makeRequest(`${API_BASE}/ajax/v2/episode/list/${animeId}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            res.writeHead(result.status, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(result.body);
        }
        else if (path === '/api/anime/episode-sources') {
            const episodeId = parsedUrl.query.episodeId;
            const serversRes = await makeRequest(`${API_BASE}/ajax/v2/episode/servers?episodeId=${episodeId}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const serversData = JSON.parse(serversRes.body);
            const serverIdMatch = serversData.html.match(/data-id="([^"]+)"/);
            if (serverIdMatch) {
                const sourcesRes = await makeRequest(`${API_BASE}/ajax/v2/episode/sources?id=${serverIdMatch[1]}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                res.writeHead(sourcesRes.status, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(sourcesRes.body);
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'No servers found' }));
            }
        }
        else {
            let filePath = '.' + path;
            if (filePath === './' || filePath === './api') filePath = './index.html';
            const ext = pathModule.extname(filePath).toLowerCase();
            const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpg' };
            fs.readFile(pathModule.join(__dirname, filePath), (err, content) => {
                if (err) {
                    res.writeHead(err.code === 'ENOENT' ? 404 : 500);
                    res.end(err.code === 'ENOENT' ? 'Not Found' : 'Server Error');
                } else {
                    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
                    res.end(content);
                }
            });
        }
    } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end('Internal Error');
    }
});

server.listen(PORT, () => console.log(`Server on port ${PORT}`));
