import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    'src',
    'components',
    'shared',
    'chart',
    'html',
    'chartMt5.html',
  );

  let html = await readFile(filePath, 'utf8');

  // Shim ReactNativeWebView -> window.parent for web iframe usage.
  const shim = `<script>(function(){if(!window.ReactNativeWebView){window.ReactNativeWebView={postMessage:function(msg){try{window.parent&&window.parent.postMessage(msg,'*')}catch(e){}}}}})();</script>`;
  html = html.replace('<head>', `<head>${shim}`);

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
