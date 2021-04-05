/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

async function essentialsCapEconomy(playerDataPath, maxCredit) {
  console.info('Starting cap economy routine', { playerDataPath, maxCredit });

  const maxCreditStr = maxCredit.toFixed(1);

  // Get all playerdata file paths.
  const files = await fs.promises.readdir(playerDataPath, { withFileTypes: true });

  // We only want yml files containing the player-data.
  const playerFiles = files.filter((dir) => dir.isFile() && path.extname(dir.name) === '.yml');
  const playerFilesCount = playerFiles.length;
  console.info(`Found ${files.length} files, ${playerFilesCount} player files`);

  // Get full file path for every player-data file.
  const filePaths = playerFiles.map((file) => path.join(playerDataPath, file.name));

  console.info('Processing files...');
  const stats = {
    success: 0,
    error: 0,
    noMoneyEntry: 0,
    capped: 0,
    filesProcessed: 0,
  };

  const interval = setInterval(() => {
    console.info(`Processed ${stats.filesProcessed} / ${playerFilesCount}`);
  }, 1000);
  const fileTasks = filePaths.map(async (filePath) => {
    // Read the file content as string.
    const playerDataStr = await fs.promises.readFile(filePath, { encoding: 'utf8' });
    // Parse the string as YAML.
    const playerData = await YAML.parse(playerDataStr);

    // Not all players have money set.
    if (!playerData.money) {
      stats.noMoneyEntry += 1;
      stats.filesProcessed += 1;
      return;
    }
    const money = Number.parseFloat(playerData.money);

    if (money <= maxCredit) {
      stats.filesProcessed += 1;
      return;
    }

    console.info(`Capping money for player ${playerData.lastAccountName}. Credit: ${playerData.money}`);
    playerData.money = maxCreditStr;
    await fs.promises.writeFile(filePath, YAML.stringify(playerData, { singleQuote: false }));

    stats.capped += 1;
    stats.filesProcessed += 1;
  });

  const results = await Promise.allSettled(fileTasks);
  clearInterval(interval);

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      stats.success += 1;
      return;
    }
    stats.error += 1;
  });

  console.debug('errors', results.filter((result) => result.status !== 'fulfilled').map((result) => result.reason?.message));
  console.debug('Processing done.', stats);
}

essentialsCapEconomy('./userdata', 100000);
