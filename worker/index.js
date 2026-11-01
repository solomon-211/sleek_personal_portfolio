// Static assets ignore Range requests, which Safari needs to play video.
// Only /images/*.mp4 reaches this Worker (see run_worker_first in wrangler.jsonc).
export default {
    async fetch(request, env) {
        const asset = await env.ASSETS.fetch(request.url);
        const range = request.headers.get('Range');
        if (!asset.ok) return asset;

        const headers = new Headers(asset.headers);
        headers.set('Accept-Ranges', 'bytes');
        if (!range) return new Response(asset.body, { status: asset.status, headers });

        const body  = await asset.arrayBuffer();
        const size  = body.byteLength;
        const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
        let start = NaN;
        let end   = size - 1;
        if (match && match[1]) {
            start = Number(match[1]);
            if (match[2]) end = Math.min(Number(match[2]), size - 1);
        } else if (match && match[2]) {
            start = Math.max(size - Number(match[2]), 0);
        }

        if (!(start <= end)) {
            headers.delete('Content-Length');
            headers.set('Content-Range', `bytes */${size}`);
            return new Response(null, { status: 416, headers });
        }

        headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
        headers.set('Content-Length', String(end - start + 1));
        return new Response(body.slice(start, end + 1), { status: 206, headers });
    },
};
