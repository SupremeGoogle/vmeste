/**
 * Письма «Вместе»: подтверждение почты, сброс пароля, «кабинет уже есть».
 *
 * Вёрстка — таблицы и встроенные стили: почтовые программы (Gmail,
 * Mail.ru, Яндекс, Outlook) не понимают ни внешних стилей, ни флексов.
 * У каждого письма есть текстовая версия — без неё растёт вероятность спама.
 */
import { esc } from "@/server/guest-html/layout";
import type { Email } from "@/server/email/send";

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function layout(title: string, lead: string, button: { href: string; label: string }, after: string): string {
  const logo = `${appUrl()}/media/brand/vmeste-logo.png`;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f7f1ea">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f1ea;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffdf9;border-radius:16px;border:1px solid #eadfd3">
<tr><td align="center" style="padding:32px 32px 8px"><img src="${logo}" width="140" alt="Вместе" style="display:block;border:0;max-width:140px;height:auto"></td></tr>
<tr><td style="padding:16px 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#3b2f2a;text-align:center">${esc(title)}</td></tr>
<tr><td style="padding:12px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#5c4f48;text-align:center">${lead}</td></tr>
<tr><td align="center" style="padding:24px 32px">
<a href="${esc(button.href)}" style="display:inline-block;background:#3b2f2a;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:14px 28px;border-radius:999px">${esc(button.label)}</a>
</td></tr>
<tr><td style="padding:0 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#8a7c73;text-align:center">Если кнопка не нажимается, откройте ссылку:<br><a href="${esc(button.href)}" style="color:#8a6d5b;word-break:break-all">${esc(button.href)}</a></td></tr>
<tr><td style="padding:8px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#8a7c73;text-align:center">${after}</td></tr>
</table>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#a89a90;margin:16px 0 0">Вместе — свадьба, продуманная до мелочей · <a href="${appUrl()}" style="color:#a89a90">${esc(appUrl().replace(/^https?:\/\//, ""))}</a></p>
</td></tr></table></body></html>`;
}

/**
 * Код подтверждения. Письмо нарочно простое: без картинок, ссылок и кнопок —
 * короткое письмо с кодом почтовики (Gmail, Mail.ru, Яндекс) реже уносят в
 * спам, чем рассылочное с кнопкой. Код в теме — его видно в уведомлении.
 */
export function verifyCode(to: string, code: string): Email {
  const pretty = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
    to,
    subject: `${pretty} — код подтверждения «Вместе»`,
    html: `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Код подтверждения</title></head>
<body style="margin:0;padding:24px 12px;background:#f7f1ea;font-family:Arial,Helvetica,sans-serif;color:#3b2f2a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#fffdf9;border:1px solid #eadfd3;border-radius:16px">
<tr><td style="padding:32px 28px 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;text-align:center">Вместе</td></tr>
<tr><td style="padding:8px 28px 0;font-size:15px;line-height:1.55;text-align:center;color:#5c4f48">Ваш код подтверждения почты:</td></tr>
<tr><td style="padding:18px 28px;text-align:center"><span style="display:inline-block;font-size:34px;font-weight:bold;letter-spacing:8px;color:#3b2f2a;background:#f7f1ea;border-radius:12px;padding:14px 20px">${esc(code)}</span></td></tr>
<tr><td style="padding:0 28px 28px;font-size:13px;line-height:1.55;text-align:center;color:#8a7c73">Введите его на странице регистрации. Код действует 15 минут.<br>Если вы не регистрировались во «Вместе», просто удалите это письмо.</td></tr>
</table></td></tr></table></body></html>`,
    text: `Ваш код подтверждения почты для «Вместе»: ${code}

Введите его на странице регистрации. Код действует 15 минут.
Если вы не регистрировались во «Вместе», просто удалите это письмо.`,
  };
}

export function resetPassword(to: string, link: string): Email {
  return {
    to,
    subject: "Новый пароль — Вместе",
    html: layout("Новый пароль", "Кто-то (надеемся, вы) попросил сменить пароль от кабинета «Вместе».", { href: link, label: "Придумать новый пароль" },
      "Ссылка работает 1 час и только один раз. Если вы ничего не просили — удалите письмо: пароль останется прежним."),
    text: `Смена пароля от кабинета «Вместе»:\n${link}\n\nСсылка работает 1 час и только один раз. Если вы ничего не просили — удалите письмо, пароль останется прежним.`,
  };
}

/** Регистрируются повторно на занятый адрес — подсказываем войти, не раскрывая этого на сайте. */
export function alreadyRegistered(to: string, loginLink: string, resetLink: string | null): Email {
  return {
    to,
    subject: "У вас уже есть кабинет — Вместе",
    html: layout("Кабинет уже есть", "На этот адрес уже открыт кабинет «Вместе». Войдите в него — или, если забыли пароль, придумайте новый по ссылке ниже.", { href: loginLink, label: "Войти" },
      resetLink ? `Забыли пароль? <a href="${esc(resetLink)}" style="color:#8a6d5b">Придумать новый</a> (ссылка работает 1 час).` : "Этот кабинет открывается через Google — нажмите «Войти через Google»."),
    text: `На этот адрес уже открыт кабинет «Вместе». Войти: ${loginLink}${resetLink ? `\nЗабыли пароль? ${resetLink}` : "\nКабинет открывается через Google."}`,
  };
}
