import discord
from discord.ext import commands, tasks
from datetime import datetime, time
import pytz
import logging

# Налаштування логування
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Налаштування бота
TOKEN = 'MTI4OTIxNjU0OTQyNDU5OTE0NQ.GPixir.TLdC_jEhKp2ab3_-QWAXjp045MLbOITL0vLp2c'  # Замініть на ваш токен
ROLE_ID = 1305574580269613116
CHANNEL_ID = 1268347940879990817
ADMIN_ID = 906931147248894022  # Замініть на ID користувача, який матиме доступ до команд /offbot та /onbot

# Ініціалізація інтентів
intents = discord.Intents.default()
intents.members = True
intents.presences = True
intents.message_content = True

# Створення бота
bot = commands.Bot(command_prefix='/', intents=intents)

# Змінна для контролю стану бота
bot_active = True

@bot.event
async def on_ready():
    logging.info(f'Бот {bot.user.name} запущений!')
    check_moderators.start()

@tasks.loop(minutes=20)
async def check_moderators():
    if not bot_active:
        return

    current_time = datetime.now(pytz.timezone('Europe/Kiev')).time()

    if time(0, 0) <= current_time < time(8, 0):
        logging.info(f"{current_time} - Бот в нічному режимі. Перевірка не виконується.")
        return

    logging.info(f"{current_time} - Бот виходить з нічного режиму. Виконуємо перевірку модераторів.")

    channel = bot.get_channel(CHANNEL_ID)
    if not channel:
        logging.error(f"Канал з ID {CHANNEL_ID} не знайдено.")
        return

    role = channel.guild.get_role(ROLE_ID)
    if not role:
        logging.error(f"Роль з ID {ROLE_ID} не знайдена.")
        return

    online_members = [member for member in role.members if member.status != discord.Status.offline]
    offline_members = [member for member in role.members if member.status == discord.Status.offline]

    logging.info(f"Кількість онлайн модераторів: {len(online_members)}")
    logging.info(f"Кількість офлайн модераторів: {len(offline_members)}")
    logging.info(f"Нікнейми онлайн модераторів: {[member.display_name for member in online_members]}")
    logging.info(f"Нікнейми офлайн модераторів: {[member.display_name for member in offline_members]}")

    if len(online_members) <= 1:
        online_names = '\n'.join(f"**{member.display_name}**" for member in online_members) or 'Немає учасників'
        offline_names = ' '.join(member.mention for member in offline_members) or 'Немає офлайн модераторів'

        message = (
            f"## Увага на сервері Північна Україна [#04] мала кількість модерації.\n\n"
            f"**- Список модераторів в мережі:**\n{online_names}\n\n"
            f"**- Офлайн модератори:**\n{offline_names}\n\n"
            f"Просимо офлайн модераторів звернути увагу на ситуацію та по можливості вийти в онлайн."
        )

        try:
            await channel.send(message)
        except discord.errors.Forbidden:
            logging.error("Бот не має прав для відправки повідомлень у вказаний канал.")
        except Exception as e:
            logging.error(f"Помилка при відправці повідомлення: {e}")

@bot.command()
async def offbot(ctx):
    global bot_active
    if ctx.author.id == ADMIN_ID:
        bot_active = False
        await ctx.send("Бот вимкнений.")
        logging.info(f"Бот вимкнений користувачем {ctx.author.name}")
    else:
        await ctx.send("У вас немає прав для використання цієї команди.")

@bot.command()
async def onbot(ctx):
    global bot_active
    if ctx.author.id == ADMIN_ID:
        bot_active = True
        await ctx.send("Бот увімкнений.")
        logging.info(f"Бот увімкнений користувачем {ctx.author.name}")
    else:
        await ctx.send("У вас немає прав для використання цієї команди.")

# Запуск бота
if __name__ == "__main__":
    bot.run(TOKEN)

