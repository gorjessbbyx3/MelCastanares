import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rentalsRouter from "./rentals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rentalsRouter);

export default router;
