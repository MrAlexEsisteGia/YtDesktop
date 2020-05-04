/*jshint esversion: 6 */
const {
    app,
    BrowserWindow,
    BrowserView,
    Tray,
    globalShortcut
} = require('electron');
const path = require('path');
const client = require('discord-rich-presence')('558712944511156236');
require('v8-compile-cache');

const icon = path.join(__dirname, 'assets/icons/256x256.png');
const grayicon = path.join(__dirname, 'assets/icons/256x256mono.png');

let tray, notificationWindow, mainWindow, loadingWindow, title, artist, link, timenow, timefinish, view;

app.on('ready', createWindow); // create main window

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
            notificationWindow.webContents.executeJavaScript('changesong();');
        });
        initializetray();

        client.updatePresence({
            state: 'Nothing playing',
            largeImageKey: '512x512',
            smallImageKey: 'paused'
        });
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
    notificationWindow.loadFile('assets/notifications/notification.html');

    //discord rich presence & notifications activator
    view.webContents.on('media-paused', function () {
        client.updatePresence({
            state: 'Paused',
            largeImageKey: '512x512',
            smallImageKey: 'paused'
        });
    });
    view.webContents.on('media-started-playing', function () {
        setTimeout(function () {

            //this is ugly like me
            gettitle().then(result => {
                title = result
            }).catch(err => {
                console.log(err)
            });
            gettime().then(result => {
                timenow = result
            }).catch(err => {
                console.log(err)
            });
            getfinishtime().then(result => {
                timefinish = result
            }).catch(err => {
                console.log(err)
            });
            getartist().then(result => {
                artist = result
            }).catch(err => {
                console.log(err)
            });
            getlink().then(result => {
                link = result
            }).catch(err => {
                console.log(err)
            });


            setTimeout(function () {
                //discord
                client.updatePresence({
                    state: `Author: ${artist}`,
                    details: `Title: ${title}`,
                    largeImageKey: '512x512',
                    smallImageKey: 'playing',
                    instance: true,
                    spectateSecret: link,
                    startTimestamp: Date.now() - (timenow * 1000),
                    endTimestamp: Date.now() + ((timefinish - timenow) * 1000)
                });

                notificationWindow.webContents.executeJavaScript(`artist = "${artist}"`);
                sendnotification(title);
            }, 200);
        }, 750);

    });
//oshit seqrity hole
    client.on('spectate', (secret) => {
        if (secret.length !== 11) {
            sendnotification("something went wrong plz report " + secret.length);
            return;
        }
        const url = 'https://music.youtube.com/watch?v=' + secret;
        view.webContents.loadURL(url);
    });

// friendly reminder for myself: keep all the functions under this fucking comment, you moron, you fool... got it? probably not

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
    function sendnotification(message) {
        notificationWindow.webContents.executeJavaScript(`title = "${message}"`);
        notificationWindow.webContents.executeJavaScript('changesong()');
    }


    //get current time
    function gettime() {
        return view.webContents.executeJavaScript("document.getElementById('progress-bar').getAttribute('aria-valuenow');")
            .then((result) => {
                return result.trim();
            });
    }

    //get finishtime
    function getfinishtime() {
        return view.webContents.executeJavaScript("document.getElementById('progress-bar').getAttribute('aria-valuemax');")
            .then((result) => {
                return result.trim();
            });
    }

    //get title
    function gettitle() {
        return view.webContents.executeJavaScript("document.getElementsByClassName('title ytmusic-player-bar')[0].innerText")
            .then((result) => {
                return result.trim();
            });
    }


    //sorry ytmd devs, i had to YOINK that code <3
    //get artist
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
        //getlink (for discord richpresence spectator function)
        return view.webContents.executeJavaScript("document.getElementsByClassName('ytp-title-link yt-uix-sessionlink')[0].href")
            .then((result) => {
                return result.split("=").pop().trim();
            });
    }


}// oh boy the end of the suffering