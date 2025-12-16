// Importar y configurar Firebase Admin SDK
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const logger = require("firebase-functions/logger");
const {defineString} = require("firebase-functions/params");

admin.initializeApp();
const db = admin.firestore();

// --- Configuración de CORS con Parámetros ---
const corsAllowedOriginsParam = defineString("CORS_ALLOWED_ORIGINS", {
  default: "https://smartics.com.mx,http://localhost:3300",
  label: "Allowed CORS origins",
  description: "Comma-separated list of allowed CORS origins.",
});

functions.setGlobalOptions({maxInstances: 10});

// --- Middleware de CORS ---
const handleCors = (req, res) => {
  const originsValue = corsAllowedOriginsParam.value();
  const allowedOrigins = originsValue.split(",").filter(Boolean);
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
};

// --- Función para Enlaces de Productos (con SKU) ---
exports.createProductLink = functions.https.onRequest(async (req, res) => {
  handleCors(req, res);
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {targetUrl, shortId} = req.body;
  if (!targetUrl || !shortId) {
    const errorMsg = "Faltan 'targetUrl' o 'shortId' en la solicitud.";
    logger.warn(errorMsg);
    return res.status(400).send(
        "Los campos 'targetUrl' y 'shortId' son requeridos.",
    );
  }

  try {
    const newLink = {
      targetUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("shortlinks").doc(shortId).set(newLink);
    const logMsg = `Enlace de producto creado/actualizado: ${shortId} -> ${targetUrl}`;
    logger.info(logMsg);
    return res.status(201).json({shortId});
  } catch (error) {
    logger.error("Error al crear el enlace de producto:", error);
    return res.status(500).send("Error interno del servidor.");
  }
});

// --- Función para Enlaces Genéricos (ID Aleatorio) ---
exports.createLink = functions.https.onRequest(async (req, res) => {
  handleCors(req, res);
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const {targetUrl} = req.body;
  if (!targetUrl) {
    const errorMsg = "No se proporcionó 'targetUrl' en la solicitud genérica.";
    logger.warn(errorMsg);
    return res.status(400).send("El campo 'targetUrl' es requerido.");
  }

  try {
    const shortId = Math.random().toString(36).substring(2, 8);
    const newLink = {
      targetUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("shortlinks").doc(shortId).set(newLink);
    logger.info(`Enlace genérico creado: ${shortId} -> ${targetUrl}`);
    return res.status(201).json({shortId});
  } catch (error) {
    logger.error("Error al crear el enlace genérico:", error);
    return res.status(500).send("Error interno del servidor.");
  }
});

// --- Placeholder para Enlaces de Categorías ---
exports.createCategoryLink = functions.https.onRequest(async (req, res) => {
  handleCors(req, res);
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  logger.info("Función 'createCategoryLink' llamada, pero no implementada.");
  return res.status(501).send("Not Implemented");
});

// --- Función de Redirección ---
exports.redirect = functions.https.onRequest(async (req, res) => {
  const shortPath = req.path.substring(1);
  if (!shortPath || shortPath === "/") {
    const welcomeMsg =
      "Bienvenido a redirección Smartics. " +
      "Agrega una URL corta para redirigir.";
    return res.status(200).send(welcomeMsg);
  }

  try {
    const doc = await db.collection("shortlinks").doc(shortPath).get();
    if (doc.exists && doc.data().targetUrl) {
      logger.info(`Redirigiendo ${shortPath} a ${doc.data().targetUrl}`);
      return res.redirect(302, doc.data().targetUrl);
    } else {
      logger.warn(`Enlace no encontrado para ID: ${shortPath}`);
      return res.status(404).redirect("https://smartics.com.mx");
    }
  } catch (error) {
    logger.error("Error al buscar o redirigir el enlace:", error);
    return res.status(500).send("Error interno del servidor.");
  }
});
