/**
 * Сроки хранения вручную: архив свадеб старше 10 дней, удаление фото
 * старше 15. На сервере это делает сам сайт раз в час; скрипт — чтобы
 * прогнать сразу или по cron, если фоновая задача выключена
 * (RETENTION_DISABLED=1).
 *
 *   npm run retention
 */
import "dotenv/config";
import { runRetention } from "@/server/services/retention";

const report = await runRetention();
console.log(`В архив: ${report.archived}. Удалено фото: ${report.purgedPhotos} (свадеб: ${report.purgedEvents}).`);
process.exit(0);
