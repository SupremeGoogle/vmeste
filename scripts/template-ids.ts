/** Список шаблонов витрины для scripts/template-previews.mjs — из самого приложения. */
import { PICKABLE_TEMPLATES } from "@/lib/invite-templates";

console.log(JSON.stringify(PICKABLE_TEMPLATES.map((template) => template.id)));
