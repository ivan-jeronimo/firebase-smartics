// Importar y configurar Firebase Admin SDK
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const {defineString} = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();

// --- Configuración de CORS con Parámetros ---
// Define el parámetro para los orígenes CORS permitidos.
// El valor se gestiona de forma segura y se puede configurar por entorno.
//
// Para desarrollo local, crea un archivo .env en el directorio de functions
// y añade la siguiente línea (ajusta el puerto si es necesario):
// CORS_ALLOWED_ORIGINS="https://smartics.com.mx,http://localhost:3300"
//
// Al desplegar en producción, Firebase te pedirá que establezcas el valor
// para este parámetro si aún no lo has hecho.
const corsAllowedOriginsParam = defineString("CORS_ALLOWED_ORIGINS", {
  default: "https://smartics.com.mx,http://localhost:3300",
  label: "Allowed CORS origins",
  description: "Comma-separated list of allowed CORS origins.",
});

functions.setGlobalOptions({maxInstances: 10});

exports.createLink = functions.https.onRequest(async (req, res) => {
  // --- Manejo de CORS ---
  // Obtiene el valor del parámetro y lo divide en un array.
  const allowedOrigins = corsAllowedOriginsParam
      .value()
      .split(",")
      .filter(Boolean);
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }

  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-control-max-age", "3600");

  // Responder a solicitudes pre-flight (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {targetUrl} = req.body;

  if (!targetUrl) {
    logger.warn("No se proporcionó targetUrl en la solicitud.");
    return res.status(400).send("El campo 'targetUrl' es requerido.");
  }

  try {
    // Generar un ID corto aleatorio
    const shortId = Math.random().toString(36).substring(2, 8);

    const newLink = {
      targetUrl: targetUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Guardar en Firestore
    await db.collection("shortlinks").doc(shortId).set(newLink);

    logger.info(`Enlace creado: ${shortId} -> ${targetUrl}`);

    // Devolver el ID corto
    return res.status(201).json({shortId: shortId});
  } catch (error) {
    logger.error("Error al crear el enlace:", error);
    return res.status(500).send("Error interno al crear el enlace.");
  }
});


exports.redirect = functions.https.onRequest(async (req, res) => {
  // 1. Obtener ruta de la URL corta
  const shortPath = req.path; // Contiene la ruta completa

  // Ignorar si la ruta de la raíz (/)
  if (shortPath === "/") {
    logger.warn("Acceso a la ruta raíz sin path.", {shortPath});
    const welcomeMsg =
      "Bienvenido a redirección Smartics. " +
      "Agrega una URL corta para redirigir.";
    return res.status(200).send(welcomeMsg);
  }

  // 2. Extraer el ID único
  const shortId = shortPath.substring(1);
  logger.info(`Buscando enlace para ID: ${shortId}`, {shortId});

  try {
    // 3. Consultar Cloud Firestore
    const docRef = db.collection("shortlinks").doc(shortId);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      const destinationUrl = data.targetUrl;

      if (destinationUrl) {
        logger.info(
            `Redirigiendo ${shortId} a ${destinationUrl}`,
            {destinationUrl},
        );

        // 4. Realizar redirección HTTP (302: Temporal)
        return res.redirect(302, destinationUrl);
      }
    }

    // Si el documento no existe o no tiene URL de destino
    logger.warn(`Enlace no encontrado para ID: ${shortId}`, {shortId});
    // Redirigir a una URL de fallback (tu sitio principal o 404)
    return res.status(404).redirect("https://smartics.com.mx");
  } catch (error) {
    logger.error("Error al buscar o redirigir el enlace:", error);
    return res.status(500).send("Error interno del servidor.");
  }
});
