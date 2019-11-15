const TelegramBot = require('node-telegram-bot-api');
const Conf = require('./conf');
const fs = require("fs");
const fetch = require("node-fetch");

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(Conf.api_key, {polling: true});

const regex = /<li>Score.*<span>(\d+)<\/span>/;

bot.onText(/\/rootme/, async (msg, match) => {

    const chatId = msg.chat.id;

    const leaderboard = await getRootmeBoard();

    const resp =  "Score: \r\n" + leaderboard.reduce((acc, user) => acc += `\t\t${user.username}: ${user.score} \r\n`, "");

    bot.sendMessage(chatId, resp);
});

async function getRootmeBoard(){

    const usernames = await readConfig("rootme");

    try{
        const bufferFile = await readFile("./rootme-buffer.json");

        // buffer available
        if(bufferFile != null && bufferFile.timestamp + 60 * 10 * 1000 > Date.now()){
            console.log("Buffer");
            console.log(bufferFile.data)
            return bufferFile.data;
        }
    } catch (e) {
        console.log("Buffer not found")
    }


    let leaderboard = [];

    for(let username of usernames){
        const response = await fetch(`https://www.root-me.org/${username}?lang=fr`);
        const html = await response.text();
        const match = html.match(regex);

        if(match != null){
            const score = match[1];

            leaderboard.push({
                score,
                username
            });
        }
    }

    leaderboard = leaderboard.sort((a, b) => {
        return b.score - a.score;
    });

    writeFile("./rootme-buffer.json", {
        timestamp: Date.now(),
        data: leaderboard

    });

    return leaderboard;
}

function readConfig(name) {
    return readFile(`${Conf.dynamic_config}/${name}.json`);
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, function(err, buf) {
            if(err)
                reject(err);
            else
                resolve(JSON.parse(buf));
        });
    })
}

function writeFile(file, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, JSON.stringify(data) , function(err) {
            if(err)
                reject(err);
            else
                resolve();
        });
    })
}