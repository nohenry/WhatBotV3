"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onExecute = exports.command = void 0;
const discord_js_1 = require("discord.js");
exports.command = new discord_js_1.SlashCommandBuilder()
    .setName("googlethat")
    .setDescription("Creates a `Let me google that for you` and optionally tags a person")
    .addStringOption((option) => option.setName("search").setDescription("The value to search"))
    .addUserOption((option) => option
    .setName("mention")
    .setRequired(false)
    .setDescription("Mention a person with the link"));
const link = "https://letmegooglethat.com/?q=";
const onExecute = async (_interaction) => {
    console.dir(_interaction.options, { depth: null });
    if (!_interaction.isChatInputCommand())
        return;
    const interaction = _interaction;
    let st = interaction.options.getString("search")?.replace(" ", "+");
    console.log(st);
    if (interaction.options.getUser("mention")) {
        interaction.reply(`${interaction.options.getUser("mention")} ${link}${st}`);
    }
    else {
        interaction.reply(`${link}${st}`);
    }
};
exports.onExecute = onExecute;
//# sourceMappingURL=googleit.js.map