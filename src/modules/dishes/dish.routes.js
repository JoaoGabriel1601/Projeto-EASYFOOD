const router = require("express").Router();
const controller = require("./dish.controller");
const authenticate = require("../auth/auth.middleware");
const upload = require("../shared/upload.middleware");

router.get("/restaurants/:restaurantId/dishes", controller.list);
router.post("/restaurants/:restaurantId/dishes", authenticate, controller.create);
router.post("/dishes/:dishId/image", authenticate, upload, controller.uploadImage);

module.exports = router;
