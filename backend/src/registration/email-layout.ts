export interface EmailLink {
  label: string;
  url: string;
}

export interface EmailContent {
  preheader: string;
  eyebrow: string;
  title: string;
  highlight: string;
  paragraphs: string[];
  action: EmailLink;
  secondary?: EmailLink;
  note?: string;
  showFallbackLink?: boolean;
  safety: string;
}

export interface EmailBrand {
  home: string;
  logo: string;
  logoDark: string;
  symbol: string;
}

const DISPLAY =
  "'Bricolage Grotesque','Arial Narrow',Arial,Helvetica,sans-serif";
const BODY = "'Plus Jakarta Sans',Arial,Helvetica,sans-serif";
const CONDENSED = "font-stretch:75%;font-variation-settings:'wdth' 75;";

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] as string,
  );

// Mantém cada palavra inteira para o rótulo não quebrar em "E-" / "MAIL".
const keepWords = (text: string): string =>
  text
    .split(' ')
    .map(
      (word) => `<span style="white-space:nowrap;">${escapeHtml(word)}</span>`,
    )
    .join(' ');

const spacer = (height: number): string =>
  `<tr><td style="height:${height}px;line-height:${height}px;font-size:0;">&nbsp;</td></tr>`;

const button = ({ label, url }: EmailLink): string => `
<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:30px auto 0;">
  <tr>
    <td align="center" bgcolor="#FED501" style="background:#FED501;border:3px solid #000000;border-bottom-width:7px;border-radius:18px;mso-padding-alt:16px 34px;">
      <a class="sp-btn" href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:16px 34px;border-radius:15px;font-family:${DISPLAY};font-weight:800;${CONDENSED}font-size:26px;line-height:1;letter-spacing:.01em;text-transform:uppercase;color:#000000;text-decoration:none;">${keepWords(label)}</a>
    </td>
  </tr>
</table>`;

const fallbackCard = (url: string): string => `
${spacer(18)}
<tr>
  <td class="sp-card sp-px" bgcolor="#FFFCF7" style="background:#FFFCF7;border:3px solid #000000;border-radius:24px;padding:22px 28px;">
    <p class="sp-tx" style="margin:0 0 4px;font-family:${BODY};font-size:15px;font-weight:800;line-height:1.4;color:#142747;">O botão não funcionou?</p>
    <p class="sp-mu" style="margin:0 0 10px;font-family:${BODY};font-size:14px;line-height:1.5;color:#4E5D73;">Copie e cole este endereço no navegador:</p>
    <p style="margin:0;font-family:${BODY};font-size:13px;line-height:1.5;word-break:break-all;"><a class="sp-link" href="${escapeHtml(url)}" target="_blank" style="color:#1D50C2;text-decoration:underline;">${escapeHtml(url)}</a></p>
  </td>
</tr>`;

