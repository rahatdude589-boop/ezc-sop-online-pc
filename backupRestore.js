
/* ================= BACKUP ALL ================= */
async function backupAll() {
     const user = JSON.parse(localStorage.getItem("user"));
    const USER_ID = user.id;
    // LocalStorage backup
    const localStorageData = JSON.stringify(localStorage);
    downloadFile("localStorage_backup.json", localStorageData);

    // IndexedDB backup
    
   const dbs = ["POS_DB"+ USER_ID,"REFUND_DB"+ USER_ID, "STOCK_HISTORY_DB"+ USER_ID,"VENDOR_DB"+ USER_ID]; // add all your DB names
   // "PRODUCT_DB"+ USER_ID, "SALE_DB"+ USER_ID, 
   //const dbs = ["MASTER_DB_"+ USER_ID];
    for (const dbName of dbs) {
        await exportIndexedDB(dbName);
    }

    alert("All data exported successfully!");
}

/* ================= EXPORT SINGLE INDEXEDDB ================= */
function exportIndexedDB(dbName) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);

        req.onsuccess = e => {
            const db = e.target.result;
            const exportObj = {};

            const transactionPromises = [];
            for (const storeName of db.objectStoreNames) {
                const tx = db.transaction(storeName, "readonly");
                const store = tx.objectStore(storeName);
                const getAll = store.getAll();

                transactionPromises.push(new Promise((res, rej) => {
                    getAll.onsuccess = () => {
                        exportObj[storeName] = getAll.result;
                        res();
                    };
                    getAll.onerror = rej;
                }));
            }

            Promise.all(transactionPromises).then(() => {
                downloadFile(`${dbName}_backup.json`, JSON.stringify(exportObj, null, 2));
                resolve();
            }).catch(err => reject(err));
        };

        req.onerror = e => reject(e);
    });
}

/* ================= DOWNLOAD FILE UTILITY ================= */
function downloadFile(filename, content) {
    const link = document.createElement("a");
    link.href = "data:text/json;charset=utf-8," + encodeURIComponent(content);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/* ================= RESTORE ALL ================= */
async function restoreAll(files) {
    for (const file of files) {
        const text = await file.text();
        if (file.name.includes("localStorage")) {
            const data = JSON.parse(text);
            for (const key in data) {
                localStorage.setItem(key, data[key]);
            }
        } else {
            // assume it's IndexedDB
            const dbName = file.name.split("_backup")[0];
            const data = JSON.parse(text);
            await restoreIndexedDB(dbName, data);
        }
    }
    alert("All data restored successfully!");
    location.reload(); // refresh to load new data
}

/* ================= RESTORE SINGLE INDEXEDDB ================= */
function restoreIndexedDB(dbName, data) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);

        req.onupgradeneeded = e => {
            const db = e.target.result;
            for (const storeName in data) {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
                }
            }
        };

        req.onsuccess = e => {
            const db = e.target.result;
            const promises = [];

            for (const storeName in data) {
                const tx = db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);

                promises.push(...data[storeName].map(item => new Promise(res => {
                    const putReq = store.put(item);
                    putReq.onsuccess = () => res();
                })));
            }

            Promise.all(promises).then(resolve).catch(reject);
        };

        req.onerror = e => reject(e);
    });
}

/* ================= EXPORT BUTTONS ================= */
window.backupAll = backupAll;
window.restoreAll = restoreAll;