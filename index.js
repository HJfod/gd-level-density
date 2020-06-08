const { app, BrowserWindow, dialog } = require("electron");
const ipc = require("electron").ipcMain;

const fs = require("fs");
const pako = require('pako');
const readline = require('readline');
const path = require("path");

let w;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

app.on("ready", () => {
    w = new BrowserWindow({ webPreferences: { nodeIntegration: true } });

    w.loadFile("index.html");

    w.on("closed", () => {
        app.quit();
    });
});

decodeXor = (str, key) => {
    /**
     * @param {String} str The data to decode
     * @param {Integrer} key The decoding key
     */

    str = String(str).split('').map(letter => letter.charCodeAt());
    let res = "";
    for (let i in str) res += String.fromCodePoint(str[i] ^ key);
    return res;
};

decodeBase64 = str => {
    /**
     * @param {String} str The string to decode
     */

    return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
};

getLevelValue = (lvl, key, type) => {
    /**
     * @param {String} lvl Level data
     * @param {String} key The key to get
     * @param {String} type The type of key to get
     */

    if (type === null){
        return lvl.split(`<k>${key}</k>`).pop().substring(0,100);
    }
    if (type){
        return lvl.split(`<k>${key}</k><${type}>`).pop().substring(0,lvl.split(`<k>${key}</k><${type}>`).pop().indexOf('<'));
    }else{
        return lvl.split(`<k>${key}</k>`).pop().substring(0,lvl.split(`<k>${key}</k>`).pop().indexOf('>')).includes("t");
    }
};

function whip(msg) {
    console.log(msg);
    w.webContents.send("main", JSON.stringify({ action: "info", info: msg }));
}

ipc.on("main", (event, arg) => {
    const args = JSON.parse(arg);

    switch (args.action) {
        case "level-path":
            const levelPath = dialog.showOpenDialogSync()[0];
            try {
                fs.accessSync(levelPath);

                if (levelPath.endsWith(".gmd")) {
                    whip("Decoding file...");

                    const levelFile = fs.readFileSync(levelPath, "utf8");

                    whip(`Level: ${getLevelValue(levelFile, "k2", "s")}`);
            
                    let buffer;
                    try {
                        buffer = pako.inflate(Buffer.from(getLevelValue(levelFile, "k4", "s"), 'base64'), { to:"string" } );
                        levelData = buffer.toString("utf8");
                        levelObj = levelData.split(";").splice(1,levelData.split(";").length-2);

                        let xPos = [];
                        let yPos = [];
                        levelObj.forEach(o => {
                            let keys = [];
                            let d = o.split(",");
                            for (let i = 0; i < d.length; i += 2) {
                                keys.push({ k: d[i], v: d[i+1]});
                            }
                            keys.forEach(i => {
                                if (i.k == "2") {
                                    xPos.push(i.v);
                                }
                                if (i.k == "3") {
                                    yPos.push(i.v);
                                }
                            });
                        });
                        console.log(`Object count: ${levelObj.length}`);

                        w.webContents.send("main", JSON.stringify({ action: "level-data", x: xPos, y: yPos }));
                    } catch(e) {
                        whip(e);
                    }

                } else {
                    whip("This does not appear to be a .gmd file.");
                }
            } catch (e) {
                whip(e);
            }
            break;
    }
});