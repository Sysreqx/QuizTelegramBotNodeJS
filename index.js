// import express from "express";
// import mongoose from "mongoose";
import {MongoClient} from "mongodb";
import TelegramBot from "node-telegram-bot-api";

import config from "config";

// replace the value below with the Telegram token you receive from @BotFather
const token = config.get("token");
const mongoDB = config.get("mongoPass");

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

async function connect() {

        const client = new MongoClient(mongoDB.toString());

        try {
            await client.connect();

            console.log(await findOneQuestionById(client, 1));
            console.log(await findAUserByChatId(client, 2323));

        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }

        console.log("Connected to MongoDB");

}

connect().catch(console.error);


async function findOneQuestionById(client, idOfQuestion) {
    return await client.db("PMGQuizTelegramBotDB").collection("Questions").findOne({ id: idOfQuestion});
}

// return <null> if no
async function findAUserByChatId(client, chatId) {
    return await client.db("PMGQuizTelegramBotDB").collection("Users").findOne({ chat_id: chatId});
}

let answers = [];
answers[0] = "Ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ";
answers[1] = "Ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ";
answers[2] = "Ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ";
answers[3] = "Ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ";

let replyOptions = {

    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        inline_keyboard:[
            [
                { text: "A",  callback_data: "1"  },
                { text: "B",  callback_data: "2"  },
                { text: "C",  callback_data: "3"  },
                { text: "D",  callback_data: "4"  }
            ]
        ]
    },
};

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', async msg => {
    const chatId = msg.chat.id;

    let questionNumber = 1;

    // send a message to the chat acknowledging receipt of their message
    let questionFromDB = "Какой-то вопрос с базы данных. вопрос с базы данных. вопрос с базы данных. вопрос с базы данных. вопрос с базы данных."
    questionFromDB += "\n";

    bot.sendMessage(chatId, `Вопрос № ${questionNumber}\n ${questionFromDB}
        [A]\n${answers[0]}\n
        [B]\n${answers[1]}\n
        [C]\n${answers[2]}\n
        [D]\n${answers[3]}\n`,
        replyOptions);

    console.log(msg);
});

bot.on("callback_query", async msg => {
    const answer = msg.data;
    const chatId = msg.message.chat.id;

    await bot.sendMessage(chatId, `${answer}`);
    console.log(msg);
})