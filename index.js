// import modules

const { app, BrowserWindow, dialog } = require("electron");
const ipc = require("electron").ipcMain;

const fs = require("fs");
const pako = require('pako');

let w;          // main window

app.on("ready", () => {     // make the window, show the html file in it and close the app when the window is closed
    w = new BrowserWindow({
        webPreferences: { 
            nodeIntegration: true       // this right here is the reason i am not a professional app dev
        }         
    });

    w.loadFile("index.html");

    w.on("closed", () => {
        app.quit();
    });
});

decodeXor = (str, key) => {         // this function, like, does some weird decody shit (thanks gdcolon)
    /**
     * @param {String} str The data to decode
     * @param {Integrer} key The decoding key
     */

    str = String(str).split('').map(letter => letter.charCodeAt());
    let res = "";
    for (let i in str) res += String.fromCodePoint(str[i] ^ key);
    return res;
};

decodeBase64 = str => {         // this function, like, does some weird decody shit (thanks smjs)
    /**
     * @param {String} str The string to decode
     */

    return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
};

getLevelValue = (lvl, key, type) => {         // gets a key value from a level's data
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

function whip(msg) {         // status message in console and also in app so i don't have to call both of these mfs twice every time
    // DON'T ASK WHY I CALLED IT 'WHIP'
    console.log(msg);
    w.webContents.send("main", JSON.stringify({ action: "info", info: msg }));
}

ipc.on("main", (event, arg) => {        // when window sends a message
    const args = JSON.parse(arg);       // the message is a JSON object because best way to transfer data

    switch (args.action) {              // switch the action parameter of the message
        case "level-path":
            const levelPath = dialog.showOpenDialogSync()[0];       // prompt the user to select a file
            try {
                fs.accessSync(levelPath);           // check if the file exists

                if (levelPath.endsWith(".gmd")) {       // arbitary check to see if it's a .gmd file
                    whip("Decoding file...");

                    const levelFile = fs.readFileSync(levelPath, "utf8");       // read the file, because, like, it's been verified n shit

                    whip(`Level: ${getLevelValue(levelFile, "k2", "s")}`);
            
                    let buffer;     // start, like, a buffer
                    try {
                        buffer = pako.inflate(Buffer.from(getLevelValue(levelFile, "k4", "s"), 'base64'), { to:"string" } );    // literally no clue i just copied this straight off gdbrowser
                        levelData = buffer.toString("utf8");   
                        levelObj = levelData.split(";").splice(1,levelData.split(";").length-2);        // split the level data on every ; to get all the objects

                        let xPos = [];
                        let yPos = [];
                        levelObj.forEach(o => {     // loop through all objects and collect the key-value pairs, then push the x and y positions of objects to two arrays
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

                        w.webContents.send("main", JSON.stringify({ action: "level-data", x: xPos, y: yPos }));     // send the x and y poss of all objects to main window to deal with
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