import { exec } from 'kernelsu-alt';
import '@material/web/fab/fab.js';
import '@material/web/icon/icon.js';
import '@material/web/radio/radio.js';
import '@material/web/ripple/ripple.js';
import '@material/web/switch/switch.js';
import * as uidModule from './uid.js';

export const modDir = '/data/adb/modules/ksu_toolkit';
export const bin = 'toolkit';
export const ksuDir = '/data/adb/ksu';
export const keyword = [
    "KernelSU",
    "SukiSU",
    "KowSU"
];

function appendManagerList() {
    const managerList = document.getElementById('manager-list');
    managerList.innerHTML = '';
    if (uidModule.manager.length === 0) document.getElementById('empty').style.display = "block";
    uidModule.manager.forEach(item => {
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
        if (uidModule.currentUid && item.uid == uidModule.currentUid) {
            container.querySelector('md-radio').checked = true;
        }
        managerList.append(container);
    });
}

function setupUidPageListener() {
    const saveSwitch = document.getElementById('save');
    const crownBtn = document.getElementById('crown');

    if (uidModule.manager.length === 0) {
        saveSwitch.selected = false;
        uidModule.saveManager();
    } else {
        saveSwitch.disabled = false;
        exec(`cat ${ksuDir}/.manager_uid`).then((result) => {
            saveSwitch.selected = result.stdout.trim() !== '';
        });
    }

    saveSwitch.addEventListener('change', () => {
        if (saveSwitch.selected) {
            document.querySelectorAll('md-radio').forEach(radio => {
                if (!radio.checked) return;
                uidModule.saveManager(radio.value);
            });
        } else {
            uidModule.saveManager();
        }
    });

    crownBtn.classList.add('show');
    crownBtn.onclick = () => {
        document.querySelectorAll('md-radio').forEach(radio => {
            if (!radio.checked) return;
            uidModule.saveManager(saveSwitch.selected ? radio.value : null);
            uidModule.setManager(radio.value, radio.id);
        });
    }
}

function checkUidFeature() {
    exec(
        `${bin} --setuid $(${bin} --getuid) || exit 1`,
        { env: { PATH: `$PATH:${modDir}` }}
    ).then((result) => {
        if (result.errno !== 0 && !import.meta.env.DEV) {
            document.getElementById('unsupported').style.display = 'block';
            return;
        }
        appendManagerList();
        setupUidPageListener();
    }).catch(() => { });
}

document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('[unresolved]').forEach(el => el.removeAttribute('unresolved'));

    // Uid feature init
    await uidModule.getKsuManager();
    await uidModule.getCurrentUid();
    checkUidFeature();
});
