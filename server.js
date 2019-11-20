const TelegramBot = require('node-telegram-bot-api');
const Conf = require('./conf');
const fs = require("fs");
const fetch = require("node-fetch");

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(Conf.api_key, {polling: true});

const regex = /<li>Score.*<span>(\d+)<\/span>/;

let loading = false;

bot.onText(/\/git/, async (msg, match) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "https://github.com/BriskoCube/olympia-telegram-boot");
});

bot.onText(/\/rootme/, async (msg, match) => {

    const chatId = msg.chat.id;

    const leaderboard = await getRootmeBoard();

    // Format the result table
    const resp = "<b>Score:</b> \r\n" + leaderboard.reduce((acc, user, i) => {
        const spaces = i < 9 ? "\t\t" : "";
        return acc + `\t\t\t${spaces}${i + 1}:\t\t\t<code>${user.username}</code>  <b>${user.score}</b>  ${user.evolution > 0 ? "+" + user.evolution : ""}\r\n`;
    }, "");

    bot.sendMessage(chatId, resp, {parse_mode: "HTML"});
});

bot.onText(/\/add_rootme (.+)/, async (msg, match) => {
    const username = match[1];
    const usernames = await readConfig("rootme");

    let resp = "";

    const result = await fetch(`https://www.root-me.org/${username}?lang=fr`);

    if (result.status === 200) {

        if (!usernames.includes(username)) {
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
        try {

            let fetchedUser = await getRootMeScore(username);

            let evolution = findEvolution(fetchedUser, bufferFile);


            leaderboard.push({...fetchedUser, evolution});

        } catch (e) {
            console.error(e)
        }
    }

    leaderboard = leaderboard.sort((a, b) => b.score - a.score);

    await writeFile("./rootme-buffer.json", {
        timestamp: Date.now(),
        data: leaderboard

    });

    loading = false;

    return leaderboard;
}

/**
 * Get score for a single user
 * @param username
 * @returns {Promise<{score: number, username: *}|{score: *, username: *}>}
 */
async function getRootMeScore(username) {
    let response = await fetch(`https://www.root-me.org/${username}?lang=fr`);

    let timeOut = 1000;

    // If request rejected for too many requests. Retry after in little time out
    while (response.status === 429) {
        console.error("Request rejected (429), wait a little bit before retrying")
        response = await new Promise(resolve => {
            setTimeout(async () => {
                resolve(await fetch(`https://www.root-me.org/${username}?lang=fr`));
            }, timeOut)
        });

        timeOut += 500;
    }

    // If success return the score
    if (response.status === 200) {
        const html = await response.text();
        const match = html.match(regex);

        // If a score is found return it, else 0
        if (match != null) {
            const score = match[1];
            console.log("resolve", {score, username})
            return {score, username};
        } else {
            return {score: 0, username};
        }
    } else {
        console.error("Error:", response.status)
    }
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