import { issueSignedToken, presignUrl } from '@vercel/blob';
import { Sandbox } from '@vercel/sandbox';

const expiry = () => Date.now() + 15 * 60 * 1000;
async function signedGet(pathname: string) { const token = await issueSignedToken({ pathname, operations: ['get'], validUntil: expiry() }); return (await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil: expiry(), useCache: false })).presignedUrl; }
async function signedPut(pathname: string, type: string) { const token = await issueSignedToken({ pathname, operations: ['put'], validUntil: expiry(), allowedContentTypes: [type] }); return (await presignUrl(token, { pathname, operation: 'put', access: 'private', validUntil: expiry(), allowedContentTypes: [type], allowOverwrite: true, addRandomSuffix: false })).presignedUrl; }
function shell(value: string) { return `'${value.replaceAll("'", "'\\''")}'`; }
export async function assembleMovie(orderId: string, clips: { number: number; pathname: string; narration: string }[], kind: 'preview' | 'final') {
  const root = `/tmp/mcs-${orderId}-${kind}`; const output = `studio/orders/${orderId}/${kind}/movie.mp4`; const pdf = `studio/orders/${orderId}/final/storybook.pdf`;
  const sandbox = await Sandbox.create({ image: 'vercel/sandbox/universal:latest', persistent: false, timeout: 15 * 60 * 1000, resources: { vcpus: 2 } });
  try {
    // Preview assembly needs ffmpeg only. Do not install Chromium during preview: the previous
    // combined apt transaction failed in dpkg before ffmpeg could be used.
    const setupCommand = kind === 'preview'
      ? 'command -v ffmpeg >/dev/null || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ffmpeg)'
      : 'command -v ffmpeg >/dev/null || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ffmpeg)';
    const setup = await sandbox.runCommand('bash', ['-lc', setupCommand]);
    if (setup.exitCode !== 0) throw new Error(await setup.stderr());
    await sandbox.runCommand('bash', ['-lc', `mkdir -p ${shell(root)}`]);
    for (const clip of [...clips].sort((a, b) => a.number - b.number)) {
      const url = await signedGet(clip.pathname); const result = await sandbox.runCommand('bash', ['-lc', `curl --fail --location --silent --show-error ${shell(url)} --output ${shell(`${root}/${clip.number}.mp4`)}`]);
      if (result.exitCode !== 0) throw new Error(await result.stderr());
    }
    const manifest = [...clips].sort((a, b) => a.number - b.number).map((clip) => `file '${root}/${clip.number}.mp4'`).join('\n');
    await sandbox.fs.writeFile(`${root}/concat.txt`, manifest);
    const transcode = await sandbox.runCommand('bash', ['-lc', `ffmpeg -y -f concat -safe 0 -i ${shell(`${root}/concat.txt`)} -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart ${shell(`${root}/movie.mp4`)}`]);
    if (transcode.exitCode !== 0) throw new Error(await transcode.stderr());
    const upload = await sandbox.runCommand('bash', ['-lc', `curl --fail --location --silent --show-error -X PUT -H 'content-type: video/mp4' --upload-file ${shell(`${root}/movie.mp4`)} ${shell(await signedPut(output, 'video/mp4'))}`]);
    if (upload.exitCode !== 0) throw new Error(await upload.stderr());
    if (kind === 'final') {
      const chromiumSetup = await sandbox.runCommand('bash', ['-lc', 'command -v chromium >/dev/null || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends chromium)']);
      if (chromiumSetup.exitCode !== 0) throw new Error(await chromiumSetup.stderr());
      for (const clip of clips) await sandbox.runCommand('bash', ['-lc', `ffmpeg -y -i ${shell(`${root}/${clip.number}.mp4`)} -frames:v 1 ${shell(`${root}/${clip.number}.jpg`)}`]);
      const pages = [...clips].sort((a, b) => a.number - b.number).map((clip) => `<section><img src="file://${root}/${clip.number}.jpg"><p>${clip.narration.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</p></section>`).join('');
      await sandbox.fs.writeFile(`${root}/storybook.html`, `<style>@page{size:letter;margin:0.5in}section{page-break-after:always;font:20px serif}img{width:100%;height:6.5in;object-fit:contain}</style>${pages}`);
      const pdfResult = await sandbox.runCommand('bash', ['-lc', `chromium --headless --no-sandbox --allow-file-access-from-files --print-to-pdf=${shell(`${root}/storybook.pdf`)} file://${root}/storybook.html`]);
      if (pdfResult.exitCode !== 0) throw new Error(await pdfResult.stderr());
      const pdfUpload = await sandbox.runCommand('bash', ['-lc', `curl --fail --location --silent --show-error -X PUT -H 'content-type: application/pdf' --upload-file ${shell(`${root}/storybook.pdf`)} ${shell(await signedPut(pdf, 'application/pdf'))}`]);
      if (pdfUpload.exitCode !== 0) throw new Error(await pdfUpload.stderr());
    }
    return { moviePathname: output, storybookPathname: kind === 'final' ? pdf : undefined };
  } finally { await sandbox.runCommand('bash', ['-lc', `rm -rf ${shell(root)}`]).catch(() => undefined); await sandbox.stop().catch(() => undefined); }
}
