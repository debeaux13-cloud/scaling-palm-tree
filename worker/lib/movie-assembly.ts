import { issueSignedToken, presignUrl } from '@vercel/blob';
import { Sandbox } from '@vercel/sandbox';

const expiry = () => Date.now() + 15 * 60 * 1000;
async function signedGet(pathname: string) { const token = await issueSignedToken({ pathname, operations: ['get'], validUntil: expiry() }); return (await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil: expiry(), useCache: false })).presignedUrl; }
async function signedPut(pathname: string, type: string) { const token = await issueSignedToken({ pathname, operations: ['put'], validUntil: expiry(), allowedContentTypes: [type] }); return (await presignUrl(token, { pathname, operation: 'put', access: 'private', validUntil: expiry(), allowedContentTypes: [type], allowOverwrite: true, addRandomSuffix: false })).presignedUrl; }
function shell(value: string) { return `'${value.replaceAll("'", "'\\''")}'`; }
export async function assembleMovie(orderId: string, clips: { number: number; pathname: string; narration: string }[], kind: 'preview' | 'final') {
  const root = `/tmp/mcs-${orderId}-${kind}`; const output = `studio/orders/${orderId}/${kind}/movie.mp4`;
  console.info('[MovieAssembly] starting', { orderId, kind, clipCount: clips.length, output });
  const sandbox = await Sandbox.create({ image: 'vercel/sandbox/arch:latest', persistent: false, timeout: 15 * 60 * 1000, resources: { vcpus: 2 } });
  console.info('[MovieAssembly] sandbox created', { orderId, kind });
  try {
    const installPackages = async (...packages: string[]) => {
      console.info('[MovieAssembly] installing packages', { orderId, kind, packages });
      const install = await sandbox.runCommand({ cmd: 'bash', args: ['-lc', `pacman -Sy --noconfirm ${packages.map(shell).join(' ')}`], sudo: true });
      if (install.exitCode !== 0) throw new Error(`[MovieAssembly] package install failed: ${await install.stderr()}`);
    };
    const ffmpegCheck = await sandbox.runCommand('bash', ['-lc', 'command -v ffmpeg >/dev/null']);
    if (ffmpegCheck.exitCode !== 0) await installPackages('ffmpeg');
    console.info('[MovieAssembly] ffmpeg ready', { orderId, kind });
    const mkdir = await sandbox.runCommand('bash', ['-lc', `mkdir -p ${shell(root)}`]);
    if (mkdir.exitCode !== 0) throw new Error(`[MovieAssembly] mkdir failed: ${await mkdir.stderr()}`);
    const sorted = [...clips].sort((a, b) => a.number - b.number);
    for (const clip of sorted) {
      console.info('[MovieAssembly] downloading clip', { orderId, kind, sceneNumber: clip.number });
      const url = await signedGet(clip.pathname);
      const result = await sandbox.runCommand('bash', ['-lc', `curl --fail --location --silent --show-error ${shell(url)} --output ${shell(`${root}/${clip.number}.mp4`)}`]);
      if (result.exitCode !== 0) throw new Error(`[MovieAssembly] clip ${clip.number} download failed: ${await result.stderr()}`);
    }
    console.info('[MovieAssembly] all clips downloaded', { orderId, kind, clipCount: sorted.length });
    const manifest = sorted.map((clip) => `file '${root}/${clip.number}.mp4'`).join('\n');
    await sandbox.fs.writeFile(`${root}/concat.txt`, manifest);
    console.info('[MovieAssembly] concat manifest written', { orderId, kind });
    console.info('[MovieAssembly] ffmpeg transcode starting', { orderId, kind });
    const transcode = await sandbox.runCommand('bash', ['-lc', `ffmpeg -y -f concat -safe 0 -i ${shell(`${root}/concat.txt`)} -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart ${shell(`${root}/movie.mp4`)}`]);
    if (transcode.exitCode !== 0) throw new Error(`[MovieAssembly] ffmpeg failed: ${await transcode.stderr()}`);
    console.info('[MovieAssembly] ffmpeg transcode complete', { orderId, kind });
    const verify = await sandbox.runCommand('bash', ['-lc', `test -s ${shell(`${root}/movie.mp4`)} && stat -c '%s' ${shell(`${root}/movie.mp4`)}`]);
    if (verify.exitCode !== 0) throw new Error(`[MovieAssembly] final movie missing or empty: ${await verify.stderr()}`);
    console.info('[MovieAssembly] final movie verified', { orderId, kind, bytes: (await verify.stdout()).trim() });
    console.info('[MovieAssembly] upload starting', { orderId, kind, output });
    const upload = await sandbox.runCommand('bash', ['-lc', `curl --fail --location --silent --show-error -X PUT -H 'content-type: video/mp4' --upload-file ${shell(`${root}/movie.mp4`)} ${shell(await signedPut(output, 'video/mp4'))}`]);
    if (upload.exitCode !== 0) throw new Error(`[MovieAssembly] upload failed: ${await upload.stderr()}`);
    console.info('[MovieAssembly] upload complete', { orderId, kind, output });
    return { moviePathname: output };
  } catch (error) {
    console.error('[MovieAssembly] failed', { orderId, kind, error });
    throw error;
  } finally {
    console.info('[MovieAssembly] cleanup starting', { orderId, kind });
    await sandbox.runCommand('bash', ['-lc', `rm -rf ${shell(root)}`]).catch(() => undefined);
    await sandbox.stop().catch(() => undefined);
    console.info('[MovieAssembly] cleanup complete', { orderId, kind });
  }
}
