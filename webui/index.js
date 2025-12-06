import { toast, exec, listPackages, getPackagesInfo } from 'kernelsu-alt';
import '@material/web/fab/fab.js';
import '@material/web/icon/icon.js';
import '@material/web/radio/radio.js';
import '@material/web/ripple/ripple.js';
import '@material/web/switch/switch.js';

const modDir = '/data/adb/modules/ksu_toolkit';
const ksuDir = '/data/adb/ksu';
const keyword = [
    "KernelSU",
    "SukiSU",
    "KowSU"
];
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
    await exec("toolkit --getuid", { env: { PATH: `$PATH:${modDir}` }}).then((result) => {
        if (result.errno !== 0 || result.stdout.trim() === '') return;
        currentUid = result.stdout.trim();
    });
}

function appendManagerList() {
    const managerList = document.getElementById('manager-list');
    managerList.innerHTML = '';
    if (manager.length === 0) document.getElementById('empty').style.display = "block";
    manager.forEach(item => {
        const container = document.createElement('div');
        container.className = 'manager-list-item';
        container.innerHTML = `
            <label for="${item.packageName}">
                <img class="app-icon" src="ksu://icon/${item.packageName}" />
                <div class="app-info">
                    <span class="app-label">
                        ${item.appLabel}
                        <div class="app-uid">${item.uid}</div>
                    </span>
                    <span class="package-name">${item.packageName}</span>
                </div>
            </label>
            <md-radio id="${item.packageName}" name="manager-group" value="${item.uid.toString()}"></md-radio>
            <md-ripple></md-ripple>
        `;
        if (currentUid && item.uid == currentUid) {
            container.querySelector('md-radio').checked = true;
        }
        managerList.append(container);
    });
}

async function setManager(uid, manager) {
    await exec(
        `toolkit --setuid ${uid} && { kill -9 $(busybox pidof ${manager}) || true; }`,
        { env: { PATH: `$PATH:${modDir}:${ksuDir}/bin` }}
    ).then((result) => {
        if (result.errno !== 0) {
            toast("Failed to crown manager: " + result.stderr);
        } else {
            toast("Success, root access might no longer avaible in current window.");
        }
    });
}

function saveManager(uid) {
    const cmd = uid ? `echo ${uid} >` : 'rm -rf';
    exec(`${cmd} ${ksuDir}/.manager_uid`).then(({result}) => {
        if (result.errno !== 0) toast("Failed to save manager_uid: " + result.stderr);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('[unresolved]').forEach(el => el.removeAttribute('unresolved'));
    await getKsuManager();
    await getCurrentUid();
    appendManagerList();

    const saveSwitch = document.getElementById('save');
    if (manager.length === 0) {
        saveSwitch.selected = false;
        saveSwitch.disabled = true;
        saveManager();
    } else {
        exec(`cat ${ksuDir}/.manager_uid`).then((result) => {
            if (result.stdout.trim() !== '') saveSwitch.selected = true;
        });
    }
    saveSwitch.addEventListener('change', () => {
        if (saveSwitch.selected) {
            document.querySelectorAll('md-radio').forEach(radio => {
                if (!radio.checked) return;
                saveManager(radio.value);
            });
        } else {
            saveManager();
        }
    });

    document.getElementById('crown').onclick = () => {
        document.querySelectorAll('md-radio').forEach(radio => {
            if (!radio.checked) return;
            saveManager(saveSwitch.selected ? radio.value : null);
            setManager(radio.value, radio.id);
        });
    }
});
