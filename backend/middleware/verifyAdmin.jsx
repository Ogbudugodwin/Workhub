async function verifyAdmin(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  const decoded = await admin.auth().verifyIdToken(token);

  const user = await db.collection("users").doc(decoded.uid).get();
  if (user.data().role !== "admin") {
    return res.status(403).send("Forbidden");
  }
  next();
}
