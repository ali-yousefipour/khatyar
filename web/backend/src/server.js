import { app } from './app.js';
import { config } from './config.js';
app.listen(config.port, () => console.log(`API روی پورت ${config.port} بالا آمد`));
