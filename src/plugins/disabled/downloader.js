const pathToFfmpeg = require('ffmpeg-static');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(pathToFfmpeg)
const fs = require('fs');

async function downloadsong() {
    let youtubeurl = "https://www.youtube.com/watch?v=" + songinfo.link
    if (!ytdl.validateURL(youtubeurl))
        return
    let filename = dialog.showSaveDialogSync(mainWindow, {
        title: "Download song",
        defaultPath: `${songinfo.artist} - ${songinfo.title}`
    })
    if (filename === undefined)
        return

    await ffmpeg(ytdl(youtubeurl, {filter: 'audioonly'}))
        .output(filename + ".mp3")
        .on('end', function() {
            console.log('Finished processing');
        })
        .run();
}