require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

// Initialize the Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// OpenAI API settings
const OPENAI_API_URL = "https://api.openai.com/v1/images/edits";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Command to trigger image edit
const COMMAND_TRIGGER = "!editimage";

// Event listener for when the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Event listener for messages
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(COMMAND_TRIGGER) || message.author.bot) return;

    const args = message.content.slice(COMMAND_TRIGGER.length).trim().split(' ');
    const prompt = args.join(' ');

    if (!message.attachments.size) {
        return message.reply("Please attach an image to edit.");
    }

    const attachment = message.attachments.first();
    const imageUrl = attachment.url;

    try {
        // Download the attached image
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const inputImagePath = './input_image.png';
        fs.writeFileSync(inputImagePath, response.data);

        // Prepare the request for OpenAI image edit
        const formData = new FormData();
        formData.append('image', fs.createReadStream(inputImagePath));
        formData.append('prompt', prompt);
        formData.append('n', 1);
        formData.append('size', '1024x1024');

        // Send request to OpenAI
        const openaiResponse = await axios.post(OPENAI_API_URL, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
        });

        // Get the edited image URL
        const editedImageUrl = openaiResponse.data.data[0].url;

        // Send the edited image back to Discord
        await message.reply(`Here is your edited image: ${editedImageUrl}`);

        // Cleanup
        fs.unlinkSync(inputImagePath);
    } catch (error) {
        console.error(error);
        message.reply("An error occurred while processing your request.");
    }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
