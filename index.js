// import express from "express";
// import mongoose from "mongoose";
import {MongoClient} from "mongodb";
import TelegramBot from "node-telegram-bot-api";

import config from "config";

import cron from "node-cron";
import {text} from "express";

let cronTask;

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
        await client.db("PMGQuizTelegramBotDB").collection("Users").updateOne({ chat_id: chatId }, { $set: updatedUser });
    }

    async createUser(client, newUser) {
        await client.db("PMGQuizTelegramBotDB").collection("Users").insertOne(newUser);
    }
}

let db = new DataBase();
db.connect().catch(console.error);


let answers = [];
answers[0] = "Что-то пошло не так. Свяжитесь с менеджером/разработчиком";


let replyOptions = {

    reply_markup: {
        resize_keyboard: true,
        one_time_keyboard: true,
        inline_keyboard: []
    },
};

let questionNumber = 99;
let correctAnswerNumber = 99;


// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', async msg => {
    // also User ID that is passed to the database

    const chatId = msg.chat.id;
    let textFromUser = msg.text;

    let canVoteToday = true;

    if (textFromUser === "/start" || textFromUser === "0000" || textFromUser === "Получить новый вопрос") {

        let user = await db.findAUserByChatId(client, chatId);

        // if user is null
        if (!user) {
            let newUser = {
                chat_id: msg.chat.id,
                first_name: msg.chat.first_name,
                last_name: msg.chat.last_name,
                username: msg.chat.username,
                answers: {
                    "0": "incorrect",
                },
                correct_answers_cnt: 0
            }
            canVoteToday = true;
            user = newUser;
            await db.createUser(client, newUser);
        }

        // 20 october 2023
        let originDate = 1698142703484;
        // originDate = new Date().getTime(); // comment me, test purposes
        let day = 86400000; // change to minute for test purpose
        day = 60000; // minute
        const date = new Date();

        // here compare date
        questionNumber = Math.ceil((date.getTime() - originDate) / day);
        // questionNumber = 3;
        // console.log(questionNumber);

        canVoteToday = true;

        // @TODO compare last answerID with current question ID, if equals say "can't vote again"
        if (user && canVoteToday) {

            // console.log(Object.keys(user.answers));
            let questionReplied = Object.keys(user.answers);
            // console.log(questionReplied);

            for (let i = 0; i < questionReplied.length; i++) {
                if (questionReplied[i] === questionNumber.toString()) {
                    // console.log("Вы уже отвечали на данный вопрос. Можно голосовать один раз в сутки.\nПриходите завтра.");

                    await bot.sendMessage(chatId,"Вы уже отвечали на данный вопрос. Можно голосовать один раз в сутки.\nПриходите завтра.");

                    canVoteToday = false;
                    return;
                }
            }

            if (!canVoteToday) return;

            let questionFromDB = await db.findOneQuestionById(client, questionNumber);

            if (questionFromDB === null) {
                await bot.sendMessage(chatId,`~~DAY ${questionNumber}~~\nВопросы закончились. Результаты голосования доступны на сайте.`);
                return;
            }

            // console.log(questionFromDB);
            correctAnswerNumber = questionFromDB.correct;
            // correctAnswersCnt = user.correct_answers_cnt;

            answers = [];
            questionFromDB.answers.forEach(a => {
                answers.push(a);
            });

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
                    { text: letter,  callback_data: (idx).toString() }
                ];

                replyOptions.reply_markup.inline_keyboard.push(tmpArrLetterForKeyboard);
            });

            await bot.sendMessage(chatId,
                `Вопрос № ${questionNumber}\n\n${questionFromDB.text}\n\n${questionTextWithAnswersText}`,
                replyOptions);

            user.answers = {...user.answers, [questionNumber]: "xx"};
            await db.updateUserByChatId(client, chatId, user);
        }
    }

    // console.log(msg);
});

bot.on("callback_query", async msg => {
    const answer = msg.data;
    const chatId = msg.message.chat.id;

    let user = await db.findAUserByChatId(client, chatId);

    user.answers = {...user.answers, [questionNumber]: answer};

    // console.log("correctAnswerNubmer " + correctAnswerNumber);
    let corrAnswerLetter = "1";
    if (correctAnswerNumber.toString() === answer.toString()) {
        user.answers = {...user.answers, [questionNumber]: `${answer}++`};
        user.correct_answers_cnt = user.correct_answers_cnt + 1;
        await db.updateUserByChatId(client, chatId, user);
    } else {
        await db.updateUserByChatId(client, chatId, user);
    }

    if (answer.toString() === "0") {
        if (correctAnswerNumber.toString() === "0") {
            msg.message.text = msg.message.text.replace("[A]", "[A] ✅");
        } else {
            msg.message.text = msg.message.text.replace("[A]", "[A] ❌");
        }
    } else if (answer.toString() === "1") {
        if (correctAnswerNumber.toString() === "1") {
            msg.message.text = msg.message.text.replace("[B]", "[B] ✅");
        } else {
            msg.message.text = msg.message.text.replace("[B]", "[B] ❌");
        }
    } else if (answer.toString() === "2") {
        if (correctAnswerNumber.toString() === "2") {
            msg.message.text = msg.message.text.replace("[C]", "[C] ✅");
        } else {
            msg.message.text = msg.message.text.replace("[C]", "[C] ❌");
        }
    } else if (answer.toString() === "3") {
        if (correctAnswerNumber.toString() === "3") {
            msg.message.text = msg.message.text.replace("[D]", "[D] ✅");
        } else {
            msg.message.text = msg.message.text.replace("[D]", "[D] ❌");
        }
    }

    try {
        await bot.editMessageText(msg.message.text, {
            chat_id: chatId,
            message_id: msg.message.message_id
        });
    } catch (e) {
        console.log(e);
    }

    // After answer selection starts cron
    if (cronTask) {
        cronTask.stop();
    }
    cronTask = cron.schedule("*/1 * * * *", async () => {
        let replyOptions = {

            reply_markup: {
                resize_keyboard: true,
                one_time_keyboard: true,
                inline_keyboard: [
                    [{text: "Получить новый вопрос"}]
                ]
            },
        };

        await bot.sendMessage(chatId,
            `Вы можете получить новый вопрос. Нажмите на кнопку`,
            replyOptions);
    });

    if (answer.toString() === "0" ||
        answer.toString() === "1" ||
        answer.toString() === "2" ||
        answer.toString() === "3") {
        await bot.sendMessage(chatId, `Спасибо за ваш ответ, мы его сохранили.\nСледующий вопрос будет доступен завтра.`);
    }

    // console.log(msg);
    // console.log(answer);
})