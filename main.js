/*jshint esversion: 6 */
const {
    app,
    ipcMain,
    BrowserWindow,
    BrowserView,
    Tray,
    globalShortcut
} = require('electron');
const { autoUpdater } = require("electron-updater")
const path = require('path');
const URL = require('url').URL
const client = require('./plugins/rpc-helper')('558712944511156236');
const validator = require('validator');
const request = require('request')
const icon = path.join(__dirname, 'assets/icons/256x256.png');
const grayicon = path.join(__dirname, 'assets/icons/256x256mono.png');
const getArtistTitle = require('get-artist-title')
autoUpdater.checkForUpdatesAndNotify()

//fuck me what is this dogshit
let tray, notificationWindow, mainWindow, loadingWindow, view, percentimage, discordrichupdater;

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
    loadingWindow.loadFile('assets/icons/icon.html');
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
        webPreferences: {nodeIntegration: true}
    });

    //help with login problems
    mainWindow.webContents.session.setUserAgent(
        "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/71.0"
    );

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile('frame.html');
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
        loadingWindow.close();
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
        type: `toolbar`
    });
    notificationWindow.setIgnoreMouseEvents(true);
    notificationWindow.setMenuBarVisibility(false);
    notificationWindow.loadFile('assets/notifications/notificationbeta.html');

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

    client.on('spectate', (secret) => {
        if (secret.length === 11 && isBase64(secret, {urlSafe: true}))
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
        if (image)
            if (validator.isURL(image))
                safeimage = image
        notificationWindow.webContents.executeJavaScript(`changesong("${validator.escape(text1)}", "${validator.escape(text2)}", "${safeimage}")`);
    }

    async function discordrichpresencesyncer() {
        await updatesonginfo()


        songpercent = ((songinfo.time * 100) / songinfo.timefinish)
        if (songpercent < 10)
            percentimage = "10"
        else if (songpercent < 30)
            percentimage = "30"
        else if (songpercent < 70)
            percentimage = "70"
        else if (songpercent < 90)
            percentimage = "90"

        client.updatePresence({
            state: `Author: ${songinfo.artist}`,
            details: `Title: ${songinfo.title}`,
            largeImageKey: percentimage,
            smallImageKey: 'playing',
            instance: true,
            spectateSecret: songinfo.link,
            startTimestamp: Date.now() - (songinfo.time * 1000),
            endTimestamp: Date.now() + ((songinfo.timefinish - songinfo.time) * 1000)
        });
    }

    async function overlaysyncer() {
        console.log(songinfo.percent)
        notificationWindow.webContents.executeJavaScript(`updateoverlay("${songinfo.percent}")`);
        console.log("sync")
    }

    function gettime() {
        return view.webContents.executeJavaScript("document.getElementById('progress-bar').getAttribute('aria-valuenow');")
            .then((result) => {
                return result.trim();
            });
    }

    function getfinishtime() {
        return view.webContents.executeJavaScript("document.getElementById('progress-bar').getAttribute('aria-valuemax');")
            .then((result) => {
                return result.trim();
            });
    }

    function gettitle() {
        return view.webContents.executeJavaScript("document.getElementsByClassName('title ytmusic-player-bar')[0].innerText")
            .then((result) => {
                return result.trim();
            });
    }

    function getartist() {
        return view.webContents.executeJavaScript(
            `var bar = document.getElementsByClassName('subtitle ytmusic-player-bar')[0];
                   var title = bar.getElementsByClassName('yt-simple-endpoint yt-formatted-string');
                   if( !title.length ) { title = bar.getElementsByClassName('byline ytmusic-player-bar') }
                   title[0].innerText`)
            .then((result) => {
                return result.trim();
            });
    }

    function getlink() {
        return view.webContents.executeJavaScript("document.getElementsByClassName('ytp-title-link yt-uix-sessionlink')[0].href")
            .then((result) => {
                return result.split("=").pop().trim();
            });
    }

    function getimg() {
        return view.webContents.executeJavaScript("document.getElementsByClassName('image style-scope ytmusic-player-bar')[0].src;")
            .then((result) => {
                if (!result) return undefined
                var sanitizedresult = result.split('=')[0].trim() + "=w250";
                return sanitizedresult;
            });
    }

    async function updatesonginfo() {
        songinfo.title = await gettitle()
        songinfo.artist = await getartist()
        songinfo.link = await getlink()
        songinfo.img = await getimg()
        songinfo.time = await gettime()
        songinfo.timefinish = await getfinishtime()
        songinfo.percent = ((songinfo.time * 100) / songinfo.timefinish)
        //await songinfo.isplaying = tbd
        overlaysyncer()

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