export function renderEmailHtml(
  subject: string,
  content: EmailContent,
  brand: EmailBrand,
): string {
  const paragraphs = content.paragraphs
    .map(
      (text, index) =>
        `<p style="margin:${index === 0 ? 20 : 12}px auto 0;max-width:440px;font-family:${BODY};font-size:17px;line-height:1.55;color:#FFFFFF;">${escapeHtml(text)}</p>`,
    )
    .join('');
  const secondary = content.secondary
    ? `<p style="margin:18px 0 0;font-family:${BODY};font-size:15px;font-weight:700;line-height:1.5;"><a href="${escapeHtml(content.secondary.url)}" target="_blank" style="color:#FFFFFF;text-decoration:underline;">${escapeHtml(content.secondary.label)}</a></p>`
    : '';
  const note = content.note
    ? `<p style="margin:18px 0 0;font-family:${BODY};font-size:14px;line-height:1.5;color:#FFFFFF;">${escapeHtml(content.note)}</p>`
    : '';
  // Caracteres invisíveis impedem que o cliente complete a prévia com o corpo do e-mail.
  const previewPad = '&#8199;&#65279;&#847; '.repeat(60);

  return `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<!--[if !mso]><!--><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,800&amp;family=Plus+Jakarta+Sans:wght@400;700;800&amp;display=swap" rel="stylesheet"><!--<![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:separate;mso-table-lspace:0;mso-table-rspace:0}
img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important}
@media (max-width:620px){
.sp-px{padding-left:20px!important;padding-right:20px!important}
.sp-hero{padding:32px 20px 30px!important;border-radius:26px!important}
.sp-title{font-size:38px!important}
.sp-btn{padding:14px 18px!important;font-size:22px!important}
}
@media (prefers-color-scheme:dark){
.sp-bg{background:#101B30!important}
.sp-card{background:#192740!important;border-color:#3C4F6C!important}
.sp-tip{background:#1E3466!important}
.sp-tx{color:#F1F5F9!important}
.sp-mu{color:#A3B1C6!important}
.sp-link,.sp-eyebrow{color:#9DB8FF!important}
.sp-light-only{display:none!important}
.sp-dark-only{display:block!important;max-height:none!important;overflow:visible!important}
}
</style>
<!--[if mso]><style>body,table,td,p,a,h1,span{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body class="sp-bg" style="margin:0;padding:0;background:#F9EEDC;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F9EEDC;opacity:0;">${escapeHtml(content.preheader)}${previewPad}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="sp-bg" bgcolor="#F9EEDC" style="background:#F9EEDC;">
  <tr>
    <td align="center" style="padding:32px 12px 40px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr>
          <td class="sp-px" style="padding:0 8px 22px;">
            <a href="${escapeHtml(brand.home)}" target="_blank" style="text-decoration:none;">
              <img class="sp-light-only" src="${escapeHtml(brand.logo)}" width="180" alt="SecurePlay" style="display:block;width:180px;height:auto;font-family:${BODY};font-size:24px;font-weight:800;color:#2662E7;">
              <!--[if !mso]><!--><div class="sp-dark-only" style="display:none;max-height:0;overflow:hidden;"><img src="${escapeHtml(brand.logoDark)}" width="180" alt="SecurePlay" style="display:block;width:180px;height:auto;font-family:${BODY};font-size:24px;font-weight:800;color:#F9EEDC;"></div><!--<![endif]-->
            </a>
          </td>
        </tr>
        <tr>
          <td class="sp-hero" align="center" bgcolor="#2662E7" style="background:#2662E7;border:3px solid #000000;border-bottom-width:9px;border-radius:32px;padding:40px 44px 36px;text-align:center;">
            <img src="${escapeHtml(brand.symbol)}" width="104" alt="" style="display:block;margin:0 auto;width:104px;height:auto;">
            <p style="margin:26px 0 14px;font-family:${BODY};font-size:12px;font-weight:800;line-height:1.4;letter-spacing:.22em;text-transform:uppercase;color:#FFFFFF;">${escapeHtml(content.eyebrow)}</p>
            <h1 class="sp-title" style="margin:0;font-family:${DISPLAY};font-weight:800;${CONDENSED}font-size:46px;line-height:1;letter-spacing:-.005em;text-transform:uppercase;text-wrap:balance;color:#F9EEDC;">${escapeHtml(content.title)} <span style="color:#FED501;">${escapeHtml(content.highlight)}</span></h1>
            ${paragraphs}
            ${button(content.action)}
            ${secondary}
            ${note}
          </td>
        </tr>
        ${content.showFallbackLink ? fallbackCard(content.action.url) : ''}
        ${spacer(18)}
        <tr>
          <td class="sp-tip sp-px" bgcolor="#E7EEFF" style="background:#E7EEFF;border-radius:24px;padding:20px 28px;">
            <p class="sp-eyebrow" style="margin:0 0 6px;font-family:${BODY};font-size:12px;font-weight:800;line-height:1.4;letter-spacing:.14em;text-transform:uppercase;color:#1D50C2;">Dica de segurança</p>
            <p class="sp-tx" style="margin:0;font-family:${BODY};font-size:14px;line-height:1.55;color:#142747;">${escapeHtml(content.safety)} A SecurePlay nunca pede sua senha por e-mail.</p>
          </td>
        </tr>
        ${spacer(28)}
        <tr>
          <td align="center" bgcolor="#FED501" style="background:#FED501;border:3px solid #000000;border-radius:999px;padding:12px 18px;text-align:center;font-family:${DISPLAY};font-weight:800;${CONDENSED}font-size:20px;line-height:1.1;letter-spacing:.04em;text-transform:uppercase;color:#000000;">Aprenda&nbsp;&rarr; Pratique&nbsp;&rarr; Conquiste&nbsp;&rarr; Cuide</td>
        </tr>
        <tr>
          <td class="sp-px" align="center" style="padding:20px 8px 0;text-align:center;">
            <p class="sp-mu" style="margin:0;font-family:${BODY};font-size:12px;line-height:1.6;color:#4E5D73;">Você recebeu este e-mail porque este endereço foi informado na SecurePlay.<br>&copy; ${new Date().getFullYear()} SecurePlay &middot; Segurança digital para escolas.</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}
