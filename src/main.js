/*jshint esversion: 8 */
const {
    app,
    ipcMain,
    BrowserWindow,
    BrowserView,
    Tray,
    dialog,
    globalShortcut
} = require('electron');
const {autoUpdater} = require("electron-updater")

const path = require('path');
//const URL = require('url').URL
const validator = require('validator');
const request = require('request')
const client = require('./plugins/rpc-helper')('558712944511156236');
const getArtistTitle = require('get-artist-title')
const icon = path.join(__dirname, 'assets/icons/256x256.png');
const grayicon = path.join(__dirname, 'assets/icons/256x256mono.png');
autoUpdater.checkForUpdatesAndNotify()

//fuck me what is this dogshit
let tray, notificationWindow, mainWindow, loadingWindow, view, discordrichupdater;

//also use this ffs (objects)
let songinfo = {}
let discordinfo = {}


app.on('ready', createWindow); // create main window

//Lord microsoft doesnt want that we buy youtube's stuff without their api
//so we're gonna comply because ;-;
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl)
        //delet debug stuff before release
        //if this comment ends up on github im dumb, also hi, how are you doing?
        //also, fuck this doesnt work
        if (navigationUrl === 'https://music.youtube.com/music_premium') {
            console.log(navigationUrl)
            console.log(parsedUrl)
            event.preventDefault()
        }
    })
})

