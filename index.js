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
const client = new MongoClient(mongoDB.toString());

class DataBase {
    async connect() {

        try {
            await client.connect();
        } catch (e) {
            console.error(e);
        }
        // finally {
        //     await client.close();
        // }

        console.log("Connected to MongoDB");

    }

    async findOneQuestionById(client, idOfQuestion) {
        return await client.db("PMGQuizTelegramBotDB").collection("Questions").findOne({ id: idOfQuestion});
    }

// return <null> if no
    async findAUserByChatId(client, chatId) {
        return await client.db("PMGQuizTelegramBotDB").collection("Users").findOne({ chat_id: chatId});
    }

    async updateUserByChatId(client, chatId, updatedUser) {
        const result = await client.db("PMGQuizTelegramBotDB").collection("Users").updateOne({ chat_id: chatId }, { $set: updatedUser });
    }

    async createUser(client, newUser) {
        await client.db("PMGQuizTelegramBotDB").collection("Users").insertOne(newUser);
    }
}

let db = new DataBase();
db.connect().catch(console.error);


let answers = [];
answers[0] = "Что-то пошло не так";
// answers[1] = "Ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ";
// answers[2] = "Ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ";
// answers[3] = "Ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ ответ";

let replyOptions = {

    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        inline_keyboard: []
    },
};



// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', async msg => {

    // also User ID that is passed to the database
    const chatId = msg.chat.id;

    let textFromUser = msg.text;

    if (textFromUser === "/start") {
        let user = await db.findAUserByChatId(client, chatId);

        // @TODO check if user answered a question
        // ...

        // if user is null
        if (!user) {
            let newUser = {
                chat_id: msg.chat.id,
                first_name: msg.chat.first_name,
                last_name: msg.chat.last_name,
                username: msg.chat.username,
                answers: {
                    0: "incorrect",
                },
                correct_answers_cnt: 0
            }

            await db.createUser(client, newUser);
        }

        let questionNumber = 1;

        // 20 october 2023
        const originDate = 1698019200000;
        const day = 86400000;
        const date = new Date();
        // here compare date
        questionNumber = Math.ceil((date.getTime() - originDate) / day);
        // console.log(questionNumber);

        // @TODO compare last answerID with current question ID, if equals say "can't vote again"
        if (user) {
            // pull questionID to compare
            // let lastQuestionId = 1;
            // const lastQuestionId = Object.values(obj).pop();


        }

        let questionFromDB = await db.findOneQuestionById(client, questionNumber);
        // console.log(questionFromDB);

        answers = [];
        questionFromDB.answers.forEach(a => {
            answers.push(a);
        })

        let questionTextWithAnswersText = "";

        // [A]\n
        // ${answers[idx]}\n
        replyOptions = {

            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                inline_keyboard: []
            },
        }; // ebal v nozdry, inline_keyboard = [] in some reason doesn't work

        await answers.forEach((a, idx) => {
           let letter = String.fromCharCode(idx + 65);
           let answ = a.toString();

           questionTextWithAnswersText += "[" + letter + "]\n" + answ + "\n\n";

            // [
            //     { text: "A",  callback_data: "1"  }
            // ],

           let tmpArrLetterForKeyboard = [
               { text: letter,  callback_data: (idx + 1).toString() }
           ];

           replyOptions.reply_markup.inline_keyboard.push(tmpArrLetterForKeyboard);

            // console.log("tmpArrLetterForKeyboard\n" + tmpArrLetterForKeyboard.text);
            // console.log("replyOptions\n" + replyOptions);

        });

        console.log(replyOptions);

        await bot.sendMessage(chatId,
            `Вопрос № ${questionNumber}\n\n${questionFromDB.text}\n\n${questionTextWithAnswersText}`,
            replyOptions);
    }

    // console.log(msg);
});

bot.on("callback_query", async msg => {
    const answer = msg.data;
    const chatId = msg.message.chat.id;

    await bot.sendMessage(chatId, `${answer}`);
    console.log(msg);
})