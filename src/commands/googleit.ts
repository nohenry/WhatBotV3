import {
  ChatInputCommandInteraction,
  CommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export const command = new SlashCommandBuilder()
  .setName("googlethat")
  .setDescription(
    "Creates a `Let me google that for you` and optionally tags a person"
  )
  .addStringOption((option) =>
    option.setName("search").setDescription("The value to search")
  )
  .addUserOption((option) =>
    option
      .setName("mention")
      .setRequired(false)
      .setDescription("Mention a person with the link")
  );

const link = "https://letmegooglethat.com/?q=";

export const onExecute = async (_interaction: CommandInteraction) => {
  console.dir(_interaction.options, { depth: null });
  if (!_interaction.isChatInputCommand()) return;
  const interaction = _interaction as ChatInputCommandInteraction;
  let st = interaction.options.getString("search")?.replace(" ", "+");
  console.log(st);
  if (interaction.options.getUser("mention")) {
    interaction.reply(`${interaction.options.getUser("mention")} ${link}${st}`);
  } else {
    interaction.reply(`${link}${st}`);
  }
};
