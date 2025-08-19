// /api/analyzeImage.js

// Esta función se ejecuta en el servidor de Vercel, no en el navegador.
export default async function handler(req, res) {
  // 1. Solo aceptamos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { base64ImageData, mimeType } = req.body;

    // 2. Validamos que nos hayan enviado los datos necesarios
    if (!base64ImageData || !mimeType) {
      return res.status(400).json({ message: 'Faltan datos de la imagen.' });
    }
    
    // 3. Obtenemos la clave secreta desde las variables de entorno del SERVIDOR
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("La clave de API de Gemini no está configurada en el servidor.");
    }
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Analiza la imagen de un recibo o boleta de restaurante. Extrae cada ítem con su nombre, cantidad y precio unitario. Devuelve solo un JSON válido con la estructura: {"items": [{"name": "string", "quantity": integer, "price": "string"}]}. Asegúrate de que el precio sea un string que represente el valor numérico, usando coma como separador decimal si es necesario.`;

    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64ImageData } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    };

    // 4. Hacemos la llamada a la API de Gemini desde nuestro servidor
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Error desde la API de Gemini:", errorBody);
        throw new Error(`Error en la API de Gemini: ${response.statusText}`);
    }

    const result = await response.json();

    // 5. Enviamos el resultado de vuelta al frontend
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error en la función serverless:', error);
    return res.status(500).json({ message: error.message || 'Error interno del servidor.' });
  }
}
