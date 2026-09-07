const QUESTIONS = {
  q1: '¿Cuál es el propósito o la razón por la cual te quieres verificar?',
  q2: '¿Qué edad tienes realmente?',
  q3: 'Si entras al servidor y quieres sacar un vehículo, ¿cómo lo harías?',
  q4: '¿Tienes chat de voz en Roblox?',
  q5: '¿Tu chat de voz pertenece al grupo de edad de 18 años o más?',
  q6: 'Si te aburres estando dentro del servidor haciendo Roleplay, ¿qué harías para quitarte el aburrimiento sin salirte del Roleplay?',
  q7: '¿Cómo realizarías una persecución para que no se vea forzada, exagerada o irrealista?',
  q8: '¿Estás de acuerdo con que estás verificándote para un servidor de Roleplay estilo vida real, donde las situaciones deben mantenerse lo más realistas posible? ¿Por qué?',
  q9: 'Si un moderador te detiene y te hace preguntas sobre una situación, ¿cuál sería tu solución?',
  q10: '¿Eres una persona que se toma las cosas en serio durante el Roleplay?',
  q11: 'Si tienes que reportar a alguien, ¿cómo realizarías el reporte?'
};

const AUDIO_FILENAMES = {
  q1: '01_Proposito_de_verificacion.webm',
  q2: '02_Edad_real.webm',
  q3: '03_Sacar_un_vehiculo.webm',
  q6: '06_Aburrimiento_sin_salir_del_RP.webm',
  q7: '07_Persecucion_realista.webm',
  q8: '08_Explicacion_realismo_RP.webm',
  q9: '09_Situacion_con_moderador.webm',
  q10: '10_Tomarse_en_serio_el_RP.webm',
  q11: '11_Como_reportaria.webm'
};

