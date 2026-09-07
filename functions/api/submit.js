export async function onRequestPost({ request, env }) {
  try {
    const form = await request.formData();
    const community = String(form.get('community') || '').trim();
    const roblox = String(form.get('roblox') || '').trim();
    const discord = String(form.get('discord') || '').trim();

    if (!community || !roblox || !discord) {
      return json({ ok: false, error: 'Faltan datos obligatorios.' }, 400);
    }

    const required = ['q1','q2','q3','q6','q7','q8','q9','q10','q11'];
    for (const key of required) {
      const file = form.get(key);
      if (!(file instanceof File) || file.size === 0) {
        return json({ ok: false, error: `Falta la grabación ${key.toUpperCase()}.` }, 400);
      }
    }

    if (!env.RESEND_API_KEY || !env.VERIFICATION_EMAIL) {
      return json({ ok: false, error: 'El administrador todavía no ha configurado el correo de recepción.' }, 500);
    }

    const attachments = [];
    for (const key of required) {
      const file = form.get(key);
      if (file.size > 8 * 1024 * 1024) {
        return json({ ok: false, error: `La grabación ${key.toUpperCase()} supera 8 MB.` }, 400);
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
      }
      attachments.push({ filename: `${key}.webm`, content: btoa(binary) });
    }

    const answers = {};
    for (const key of ['q4','q5']) answers[key] = String(form.get(key) || '');
    answers.q8_choice = String(form.get('q8_choice') || '');

    const now = new Date().toLocaleString('es-MX', { timeZone: 'America/Los_Angeles' });
    const html = `
      <h2>Nueva verificación — LIFE IN ARIZONA</h2>
      <p><b>Comunidad:</b> ${escapeHtml(community)}</p>
      <p><b>Roblox:</b> ${escapeHtml(roblox)}</p>
      <p><b>Discord:</b> ${escapeHtml(discord)}</p>
      <p><b>Fecha:</b> ${escapeHtml(now)}</p>
      <hr>
      <p><b>Pregunta 4:</b> ${escapeHtml(answers.q4)}</p>
      <p><b>Pregunta 5:</b> ${escapeHtml(answers.q5)}</p>
      <p><b>Pregunta 8:</b> ${escapeHtml(answers.q8_choice)}</p>
      <p>Las respuestas de voz están adjuntas como archivos .webm.</p>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'Verificaciones <onboarding@resend.dev>',
        to: [env.VERIFICATION_EMAIL],
        subject: `Nueva verificación — ${community} — ${roblox}`,
        html,
        attachments
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Resend error:', detail);
      return json({ ok: false, error: 'No se pudo entregar la solicitud por correo.' }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: 'Ocurrió un error al enviar la verificación.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' }
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
