import {createServer, IncomingMessage} from 'node:http';
import {ServerResponse} from 'http';
import {createReadStream, readFileSync, statSync} from 'node:fs';

const videoCache: { [key: string]: Buffer } = {};

function render(req: IncomingMessage, res: ServerResponse) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(readFileSync(__dirname + '/index.html'));
    return res;
}

function video(req: IncomingMessage, res: ServerResponse) {
    const range = req.headers.range;
    
    if (!range) return jsonResponse(res, 400, {error: 'Range header is required'});

    const videoPath = __dirname + '/video.mp4';
    const videoSize = statSync(videoPath).size;
    const CHUNK_SIZE = 10 ** 6;

    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    const contentLength = end - start + 1;
    const headers = {
        'Content-Range': `bytes ${start}-${end}/${videoSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': 'video/mp4',
    };
    res.writeHead(206, headers);

    if (videoCache[`${start}-${end}`])
        return res.end(videoCache[`${start}-${end}`]);

    const videoStream = createReadStream(videoPath, {start, end, autoClose: true});
    videoStream.pipe(res);

    return res;
}

function jsonResponse<T>(res: ServerResponse, code: number, data: T) {
    res.writeHead(code, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(data));
    return res;
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    switch (req.url) {
        case '/':
            return render(req, res);
        case '/video':
            return video(req, res);
        default:
            return jsonResponse(res, 404, {error: 'Not found'});
    }
});

const port = 3000;

server.listen(port, '0.0.0.0', () => {
    console.log(`Listening on http://localhost:${port}`);
});