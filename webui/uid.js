import { toast, exec, listPackages, getPackagesInfo } from 'kernelsu-alt';
import { modDir, bin, ksuDir, keyword } from './index.js';

let manager = [];
let currentUid = null;

async function getKsuManager() {
    try {
        const packages = await listPackages();
        const pkgInfos = await getPackagesInfo(packages);
        pkgInfos.forEach(pkg => {
            if (keyword.some(kw => pkg.appLabel.toLowerCase().includes(kw.toLowerCase()))) {
                manager.push({
                    packageName: pkg.packageName,
                    appLabel: pkg.appLabel,
                    uid: pkg.uid
                });
            }
        });
    } catch (e) {
        // Vite debug
        if (import.meta.env.DEV) {
            manager = [
                { packageName: "me.weishu.kernelsu", appLabel: "KernelSU", uid: "10006"},
                { packageName: "com.kowx712.supermanager", appLabel: "KowSU", uid: "10007"}
            ];
        }
    }
}

async function getCurrentUid() {
    await exec(`${bin} --getuid`, { env: { PATH: `$PATH:${modDir}` }}).then((result) => {
        if (result.errno !== 0 || result.stdout.trim() === '') return;
        currentUid = result.stdout.trim();
    }).catch(() => { });
}

async function setManager(uid, manager) {
    await exec(
        `${bin} --setuid ${uid} && { kill -9 $(busybox pidof ${manager}) || true; }`,
        { env: { PATH: `$PATH:${modDir}:${ksuDir}/bin` }}
    ).then((result) => {
        if (result.errno !== 0) {
            toast("Failed to crown manager: " + result.stderr);
        } else {
            toast("Success, root access might no longer avaible in current window.");
        }
    }).catch(() => { });
}

function saveManager(uid) {
    const cmd = uid ? `echo ${uid} >` : 'rm -rf';
    exec(`${cmd} ${ksuDir}/.manager_uid`).then((result) => {
        if (result.errno !== 0) toast("Failed to save manager_uid: " + result.stderr);
    }).catch(() => { });
}

export { manager, currentUid, getKsuManager, getCurrentUid, setManager, saveManager };
