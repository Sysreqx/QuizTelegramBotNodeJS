import TelegramBot from "node-telegram-bot-api";
import config from "config";

// replace the value below with the Telegram token you receive from @BotFather
const token = config.get("token");

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});


// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // send a message to the chat acknowledging receipt of their message
    bot.sendMessage(chatId, 'Received your message');

    console.log(msg);
});