const TelegramBot = require('node-telegram-bot-api');
const Conf = require('./conf');
const fs = require("fs");
const fetch = require("node-fetch");
const api = require("./rootme_api");

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(Conf.api_key, {polling: true});

const regex = /<span class="color1 txxl">\s+(\d+)&nbsp;Points&nbsp;\s+<span/i;

const keyboardResponses = {};

let loading = false;

bot.onText(/\/git/, async (msg, match) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "https://github.com/BriskoCube/olympia-telegram-boot");
});

bot.onText(/\/rootme/, async (msg, match) => {

    const chatId = msg.chat.id;

    const leaderboard = await getRootmeBoard();

    const medals = ["🤓","🥈","🥉"];

    // Format the result table
    const resp = "<b>Score:</b> \r\n" + leaderboard.reduce((acc, user, i) => {
        const spaces = i < 9 ? "\t\t" : "";
        let score = i < 3 ? medals[i] : `\t\t${i + 1}\t\t`;
        score = i === leaderboard.length - 1 ? "\t\t🤪️" : score;
        return acc + `${spaces}${score}:\t\t\t<code>${user.realUsername || user.username}</code>  <b>${user.score}</b>  ${user.evolution > 0 ? "+" + user.evolution : ""}\r\n`;
    }, "");

    bot.sendMessage(chatId, resp, {parse_mode: "HTML"});
});

bot.onText(/\/add_rootme (.+)/, async (msg, match) => {
    const username = match[1];

    const results = await api.search(username);

    if(results.length === 1){
        bot.sendMessage(msg.chat.id, await addUser(results[0]));
    } else if(results.length > 1){
        keyboardResponses[msg.chat.id] = results;

        bot.sendMessage(msg.chat.id, "Choose a user", {
            "reply_markup": {
                "keyboard": results.map(result => [result.realUsername]),
                "resize_keyboard": true,
                "one_time_keyboard": true,
                "selective" : true
            },
            "reply_to_message_id": msg.message_id,
        });
    } else {
        bot.sendMessage(msg.chat.id, `User '${username}' not found`);
    }
});

bot.onText(/(.+)/, async (msg, match) => {
    const realUsername = match[0];


    const chatId = msg.chat.id;
    console.log(keyboardResponses[chatId]);

    if(keyboardResponses[chatId] && keyboardResponses[chatId].some(user => user.realUsername === realUsername)){
        const user = keyboardResponses[chatId].find(user => user.realUsername === realUsername);

        bot.sendMessage(chatId, await addUser(user));
    }

    delete keyboardResponses[chatId];
});

async function addUser(user){
    if (user !== undefined) {
        const usernames = await readConfig("rootme");

        if (!usernames.includes(user.username)) {
            // invalidate buffer
            writeFile("./rootme-buffer.json", {
                timestamp: 0,
                data: []
            });

            writeConfig("rootme", [...usernames, user.username]);

            resp = `User '${user.realUsername}' added`;
        } else {
            resp = `the user '${user.realUsername}' is already in the list`;

        }
    } else {
        resp = `User not found`
    }

    return resp;
}

/**
 * Get all user's scores
 * @returns {Promise<this|*>}
 */
async function getRootmeBoard() {

    const usernames = await readConfig("rootme");

    await waitLoadingFinished();

    let bufferFile = null;

    await waitLoadingFinished();

    try {
        bufferFile = await readFile("./rootme-buffer.json");

        // buffer available
        if (bufferFile != null && bufferFile.timestamp + 60 * 10 * 1000 > Date.now()) {
            return bufferFile.data;
        }
    } catch (e) {
        console.log("Buffer not found")
    }
    
    loading = true;

    let leaderboard = [];

    for (let username of usernames) {
        console.log(username)

        try {
            let fetchedUser = await api.user(username);

            let evolution = findEvolution(fetchedUser, bufferFile);

            leaderboard.push({...fetchedUser, evolution});

        } catch (e) {
            console.error(e)
        }
    }

    leaderboard = leaderboard.sort((a, b) => b.score - a.score);

    await writeFile("./rootme-buffer.json", {
        timestamp: Date.now(),
        data: leaderboard.map(user => { return {...user}})
    });

    loading = false;

    return leaderboard;
}

/**
 * Wait until loading is true
 * @returns {Promise<void>}
 */
async function waitLoadingFinished() {
    if (loading)
        console.log("Wait for buffer construction");

    // Wait until loading is finished
    while (loading) {
        await new Promise(resolve => {
            setTimeout(() => resolve(), 1000)
        });
    }
}

function readConfig(name) {
    return readFile(`${Conf.dynamic_config}/${name}.json`);
}

function findEvolution(user, buffer) {
    if(buffer != null){
        const found = buffer.data.find(oldUser => oldUser.username === user.username);
        if (found !== undefined) {
            return user.score - found.score;
        }
    }

    return 0
}

function writeConfig(name, data) {
    return writeFile(`${Conf.dynamic_config}/${name}.json`, data);
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        fs.readFile(file, function (err, buf) {
            if (err)
                reject(err);
            else
                resolve(JSON.parse(buf));
        });
    })
}

function writeFile(file, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, JSON.stringify(data), function (err) {
            if (err)
                reject(err);
            else
                resolve();
        });
    })
}