export async function onRequestPost({ request, env }) {
  try {
    const form = await request.formData();
    const community = String(form.get('community') || '').trim();
    const roblox = String(form.get('roblox') || '').trim();
    const discord = String(form.get('discord') || '').trim();

    if (!community || !roblox || !discord) {
      return json({ ok: false, error: 'Faltan datos obligatorios.' }, 400);
    }

    const requiredAudio = ['q1','q2','q3','q6','q7','q8','q9','q10','q11'];
    for (const key of requiredAudio) {
      const file = form.get(key);
      if (!(file instanceof File) || file.size === 0) {
        return json({ ok: false, error: `Falta la grabación ${key.toUpperCase()}.` }, 400);
      }
    }

    if (!env.RESEND_API_KEY || !env.VERIFICATION_EMAIL) {
      return json({ ok: false, error: 'El administrador todavía no ha configurado el correo de recepción.' }, 500);
    }

    const attachments = [];
    for (const key of requiredAudio) {
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

      attachments.push({
        filename: AUDIO_FILENAMES[key],
        content: btoa(binary)
      });
    }

    const q4 = String(form.get('q4') || 'Sin respuesta');
    const q5 = String(form.get('q5') || 'Sin respuesta');
    const q8 = String(form.get('q8_choice') || 'Sin respuesta');
    const now = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Los_Angeles',
      dateStyle: 'long',
      timeStyle: 'short'
    });

    const audioCard = (number, filename) => `
      <div style="margin:12px 0;padding:16px 18px;background:#0b1016;border:1px solid #29313a;border-left:4px solid #b4002f;border-radius:10px;">
        <div style="font-size:12px;color:#aeb6c0;letter-spacing:1px;font-weight:700;">RESPUESTA DE VOZ</div>
        <div style="margin-top:6px;color:#ffffff;font-size:15px;font-weight:700;">Pregunta ${number}</div>
        <div style="margin-top:6px;color:#c8ced6;font-size:13px;">🎙 Archivo adjunto: <strong style="color:#ff315f;">${escapeHtml(filename)}</strong></div>
      </div>`;

    const textCard = (number, question, answer) => `
      <div style="margin:14px 0;padding:18px;background:#0b1016;border:1px solid #29313a;border-radius:10px;">
        <div style="font-size:11px;color:#ff315f;font-weight:800;letter-spacing:1.5px;">PREGUNTA ${number}</div>
        <div style="margin-top:7px;color:#ffffff;font-size:15px;line-height:1.45;font-weight:700;">${escapeHtml(question)}</div>
        <div style="margin-top:12px;padding:10px 12px;background:#111821;border-radius:7px;color:#dfe4ea;font-size:14px;">
          <strong style="color:#8ee28e;">Respuesta:</strong> ${escapeHtml(answer)}
        </div>
      </div>`;

    const voiceQuestionCard = (number, question, filename) => `
      <div style="margin:14px 0;padding:18px;background:#0b1016;border:1px solid #29313a;border-radius:10px;">
        <div style="font-size:11px;color:#ff315f;font-weight:800;letter-spacing:1.5px;">PREGUNTA ${number}</div>
        <div style="margin-top:7px;color:#ffffff;font-size:15px;line-height:1.45;font-weight:700;">${escapeHtml(question)}</div>
        <div style="margin-top:12px;padding:11px 12px;background:#111821;border-radius:7px;color:#cbd2da;font-size:13px;">
          <strong style="color:#8ee28e;">Respuesta:</strong> 🎙 Voz adjunta — <strong style="color:#ff315f;">${escapeHtml(filename)}</strong>
        </div>
      </div>`;

    const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#05070a;font-family:Arial,Helvetica,sans-serif;color:#e8ecf1;">
  <div style="max-width:760px;margin:0 auto;padding:28px 14px;">
    <div style="background:#0a0d12;border:1px solid #242a32;border-radius:16px;overflow:hidden;box-shadow:0 10px 35px rgba(0,0,0,.35);">
      <div style="padding:30px 28px;background:linear-gradient(135deg,#111720,#07090d);border-bottom:3px solid #b4002f;">
        <div style="font-size:12px;color:#ff315f;letter-spacing:3px;font-weight:800;">LIFE IN ARIZONA • VERIFICACIONES</div>
        <div style="margin-top:8px;font-size:30px;line-height:1.1;color:#ffffff;font-weight:900;">Nueva solicitud</div>
        <div style="margin-top:7px;font-size:14px;color:#aeb6c0;">Revisión de candidato — respuestas de entrevista y grabaciones de voz</div>
      </div>

      <div style="padding:24px 28px;">
        <div style="font-size:11px;color:#ff315f;font-weight:800;letter-spacing:2px;">DATOS DEL CANDIDATO</div>
        <div style="margin-top:12px;padding:18px;background:#11161d;border:1px solid #29313a;border-radius:12px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#dce2e8;">
            <tr><td style="padding:7px 0;color:#8f99a5;width:150px;">Comunidad</td><td style="padding:7px 0;color:#ffffff;font-weight:800;">${escapeHtml(community)}</td></tr>
            <tr><td style="padding:7px 0;color:#8f99a5;">Roblox</td><td style="padding:7px 0;color:#ffffff;font-weight:800;">${escapeHtml(roblox)}</td></tr>
            <tr><td style="padding:7px 0;color:#8f99a5;">Discord</td><td style="padding:7px 0;color:#ffffff;font-weight:800;">${escapeHtml(discord)}</td></tr>
            <tr><td style="padding:7px 0;color:#8f99a5;">Fecha</td><td style="padding:7px 0;color:#ffffff;">${escapeHtml(now)}</td></tr>
          </table>
        </div>

        <div style="margin-top:28px;font-size:11px;color:#ff315f;font-weight:800;letter-spacing:2px;">RESPUESTAS DE LA ENTREVISTA</div>

        ${voiceQuestionCard(1, QUESTIONS.q1, AUDIO_FILENAMES.q1)}
        ${voiceQuestionCard(2, QUESTIONS.q2, AUDIO_FILENAMES.q2)}
        ${voiceQuestionCard(3, QUESTIONS.q3, AUDIO_FILENAMES.q3)}
        ${textCard(4, QUESTIONS.q4, q4)}
        ${textCard(5, QUESTIONS.q5, q5)}
        ${voiceQuestionCard(6, QUESTIONS.q6, AUDIO_FILENAMES.q6)}
        ${voiceQuestionCard(7, QUESTIONS.q7, AUDIO_FILENAMES.q7)}
        ${textCard(8, QUESTIONS.q8, q8)}
        ${voiceQuestionCard(8, 'Explicación mediante voz de la pregunta 8', AUDIO_FILENAMES.q8)}
        ${voiceQuestionCard(9, QUESTIONS.q9, AUDIO_FILENAMES.q9)}
        ${voiceQuestionCard(10, QUESTIONS.q10, AUDIO_FILENAMES.q10)}
        ${voiceQuestionCard(11, QUESTIONS.q11, AUDIO_FILENAMES.q11)}

        <div style="margin-top:26px;padding:18px;background:#11161d;border:1px solid #29313a;border-radius:12px;">
          <div style="font-size:11px;color:#ff315f;font-weight:800;letter-spacing:2px;">ARCHIVOS ADJUNTOS</div>
          <div style="margin-top:8px;color:#d8dee5;font-size:14px;line-height:1.6;">Se adjuntaron <strong style="color:#ffffff;">9 grabaciones de voz</strong>. Los nombres de archivo indican exactamente a qué pregunta corresponde cada audio.</div>
        </div>
      </div>

      <div style="padding:18px 28px;background:#080a0e;border-top:1px solid #242a32;color:#747e89;font-size:12px;line-height:1.5;">
        LIFE IN ARIZONA • Sistema de Verificaciones<br>
        Este correo fue generado automáticamente por el formulario de verificación.
      </div>
    </div>
  </div>
</body>
</html>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'Verificaciones <onboarding@resend.dev>',
        to: [env.VERIFICATION_EMAIL],
        subject: `🔰 NUEVA VERIFICACIÓN — ${community} — ${roblox}`,
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
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
