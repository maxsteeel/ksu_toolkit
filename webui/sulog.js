import { spawn, listPackages, getPackagesInfo } from 'kernelsu-alt';
import { modDir, bin, appendSuLogList } from './index.js';

let appList = [], sulogList = [], sulogOld = [];
const symbolMap = {
    'a': ['access'],
    's': ['stat'],
    'x': ['exec'],
    'i': ['ioctl'],
    '$': ['access', 'stat']
};

async function getAppList() {
    try {
        const pacakegs = await listPackages();
        const pkgInfos = await getPackagesInfo(pacakegs);
        pkgInfos.forEach(pkg => {
            appList.push({
                packageName: pkg.packageName,
                appLabel: pkg.appLabel,
                uid: pkg.uid
            });
        });
    } catch (e) {
        // Vite debug
        if (import.meta.env.DEV) {
            appList = [
                { packageName: "com.android.example", appLabel: "Example", uid: 10008 },
            ];
        }
    }
    
}

function getSulog() {
    let copy = [];
    const result = spawn(`${bin}`, ['--sulog'], { env: { PATH: `${modDir}` }});
    result.stdout.on('data', (data) => {
        // output format = sym: i uid: 010230
        const symbol = data.trim().split(' ')[1];
        const userId = parseInt(data.trim().split(' ')[3]);
        copy.push({ uid: userId, sym: symbol });
    });
    result.on('exit', () => {
        if (import.meta.env.DEV) { // Vite debug
            copy.push({ uid: 10008, sym: '$' });
        }

        // Since sulog give a maximum 100 lines of output so we need this to compare the overlapping length
        let overlap = 0;
        const maxLen = Math.min(sulogOld.length, copy.length);
        for (let len = maxLen; len >= 0; len--) {
            const suffix = sulogOld.slice(sulogOld.length - len);
            const prefix = copy.slice(0, len);
            if (JSON.stringify(suffix) === JSON.stringify(prefix)) {
                overlap = len;
                break;
            }
        }

        const newItems = copy.slice(overlap);
        sulogList.push(...newItems);
        appendSuLogList(newItems);
        sulogOld = [...copy];
    });
}

function parseSymbol(sym) {
    return symbolMap[sym] || [sym];
}

export { appList, sulogList, symbolMap, getAppList, getSulog, parseSymbol }
