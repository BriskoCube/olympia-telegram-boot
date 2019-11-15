const TelegramBot = require('node-telegram-bot-api');
const Conf = require('./conf')

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(Conf.api_key, {polling: true});


/*bot.setWebHook('opympia.bigcube.ch', {
    certificate: 'cert/crt.pem', // Path to your crt.pem
});*/

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"

    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, resp);
});