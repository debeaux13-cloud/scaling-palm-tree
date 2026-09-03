import { issueSignedToken, presignUrl } from '@vercel/blob';
import { Sandbox } from '@vercel/sandbox';

const expiry = () => Date.now() + 15 * 60 * 1000;
async function signedGet(pathname: string) { const token = await issueSignedToken({ pathname, operations: ['get'], validUntil: expiry() }); return (await presignUrl(token, { pathname, operation: 'get', access: 'private', validUntil: expiry(), useCache: false })).presignedUrl; }
async function signedPut(pathname: string, type: string) { const token = await issueSignedToken({ pathname, operations: ['put'], validUntil: expiry(), allowedContentTypes: [type] }); return (await presignUrl(token, { pathname, operation: 'put', access: 'private', validUntil: expiry(), allowedContentTypes: [type], allowOverwrite: true, addRandomSuffix: false })).presignedUrl; }
function shell(value: string) { return `'${value.replaceAll("'", "'\\''")}'`; }
export async function assembleMovie(orderId: string, clips: { number: number; pathname: string; narration: string }[], kind: 'preview' | 'final') {
  const root = `/tmp/mcs-${orderId}-${kind}`; const output = `studio/orders/${orderId}/${kind}/movie.mp4`;
  const sandbox = await Sandbox.create({ image: 'vercel/sandbox/arch:latest', persistent: false, timeout: 15 * 60 * 1000, resources: { vcpus: 2 } });
  try {
    const installPackages = async (...packages: string[]) => {
      const install = await sandbox.runCommand({ cmd: 'bash', args: ['-lc', `pacman -Sy --noconfirm ${packages.map(shell).join(' ')}`], sudo: true });
      if (install.exitCode !== 0) throw new Error(await install.stderr());
    };
    if ((await sandbox.runCommand('bash', ['-lc', 'command -v ffmpeg >/dev/null'])).exitCode !== 0) await installPackages('ffmpeg');
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
    return { moviePathname: output };
  } finally { await sandbox.runCommand('bash', ['-lc', `rm -rf ${shell(root)}`]).catch(() => undefined); await sandbox.stop().catch(() => undefined); }
}
