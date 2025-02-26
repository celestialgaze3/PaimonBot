const Event = require('../Event.js');
const { token } = require('../../../config.json');
const path = require('path');
const { promisify } = require('util');
const glob = promisify(require('glob'));
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

module.exports = class Util {

	constructor(client) {
		this.client = client;
	}

	// fetches specified directories.
	get directory() {
		return `${path.dirname(require.main.filename)}${path.sep}`;
	}

	async sleep(ms) {
		await new Promise(resolve => setTimeout(resolve, ms));
	}

	// trim's array lengths
	trimArray(arr, maxLen = 10) {
		if (arr.length > maxLen) {
			const len = arr.length - maxLen;
			arr = arr.slice(0, maxLen);
			arr.push(`${len} more...`);
		}
		return arr;
	}

	// removes duplicate properties from arrays.
	removeDuplicates(arr) {
		return [...new Set(arr)];
	}

	// Shuffles and returns the given array.
	shuffle(array) {
		const arr = array.slice(0);
		for (let i = arr.length - 1; i >= 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const temp = arr[i];
			arr[i] = arr[j];
			arr[j] = temp;
		}
		return arr;
	}

	// Returns a number between the minimum and maximum integers provided.
	generateRandomInteger(min, max) {
		return Math.round(Math.random() * (max - min)) + min;
	}

	capitalize(str) {
		return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
	}

	abbreviateNumber(value) {
		let newValue = value;

		if (value >= 1000) {
			const suffixes = ['', 'k', 'm', 'b', 't'];
			const suffixNum = Math.floor(`${value}`.length / 3);

			let shortValue = '';

			for (let precision = 2; precision >= 1; precision--) {
				shortValue = parseFloat((suffixNum !== 0 ? value / Math.pow(1000, suffixNum) : value).toPrecision(precision));
				var dotLessShortValue = `${shortValue}`.replace(/[^a-zA-Z 0-9]+/g, '');
				if (dotLessShortValue.length <= 2) { break; }
			}
			if (shortValue % 1 !== 0) shortValue = shortValue.toFixed(1);
			newValue = shortValue + suffixes[suffixNum];
		}

		return newValue;
	}

	msToTime(ms) {
		const totalSeconds = ms / 1000;
		const hr = (totalSeconds % 86400) / 3600;
		const min = (totalSeconds % 3600) / 60;
		const sec = totalSeconds % 60;

		return `${(hr > 0 ? `${Math.floor(hr)}h ` : '') + (min > 0 ? `${Math.floor(min)}m ` : '')}${Math.floor(sec)}s`;
	}

	msToDate(ms) {
		const date = new Date(ms);
		return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
	}

	storeAPIData() {
		this.cacheWeapons();
		this.cacheCharacters();
		this.cacheEnemies();
		this.cacheElements();
		this.cacheReactions();
		this.cacheFood();
	}

	cacheCharacters() {
		const characterlist = require('../../../assets/data/characters.json');

		for (let i = 0; i < characterlist.length; i++) {
			this.client.characters.set(characterlist[i].name, characterlist[i]);
		}
	}

	cacheEnemies() {
		const enemyList = require('../../../assets/data/enemies.json');

		for (let i = 0; i < enemyList.length; i++) {
			this.client.enemies.set(enemyList[i].id, enemyList[i]);
		}
	}

	cacheElements() {
		const elementList = require('../../../assets/data/other/elements.json');

		for (let i = 0; i < elementList.length; i++) {
			const { name, description, reactions } = elementList[i];
			this.client.elements.set(name, { description: description, reactions: reactions });
		}
	}

	cacheReactions() {
		const reactionList = require('../../../assets/data/other/reactions.json');

		for (let i = 0; i < reactionList.length; i++) {
			const { name, description, elementalFormula } = reactionList[i];
			this.client.reactions.set(name, { name: name, description: description, elementalFormula: elementalFormula });
		}
	}

	cacheFood() {
		const foodList = require('../../../assets/data/consumables/food.json');

		for (let i = 0; i < foodList.length; i++) {
			this.client.food.set(foodList[i].name, foodList[i]);
		}
	}

	cacheWeapons() {
		const weaponList = require('../../../assets/data/weapons.json');

		for (let i = 0; i < weaponList.length; i++) {
			this.client.weapons.set(weaponList[i].name, weaponList[i]);
		}
	}

	async getMember(message, memberToFind = '', returnToAuthor) {
		// Fetches the user from their mention
		if (memberToFind && message.mentions.members.size > 0) {
			memberToFind = message.mentions.members.first();

			return memberToFind.user;
		}

		// Fetch via ID
		const fetchedByID = await this.client.users.fetch(memberToFind).catch(() => null);

		if (memberToFind && fetchedByID !== null) return fetchedByID;

		// Fetch by username, then display name (server nicknames), then tags

		memberToFind = memberToFind.toLowerCase();

		const findByNickname = message.guild.members.cache.find(member => member.user.username.toLowerCase() === memberToFind) ||
		message.guild.members.cache.find(member => member.displayName.toLowerCase().includes(memberToFind) || member.user.tag.toLowerCase().includes(memberToFind));

		if (memberToFind && findByNickname) {
			return findByNickname.user;
		}

		if (!memberToFind && returnToAuthor === true) {
			return message.author;
		}

		return null;
	}

	async clearSlashCommands() {
		const clientId = '809302717843111946';
		const rest = new REST({ version: '9' }).setToken(token);
		rest.get(Routes.applicationCommands(clientId)).then(data => {
			const promises = [];
			for (const command of data) {
				const deleteUrl = `${Routes.applicationCommands(clientId)}/${command.id}`;
				promises.push(rest.delete(deleteUrl));
			}
			return Promise.all(promises);
		});
	}

	async loadSlashCommands() {
		const slashCommandArray = [];

		const commands = await glob(`${this.directory}slashcommands/**/*.js`);

		for (const commandFile of commands) {
			const command = require(commandFile);
			slashCommandArray.push(command.data.toJSON());
			this.client.slashCommands.set(command.data.name, command);
		}

		const clientID = '809302717843111946';
		const guildID = '780394213200232491';
		const rest = new REST({ version: '9' }).setToken(token);
		// await this.registerSlashCommandsGlobally(rest, slashCommandArray);
		return await this.registerSlashCommandsToGuild(clientID, guildID, rest, slashCommandArray);
	}

	async registerSlashCommandsToGuild(clientID, guildID, rest, slashCommandArray) {
		try {
			await rest.put(
				Routes.applicationGuildCommands(clientID, guildID),
				{ body: slashCommandArray }
			);
		} catch (error) {
			if (error) return console.error(error);
		}

		return console.log(`Registered ${slashCommandArray.length} local slash commands.`);
	}

	async registerSlashCommandsGlobally(rest, slashCommandArray) {
		try {
			await rest.put(Routes.applicationCommands('809302717843111946'), { body: slashCommandArray });
		} catch (error) {
			if (error) return console.error(error);
		}

		return console.log(`Registered ${slashCommandArray.length} global slash commands.`);
	}

	// Loads all of the discord bot events using file directories, collections and the Event.js file
	async loadEvents() {
		return glob(`${this.directory}events/**/*.js`).then(events => {
			for (const eventFile of events) {
				delete require.cache[eventFile];
				const { name } = path.parse(eventFile);
				const File = require(eventFile);
				const event = new File(this.client, name);
				if (!(event instanceof Event)) throw new TypeError(`Event ${name} doesn't belong in Events`);
				this.client.events.set(event.name, event);
				event.emitter[event.type](name, (...args) => event.run(...args));
			}
		});
	}

};
