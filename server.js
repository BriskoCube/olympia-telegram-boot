const TelegramBot = require('node-telegram-bot-api');
const Conf = require('./conf');
const fs = require("fs");
const fetch = require("node-fetch");

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(Conf.api_key, {polling: true});

const regex = /<li>Score.*<span>(\d+)<\/span>/;

bot.onText(/\/git/, async (msg, match) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "https://github.com/BriskoCube/olympia-telegram-boot");
});

bot.onText(/\/rootme/, async (msg, match) => {

    const chatId = msg.chat.id;

    const leaderboard = await getRootmeBoard();

    const resp = "<b>Score:</b> \r\n" + leaderboard.reduce((acc, user, i) => {
        const spaces = i < 9 ? "\t\t": "";
        return acc + `\t\t\t${spaces}${i + 1}:\t\t\t<code>${user.username}</code>  <b>${user.score}</b> \r\n`;
    }, "");

    bot.sendMessage(chatId, resp,{parse_mode : "HTML"});
});

bot.onText(/\/add_rootme (.+)/, async (msg, match) => {
    const username = match[1];
    const usernames = await readConfig("rootme");

    let resp = "";

    const result = await fetch(`https://www.root-me.org/${username}?lang=fr`);

    if(result.status === 200){

        if(!usernames.includes(username)) {
            // invalidate buffer
            writeFile("./rootme-buffer.json", {
                timestamp: 0,
                data: []
            });

            writeConfig("rootme", [...usernames, username]);

            resp = `User '${username}' added`;
        } else {
            resp = `the user '${username}' is already in the list`;

        }
    } else {
        resp = `User '${username}' not found`
    }

    const chatId = msg.chat.id;

    bot.sendMessage(chatId, resp);
});

async function getRootmeBoard(){

    const usernames = await readConfig("rootme");

    try{
        const bufferFile = await readFile("./rootme-buffer.json");

        // buffer available
        if(bufferFile != null && bufferFile.timestamp + 60 * 10 * 1000 > Date.now()){
            return bufferFile.data;
        }
    } catch (e) {
        console.log("Buffer not found")
    }


    let leaderboard = [];

    for(let username of usernames){
        try {
            leaderboard.push(await getRootMeScore(username));
        } catch (e) {
            console.error(e)
        }
    }

    leaderboard = leaderboard.sort((a, b) => b.score - a.score);

    writeFile("./rootme-buffer.json", {
        timestamp: Date.now(),
        data: leaderboard
    });

    return leaderboard;
}

async function getRootMeScore(username) {
    const response = await fetch(`https://www.root-me.org/${username}?lang=fr`);

    return new Promise((async (resolve) => {
        if(response.status === 429){
            setTimeout(async () => {
                resolve(await getRootMeScore(username));
            }, 500);
        } else {
            const html = await response.text();
            const match = html.match(regex);

            if(match != null){
                const score = match[1];
                console.log("resolve", {score,username})
                resolve({score,username});
            } else {
                resolve({score: 0, username});
            }
        }
    }));


}

function readConfig(name) {
    return readFile(`${Conf.dynamic_config}/${name}.json`);
}


function writeConfig(name, data) {
    return writeFile(`${Conf.dynamic_config}/${name}.json`, data);
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