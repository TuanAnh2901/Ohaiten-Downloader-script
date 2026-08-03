import { Command } from 'commander';

const program = new Command();

program
  .name('fb-saved-dl')
  .description('Download videos from Facebook saved collection')
  .version('0.1.0');

program
  .command('hello')
  .description('placeholder command (scaffold verification)')
  .action(() => {
    console.log('fb-saved-dl scaffold ok');
  });

export default program;
