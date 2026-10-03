const router = require("express").Router();
router.use("/auth", require("./modules/auth/auth.routes"));
router.use("/users", require("./modules/users/users.routes"));
router.use("/assets", require("./modules/assets/assets.routes"));
module.exports = router;