function createWindow() {
    // startup screen
    loadingWindow = new BrowserWindow({
        backgroundColor: '#00FFFFFF',
        width: 256,
        height: 256,
        transparent: true,
        resizable: false,
        alwaysOnTop: false,
        frame: false,
        skipTaskbar: true,
        type: `toolbar`
    });
    loadingWindow.loadFile('./src/assets/icons/icon.html');
    loadingWindow.setMenuBarVisibility(false);
    loadingWindow.setIgnoreMouseEvents(true);

    // main window
    mainWindow = new BrowserWindow({
        icon: icon,
        backgroundColor: '#000000',
        show: false,
        MenuBarVisibility: false,
        width: 1280,
        height: 720,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    });

    //help with login problems
    mainWindow.webContents.session.setUserAgent(
        "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/71.0"
    );

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile('./src/frame.html');
    view = new BrowserView({
        webPreferences: {nodeIntegration: false}
    });
    view.setBounds({x: 0, y: 20, width: 1280, height: 700});
    view.setAutoResize({
        width: true,
        height: true
    });
    view.webContents.loadURL('https://music.youtube.com');
    mainWindow.setBrowserView(view);
    mainWindow.on('closed', function () {
        app.quit();
    });

    //finished loading
    view.webContents.once('did-finish-load', function () {
        mainWindow.show();
        loadingWindow.destroy();
        globalShortcut.register('Alt+x', () => {
            updatesonginfo()
            sendnotification(songinfo.title, songinfo.artist, songinfo.img)
        });
        initializetray();

        client.updatePresence({
            state: 'Nothing playing',
            largeImageKey: '512x512',
            smallImageKey: 'paused'
        });
        songinfo.isplaying = false
    });

    // notifications window
    notificationWindow = new BrowserWindow({
        backgroundColor: '#00FFFFFF',
        width: 1920,
        height: 1080,
        transparent: true,
        resizable: false,
        alwaysOnTop: true,
        frame: false,
        skipTaskbar: true,
        type: `toolbar`,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    });
    notificationWindow.setIgnoreMouseEvents(true);
    notificationWindow.webContents.openDevTools()
    notificationWindow.setMenuBarVisibility(false);
    notificationWindow.loadFile('./src/assets/notifications/notificationbeta.html');

    //discord rich presence & notifications activator
    view.webContents.on('media-paused', function () {
        if (discordrichupdater)
            clearInterval(discordrichupdater)
        client.updatePresence({
            state: 'Paused',
            largeImageKey: '512x512',
            smallImageKey: 'paused'
        });
        songinfo.isplaying = false
    });
    view.webContents.on('media-started-playing', function () {
        songinfo.isplaying = true
        setTimeout(async function () {
            discordrichupdater = setInterval(discordrichpresencesyncer, 3000);
            await updatesonginfo()
            discordrichpresencesyncer()
            sendnotification(songinfo.title, songinfo.artist, songinfo.img);
        }, 750);

    });

    ipcMain.on('senddiscord', (event, arg) => {
        pushsong();
    })
    ipcMain.on('download', (event, arg) => {
        downloadsong();
    })

    client.on('spectate', (secret) => {
        if (secret.length === 11 && validator.isBase64(secret, {urlSafe: true}))
            view.webContents.loadURL('https://music.youtube.com/watch?v=' + secret);
    });
    client.on('connected', (user) => {
        discordinfo.id = user.id
        discordinfo.name = user.username
        discordinfo.tag = user.discriminator
        discordinfo.avatar = user.avatar
        discordinfo.isconnected = true //the madlad declared an object as a bool, you did it... you nasty bastard
    });


// friendly reminder for myself: keep all the functions under this fucking comment, you moron, you fool... got it?           probably not

    // tray
    function initializetray() {
        tray = new Tray(icon);
        tray.setToolTip('YtDesktop');
        tray.on('click', () => {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
                tray.setImage(grayicon);
            } else {
                mainWindow.show();
                tray.setImage(icon);
            }
        });
    }

    // Notification Helper
    function sendnotification(text1, text2, image) {
        let safeimage
        if (image && validator.isURL(image))
            safeimage = image
        notificationWindow.webContents.executeJavaScript(`changesong("${validator.escape(text1)}", "${validator.escape(text2)}", "${safeimage}")`);
    }

    async function discordrichpresencesyncer() {
        await updatesonginfo()

        //seems like this is the fastest one https://stackoverflow.com/questions/6665997/switch-statement-for-greater-than-less-than#6666246
        let percent = songinfo.percent
        let image
        if (percent < 10)
            image = "10"
        else if (percent < 30)
            image = "30"
        else if (percent < 70)
            image = "70"
        else if (percent < 90) {
            image = "90"
        }

        client.updatePresence({
            state: `Author: ${songinfo.artist}`,
            details: `Title: ${songinfo.title}`,
            largeImageKey: image,
            smallImageKey: 'playing',
            instance: true,
            spectateSecret: songinfo.link,
            startTimestamp: Date.now() - (songinfo.time * 1000),
            endTimestamp: Date.now() + ((songinfo.timefinish - songinfo.time) * 1000)
        });
    }

    async function overlaysyncer() {
        await notificationWindow.webContents.executeJavaScript(`updateoverlay()`);
        console.log("sync")
    }









    async function gettime() {
        let result = await view.webContents.executeJavaScript("document.getElementById('progress-bar').getAttribute('aria-valuenow');")
        return result.trim();
    }

    async function getfinishtime() {
        let result = await view.webContents.executeJavaScript("document.getElementById('progress-bar').getAttribute('aria-valuemax');")
        return result.trim();
    }

    async function gettitle() {
        let result = await view.webContents.executeJavaScript("document.getElementsByClassName('title ytmusic-player-bar')[0].innerText")
        return result.trim()
    }

    async function getartist() {
        let result = await view.webContents.executeJavaScript(
            `var bar = document.getElementsByClassName('subtitle ytmusic-player-bar')[0];
                   var title = bar.getElementsByClassName('yt-simple-endpoint yt-formatted-string');
                   if( !title.length ) { title = bar.getElementsByClassName('byline ytmusic-player-bar') }
                   title[0].innerText`)
        return result.trim();
    }

    async function getid() {
        let result = await view.webContents.executeJavaScript("document.getElementsByClassName('ytp-title-link yt-uix-sessionlink')[0].href")
        return result.split("=").pop().trim();
    }

    async function getimg() {
        let result = await view.webContents.executeJavaScript("document.getElementsByClassName('image style-scope ytmusic-player-bar')[0].src;")
        if (!result) return undefined
        return result.split('=')[0].trim() + "=w250";
    }

    async function updatesonginfo() {
        //i should change to promise.all even if the benefit is small

        let temptitle = await gettitle()
        let tempartist = await getartist()
        const [ artist, title ] = getArtistTitle(temptitle, {
            defaultArtist: tempartist,
            defaultTitle: temptitle
        })
        songinfo.title = title
        songinfo.artist = artist
        songinfo.link = await getid()
        songinfo.img = await getimg()
        songinfo.time = await gettime()
        songinfo.timefinish = await getfinishtime()
        songinfo.percent = ((songinfo.time * 100) / songinfo.timefinish)
        //await songinfo.isplaying = tbd
        //overlaysyncer()
    }


    async function pushsong() {
        await updatesonginfo()
        console.log(songinfo.time)
        request.post({
            uri: 'http://localhost:3000/bruh',
            json: {songe: songinfo.link, userid: discordinfo.id, time: songinfo.time}
        })
    }

}// oh boy the end of the suffering
